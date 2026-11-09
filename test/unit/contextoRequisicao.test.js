import assert from 'node:assert/strict';
import { setTimeout as esperar } from 'node:timers/promises';
import { describe, it } from 'node:test';

import { executarComContexto, idDaRequisicao } from '../../src/config/contextoRequisicao.js';

/**
 * O contrato do contexto de requisição: o id acompanha a cadeia de chamadas
 * assíncronas e não vaza para outra.
 *
 * Vale testar porque a alternativa — passar o `req` camada abaixo — é sempre
 * mais óbvia para quem chega depois, e a razão de não fazê-la (service não pode
 * conhecer HTTP) não está escrita no código que a usaria.
 */

describe('contexto da requisição', () => {
  it('não tem id fora de uma requisição', () => {
    assert.equal(idDaRequisicao(), undefined);
  });

  it('enxerga o id de dentro do contexto', () => {
    executarComContexto({ requestId: 'abc-123' }, () => {
      assert.equal(idDaRequisicao(), 'abc-123');
    });
  });

  it('o id sobrevive ao await, que é o caso de todo service', async () => {
    await executarComContexto({ requestId: 'depois-do-await' }, async () => {
      await esperar(5);
      assert.equal(idDaRequisicao(), 'depois-do-await');
    });
  });

  it('duas requisições concorrentes não trocam de id', async () => {
    const primeira = executarComContexto({ requestId: 'primeira' }, async () => {
      await esperar(10);
      return idDaRequisicao();
    });
    const segunda = executarComContexto({ requestId: 'segunda' }, async () => {
      await esperar(1);
      return idDaRequisicao();
    });

    assert.deepEqual(await Promise.all([primeira, segunda]), ['primeira', 'segunda']);
  });

  it('o contexto termina junto com a chamada', async () => {
    await executarComContexto({ requestId: 'temporario' }, async () => esperar(1));
    assert.equal(idDaRequisicao(), undefined);
  });
});
