import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../../helpers/banco.js';
import { emTransacao, fecharPool } from '../../../src/config/database.js';
import * as schedulesRepository from '../../../src/repositories/schedulesRepository.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';

/**
 * `schedulesRepository` contra banco real — a disponibilidade da semana.
 *
 * Este arquivo mudou de assunto na E01: era o cronograma que servia de balde
 * para metas, virou os dias em que o jogador diz que vai jogar. O teste da
 * semana completa fixa a decisão de gravar os 7 dias sempre, inclusive os não
 * escolhidos — ausência de linha seria ambígua entre "não joga" e "não
 * respondeu", e a sequência (streak) precisa dessa diferença.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('schedulesRepository', opcoes, () => {
  let banco;

  before(async () => {
    banco = await criarBancoDeTeste();
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function jogador(sufixo) {
    return usersRepository.criar({
      email: `agenda-${sufixo}@beever.dev`,
      apelido: `agenda-${sufixo}`,
      dataNasc: '2014-12-01',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
  }

  it('marca um dia e o devolve como disponível', async () => {
    const idUsuario = await jogador('um-dia');

    await emTransacao((c) => schedulesRepository.definirDia(c, { idUsuario, diaSemana: 3, disponivel: true }));

    assert.deepEqual(await schedulesRepository.diasDisponiveis(idUsuario), [3]);
  });

  it('remarcar o mesmo dia corrige a linha em vez de estourar', async () => {
    const idUsuario = await jogador('remarcar');

    await emTransacao(async (c) => {
      await schedulesRepository.definirDia(c, { idUsuario, diaSemana: 2, disponivel: true });
      await schedulesRepository.definirDia(c, { idUsuario, diaSemana: 2, disponivel: false });
    });

    assert.deepEqual(await schedulesRepository.diasDisponiveis(idUsuario), []);
    assert.equal((await schedulesRepository.listarPorUsuario(idUsuario)).length, 1, 'continua sendo uma linha só');
  });

  it('a semana grava os 7 dias, marcando só os escolhidos', async () => {
    const idUsuario = await jogador('semana');

    const escolhidos = await emTransacao((c) => schedulesRepository.definirSemana(c, idUsuario, [1, 3, 5]));

    assert.equal(escolhidos, 3);
    const semana = await schedulesRepository.listarPorUsuario(idUsuario);
    assert.equal(semana.length, 7, 'o dia não escolhido também vira linha, com is_available = 0');
    assert.deepEqual(
      semana.map((dia) => Number(dia.weekday)),
      [0, 1, 2, 3, 4, 5, 6],
    );
    assert.deepEqual(await schedulesRepository.diasDisponiveis(idUsuario), [1, 3, 5]);
  });

  it('regravar a semana troca a escolha sem duplicar linha', async () => {
    const idUsuario = await jogador('regravar');

    await emTransacao((c) => schedulesRepository.definirSemana(c, idUsuario, [0, 6]));
    await emTransacao((c) => schedulesRepository.definirSemana(c, idUsuario, [2]));

    assert.equal((await schedulesRepository.listarPorUsuario(idUsuario)).length, 7);
    assert.deepEqual(await schedulesRepository.diasDisponiveis(idUsuario), [2]);
  });

  it('dia fora de 0–6 é recusado pelo banco', async () => {
    const idUsuario = await jogador('dia-invalido');

    await assert.rejects(
      emTransacao((c) => schedulesRepository.definirDia(c, { idUsuario, diaSemana: 9, disponivel: true })),
      /ck_schedules_weekday/,
    );
  });

  it('a agenda some junto com a conta', async () => {
    const idUsuario = await jogador('cascata');
    await emTransacao((c) => schedulesRepository.definirSemana(c, idUsuario, [1, 2]));

    await usersRepository.removerPorIds([idUsuario]);

    assert.equal((await schedulesRepository.listarPorUsuario(idUsuario)).length, 0);
  });
});
