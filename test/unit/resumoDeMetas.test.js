import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ordenarPorVencimento, resumirMeta, urgenciaDoPrazo } from '../../src/services/goalsService.js';

/**
 * A meta pronta para a tela, sem banco (RF-HOM-04, RF-HOM-05 e RF-MET-02).
 *
 * O que estes testes protegem: a meta chega pronta — percentual, dias até o
 * prazo, urgência em palavra e recompensa —, e quem ganha o destaque é sempre a
 * que vence primeiro, não a que foi criada primeiro.
 */

const DIA = { hoje: '2026-08-25', fuso: 'America/Sao_Paulo' };

function meta(atributos) {
  return {
    id: 1,
    title: 'Concluir 5 células',
    current_value: 2,
    target_value: 5,
    reward_coins: 40,
    reward_points: 15,
    status: 'ativa',
    difficulty: 'media',
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
    assert.equal(resumo.polenDaRecompensa, 15);
  });
});

describe('urgência do prazo da meta', () => {
  it('a que vence hoje é anunciada em palavra, não só em número', () => {
    assert.deepEqual(urgenciaDoPrazo(0), { nivel: 'hoje', icone: '⏰', frase: 'Termina hoje' });
  });

  it('dois dias ou menos contam como apertado', () => {
    assert.equal(urgenciaDoPrazo(1).nivel, 'apertado');
    assert.equal(urgenciaDoPrazo(1).frase, 'Faltam 1 dia');
    assert.equal(urgenciaDoPrazo(2).nivel, 'apertado');
  });

  it('daí em diante é prazo tranquilo', () => {
    assert.equal(urgenciaDoPrazo(3).nivel, 'tranquilo');
    assert.equal(urgenciaDoPrazo(30).frase, 'Faltam 30 dias');
  });

  it('meta sem prazo diz que não tem prazo, em vez de mentir um número', () => {
    assert.equal(urgenciaDoPrazo(null).nivel, 'sem-prazo');
    assert.equal(urgenciaDoPrazo(null).frase, 'Sem prazo');
  });

  it('prazo vencido não vira número negativo na tela', () => {
    assert.equal(urgenciaDoPrazo(-3).nivel, 'hoje');
  });

  it('a urgência viaja dentro do resumo da meta', () => {
    const resumo = resumirMeta(meta({ due_at: '2026-08-26T03:00:00.000Z' }), DIA);

    assert.equal(resumo.diasRestantes, 1);
    assert.equal(resumo.urgencia.nivel, 'apertado');
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
