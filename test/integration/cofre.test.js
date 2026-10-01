import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';
import * as vaultsRepository from '../../src/repositories/vaultsRepository.js';
import * as walletsRepository from '../../src/repositories/walletsRepository.js';
import * as coinsService from '../../src/services/coinsService.js';
import * as patrimonyService from '../../src/services/patrimonyService.js';
import * as vaultService from '../../src/services/vaultService.js';

/**
 * O cofre contra banco real (RF-COF-01 a 04, RN-042 a 044).
 *
 * O que estes testes protegem: guardar mel não pode criar nem destruir mel — o
 * que sai da carteira entra no cofre, no mesmo instante e pelo mesmo valor —, o
 * saldo do cofre nunca fica negativo, e o rendimento não paga sobre o mel que
 * o jogador já tirou no ciclo (RN-043).
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const SENHA_FALSA = '$2b$10$hashfalsoparatestes000000000000000000000000000000000000';

describe('cofre', opcoes, () => {
  let banco;

  before(async () => {
    banco = await criarBancoDeTeste();
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function criarJogador(apelido, mel) {
    const idUsuario = await usersRepository.criar({
      email: `${apelido}@beever.dev`,
      apelido,
      dataNasc: '2014-04-02',
      senhaHash: SENHA_FALSA,
    });
    const idPerfil = await profilesRepository.criar({ idUsuario });
    await profilesRepository.atualizar(idPerfil, { faixaEtaria: 'C' });
    await walletsRepository.criar(idUsuario);

    if (mel > 0) {
      await emTransacao((conexao) =>
        coinsService.creditar(conexao, idUsuario, mel, { motivo: 'ajuste-administrativo' }),
      );
    }
    return idUsuario;
  }

  async function melDe(idUsuario) {
    return (await coinsService.obterCarteira(idUsuario)).mel;
  }

  it('depositar tira da carteira e põe no cofre, sem mudar o total', async () => {
    const idUsuario = await criarJogador('cofre-deposito', 500);

    const { saldo } = await vaultService.depositar(idUsuario, 200);

    assert.equal(saldo, 200);
    assert.equal(await melDe(idUsuario), 300);

    const extrato = await vaultsRepository.listarTransacoes(idUsuario);
    assert.equal(extrato.length, 1);
    assert.equal(extrato[0].tipo, 'deposito');
    assert.equal(Number(extrato[0].balance_after), 200, 'o extrato guarda o saldo que o cofre viu');
  });

  it('sacar devolve o mel para a carteira e o extrato acompanha', async () => {
    const idUsuario = await criarJogador('cofre-saque', 500);
    await vaultService.depositar(idUsuario, 400);

    const { saldo } = await vaultService.sacar(idUsuario, 150);

    assert.equal(saldo, 250);
    assert.equal(await melDe(idUsuario), 250);

    const extrato = await vaultsRepository.listarTransacoes(idUsuario);
    assert.equal(extrato[0].tipo, 'saque');
    assert.equal(Number(extrato[0].balance_after), 250);
  });

  it('sacar mais do que há é recusado e não deixa rastro', async () => {
    const idUsuario = await criarJogador('cofre-saque-alto', 300);
    await vaultService.depositar(idUsuario, 100);

    await assert.rejects(
      () => vaultService.sacar(idUsuario, 101),
      (erro) => erro.codigo === 'COFRE_INSUFICIENTE',
    );

    assert.equal(await melDe(idUsuario), 200, 'a carteira não recebe nada');
    assert.equal(Number((await vaultsRepository.buscarPorUsuario(idUsuario)).balance), 100);
    assert.equal((await vaultsRepository.listarTransacoes(idUsuario)).length, 1, 'só o depósito no extrato');
  });

  it('depositar mais do que a carteira tem é recusado', async () => {
    const idUsuario = await criarJogador('cofre-sem-mel', 50);

    await assert.rejects(
      () => vaultService.depositar(idUsuario, 51),
      (erro) => erro.codigo === 'MEL_INSUFICIENTE',
    );

    assert.equal(await melDe(idUsuario), 50);
    assert.equal(await vaultsRepository.buscarPorUsuario(idUsuario), null, 'nada é criado numa recusa');
  });

  it('o rendimento do ciclo paga 2% e entra no extrato (RN-042)', async () => {
    const idUsuario = await criarJogador('cofre-rendimento', 2000);
    await vaultService.depositar(idUsuario, 1000);

    const resultado = await emTransacao((conexao) =>
      vaultService.aplicarRendimento(conexao, idUsuario, { desde: null }),
    );

    assert.equal(resultado.rendimento, 20, '2% de 1000');
    assert.equal(resultado.saldo, 1020);

    const extrato = await vaultsRepository.listarTransacoes(idUsuario);
    assert.equal(extrato[0].tipo, 'rendimento');
    assert.equal(Number(extrato[0].balance_after), 1020);
  });

  it('o mel sacado no ciclo não rende naquele ciclo (RN-043)', async () => {
    const idUsuario = await criarJogador('cofre-saque-no-ciclo', 2000);
    await vaultService.depositar(idUsuario, 1000);

    const inicioDoCiclo = new Date();
    await vaultService.sacar(idUsuario, 500);

    const resultado = await emTransacao((conexao) =>
      vaultService.aplicarRendimento(conexao, idUsuario, { desde: inicioDoCiclo }),
    );

    // Sobraram 500 no cofre, mas os 500 sacados também não rendem: a base é
    // 500 - 500 = 0.
    assert.equal(resultado.rendimento, 0, 'quem tirou tudo no ciclo não recebe rendimento');
    assert.equal(resultado.saldo, 500);
  });

  it('bater a meta paga o bônus uma vez só e libera a próxima (RN-044)', async () => {
    const idUsuario = await criarJogador('cofre-meta', 1000);
    await vaultService.definirMeta(idUsuario, { valor: 500 });

    const primeiro = await vaultService.depositar(idUsuario, 400);
    assert.equal(primeiro.meta, null, 'ainda não bateu');

    const segundo = await vaultService.depositar(idUsuario, 200);
    assert.equal(segundo.meta.alvo, 500);
    assert.equal(segundo.meta.bonus, 25, '5% de 500');
    assert.equal(segundo.saldo, 625, 'o bônus cai dentro do cofre');

    const cofre = await vaultsRepository.buscarPorUsuario(idUsuario);
    assert.equal(cofre.goal_amount, null, 'a meta batida é limpa');

    const terceiro = await vaultService.depositar(idUsuario, 100);
    assert.equal(terceiro.meta, null, 'sem meta declarada, não paga de novo');
    assert.equal(terceiro.saldo, 725);
  });

  it('o mel guardado continua contando no patrimônio (RN-039)', async () => {
    const idUsuario = await criarJogador('cofre-patrimonio', 800);
    const antes = await patrimonyService.obterDoUsuario(idUsuario);

    await vaultService.depositar(idUsuario, 300);
    const depois = await patrimonyService.obterDoUsuario(idUsuario);

    assert.equal(depois.cofre, 300);
    assert.equal(depois.carteira, 500);
    assert.equal(depois.total, antes.total, 'guardar não muda o quanto o jogador tem');
  });

  it('o resumo traz saldo, meta, extrato e projeção (RF-COF-04)', async () => {
    const idUsuario = await criarJogador('cofre-resumo', 1000);
    await vaultService.depositar(idUsuario, 600);
    await vaultService.definirMeta(idUsuario, { valor: 1000 });

    const resumo = await vaultService.obterDoUsuario(idUsuario, { porSemana: 100, semanas: 4 });

    assert.equal(resumo.saldo, 600);
    assert.equal(resumo.taxaPercentual, 2);
    assert.equal(resumo.meta.valor, 1000);
    assert.equal(resumo.projecao.length, 4);
    assert.ok(resumo.projecao[3].total > resumo.saldo, 'guardar 100 por semana faz o total subir');
    assert.equal(resumo.semanasParaAMeta, 4, 'guardando 100 por semana, a meta chega em 4 semanas');
    assert.equal(resumo.extrato.length, 1);
  });

  it('depositar deixa a linha de auditoria com o antes e o depois (RN-010)', async () => {
    const idUsuario = await criarJogador('cofre-auditoria', 400);
    await vaultService.depositar(idUsuario, 250);

    const [linhas] = await banco.conexao.query(
      `SELECT before_state, after_state FROM audit_logs
        WHERE action = 'cofre.deposito' AND actor_id = ?`,
      [idUsuario],
    );

    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].before_state.mel, 400);
    assert.equal(linhas[0].before_state.cofre, 0);
    assert.equal(linhas[0].after_state.mel, 150);
    assert.equal(linhas[0].after_state.cofre, 250);
  });
});
