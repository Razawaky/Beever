import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../../helpers/banco.js';
import { emTransacao, fecharPool } from '../../../src/config/database.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';
import * as vaultsRepository from '../../../src/repositories/vaultsRepository.js';

/**
 * `vaultsRepository` contra banco real — o cofre e o extrato dele.
 *
 * O que estes testes protegem: o cofre nunca fica negativo, e o extrato nunca
 * discorda do saldo. As duas coisas são conferidas pela própria instrução —
 * saque tem `balance >= ?` no `WHERE`, e `balance_after` é gravado por quem
 * acabou de mexer no saldo, dentro da mesma transação.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const RENDIMENTO_PADRAO = 2;

describe('vaultsRepository', opcoes, () => {
  let banco;

  before(async () => {
    banco = await criarBancoDeTeste();
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function dono(sufixo) {
    return usersRepository.criar({
      email: `cofre-${sufixo}@beever.dev`,
      apelido: `cofre-${sufixo}`,
      dataNasc: '2014-05-05',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
  }

  /** Depósito como o service vai fazer: mexe no saldo e grava o extrato junto. */
  async function depositar(idUsuario, valor) {
    return emTransacao(async (conexao) => {
      const cofre = await vaultsRepository.bloquearPorUsuario(conexao, idUsuario);
      await vaultsRepository.creditar(conexao, idUsuario, valor);

      const saldoDepois = Number(cofre.balance) + valor;
      await vaultsRepository.registrarTransacao(conexao, {
        idUsuario,
        tipo: 'deposito',
        valor,
        saldoDepois,
      });
      return saldoDepois;
    });
  }

  it('o cofre nasce zerado, com a taxa da RN-042', async () => {
    const idUsuario = await dono('novo');

    const cofre = await vaultsRepository.criarSeNaoExistir(idUsuario);

    assert.equal(Number(cofre.balance), 0);
    assert.equal(Number(cofre.interest_rate), RENDIMENTO_PADRAO);
    assert.equal(cofre.goal_amount, null, 'meta de cofre é opcional e começa sem nenhuma');
  });

  it('criar duas vezes não zera o cofre de quem já tem saldo', async () => {
    const idUsuario = await dono('idempotente');
    await vaultsRepository.criarSeNaoExistir(idUsuario);
    await depositar(idUsuario, 150);

    const cofre = await vaultsRepository.criarSeNaoExistir(idUsuario);

    assert.equal(Number(cofre.balance), 150);
  });

  it('o depósito soma no saldo e o extrato guarda o saldo que ficou', async () => {
    const idUsuario = await dono('deposito');
    await vaultsRepository.criarSeNaoExistir(idUsuario);

    await depositar(idUsuario, 200);
    await depositar(idUsuario, 50);

    const cofre = await vaultsRepository.buscarPorUsuario(idUsuario);
    assert.equal(Number(cofre.balance), 250);

    const extrato = await vaultsRepository.listarTransacoes(idUsuario);
    assert.equal(extrato.length, 2);
    assert.equal(extrato[0].tipo, 'deposito');
    assert.equal(Number(extrato[0].balance_after), 250, 'a linha mais nova guarda o saldo final');
    assert.equal(Number(extrato[1].balance_after), 200);
  });

  it('sacar mais do que há no cofre é recusado, e o saldo não se mexe', async () => {
    const idUsuario = await dono('saque-alto');
    await vaultsRepository.criarSeNaoExistir(idUsuario);
    await depositar(idUsuario, 100);

    const afetadas = await emTransacao((conexao) => vaultsRepository.debitar(conexao, idUsuario, 101));

    assert.equal(afetadas, 0, 'saldo insuficiente devolve zero linha, nunca saldo negativo');
    assert.equal(Number((await vaultsRepository.buscarPorUsuario(idUsuario)).balance), 100);
  });

  it('sacar o saldo inteiro é permitido e deixa o cofre no zero', async () => {
    const idUsuario = await dono('saque-total');
    await vaultsRepository.criarSeNaoExistir(idUsuario);
    await depositar(idUsuario, 80);

    const afetadas = await emTransacao((conexao) => vaultsRepository.debitar(conexao, idUsuario, 80));

    assert.equal(afetadas, 1);
    assert.equal(Number((await vaultsRepository.buscarPorUsuario(idUsuario)).balance), 0);
  });

  /**
   * RN-043: o mel sacado não rende no ciclo do saque. Quem vai descontá-lo é o
   * `VaultService`, e para isso precisa saber quanto saiu desde o último ciclo.
   */
  it('soma os saques feitos depois de um instante, e ignora os depósitos', async () => {
    const idUsuario = await dono('saques-do-ciclo');
    await vaultsRepository.criarSeNaoExistir(idUsuario);
    await depositar(idUsuario, 500);

    const marco = new Date();
    await emTransacao(async (conexao) => {
      await vaultsRepository.debitar(conexao, idUsuario, 120);
      await vaultsRepository.registrarTransacao(conexao, {
        idUsuario,
        tipo: 'saque',
        valor: 120,
        saldoDepois: 380,
      });
    });

    const sacado = await vaultsRepository.totalSacadoDesde(idUsuario, marco);
    assert.equal(sacado, 120, 'o depósito anterior não entra na conta do ciclo');
  });

  it('a meta do cofre é definida e apagada pelo mesmo caminho (RN-044)', async () => {
    const idUsuario = await dono('meta');
    await vaultsRepository.criarSeNaoExistir(idUsuario);
    const prazo = new Date('2026-12-25T12:00:00Z');

    await emTransacao((conexao) =>
      vaultsRepository.definirMeta(conexao, idUsuario, { valor: 1000, prazo }),
    );
    const comMeta = await vaultsRepository.buscarPorUsuario(idUsuario);
    assert.equal(Number(comMeta.goal_amount), 1000);
    assert.ok(comMeta.goal_due_at, 'a meta com prazo guarda a data');

    await emTransacao((conexao) => vaultsRepository.definirMeta(conexao, idUsuario));
    const semMeta = await vaultsRepository.buscarPorUsuario(idUsuario);
    assert.equal(semMeta.goal_amount, null);
    assert.equal(semMeta.goal_due_at, null);
  });
});
