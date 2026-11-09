import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { marcarFocoDaTrilha } from '../../src/services/homeService.js';

/**
 * O foco da trilha na Colmeia (RF-HOM-06).
 *
 * O que estes testes protegem: a home destaca o favo em andamento e o seguinte,
 * e não o primeiro da lista nem o último aberto. Os demais continuam na trilha,
 * porque é neles que a criança vê o que ainda vem.
 */

function favo(atributos) {
  return { id: 1, title: 'Favo', aberto: true, concluido: false, ...atributos };
}

describe('foco da trilha', () => {
  it('destaca o favo em andamento e o seguinte', () => {
    const trilha = marcarFocoDaTrilha([
      favo({ id: 1, concluido: true }),
      favo({ id: 2 }),
      favo({ id: 3, aberto: false }),
      favo({ id: 4, aberto: false }),
    ]);

    assert.deepEqual(
      trilha.map((linha) => linha.emFoco),
      [false, true, true, false],
    );
  });

  it('favo concluído não rouba o foco de quem está em andamento', () => {
    const trilha = marcarFocoDaTrilha([favo({ id: 1, concluido: true }), favo({ id: 2, concluido: true }), favo({ id: 3 })]);

    assert.equal(trilha[0].emFoco, false);
    assert.equal(trilha[2].emFoco, true);
  });

  it('o último favo em andamento fica em foco sozinho', () => {
    const trilha = marcarFocoDaTrilha([favo({ id: 1, concluido: true }), favo({ id: 2 })]);

    assert.deepEqual(
      trilha.map((linha) => linha.emFoco),
      [false, true],
    );
  });

  it('trilha inteira concluída não põe ninguém em foco', () => {
    const trilha = marcarFocoDaTrilha([favo({ id: 1, concluido: true }), favo({ id: 2, concluido: true })]);

    assert.ok(trilha.every((linha) => linha.emFoco === false));
  });

  it('trilha vazia devolve lista vazia, e não erro', () => {
    assert.deepEqual(marcarFocoDaTrilha([]), []);
  });

  it('não altera o favo original: o estado continua sendo do `contentService`', () => {
    const original = favo({ id: 1 });
    marcarFocoDaTrilha([original]);

    assert.ok(!Object.hasOwn(original, 'emFoco'));
  });
});
