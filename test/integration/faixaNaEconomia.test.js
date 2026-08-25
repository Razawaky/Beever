import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import * as inventoryRepository from '../../src/repositories/inventoryRepository.js';
import * as itemsRepository from '../../src/repositories/itemsRepository.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';
import * as walletsRepository from '../../src/repositories/walletsRepository.js';
import * as coinsService from '../../src/services/coinsService.js';
import * as economicCycleService from '../../src/services/economicCycleService.js';
import * as profilesService from '../../src/services/profilesService.js';
import * as shopService from '../../src/services/shopService.js';

/**
 * A faixa etária dentro da economia (RN-038).
 *
 * O que estes testes protegem: a criança de 6 a 8 anos só vê ganho — o item não
 * perde valor, não cobra nada por semana e nunca é vendido à força —, enquanto
 * a Faixa C continua vivendo a regra inteira. Valorização e renda passiva
 * continuam pagando nas duas.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const SENHA_FALSA = '$2b$10$hashfalsoparatestes000000000000000000000000000000000000';
const MILISSEGUNDOS_POR_SEMANA = 7 * 86400000;

describe('faixa etária na economia', opcoes, () => {
  let banco;
  let moto;
  let terreno;
  let barraquinha;

  before(async () => {
    banco = await criarBancoDeTeste();
    moto = await itemsRepository.buscarPorSlug('moto');
    terreno = await itemsRepository.buscarPorSlug('terreno');
    barraquinha = await itemsRepository.buscarPorSlug('barraquinha-de-limonada');
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  function daquiASemanas(semanas) {
    return new Date(Date.now() + semanas * MILISSEGUNDOS_POR_SEMANA);
  }

  async function criarJogador(apelido, faixa, mel) {
    const idUsuario = await usersRepository.criar({
      email: `${apelido}@beever.dev`,
      apelido,
      dataNasc: '2014-04-02',
      senhaHash: SENHA_FALSA,
    });
    const idPerfil = await profilesRepository.criar({ idUsuario });
    await profilesRepository.atualizar(idPerfil, { faixaEtaria: faixa });
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

  it('a Faixa A desliga custo fixo, depreciação e inadimplência; a C mantém tudo', async () => {
    const regrasDaA = await profilesService.regrasEconomicasDoUsuario(
      await criarJogador('faixa-regras-a', 'A', 0),
    );
    const regrasDaC = await profilesService.regrasEconomicasDoUsuario(
      await criarJogador('faixa-regras-c', 'C', 0),
    );

    assert.deepEqual(regrasDaA, { faixa: 'A', custoFixo: false, depreciacao: false, inadimplencia: false });
    assert.deepEqual(regrasDaC, { faixa: 'C', custoFixo: true, depreciacao: true, inadimplencia: true });
  });

  it('o mesmo item deprecia e cobra na Faixa C, e não faz nenhum dos dois na A', async () => {
    const idDaCrianca = await criarJogador('faixa-moto-a', 'A', 1000);
    const idDoJovem = await criarJogador('faixa-moto-c', 'C', 1000);
    const motoDaCrianca = await darItem(idDaCrianca, moto);
    const motoDoJovem = await darItem(idDoJovem, moto);

    await economicCycleService.processarPendentes(idDaCrianca, daquiASemanas(1));
    await economicCycleService.processarPendentes(idDoJovem, daquiASemanas(1));

    const unidadeDaCrianca = await inventoryRepository.buscarPorId(motoDaCrianca);
    const unidadeDoJovem = await inventoryRepository.buscarPorId(motoDoJovem);

    assert.equal(Number(unidadeDaCrianca.current_value), Number(moto.price), 'na Faixa A o valor não cai');
    assert.ok(Number(unidadeDoJovem.current_value) < Number(moto.price), 'na Faixa C a moto deprecia');
    assert.equal(await melDe(idDaCrianca), 1000, 'na Faixa A nada é cobrado');
    assert.equal(await melDe(idDoJovem), 1000 - Number(moto.upkeep_cost));
  });

  it('sem mel, a Faixa A não fica inadimplente nem perde o item', async () => {
    const idUsuario = await criarJogador('faixa-sem-mel', 'A', 0);
    const idDaMoto = await darItem(idUsuario, moto);

    const [primeiro] = await economicCycleService.processarPendentes(idUsuario, daquiASemanas(1));
    await economicCycleService.processarPendentes(idUsuario, daquiASemanas(2));
    await economicCycleService.processarPendentes(idUsuario, daquiASemanas(3));

    const unidade = await inventoryRepository.buscarPorId(idDaMoto);
    assert.equal(unidade.status, 'ativo');
    assert.equal(Number(unidade.overdue_cycles), 0);
    assert.deepEqual(primeiro.inadimplentes, []);
    assert.deepEqual(primeiro.vendidos, []);
  });

  it('valorização e renda passiva continuam pagando na Faixa A', async () => {
    const idUsuario = await criarJogador('faixa-ganho', 'A', 0);
    const idDoTerreno = await darItem(idUsuario, terreno);
    await darItem(idUsuario, barraquinha);

    const [resumo] = await economicCycleService.processarPendentes(idUsuario, daquiASemanas(1));

    const unidade = await inventoryRepository.buscarPorId(idDoTerreno);
    assert.ok(Number(unidade.current_value) > Number(terreno.price), 'o terreno valoriza igual');
    assert.equal(await melDe(idUsuario), Number(barraquinha.income_per_cycle));
    assert.equal(resumo.depreciacao, 0);
    assert.ok(resumo.valorizacao > 0);
  });

  it('quem já devia e passou para uma faixa sem custo é regularizado no ciclo', async () => {
    const idUsuario = await criarJogador('faixa-perdao', 'C', 0);
    const idDaMoto = await darItem(idUsuario, moto);
    await economicCycleService.processarPendentes(idUsuario, daquiASemanas(1));

    const devendo = await inventoryRepository.buscarPorId(idDaMoto);
    assert.equal(devendo.status, 'inadimplente');

    const perfil = await profilesRepository.buscarPorUsuario(idUsuario);
    await profilesRepository.atualizar(perfil.id, { faixaEtaria: 'A' });
    await economicCycleService.processarPendentes(idUsuario, daquiASemanas(2));

    const unidade = await inventoryRepository.buscarPorId(idDaMoto);
    assert.equal(unidade.status, 'ativo', 'a dívida era da regra antiga');
    assert.equal(Number(unidade.overdue_cycles), 0);
  });

  it('a loja mostra o item para a Faixa A com custo zero e a frase que explica', async () => {
    const idUsuario = await criarJogador('faixa-loja', 'A', 5000);

    const vitrine = await shopService.listarVitrine(idUsuario);
    const naVitrine = vitrine.itens.find((item) => item.slug === 'moto');
    const previa = await shopService.previaDaCompra(idUsuario, moto.id);

    assert.ok(naVitrine, 'o catálogo é o mesmo para todas as faixas');
    assert.equal(naVitrine.custoSemanal, 0);
    assert.equal(naVitrine.perdeValor, false);
    assert.ok(naVitrine.avisoDaFaixa, 'a diferença aparece como cuidado, não como bloqueio');
    assert.equal(previa.custoSemanal, 0);
    assert.equal(previa.perdeValor, false);
  });

  it('a loja da Faixa C continua dizendo o custo de verdade', async () => {
    const idUsuario = await criarJogador('faixa-loja-c', 'C', 5000);

    const previa = await shopService.previaDaCompra(idUsuario, moto.id);

    assert.equal(previa.custoSemanal, Number(moto.upkeep_cost));
    assert.equal(previa.perdeValor, true);
    assert.equal(previa.avisoDaFaixa, null);
  });
});
