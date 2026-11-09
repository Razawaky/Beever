import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { numeroDoCiclo, separarPendentes } from '../../src/services/economicCycleService.js';

/**
 * A conta do ciclo econômico (RN-036), sem banco.
 *
 * O que estes testes protegem: o número do ciclo sai do calendário do jogador,
 * então o mesmo instante devolve sempre o mesmo ciclo, e a volta depois de
 * muito tempo fora não aplica um ano de custo fixo de uma vez.
 */

const FUSO = 'America/Sao_Paulo';

describe('ciclo econômico', () => {
  it('a conta nova está no ciclo zero: não há nada pendente', () => {
    const criadoEm = '2026-08-05T12:00:00Z';

    assert.equal(numeroDoCiclo({ criadoEm, agora: new Date('2026-08-07T12:00:00Z'), fuso: FUSO }), 0);
  });

  it('a semana vira no domingo, mesmo com poucos dias de conta', () => {
    // Conta criada na quarta, 5 de agosto; domingo, 9, já é o ciclo 1.
    const criadoEm = '2026-08-05T12:00:00Z';

    assert.equal(numeroDoCiclo({ criadoEm, agora: new Date('2026-08-08T12:00:00Z'), fuso: FUSO }), 0);
    assert.equal(numeroDoCiclo({ criadoEm, agora: new Date('2026-08-09T12:00:00Z'), fuso: FUSO }), 1);
  });

  it('seis semanas fora são seis ciclos, contados pelo calendário', () => {
    const criadoEm = '2026-08-05T12:00:00Z';

    assert.equal(numeroDoCiclo({ criadoEm, agora: new Date('2026-09-13T12:00:00Z'), fuso: FUSO }), 6);
  });

  it('o número não muda quando a página é aberta de novo no mesmo dia', () => {
    const criadoEm = '2026-08-05T12:00:00Z';
    const manha = numeroDoCiclo({ criadoEm, agora: new Date('2026-09-20T09:00:00Z'), fuso: FUSO });
    const noite = numeroDoCiclo({ criadoEm, agora: new Date('2026-09-20T23:00:00Z'), fuso: FUSO });

    assert.equal(manha, noite);
  });

  it('o fuso do jogador decide de quem já virou a semana', () => {
    const criadoEm = '2026-08-05T12:00:00Z';
    // 2h UTC de domingo: em São Paulo ainda é sábado, em Kiritimati já é domingo.
    const instante = new Date('2026-08-09T02:00:00Z');

    assert.equal(numeroDoCiclo({ criadoEm, agora: instante, fuso: FUSO }), 0);
    assert.equal(numeroDoCiclo({ criadoEm, agora: instante, fuso: 'Pacific/Kiritimati' }), 1);
  });

  it('quem tem poucos ciclos pendentes aplica todos', () => {
    const { pular, aplicar } = separarPendentes({ ultimoProcessado: 2, cicloAtual: 8 });

    assert.deepEqual(pular, []);
    assert.deepEqual(aplicar, [3, 4, 5, 6, 7, 8]);
  });

  it('acima do teto, os ciclos mais antigos são marcados sem efeito', () => {
    const { pular, aplicar } = separarPendentes({ ultimoProcessado: 0, cicloAtual: 30 });

    assert.equal(pular.length, 18, 'os antigos entram só para o calendário não ficar devendo');
    assert.equal(aplicar.length, 12);
    assert.equal(pular[0], 1);
    assert.equal(aplicar[aplicar.length - 1], 30);
  });

  it('quem está em dia não tem ciclo nenhum a processar', () => {
    const { pular, aplicar } = separarPendentes({ ultimoProcessado: 5, cicloAtual: 5 });

    assert.deepEqual(pular, []);
    assert.deepEqual(aplicar, []);
  });
});
