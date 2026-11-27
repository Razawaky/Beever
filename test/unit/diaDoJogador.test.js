import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dataDoDia,
  diaDaSemana,
  diaDoAno,
  diferencaEmDias,
  fimDaSemana,
  fimDoDia,
  fusoValido,
  inicioDaSemana,
  inicioDoDia,
  somarDias,
} from '../../src/utils/diaDoJogador.js';

/**
 * O dia do jogador (RN-024, dívida DT-23).
 *
 * O que estes testes protegem: a virada do dia acontece no fuso do perfil, e o
 * mesmo instante pode ser dias diferentes para dois jogadores. Sem isso, quem
 * mora fora de São Paulo perde a sequência antes da hora.
 */

describe('dia do jogador', () => {
  it('o mesmo instante é um dia em São Paulo e outro em Kiritimati', () => {
    // 2h UTC do dia 10: ainda é dia 9 no Brasil (UTC-3) e já é dia 10 na ilha (UTC+14).
    const instante = new Date('2026-03-10T02:00:00Z');

    assert.equal(dataDoDia(instante, 'America/Sao_Paulo'), '2026-03-09');
    assert.equal(dataDoDia(instante, 'Pacific/Kiritimati'), '2026-03-10');
  });

  it('a meia-noite do fuso é o começo do dia, não a do servidor', () => {
    // Meia-noite em São Paulo é 3h UTC do mesmo dia.
    assert.equal(inicioDoDia('2026-03-10', 'America/Sao_Paulo').toISOString(), '2026-03-10T03:00:00.000Z');
    assert.equal(fimDoDia('2026-03-10', 'America/Sao_Paulo').toISOString(), '2026-03-11T03:00:00.000Z');
  });

  it('a semana começa no domingo, igual à agenda do jogador', () => {
    // 2026-03-10 é uma terça.
    assert.equal(diaDaSemana('2026-03-10'), 2);
    assert.equal(inicioDaSemana('2026-03-10', 'America/Sao_Paulo').toISOString(), '2026-03-08T03:00:00.000Z');
    assert.equal(fimDaSemana('2026-03-10', 'America/Sao_Paulo').toISOString(), '2026-03-15T03:00:00.000Z');
  });

  it('somar e diferenciar dias atravessa o fim do mês', () => {
    assert.equal(somarDias('2026-02-28', 1), '2026-03-01');
    assert.equal(somarDias('2026-03-01', -1), '2026-02-28');
    assert.equal(diferencaEmDias('2026-02-28', '2026-03-03'), 3);
    assert.equal(diferencaEmDias('2026-03-03', '2026-02-28'), -3);
  });

  it('o dia do ano gira a lista de tarefas', () => {
    assert.equal(diaDoAno('2026-01-01'), 1);
    assert.equal(diaDoAno('2026-12-31'), 365);
  });

  it('fuso inválido no perfil cai no padrão em vez de derrubar a página', () => {
    assert.equal(fusoValido('Terra/Media'), 'America/Sao_Paulo');
    assert.equal(fusoValido('Europe/Lisbon'), 'Europe/Lisbon');
    assert.equal(dataDoDia(new Date('2026-03-10T02:00:00Z'), 'Terra/Media'), '2026-03-09');
  });

  it('horário de verão não engole a meia-noite', () => {
    // Lisboa entra no horário de verão em 29/03/2026, às 1h da manhã.
    assert.equal(inicioDoDia('2026-03-29', 'Europe/Lisbon').toISOString(), '2026-03-29T00:00:00.000Z');
    assert.equal(inicioDoDia('2026-03-30', 'Europe/Lisbon').toISOString(), '2026-03-29T23:00:00.000Z');
  });
});
