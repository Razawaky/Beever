import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { projetar, semanasParaAlcancar } from '../../src/services/vaultService.js';

/**
 * A projeção da RF-COF-04 é conta pura, então roda sem banco.
 *
 * O que estes casos fixam é a ordem: o rendimento vem antes do depósito da
 * semana, porque mel que acabou de chegar ainda não rendeu. Trocar a ordem
 * pagaria juros sobre dinheiro que nem entrou.
 */

describe('projeção do cofre', () => {
  it('sem depósito e sem taxa, o saldo fica parado', () => {
    const linhas = projetar({ saldo: 100, porSemana: 0, semanas: 3, taxaPercentual: 0 });

    assert.deepEqual(
      linhas.map((linha) => linha.total),
      [100, 100, 100],
    );
  });

  it('a 2% por semana, o rendimento compõe sobre o total anterior', () => {
    const linhas = projetar({ saldo: 1000, porSemana: 0, semanas: 3, taxaPercentual: 2 });

    // 1000 -> 1020 -> 1040 (1040,4 truncado) -> 1060 (1060,8 truncado).
    assert.deepEqual(
      linhas.map((linha) => linha.total),
      [1020, 1040, 1060],
    );
  });

  it('o depósito da semana entra depois do rendimento', () => {
    const linhas = projetar({ saldo: 100, porSemana: 50, semanas: 2, taxaPercentual: 10 });

    // 100 rende 10 e recebe 50 = 160; 160 rende 16 e recebe 50 = 226.
    assert.deepEqual(
      linhas.map((linha) => linha.total),
      [160, 226],
    );
  });

  it('o mel é inteiro: fração de rendimento é truncada para baixo', () => {
    const linhas = projetar({ saldo: 10, porSemana: 0, semanas: 1, taxaPercentual: 2 });

    assert.equal(linhas[0].total, 10, '2% de 10 dá 0,2 e não vira mel');
  });

  it('quem já tem o alvo chega em zero semanas', () => {
    assert.equal(semanasParaAlcancar({ saldo: 500, porSemana: 10, alvo: 500, taxaPercentual: 2 }), 0);
  });

  it('guardando por semana, diz em quantas semanas o alvo chega', () => {
    assert.equal(semanasParaAlcancar({ saldo: 0, porSemana: 100, alvo: 300, taxaPercentual: 0 }), 3);
  });

  it('sem depósito e sem taxa, o alvo nunca chega e a resposta é nula', () => {
    assert.equal(semanasParaAlcancar({ saldo: 10, porSemana: 0, alvo: 1000, taxaPercentual: 0 }), null);
  });
});
