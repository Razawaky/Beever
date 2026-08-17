import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, idPorSlug, motivoParaPular } from '../../helpers/banco.js';
import { emTransacao, fecharPool } from '../../../src/config/database.js';
import * as goalsRepository from '../../../src/repositories/goalsRepository.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';

/**
 * `goalsRepository` contra banco real — as metas do jogador.
 *
 * O teste que documenta a mudança de contrato é o primeiro: a meta pertence ao
 * usuário direto. Não há mais cronograma no meio, e uma consulta que ainda
 * tentasse aquele join simplesmente não encontraria tabela.
 *
 * O progresso é absoluto e limitado ao alvo, porque a fonte da maioria das
 * metas é um saldo — somar deltas sobre saldo daria número dobrado.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const EM_UMA_SEMANA = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
const ONTEM = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

describe('goalsRepository', opcoes, () => {
  let banco;
  let conexao;
  let idTipo;
  let idDificuldade;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;
    idTipo = await idPorSlug(conexao, 'goal_types', 'acumular-mel');
    idDificuldade = await idPorSlug(conexao, 'goal_difficulties', 'simples');
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function jogador(sufixo) {
    return usersRepository.criar({
      email: `meta-${sufixo}@beever.dev`,
      apelido: `meta-${sufixo}`,
      dataNasc: '2013-06-11',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
  }

  async function metaNova(sufixo, { alvo = 100, prazo = EM_UMA_SEMANA } = {}) {
    const idUsuario = await jogador(sufixo);
    const id = await emTransacao((c) =>
      goalsRepository.criar(c, {
        idUsuario,
        idTipo,
        idDificuldade,
        titulo: 'Guardar mel para o patinete',
        alvo,
        recompensaMoedas: 30,
        recompensaPontos: 20,
        prazo,
      }),
    );
    return { idUsuario, id };
  }

  it('a meta pertence ao usuário direto, sem cronograma no meio', async () => {
    const { idUsuario, id } = await metaNova('dono');
    const meta = await goalsRepository.buscarPorId(id);

    assert.equal(Number(meta.user_id), Number(idUsuario));
    assert.equal(meta.status, 'ativa');
    assert.equal(meta.type_slug, 'acumular-mel');
    assert.equal(meta.difficulty, 'simples');
    assert.ok(meta.progress_source, 'o tipo diz de onde o progresso vem');
  });

  it('grava progresso absoluto, limitado ao alvo', async () => {
    const { id } = await metaNova('progresso', { alvo: 100 });

    await emTransacao((c) => goalsRepository.atualizarProgresso(c, id, 40));
    assert.equal(Number((await goalsRepository.buscarPorId(id)).current_value), 40);

    await emTransacao((c) => goalsRepository.atualizarProgresso(c, id, 500));
    assert.equal(
      Number((await goalsRepository.buscarPorId(id)).current_value),
      100,
      'progresso não passa do alvo, mesmo com saldo maior',
    );
  });

  it('conclui uma vez só', async () => {
    const { id } = await metaNova('idempotente');

    const primeira = await emTransacao((c) => goalsRepository.concluir(c, id));
    const segunda = await emTransacao((c) => goalsRepository.concluir(c, id));

    assert.equal(primeira, 1);
    assert.equal(segunda, 0, 'concluir de novo não pode pagar a recompensa de novo');

    const meta = await goalsRepository.buscarPorId(id);
    assert.equal(meta.status, 'concluida');
    assert.equal(Number(meta.current_value), Number(meta.target_value));
  });

  it('meta concluída não aceita mais progresso', async () => {
    const { id } = await metaNova('congelada');
    await emTransacao((c) => goalsRepository.concluir(c, id));

    assert.equal(await emTransacao((c) => goalsRepository.atualizarProgresso(c, id, 10)), 0);
  });

  it('conta e lista só as ativas do jogador', async () => {
    const { idUsuario, id } = await metaNova('contagem');
    await emTransacao((c) =>
      goalsRepository.criar(c, {
        idUsuario,
        idTipo,
        idDificuldade,
        titulo: 'Segunda meta',
        alvo: 50,
        prazo: EM_UMA_SEMANA,
      }),
    );

    assert.equal(await goalsRepository.contarAtivas(idUsuario), 2);

    await emTransacao((c) => goalsRepository.concluir(c, id));

    assert.equal(await goalsRepository.contarAtivas(idUsuario), 1);
    assert.equal((await goalsRepository.listarAtivasPorUsuario(idUsuario)).length, 1);
    assert.equal((await goalsRepository.listarPorUsuario(idUsuario)).length, 2, 'a concluída continua no histórico');
  });

  it('expira as vencidas e preserva as do prazo', async () => {
    const { id: vencida } = await metaNova('vencida');
    const { id: noPrazo } = await metaNova('no-prazo');

    // O prazo vencido é plantado por update, e não na criação, porque
    // `ck_goals_dates` exige `due_at > starts_at`: uma meta não nasce vencida.
    // As duas datas andam juntas para o passado, e a constraint segue válida.
    await conexao.query(
      `UPDATE goals
          SET starts_at = DATE_SUB(NOW(), INTERVAL 10 DAY),
              due_at    = DATE_SUB(NOW(), INTERVAL 1 DAY)
        WHERE id = ?`,
      [vencida],
    );

    await goalsRepository.expirarVencidas();

    assert.equal((await goalsRepository.buscarPorId(vencida)).status, 'expirada');
    assert.equal((await goalsRepository.buscarPorId(noPrazo)).status, 'ativa');
  });

  it('guarda de qual meta a renovação veio', async () => {
    const { idUsuario, id: original } = await metaNova('renovada');

    const renovada = await emTransacao((c) =>
      goalsRepository.criar(c, {
        idUsuario,
        idTipo,
        idDificuldade,
        titulo: 'Guardar mel, segunda tentativa',
        alvo: 100,
        prazo: EM_UMA_SEMANA,
        renovadaDe: original,
      }),
    );

    assert.equal(Number((await goalsRepository.buscarPorId(renovada)).renewed_from_goal_id), Number(original));
  });

  it('alvo zero e prazo anterior ao início são recusados pelo banco', async () => {
    const idUsuario = await jogador('invalida');
    const base = { idUsuario, idTipo, idDificuldade, titulo: 'Meta inválida' };

    await assert.rejects(
      emTransacao((c) => goalsRepository.criar(c, { ...base, alvo: 0, prazo: EM_UMA_SEMANA })),
      /ck_goals_values/,
    );
    await assert.rejects(
      emTransacao((c) => goalsRepository.criar(c, { ...base, alvo: 10, prazo: ONTEM })),
      /ck_goals_dates/,
    );
  });
});
