import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, idPorSlug, motivoParaPular } from '../../helpers/banco.js';
import { emTransacao, fecharPool } from '../../../src/config/database.js';
import * as tasksRepository from '../../../src/repositories/tasksRepository.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';

/**
 * `tasksRepository` contra banco real — as tarefas diárias e semanais.
 *
 * A conclusão idempotente é o teste que mais importa: o `AND completed_at IS
 * NULL` mora no `WHERE`, e é ele que impede o clique duplo de creditar
 * recompensa duas vezes. Era assim no schema antigo (com `progresso < 100`) e
 * continua sendo — só mudou a coluna.
 *
 * O resto fixa o contrato novo: a tarefa nasce de um `task_type`, o título vem
 * do tipo, e o progresso é contagem até o alvo, não porcentagem.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const AMANHA = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
const ONTEM = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

describe('tasksRepository', opcoes, () => {
  let banco;
  let conexao;
  let idTipo;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;
    idTipo = await idPorSlug(conexao, 'task_types', 'concluir-3-celulas');
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function jogador(sufixo) {
    return usersRepository.criar({
      email: `tarefa-${sufixo}@beever.dev`,
      apelido: `tarefa-${sufixo}`,
      dataNasc: '2015-02-20',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
  }

  async function tarefaNova(sufixo, prazo = AMANHA) {
    const idUsuario = await jogador(sufixo);
    const id = await emTransacao((c) => tasksRepository.criar(c, { idUsuario, idTipo, prazo }));
    return { idUsuario, id };
  }

  it('herda alvo e recompensa do tipo quando nada é informado', async () => {
    const { id } = await tarefaNova('padrao');
    const tarefa = await tasksRepository.buscarPorId(id);
    const [tipo] = await conexao
      .query('SELECT default_target, reward_points, reward_coins, name FROM task_types WHERE id = ?', [idTipo])
      .then(([linhas]) => linhas);

    assert.equal(Number(tarefa.target_value), Number(tipo.default_target));
    assert.equal(Number(tarefa.reward_points), Number(tipo.reward_points));
    assert.equal(Number(tarefa.reward_coins), Number(tipo.reward_coins));
    assert.equal(tarefa.title, tipo.name, 'o título vem do tipo, não de texto solto na tarefa');
    assert.equal(tarefa.status, 'ativa');
    assert.equal(tarefa.scope, 'diaria');
  });

  it('aceita alvo e recompensa customizados', async () => {
    const idUsuario = await jogador('customizada');
    const id = await emTransacao((c) =>
      tasksRepository.criar(c, { idUsuario, idTipo, alvo: 7, pontos: 99, moedas: 42, prazo: AMANHA }),
    );

    const tarefa = await tasksRepository.buscarPorId(id);
    assert.equal(Number(tarefa.target_value), 7);
    assert.equal(Number(tarefa.reward_points), 99);
    assert.equal(Number(tarefa.reward_coins), 42);
  });

  it('soma progresso sem passar do alvo', async () => {
    const { id } = await tarefaNova('progresso');
    const alvo = Number((await tasksRepository.buscarPorId(id)).target_value);

    await emTransacao((c) => tasksRepository.registrarProgresso(c, id, 1));
    assert.equal(Number((await tasksRepository.buscarPorId(id)).current_value), 1);

    await emTransacao((c) => tasksRepository.registrarProgresso(c, id, 999));
    assert.equal(
      Number((await tasksRepository.buscarPorId(id)).current_value),
      alvo,
      'o progresso não pode ultrapassar o alvo',
    );
  });

  it('conclui uma vez só (clique duplo não credita duas vezes)', async () => {
    const { id } = await tarefaNova('idempotente');

    const primeira = await emTransacao((c) => tasksRepository.concluir(c, id));
    const segunda = await emTransacao((c) => tasksRepository.concluir(c, id));

    assert.equal(primeira, 1);
    assert.equal(segunda, 0, 'a segunda conclusão não pode afetar linha nenhuma');

    const tarefa = await tasksRepository.buscarPorId(id);
    assert.equal(tarefa.status, 'concluida');
    assert.equal(Number(tarefa.current_value), Number(tarefa.target_value));
    assert.ok(tarefa.completed_at);
  });

  it('tarefa concluída não aceita mais progresso', async () => {
    const { id } = await tarefaNova('congelada');
    await emTransacao((c) => tasksRepository.concluir(c, id));

    const afetadas = await emTransacao((c) => tasksRepository.registrarProgresso(c, id, 5));
    assert.equal(afetadas, 0);
  });

  it('lista as ativas do jogador, sem as dos outros', async () => {
    const { idUsuario } = await tarefaNova('lista');
    const { id: outraTarefa } = await tarefaNova('lista-outro');

    const ativas = await tasksRepository.listarAtivasPorUsuario(idUsuario);

    assert.equal(ativas.length, 1);
    assert.ok(!ativas.some((tarefa) => Number(tarefa.id) === Number(outraTarefa)));
  });

  it('expira as vencidas e deixa as do prazo em paz', async () => {
    const { idUsuario, id: vencida } = await tarefaNova('vencida', ONTEM);
    const noPrazo = await emTransacao((c) => tasksRepository.criar(c, { idUsuario, idTipo, prazo: AMANHA }));

    await tasksRepository.expirarVencidas();

    assert.equal((await tasksRepository.buscarPorId(vencida)).status, 'expirada');
    assert.equal((await tasksRepository.buscarPorId(noPrazo)).status, 'ativa');
  });

  it('a expiração não mexe em tarefa já concluída', async () => {
    const { id } = await tarefaNova('concluida-vencida', ONTEM);
    await emTransacao((c) => tasksRepository.concluir(c, id));

    await tasksRepository.expirarVencidas();

    assert.equal((await tasksRepository.buscarPorId(id)).status, 'concluida');
  });

  it('alvo zero é recusado pelo banco', async () => {
    const idUsuario = await jogador('alvo-zero');

    await assert.rejects(
      emTransacao((c) => tasksRepository.criar(c, { idUsuario, idTipo, alvo: 0, prazo: AMANHA })),
      /ck_tasks_values/,
    );
  });
});
