import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { podeExecutar } from '../../scripts/reset.js';

/**
 * O reset apaga tudo sem backup, então as duas travas — produção e confirmação
 * explícita — são a parte do script que mais precisa de teste.
 */
describe('reset do banco', () => {
  it('recusa em produção, mesmo com a confirmação', () => {
    const { permitido, motivo } = podeExecutar({
      producao: true,
      argumentos: ['--sim'],
      nomeBanco: 'beever',
    });

    assert.equal(permitido, false);
    assert.match(motivo, /production/);
  });

  it('recusa sem confirmação explícita', () => {
    const { permitido, motivo } = podeExecutar({
      producao: false,
      argumentos: [],
      nomeBanco: 'beever',
    });

    assert.equal(permitido, false);
    assert.match(motivo, /--sim/);
  });

  it('avisa qual banco vai ser apagado', () => {
    const { motivo } = podeExecutar({ producao: false, argumentos: [], nomeBanco: 'beever_dev' });

    assert.match(motivo, /beever_dev/);
  });

  it('permite em desenvolvimento com a confirmação', () => {
    const { permitido } = podeExecutar({
      producao: false,
      argumentos: ['--sim'],
      nomeBanco: 'beever',
    });

    assert.equal(permitido, true);
  });
});
