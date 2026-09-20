import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { estrelasPara } from '../../src/services/progressService.js';

/**
 * A tabela da RN-030, sem banco. É a regra que decide o que a criança leva de
 * uma partida, e ela cabe num teste de milissegundos.
 */

describe('progressService — estrelas da RN-030', () => {
  it('0 ou 1 erro valem 3 estrelas', () => {
    assert.equal(estrelasPara(0, true), 3);
    assert.equal(estrelasPara(1, true), 3);
  });

  it('2 ou 3 erros valem 2 estrelas', () => {
    assert.equal(estrelasPara(2, true), 2);
    assert.equal(estrelasPara(3, true), 2);
  });

  it('4 erros ou mais ainda valem 1 estrela: errar não bloqueia', () => {
    assert.equal(estrelasPara(4, true), 1);
    assert.equal(estrelasPara(40, true), 1, 'não existe reprovação, só resultado menor');
  });

  it('quem não concluiu fica em zero, com erro nenhum ou com muitos', () => {
    assert.equal(estrelasPara(0, false), 0, 'sair no meio sem errar não conclui a célula');
    assert.equal(estrelasPara(10, false), 0);
  });
});
