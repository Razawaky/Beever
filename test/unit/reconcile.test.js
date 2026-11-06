import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { contarDivergencias } from '../../scripts/reconcile.js';

describe('reconciliação de livros e saldos', () => {
  it('não conta divergência quando todas as conferências passam', () => {
    const resultado = [
      { nome: 'mel', divergencias: [] },
      { nome: 'pólen', divergencias: [] },
    ];

    assert.equal(contarDivergencias(resultado), 0);
  });

  it('soma as divergências de todas as conferências', () => {
    const resultado = [
      { nome: 'mel', divergencias: [{ user_id: 1, cache: 100, livro: 90 }] },
      { nome: 'pólen', divergencias: [] },
      { nome: 'XP', divergencias: [{ user_id: 2, cache: 0, livro: 50 }, { user_id: 3, cache: 10, livro: 0 }] },
    ];

    assert.equal(contarDivergencias(resultado), 3);
  });
});
