import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { lerCorpoJson, slugDoTitulo } from '../../src/services/adminContentService.js';

/**
 * As duas partes do cadastro de conteúdo que não precisam de banco: a montagem
 * do endereço a partir do título e a leitura do JSON colado no formulário.
 */

describe('slug do favo', () => {
  it('tira acento, maiúscula e pontuação', () => {
    assert.equal(slugDoTitulo('Guardar é Gastar!'), 'guardar-e-gastar');
    assert.equal(slugDoTitulo('Primeiros passos'), 'primeiros-passos');
  });

  it('não deixa hífen sobrando nas pontas', () => {
    assert.equal(slugDoTitulo('  Juros?  '), 'juros');
    assert.equal(slugDoTitulo('--- mesada ---'), 'mesada');
  });

  it('cabe na coluna, que tem 60 caracteres', () => {
    assert.ok(slugDoTitulo('a'.repeat(120)).length <= 60);
  });

  it('título vazio não vira slug', () => {
    assert.equal(slugDoTitulo(''), '');
    assert.equal(slugDoTitulo(null), '');
  });
});

describe('leitura do conteúdo colado', () => {
  it('devolve o objeto quando o JSON está inteiro', () => {
    assert.deepEqual(lerCorpoJson('{"tipo":"quiz","perguntas":[]}'), { tipo: 'quiz', perguntas: [] });
  });

  it('recusa com 422 o que nem JSON é', () => {
    assert.throws(() => lerCorpoJson('{ isto não é json'), (erro) => {
      assert.equal(erro.status, 422);
      assert.match(erro.message, /JSON válido/);
      return true;
    });
  });
});
