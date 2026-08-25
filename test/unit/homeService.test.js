import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ordenarPorVencimento, resumirMeta } from '../../src/services/homeService.js';

/**
 * As contas da Colmeia que não precisam de banco (RF-HOM-04 e 05).
 *
 * O que estes testes protegem: a meta chega pronta à tela — percentual, dias até
 * o prazo e mel da recompensa —, e quem ganha o destaque é sempre a que vence
 * primeiro, não a que foi criada primeiro.
 */

const DIA = { hoje: '2026-08-25', fuso: 'America/Sao_Paulo' };

function meta(atributos) {
  return {
    id: 1,
    title: 'Concluir 5 células',
    current_value: 2,
    target_value: 5,
    reward_coins: 40,
    due_at: '2026-08-30T00:00:00.000Z',
    ...atributos,
  };
}

describe('resumo da meta na Colmeia', () => {
  it('traduz progresso em percentual, com o alvo como base', () => {
    const resumo = resumirMeta(meta({ current_value: 2, target_value: 5 }), DIA);

    assert.equal(resumo.atual, 2);
    assert.equal(resumo.alvo, 5);
    assert.equal(resumo.percentual, 40);
  });

  it('não passa de 100% quando o jogador ultrapassa o alvo', () => {
    const resumo = resumirMeta(meta({ current_value: 9, target_value: 5 }), DIA);

    assert.equal(resumo.percentual, 100);
  });

  it('alvo zero não vira divisão por zero', () => {
    const resumo = resumirMeta(meta({ current_value: 0, target_value: 0 }), DIA);

    assert.equal(resumo.percentual, 0);
  });

  it('conta os dias que faltam até o prazo (RF-HOM-04)', () => {
    const resumo = resumirMeta(meta({ due_at: '2026-08-28T03:00:00.000Z' }), DIA);

    assert.equal(resumo.diasRestantes, 3);
  });

  it('meta que vence hoje mostra zero dia, não um dia', () => {
    const resumo = resumirMeta(meta({ due_at: '2026-08-25T12:00:00.000Z' }), DIA);

    assert.equal(resumo.diasRestantes, 0);
  });

  it('meta sem prazo devolve `null`, e não um número inventado', () => {
    const resumo = resumirMeta(meta({ due_at: null }), DIA);

    assert.equal(resumo.diasRestantes, null);
  });

  it('leva o mel da recompensa junto, que é o que a criança quer saber', () => {
    const resumo = resumirMeta(meta({ reward_coins: 40 }), DIA);

    assert.equal(resumo.melDaRecompensa, 40);
  });
});

describe('ordem das metas na Colmeia', () => {
  it('o destaque é a que vence primeiro, não a mais antiga', () => {
    const ordenadas = ordenarPorVencimento([
      meta({ id: 1, due_at: '2026-09-10T00:00:00.000Z' }),
      meta({ id: 2, due_at: '2026-08-27T00:00:00.000Z' }),
      meta({ id: 3, due_at: '2026-09-01T00:00:00.000Z' }),
    ]);

    assert.deepEqual(
      ordenadas.map((linha) => linha.id),
      [2, 3, 1],
    );
  });

  it('meta sem prazo vai para o fim, mas não some da lista (RF-HOM-05)', () => {
    const ordenadas = ordenarPorVencimento([
      meta({ id: 1, due_at: null }),
      meta({ id: 2, due_at: '2026-08-27T00:00:00.000Z' }),
    ]);

    assert.deepEqual(
      ordenadas.map((linha) => linha.id),
      [2, 1],
    );
  });

  it('sem meta nenhuma devolve lista vazia', () => {
    assert.deepEqual(ordenarPorVencimento([]), []);
  });
});
