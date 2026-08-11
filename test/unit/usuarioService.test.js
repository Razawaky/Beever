import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { senhaValida } from '../../src/services/usuarioService.js';

describe('usuarioService.senhaValida', () => {
  it('aceita senha com 8+ caracteres, letras e números', () => {
    assert.equal(senhaValida('beever123'), true);
    assert.equal(senhaValida('A1bcdefgh'), true);
  });

  it('recusa senha curta demais', () => {
    assert.equal(senhaValida('abc123'), false);
  });

  it('recusa senha só com letras ou só com números', () => {
    assert.equal(senhaValida('abcdefghij'), false);
    assert.equal(senhaValida('1234567890'), false);
  });

  it('recusa valores que não são texto', () => {
    assert.equal(senhaValida(undefined), false);
    assert.equal(senhaValida(12345678), false);
  });
});
