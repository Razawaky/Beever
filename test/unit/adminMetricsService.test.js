import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PERIODOS_EM_DIAS,
  barrasDoGrafico,
  intervaloDoPeriodo,
  percentual,
  periodoEmDias,
  retencaoDosDiasMarcados,
} from '../../src/services/adminMetricsService.js';

/**
 * As contas do painel de métricas (T-12.7), sem banco.
 *
 * O que é conta pura fica aqui, e o que é consulta fica no teste de integração:
 * é a separação que permite provar o caso do denominador zero, que é raro no
 * banco e comum no primeiro dia de uso.
 */

describe('período do painel', () => {
  it('oferece os cinco recortes combinados', () => {
    assert.deepEqual(PERIODOS_EM_DIAS, [7, 14, 30, 90, 180]);
  });

  it('sem escolha, o padrão é trinta dias', () => {
    assert.equal(periodoEmDias(undefined), 30);
    assert.equal(periodoEmDias(''), 30);
    assert.equal(periodoEmDias('abc'), 30);
  });

  it('recorte fora da lista cai no padrão', () => {
    assert.equal(periodoEmDias('45'), 30);
    assert.equal(periodoEmDias('-7'), 30);
  });

  it('recorte da lista é respeitado', () => {
    for (const dias of PERIODOS_EM_DIAS) assert.equal(periodoEmDias(String(dias)), dias);
  });

  it('o intervalo cobre o período inteiro, do primeiro ao último segundo', () => {
    const { de, ate } = intervaloDoPeriodo(7, new Date('2026-08-27T15:00:00Z'));

    assert.equal(de, '2026-08-21 00:00:00', 'sete dias contando hoje começam no dia 21');
    assert.equal(ate, '2026-08-27 23:59:59');
  });
});

describe('retenção dos dias marcados', () => {
  it('conta só o dia que foi avaliado, e o protegido não vira cumprido', () => {
    const retencao = retencaoDosDiasMarcados({ cumprido: 6, perdido: 2, protegido: 2 });

    assert.equal(retencao.avaliados, 10);
    assert.equal(retencao.percentual, 60);
    assert.equal(retencao.protegidos, 2);
  });

  it('sem dia avaliado, o percentual é nulo e não zero', () => {
    const retencao = retencaoDosDiasMarcados({});

    assert.equal(retencao.avaliados, 0);
    assert.equal(retencao.percentual, null, '"ainda não houve dia" não é "ninguém cumpriu"');
  });

  it('o percentual arredonda para inteiro', () => {
    assert.equal(percentual(1, 3), 33);
    assert.equal(percentual(2, 3), 67);
    assert.equal(percentual(5, 0), null);
  });
});

describe('barras do gráfico', () => {
  it('sem dia nenhum, não há barra', () => {
    assert.deepEqual(barrasDoGrafico([]), []);
  });

  it('a maior barra ocupa a altura inteira e as outras são proporcionais', () => {
    const barras = barrasDoGrafico([
      { dia: '2026-08-25', total: 10 },
      { dia: '2026-08-26', total: 5 },
    ]);

    assert.equal(barras[0].altura, 100);
    assert.equal(barras[0].topo, 0);
    assert.equal(barras[1].altura, 50);
    assert.equal(barras[1].topo, 50);
  });

  it('dia com pouquíssima atividade ainda desenha um traço', () => {
    const barras = barrasDoGrafico([
      { dia: '2026-08-25', total: 500 },
      { dia: '2026-08-26', total: 1 },
    ]);

    assert.ok(barras[1].altura >= 2, 'zero seria indistinguível de "ninguém jogou"');
  });
});
