import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../../helpers/banco.js';
import { emTransacao, fecharPool } from '../../../src/config/database.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';
import * as walletsRepository from '../../../src/repositories/walletsRepository.js';

/**
 * `walletsRepository` contra banco real — mel e pólen.
 *
 * A regra que estes testes existem para segurar: **o livro é a verdade, a
 * carteira é cache**. Toda entrada ou saída tem que deixar linha no ledger com
 * o saldo depois, senão o `db:reconcile` acusa divergência — e o teste aqui
 * acusa antes, que é mais barato.
 *
 * O débito sem saldo é o caso que mais dói se passar: mel que sai do nada
 * quebra a economia inteira do jogo.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('walletsRepository', opcoes, () => {
  let banco;
  let conexao;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function jogadorComCarteira(sufixo) {
    const idUsuario = await usersRepository.criar({
      email: `carteira-${sufixo}@beever.dev`,
      apelido: `carteira-${sufixo}`,
      dataNasc: '2013-07-21',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
    await walletsRepository.criar(idUsuario);
    return idUsuario;
  }

  async function linhasDoLivro(tabela, idUsuario) {
    const [linhas] = await conexao.query(
      `SELECT amount, balance_after FROM ${tabela} WHERE user_id = ? ORDER BY id`,
      [idUsuario],
    );
    return linhas;
  }

  it('cria a carteira zerada', async () => {
    const idUsuario = await jogadorComCarteira('nova');
    const carteira = await walletsRepository.buscarPorUsuario(idUsuario);

    assert.equal(Number(carteira.coins), 0);
    assert.equal(Number(carteira.points_total), 0);
  });

  it('credita mel e lança no livro com o saldo depois', async () => {
    const idUsuario = await jogadorComCarteira('credito');

    const saldo = await emTransacao((conexaoTransacao) =>
      walletsRepository.creditarMel(conexaoTransacao, {
        idUsuario,
        quantidade: 50,
        motivo: 'conclusao-tarefa',
      }),
    );

    assert.equal(Number(saldo), 50);
    const livro = await linhasDoLivro('coin_ledger', idUsuario);
    assert.equal(livro.length, 1);
    assert.equal(Number(livro[0].amount), 50);
    assert.equal(Number(livro[0].balance_after), 50, 'o livro tem que registrar o saldo resultante');
  });

  it('debita mel e registra a saída como valor negativo', async () => {
    const idUsuario = await jogadorComCarteira('debito');
    await emTransacao((c) => walletsRepository.creditarMel(c, { idUsuario, quantidade: 100, motivo: 'conclusao-tarefa' }));

    const afetadas = await emTransacao((c) =>
      walletsRepository.debitarMel(c, { idUsuario, quantidade: 30, motivo: 'compra' }),
    );

    assert.equal(afetadas, 1);
    const carteira = await walletsRepository.buscarPorUsuario(idUsuario);
    assert.equal(Number(carteira.coins), 70);

    const livro = await linhasDoLivro('coin_ledger', idUsuario);
    assert.equal(Number(livro.at(-1).amount), -30);
    assert.equal(Number(livro.at(-1).balance_after), 70);
  });

  it('recusa débito sem saldo e não mexe em nada', async () => {
    const idUsuario = await jogadorComCarteira('sem-saldo');
    await emTransacao((c) => walletsRepository.creditarMel(c, { idUsuario, quantidade: 10, motivo: 'conclusao-tarefa' }));

    const afetadas = await emTransacao((c) =>
      walletsRepository.debitarMel(c, { idUsuario, quantidade: 999, motivo: 'compra' }),
    );

    assert.equal(afetadas, 0, 'débito maior que o saldo não pode acontecer');
    const carteira = await walletsRepository.buscarPorUsuario(idUsuario);
    assert.equal(Number(carteira.coins), 10, 'o saldo tem que ficar intacto');

    const livro = await linhasDoLivro('coin_ledger', idUsuario);
    assert.equal(livro.length, 1, 'débito recusado não pode gerar lançamento');
  });

  it('credita pólen no livro próprio, sem tocar no mel', async () => {
    const idUsuario = await jogadorComCarteira('polen');

    const saldo = await emTransacao((c) =>
      walletsRepository.creditarPolen(c, { idUsuario, quantidade: 25, motivo: 'conclusao-celula' }),
    );

    assert.equal(Number(saldo), 25);
    const carteira = await walletsRepository.buscarPorUsuario(idUsuario);
    assert.equal(Number(carteira.points_total), 25);
    assert.equal(Number(carteira.coins), 0, 'pólen e mel são recompensas diferentes e não se misturam');

    assert.equal((await linhasDoLivro('point_ledger', idUsuario)).length, 1);
    assert.equal((await linhasDoLivro('coin_ledger', idUsuario)).length, 0);
  });

  it('o rollback da transação desfaz carteira e livro juntos', async () => {
    const idUsuario = await jogadorComCarteira('rollback');

    await assert.rejects(
      emTransacao(async (c) => {
        await walletsRepository.creditarMel(c, { idUsuario, quantidade: 80, motivo: 'conclusao-tarefa' });
        throw new Error('falha proposital depois do crédito');
      }),
      /falha proposital/,
    );

    const carteira = await walletsRepository.buscarPorUsuario(idUsuario);
    assert.equal(Number(carteira.coins), 0, 'o crédito não pode sobreviver ao rollback');
    assert.equal((await linhasDoLivro('coin_ledger', idUsuario)).length, 0, 'nem o lançamento no livro');
  });

  it('motivo inexistente falha em vez de deixar carteira e livro divergentes', async () => {
    const idUsuario = await jogadorComCarteira('motivo-ruim');

    await assert.rejects(
      emTransacao((c) =>
        walletsRepository.creditarMel(c, { idUsuario, quantidade: 5, motivo: 'motivo-que-nao-existe' }),
      ),
      /Motivo de recompensa desconhecido/,
    );

    const carteira = await walletsRepository.buscarPorUsuario(idUsuario);
    assert.equal(Number(carteira.coins), 0, 'o saldo não pode subir sem o lançamento correspondente');
    assert.equal((await linhasDoLivro('coin_ledger', idUsuario)).length, 0);
  });
});
