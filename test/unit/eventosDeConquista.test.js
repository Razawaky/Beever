import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { criteriosDosEventos, ehEventoConhecido } from '../../src/services/eventosDeConquista.js';

/**
 * O mapa de "o que aconteceu" para "o que avaliar" (T-13.2), sem banco.
 *
 * Existe para que quem provoca o evento não precise conhecer o catálogo: o
 * fechamento da partida diz que concluiu uma célula, e não qual família de
 * conquista procurar.
 */

describe('eventos que movem conquista', () => {
  it('reconhece os quatro eventos que existem', () => {
    for (const evento of ['celula-concluida', 'favo-concluido', 'patrimonio-mudou', 'cofre-mudou']) {
      assert.equal(ehEventoConhecido(evento), true, `${evento} deveria ser conhecido`);
    }
  });

  it('evento inventado não é conhecido', () => {
    assert.equal(ehEventoConhecido('criança-riu'), false);
  });

  it('traduz o evento no critério que ele move', () => {
    assert.deepEqual(criteriosDosEventos(['celula-concluida']), ['celulas-concluidas']);
    assert.deepEqual(criteriosDosEventos(['cofre-mudou']), ['cofre-guardado']);
  });

  it('vários eventos juntos viram a lista dos critérios, sem repetir', () => {
    assert.deepEqual(criteriosDosEventos(['celula-concluida', 'favo-concluido', 'celula-concluida']), [
      'celulas-concluidas',
      'favos-concluidos',
    ]);
  });

  it('evento desconhecido é ignorado em silêncio, e não derruba os outros', () => {
    assert.deepEqual(criteriosDosEventos(['criança-riu', 'cofre-mudou']), ['cofre-guardado']);
  });

  it('sem evento nenhum, não há o que avaliar', () => {
    assert.deepEqual(criteriosDosEventos([]), []);
    assert.deepEqual(criteriosDosEventos(), []);
  });
});
