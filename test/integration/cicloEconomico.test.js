import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import * as economicCyclesRepository from '../../src/repositories/economicCyclesRepository.js';
import * as inventoryRepository from '../../src/repositories/inventoryRepository.js';
import * as itemsRepository from '../../src/repositories/itemsRepository.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';
import * as walletsRepository from '../../src/repositories/walletsRepository.js';
import * as coinsService from '../../src/services/coinsService.js';
import * as economicCycleService from '../../src/services/economicCycleService.js';
import * as vaultService from '../../src/services/vaultService.js';

/**
 * O ciclo econômico contra banco real (RN-036, RN-037, RN-042).
 *
 * O que estes testes protegem: seis semanas fora são seis ciclos aplicados uma
 * única vez, quem não tem mel fica inadimplente em vez de ficar devendo, e o
 * item que passou dois ciclos devendo é vendido por 50% com o mel voltando para
 * a carteira.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const SENHA_FALSA = '$2b$10$hashfalsoparatestes000000000000000000000000000000000000';
const MILISSEGUNDOS_POR_SEMANA = 7 * 86400000;

describe('ciclo econômico', opcoes, () => {
  let banco;
  let terreno;
  let barraquinha;
  let moto;

  before(async () => {
    banco = await criarBancoDeTeste();
    terreno = await itemsRepository.buscarPorSlug('terreno');
    barraquinha = await itemsRepository.buscarPorSlug('barraquinha-de-limonada');
    moto = await itemsRepository.buscarPorSlug('moto');
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  function daquiASemanas(semanas) {
    return new Date(Date.now() + semanas * MILISSEGUNDOS_POR_SEMANA);
  }

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

  async function darItem(idUsuario, item) {
    return emTransacao((conexao) =>
      inventoryRepository.adicionar(conexao, {
        idUsuario,
        idItem: item.id,
        valorInicial: Number(item.price),
      }),
    );
  }

  async function melDe(idUsuario) {
    return (await coinsService.obterCarteira(idUsuario)).mel;
  }

  it('quem acabou de criar a conta não tem ciclo nenhum a processar', async () => {
    const idUsuario = await criarJogador('ciclo-conta-nova', 100);

    const resumos = await economicCycleService.processarPendentes(idUsuario);

    assert.deepEqual(resumos, []);
    assert.equal(await melDe(idUsuario), 100);
  });

  it('seis semanas fora aplicam os ciclos de uma vez, e só uma vez', async () => {
    const idUsuario = await criarJogador('ciclo-seis-semanas', 1000);
    await darItem(idUsuario, barraquinha);
    const agora = daquiASemanas(6);

    const resumos = await economicCycleService.processarPendentes(idUsuario, agora);

    assert.equal(resumos.length, 6, 'seis semanas fora são seis ciclos');
    assert.deepEqual(
      resumos.map((resumo) => resumo.numero),
      [1, 2, 3, 4, 5, 6],
      'os ciclos vêm do mais antigo para o mais novo',
    );
    assert.equal(await melDe(idUsuario), 1000 + 6 * Number(barraquinha.income_per_cycle));

    const repetido = await economicCycleService.processarPendentes(idUsuario, agora);
    assert.deepEqual(repetido, [], 'voltar na mesma semana não roda ciclo de novo');
    assert.equal(await melDe(idUsuario), 1000 + 6 * Number(barraquinha.income_per_cycle));
  });

  it('duas abas ao mesmo tempo não aplicam o ciclo duas vezes', async () => {
    const idUsuario = await criarJogador('ciclo-duas-abas', 500);
    await darItem(idUsuario, barraquinha);
    const agora = daquiASemanas(1);

    const [primeira, segunda] = await Promise.all([
      economicCycleService.processarPendentes(idUsuario, agora),
      economicCycleService.processarPendentes(idUsuario, agora),
    ]);

    assert.equal(primeira.length + segunda.length, 1, 'o ciclo é de quem chegou primeiro');
    assert.equal(await melDe(idUsuario), 500 + Number(barraquinha.income_per_cycle));
  });

  it('o item que valoriza sobe de valor e o que deprecia desce', async () => {
    const idUsuario = await criarJogador('ciclo-valor', 0);
    const idDoTerreno = await darItem(idUsuario, terreno);
    const idDaMoto = await darItem(idUsuario, moto);

    const [resumo] = await economicCycleService.processarPendentes(idUsuario, daquiASemanas(1));

    const terrenoDepois = await inventoryRepository.buscarPorId(idDoTerreno);
    const motoDepois = await inventoryRepository.buscarPorId(idDaMoto);

    assert.ok(Number(terrenoDepois.current_value) > Number(terreno.price), 'o terreno valoriza');
    assert.ok(Number(motoDepois.current_value) < Number(moto.price), 'a moto deprecia');
    assert.ok(resumo.valorizacao > 0);
    assert.ok(resumo.depreciacao > 0);
  });

  it('sem mel para o custo fixo, o item fica inadimplente e a carteira não fica negativa', async () => {
    const idUsuario = await criarJogador('ciclo-inadimplente', 0);
    const idDaMoto = await darItem(idUsuario, moto);

    const [resumo] = await economicCycleService.processarPendentes(idUsuario, daquiASemanas(1));

    const unidade = await inventoryRepository.buscarPorId(idDaMoto);
    assert.equal(unidade.status, 'inadimplente');
    assert.equal(Number(unidade.overdue_cycles), 1);
    assert.equal(await melDe(idUsuario), 0, 'nunca vira dívida negativa');
    assert.deepEqual(resumo.inadimplentes, [moto.name]);
  });

  it('depois de dois ciclos devendo, o item é vendido por 50% e o mel volta', async () => {
    const idUsuario = await criarJogador('ciclo-venda-forcada', 0);
    const idDaMoto = await darItem(idUsuario, moto);

    await economicCycleService.processarPendentes(idUsuario, daquiASemanas(1));
    const [segundoCiclo] = await economicCycleService.processarPendentes(idUsuario, daquiASemanas(2));

    const unidade = await inventoryRepository.buscarPorId(idDaMoto);
    assert.equal(unidade.status, 'vendido');
    assert.equal(segundoCiclo.vendidos.length, 1);
    assert.equal(segundoCiclo.vendidos[0].item, moto.name);
    assert.equal(await melDe(idUsuario), Number(unidade.sold_value), 'o mel da venda forçada volta inteiro');
    assert.ok(Number(unidade.sold_value) > 0);
  });

  it('pagar o custo fixo tira o item da inadimplência', async () => {
    const idUsuario = await criarJogador('ciclo-regularizado', 0);
    const idDaMoto = await darItem(idUsuario, moto);

    await economicCycleService.processarPendentes(idUsuario, daquiASemanas(1));
    await emTransacao((conexao) =>
      coinsService.creditar(conexao, idUsuario, 1000, { motivo: 'ajuste-administrativo' }),
    );
    await economicCycleService.processarPendentes(idUsuario, daquiASemanas(2));

    const unidade = await inventoryRepository.buscarPorId(idDaMoto);
    assert.equal(unidade.status, 'ativo');
    assert.equal(Number(unidade.overdue_cycles), 0);
  });

  it('o cofre rende no ciclo e o extrato guarda quanto rendeu', async () => {
    const idUsuario = await criarJogador('ciclo-cofre', 1000);
    await vaultService.depositar(idUsuario, 1000);

    const [resumo] = await economicCycleService.processarPendentes(idUsuario, daquiASemanas(1));

    assert.equal(resumo.rendimentoDoCofre, 20, 'os 2% da RN-042 sobre mil');
    const cofre = await vaultService.obterDoUsuario(idUsuario);
    assert.equal(cofre.saldo, 1020);
  });

  it('quem some por muito tempo tem os ciclos antigos marcados sem efeito', async () => {
    const idUsuario = await criarJogador('ciclo-teto', 5000);
    await darItem(idUsuario, barraquinha);

    const resumos = await economicCycleService.processarPendentes(idUsuario, daquiASemanas(30));

    assert.equal(resumos.length, 12, 'no máximo doze ciclos são aplicados por visita');
    assert.equal(
      await melDe(idUsuario),
      5000 + 12 * Number(barraquinha.income_per_cycle),
      'os ciclos acima do teto não pagam renda nem cobram nada',
    );

    const ultimo = await economicCyclesRepository.ultimoNumeroProcessado(idUsuario);
    assert.equal(ultimo, 30, 'o calendário não fica devendo ciclo');

    const pulado = await economicCyclesRepository.buscarPorNumero(idUsuario, 1);
    assert.equal(pulado.summary.pulado, true);
  });
});
