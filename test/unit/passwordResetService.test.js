import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  gerarToken,
  hashDoToken,
  linkValido,
  montarLink,
} from '../../src/services/passwordResetService.js';

describe('passwordResetService.gerarToken', () => {
  it('gera 64 caracteres hexadecimais', () => {
    assert.match(gerarToken(), /^[0-9a-f]{64}$/);
  });

  it('não repete o token', () => {
    assert.notEqual(gerarToken(), gerarToken());
  });
});

describe('passwordResetService.hashDoToken', () => {
  it('é o SHA-256 do token, e não o token em si', () => {
    const token = gerarToken();
    assert.match(hashDoToken(token), /^[0-9a-f]{64}$/);
    assert.notEqual(hashDoToken(token), token);
    assert.equal(hashDoToken(token), hashDoToken(token));
  });
});

describe('passwordResetService.montarLink', () => {
  it('aponta para a tela de senha nova com o token na query', () => {
    const link = new URL(montarLink('abc123'));
    assert.equal(link.pathname, '/redefinir-senha');
    assert.equal(link.searchParams.get('token'), 'abc123');
  });
});

describe('passwordResetService.linkValido', () => {
  it('recusa token fora do formato sem consultar o banco', async () => {
    assert.equal(await linkValido(''), false);
    assert.equal(await linkValido('abc'), false);
    assert.equal(await linkValido('Z'.repeat(64)), false);
  });
});
