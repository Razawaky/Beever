import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as goalProgressSources from '../../src/services/goalProgressSources.js';
import * as taskProgressSources from '../../src/services/taskProgressSources.js';
import { resumirTarefa } from '../../src/services/tasksService.js';

/**
 * A fonte de progresso desconhecida, e o alvo zero (T-14.2, RNF-28).
 *
 * As duas são a mesma decisão escrita em dois lugares: dado que o sistema não
 * sabe medir devolve `null` e a tarefa fica parada, em vez de virar `NaN` e
 * pagar recompensa por conta nenhuma. A sincronização pula o que vem `null`,
 * então uma fonte cadastrada errada no banco não trava o resto.
 */

describe('fonte de progresso desconhecida', () => {
  it('a meta com fonte que ninguém sabe medir devolve nulo', async () => {
    assert.equal(await goalProgressSources.medir('fonte-que-nao-existe', 1), null);
  });

  it('a tarefa com fonte que ninguém sabe medir devolve nulo', async () => {
    const janela = { inicio: '2026-08-01', fim: '2026-08-31' };
    assert.equal(await taskProgressSources.medir('fonte-que-nao-existe', 1, janela), null);
  });
});

describe('resumo da tarefa', () => {
  const base = {
    id: 1,
    title: 'Guardar mel',
    current_value: 0,
    target_value: 0,
    scope: 'diaria',
    status: 'ativa',
    reward_coins: 10,
    reward_points: 5,
  };

  it('alvo zero não vira divisão por zero na barra de progresso', () => {
    const resumo = resumirTarefa(base);

    assert.equal(resumo.percentual, 0);
    assert.equal(resumo.cumprida, true, 'nada a fazer já está feito');
  });

  it('o percentual não passa de cem, mesmo quem faz mais do que o pedido', () => {
    assert.equal(resumirTarefa({ ...base, current_value: 30, target_value: 10 }).percentual, 100);
  });
});
