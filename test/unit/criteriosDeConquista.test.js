import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CRITERIOS,
  conquistasAlcancadas,
  ehCriterioConhecido,
  exigirCriterioConhecido,
  proximaConquista,
} from '../../src/services/criteriosDeConquista.js';

/**
 * A regra que decide o que um número destrava (T-13.1), sem banco.
 *
 * O caso que mais importa é o do degrau pulado: até aqui o marco de sequência
 * comparava igualdade, então quem ia de seis para oito dias numa virada de fuso
 * perdia o marco de sete para sempre.
 */

const ESCADA = [
  { id: 1, slug: 'favo-1', criterion_target: 1 },
  { id: 2, slug: 'favo-3', criterion_target: 3 },
  { id: 3, slug: 'favo-6', criterion_target: 6 },
];

describe('vocabulário dos critérios', () => {
  it('as cinco famílias da RF-GAM-01 existem', () => {
    assert.deepEqual(Object.keys(CRITERIOS), [
      'sequencia-dias',
      'favos-concluidos',
      'celulas-concluidas',
      'patrimonio-total',
      'cofre-guardado',
    ]);
  });

  it('critério inventado é recusado', () => {
    assert.equal(ehCriterioConhecido('sequencia-dias'), true);
    assert.equal(ehCriterioConhecido('mel-gasto-em-doces'), false);
    assert.throws(() => exigirCriterioConhecido('mel-gasto-em-doces'), /desconhecido/);
  });
});

describe('conquistas que um número alcança', () => {
  it('o valor exato do alvo já conta', () => {
    assert.deepEqual(
      conquistasAlcancadas(ESCADA, 3).map((conquista) => conquista.slug),
      ['favo-1', 'favo-3'],
    );
  });

  it('pular degraus destrava todos os que ficaram para trás', () => {
    assert.deepEqual(
      conquistasAlcancadas(ESCADA, 10).map((conquista) => conquista.slug),
      ['favo-1', 'favo-3', 'favo-6'],
      'quem chega a dez de uma vez merece os degraus que passou',
    );
  });

  it('abaixo do primeiro degrau não destrava nada', () => {
    assert.deepEqual(conquistasAlcancadas(ESCADA, 0), []);
  });

  it('valor que não é número não destrava nada', () => {
    assert.deepEqual(conquistasAlcancadas(ESCADA, undefined), []);
    assert.deepEqual(conquistasAlcancadas(ESCADA, 'seis'), []);
  });
});

describe('próxima conquista da escada', () => {
  it('diz qual é e quanto falta', () => {
    const proxima = proximaConquista(ESCADA, 4);

    assert.equal(proxima.conquista.slug, 'favo-6');
    assert.equal(proxima.falta, 2);
  });

  it('no topo da escada não há próxima', () => {
    assert.equal(proximaConquista(ESCADA, 6), null);
  });
});
