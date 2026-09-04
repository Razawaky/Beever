import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as goalPlannerService from '../../src/services/goalPlannerService.js';

/**
 * A régua do planejador, sem banco.
 *
 * As duas funções testadas aqui são o miolo da RN-014 e do dimensionamento de
 * alvo: qual linha da tabela atende cada quantidade de dias, e que alvo sai
 * disso. Elas são puras de propósito — recebem as regras como argumento em vez
 * de ir buscá-las — justamente para que a regra do jogo possa ser conferida sem
 * MySQL no ar, caso a caso, incluindo as bordas que ninguém testa à mão.
 */

// As três linhas da RN-014, como o seed as grava.
const REGRAS = [
  { min_weekdays: 1, max_weekdays: 2, active_goals: 1, difficulty: 'alta', default_days: 28 },
  { min_weekdays: 3, max_weekdays: 4, active_goals: 2, difficulty: 'media', default_days: 14 },
  { min_weekdays: 5, max_weekdays: 7, active_goals: 3, difficulty: 'simples', default_days: 7 },
];

const MEL = { base_per_session: 25, min_increment: 50, max_increment: 500, rounding_step: 25 };
const NIVEL = { base_per_session: 0.1, min_increment: 1, max_increment: 1, rounding_step: 1 };

describe('goalPlannerService — a tabela da RN-014', () => {
  it('dá 1 meta de 28 dias a quem joga 1 ou 2 dias por semana', () => {
    for (const dias of [1, 2]) {
      const plano = goalPlannerService.escolherPlano(REGRAS, dias);
      assert.equal(plano.active_goals, 1);
      assert.equal(plano.difficulty, 'alta');
      assert.equal(plano.default_days, 28);
    }
  });

  it('dá 2 metas de 14 dias a quem joga 3 ou 4 dias', () => {
    for (const dias of [3, 4]) {
      const plano = goalPlannerService.escolherPlano(REGRAS, dias);
      assert.equal(plano.active_goals, 2);
      assert.equal(plano.difficulty, 'media');
    }
  });

  it('dá 3 metas de 7 dias a quem joga de 5 a 7 dias', () => {
    for (const dias of [5, 6, 7]) {
      const plano = goalPlannerService.escolherPlano(REGRAS, dias);
      assert.equal(plano.active_goals, 3);
      assert.equal(plano.difficulty, 'simples');
      assert.equal(plano.default_days, 7);
    }
  });

  /**
   * Semana vazia não tem plano, e é assim de propósito: a RF-ONB-03 exige pelo
   * menos um dia marcado, então zero dias é erro de preenchimento e não um
   * ritmo de jogo. Oito dias na semana não existe.
   */
  it('não inventa plano para zero dias nem para além da semana', () => {
    assert.equal(goalPlannerService.escolherPlano(REGRAS, 0), null);
    assert.equal(goalPlannerService.escolherPlano(REGRAS, 8), null);
  });
});

describe('goalPlannerService — o tamanho do alvo', () => {
  /**
   * O alvo é dimensionado pelo tempo que o jogador disse ter, e é **absoluto**:
   * "chegue a 200 de mel", somado ao que ele já tem. Dois dias por semana,
   * sessão de 10 minutos e prazo de 28 dias dão oito sessões no período.
   */
  it('soma ao saldo de hoje o que cabe no prazo do jogador', () => {
    const alvo = goalPlannerService.calcularAlvo({
      regraDeAlvo: MEL,
      valorAtual: 0,
      dias: 2,
      minutosPorSessao: 10,
      diasDePrazo: 28,
    });
    assert.equal(alvo, 200);
  });

  it('parte do valor que o jogador já tem, para a meta não nascer cumprida', () => {
    const alvo = goalPlannerService.calcularAlvo({
      regraDeAlvo: MEL,
      valorAtual: 120,
      dias: 6,
      minutosPorSessao: 20,
      diasDePrazo: 7,
    });
    // 6 sessões de 20 minutos em uma semana: 25 × 2 × 6 = 300, acima dos 120.
    assert.equal(alvo, 420);
  });

  // Número redondo é número que criança lê: 62,5 vira 75, não 62.
  it('arredonda o alvo para o passo da régua', () => {
    const alvo = goalPlannerService.calcularAlvo({
      regraDeAlvo: MEL,
      valorAtual: 0,
      dias: 5,
      minutosPorSessao: 5,
      diasDePrazo: 7,
    });
    assert.equal(alvo % 25, 0);
    assert.equal(alvo, 75);
  });

  /**
   * Piso e teto existem para o desafio ficar na faixa em que a criança ainda
   * vence: quem joga pouquíssimo não recebe meta insignificante, e quem marcou
   * a semana inteira em sessões longas não recebe uma meta impossível.
   */
  it('respeita o piso e o teto da régua', () => {
    const minimo = goalPlannerService.calcularAlvo({
      regraDeAlvo: MEL,
      valorAtual: 0,
      dias: 1,
      minutosPorSessao: 5,
      diasDePrazo: 7,
    });
    assert.equal(minimo, 50, 'abaixo do piso, o alvo é o piso');

    const maximo = goalPlannerService.calcularAlvo({
      regraDeAlvo: MEL,
      valorAtual: 0,
      dias: 7,
      minutosPorSessao: 45,
      diasDePrazo: 28,
    });
    assert.equal(maximo, 500, 'acima do teto, o alvo é o teto');
  });

  /**
   * Quando a faixa pede mais metas do que há tipos mensuráveis — hoje três
   * metas para dois tipos —, o tipo se repete. A repetição escala o alvo para
   * que a segunda meta não seja cópia da primeira.
   */
  it('escala o alvo quando o mesmo tipo se repete no plano', () => {
    const primeira = goalPlannerService.calcularAlvo({
      regraDeAlvo: MEL,
      valorAtual: 0,
      dias: 5,
      minutosPorSessao: 10,
      diasDePrazo: 7,
    });
    const segunda = goalPlannerService.calcularAlvo({
      regraDeAlvo: MEL,
      valorAtual: 0,
      dias: 5,
      minutosPorSessao: 10,
      diasDePrazo: 7,
      repeticao: 2,
    });

    assert.equal(primeira, 125);
    assert.equal(segunda, 250);
  });

  /**
   * O nível pede sempre o degrau seguinte, nunca mais: a curva de XP é lenta no
   * começo, e "suba três níveis nesta semana" seria impossível por construção.
   * Nem a semana cheia em sessões longas muda isso.
   */
  it('mantém a meta de nível em um degrau de cada vez', () => {
    assert.equal(
      goalPlannerService.calcularAlvo({
        regraDeAlvo: NIVEL,
        valorAtual: 5,
        dias: 3,
        minutosPorSessao: 10,
        diasDePrazo: 14,
      }),
      6,
    );

    assert.equal(
      goalPlannerService.calcularAlvo({
        regraDeAlvo: NIVEL,
        valorAtual: 5,
        dias: 7,
        minutosPorSessao: 45,
        diasDePrazo: 28,
      }),
      6,
      'nem a semana cheia em sessões longas pede mais de um nível',
    );
  });
});
