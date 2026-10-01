import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { comportamentosDosNumeros } from '../../src/services/comportamentosDoItem.js';

/**
 * A derivação do comportamento econômico (RN-034 e RN-035), que saiu de dentro
 * do seed na T-12.3 e passou a ser a regra que o painel e o `db:seed` dividem.
 *
 * Sem banco de propósito: é conta pura, e é justamente por ser pura que ela pode
 * ser a única fonte de verdade dos dois lados.
 */

describe('comportamento econômico derivado dos números', () => {
  it('taxa positiva valoriza e taxa negativa deprecia', () => {
    assert.deepEqual(comportamentosDosNumeros({ taxaDeValorizacao: 0.02, custoFixo: 0, rendaPorCiclo: 0 }), [
      'valoriza',
    ]);
    assert.deepEqual(comportamentosDosNumeros({ taxaDeValorizacao: -0.01, custoFixo: 0, rendaPorCiclo: 0 }), [
      'deprecia',
    ]);
  });

  it('o carro é os dois de uma vez: deprecia e cobra custo fixo', () => {
    assert.deepEqual(comportamentosDosNumeros({ taxaDeValorizacao: -0.03, custoFixo: 5, rendaPorCiclo: 0 }), [
      'deprecia',
      'custo_fixo',
    ]);
  });

  it('renda por ciclo entra junto do resto', () => {
    assert.deepEqual(comportamentosDosNumeros({ taxaDeValorizacao: 0.01, custoFixo: 2, rendaPorCiclo: 8 }), [
      'valoriza',
      'custo_fixo',
      'gera_renda',
    ]);
  });

  it('sem nenhum efeito, o item é neutro — e neutro nunca vem acompanhado', () => {
    assert.deepEqual(comportamentosDosNumeros({ taxaDeValorizacao: 0, custoFixo: 0, rendaPorCiclo: 0 }), [
      'neutro',
    ]);
  });
});
