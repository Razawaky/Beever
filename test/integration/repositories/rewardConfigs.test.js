import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../../helpers/banco.js';
import { fecharPool } from '../../../src/config/database.js';
import * as rewardConfigsRepository from '../../../src/repositories/rewardConfigsRepository.js';

/**
 * `rewardConfigsRepository` contra banco real — quanto vale cada recompensa.
 *
 * O que estes testes protegem: a RN-006, que proíbe valor de recompensa no
 * código. Se a tabela ficar vazia ou uma combinação sumir do seed, a E06 passa
 * a pagar zero em silêncio — e é o repository que precisa denunciar isso.
 *
 * A escala do seed é base por estrela (10/20/35 de XP) multiplicada pela faixa
 * (A ×1,0 · B ×1,2 · C ×1,5), então os números conferidos aqui são os mesmos
 * de `04_reward_configs.sql`.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const XP_BASE_POR_ESTRELA = { 1: 10, 2: 20, 3: 35 };
const FATOR_DA_FAIXA = { A: 1.0, B: 1.2, C: 1.5 };

describe('rewardConfigsRepository', opcoes, () => {
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

  it('acha a configuração por slug do jogo, código da faixa e estrelas', async () => {
    const configuracao = await rewardConfigsRepository.buscarConfiguracao({
      slugDoTipoDeJogo: 'quiz-do-favo',
      codigoDaFaixa: 'A',
      estrelas: 3,
    });

    assert.ok(configuracao, 'o seed deveria ter configuração de quiz na faixa A');
    assert.equal(configuracao.stars, 3);
    assert.equal(configuracao.xp_amount, XP_BASE_POR_ESTRELA[3]);
    assert.equal(configuracao.game_type_slug, 'quiz-do-favo');
    assert.equal(configuracao.age_band_code, 'A');
  });

  it('cobre as três faixas e as três estrelas de todo tipo de jogo ativo', async () => {
    const [tiposDeJogo] = await conexao.query('SELECT slug FROM game_types');

    for (const { slug } of tiposDeJogo) {
      for (const faixa of ['A', 'B', 'C']) {
        for (const estrelas of [1, 2, 3]) {
          const configuracao = await rewardConfigsRepository.buscarConfiguracao({
            slugDoTipoDeJogo: slug,
            codigoDaFaixa: faixa,
            estrelas,
          });

          assert.ok(configuracao, `faltou configuração de ${slug} / faixa ${faixa} / ${estrelas} estrelas`);
          assert.equal(
            configuracao.xp_amount,
            Math.round(XP_BASE_POR_ESTRELA[estrelas] * FATOR_DA_FAIXA[faixa]),
          );
          assert.ok(configuracao.coins_amount >= 0, 'mel de recompensa nunca é negativo (RN-004)');
        }
      }
    }
  });

  it('paga mais na faixa mais avançada, com as mesmas estrelas', async () => {
    const infantil = await rewardConfigsRepository.buscarConfiguracao({
      slugDoTipoDeJogo: 'quiz-do-favo',
      codigoDaFaixa: 'A',
      estrelas: 3,
    });
    const avancada = await rewardConfigsRepository.buscarConfiguracao({
      slugDoTipoDeJogo: 'quiz-do-favo',
      codigoDaFaixa: 'C',
      estrelas: 3,
    });

    assert.ok(avancada.xp_amount > infantil.xp_amount);
    assert.ok(Number(avancada.coins_amount) > Number(infantil.coins_amount));
  });

  it('devolve null para combinação que não existe, em vez de estourar', async () => {
    const jogoInexistente = await rewardConfigsRepository.buscarConfiguracao({
      slugDoTipoDeJogo: 'jogo-que-nao-existe',
      codigoDaFaixa: 'A',
      estrelas: 1,
    });
    const estrelaInexistente = await rewardConfigsRepository.buscarConfiguracao({
      slugDoTipoDeJogo: 'quiz-do-favo',
      codigoDaFaixa: 'A',
      estrelas: 4,
    });

    assert.equal(jogoInexistente, null);
    assert.equal(estrelaInexistente, null);
  });

  it('traz o corte da repetição da RN-008 como número, e não como texto', async () => {
    const modificador = await rewardConfigsRepository.buscarModificador(
      rewardConfigsRepository.REPETICAO_DE_CELULA,
    );

    assert.ok(modificador, 'o seed deveria ter o modificador da repetição');
    assert.equal(modificador.xp_factor, 0.25, 'repetir paga 25% do XP');
    assert.equal(modificador.coins_factor, 0, 'repetir não paga mel');
    assert.equal(modificador.points_factor, 0, 'repetir não paga pólen');
  });

  it('devolve null para modificador desconhecido', async () => {
    assert.equal(await rewardConfigsRepository.buscarModificador('nao-existe'), null);
  });

  it('lê pela conexão da transação quando recebe uma', async () => {
    await conexao.beginTransaction();
    try {
      await conexao.execute('UPDATE reward_modifiers SET xp_factor = 0.500 WHERE slug = ?', [
        rewardConfigsRepository.REPETICAO_DE_CELULA,
      ]);

      const dentro = await rewardConfigsRepository.buscarModificador(
        rewardConfigsRepository.REPETICAO_DE_CELULA,
        conexao,
      );
      assert.equal(dentro.xp_factor, 0.5);
    } finally {
      await conexao.rollback();
    }
  });
});
