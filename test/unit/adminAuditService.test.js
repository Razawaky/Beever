import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { filtrosDaConsulta, paginacao } from '../../src/services/adminAuditService.js';

/**
 * O saneamento dos filtros e a conta da paginação (T-12.6), sem banco.
 *
 * Filtro é conveniência, então o que não serve é descartado em silêncio: uma
 * tela de auditoria que responde erro porque o campo veio vazio atrapalha quem
 * só queria ver tudo.
 */

describe('filtros da consulta de auditoria', () => {
  it('sem nada enviado, todos os filtros ficam nulos', () => {
    const filtros = filtrosDaConsulta({});
    assert.deepEqual(Object.values(filtros).filter(Boolean), []);
  });

  it('tipo de ator fora da lista é descartado', () => {
    assert.equal(filtrosDaConsulta({ atorTipo: 'admin' }).atorTipo, 'admin');
    assert.equal(filtrosDaConsulta({ atorTipo: 'invasor' }).atorTipo, null);
  });

  it('id que não é número positivo é descartado', () => {
    assert.equal(filtrosDaConsulta({ atorId: '7' }).atorId, 7);
    assert.equal(filtrosDaConsulta({ atorId: 'abc' }).atorId, null);
    assert.equal(filtrosDaConsulta({ atorId: '-3' }).atorId, null);
  });

  it('a data vira o dia inteiro, do primeiro ao último segundo', () => {
    const filtros = filtrosDaConsulta({ de: '2026-08-01', ate: '2026-08-27' });
    assert.equal(filtros.de, '2026-08-01 00:00:00');
    assert.equal(filtros.ate, '2026-08-27 23:59:59');
  });

  it('texto longo demais é cortado no tamanho da coluna', () => {
    assert.equal(filtrosDaConsulta({ acao: 'a'.repeat(200) }).acao.length, 100);
    assert.equal(filtrosDaConsulta({ entidade: 'e'.repeat(200) }).entidade.length, 60);
  });
});

describe('paginação da auditoria', () => {
  it('sem nenhuma linha, ainda existe uma página', () => {
    assert.deepEqual(paginacao(1, 0), { atual: 1, paginas: 1, porPagina: 50, total: 0, deslocamento: 0 });
  });

  it('conta as páginas pelo total e calcula o deslocamento', () => {
    const pagina = paginacao(3, 120);
    assert.equal(pagina.paginas, 3);
    assert.equal(pagina.atual, 3);
    assert.equal(pagina.deslocamento, 100);
  });

  it('página fora do intervalo é trazida de volta para dentro', () => {
    assert.equal(paginacao(99, 120).atual, 3);
    assert.equal(paginacao(0, 120).atual, 1);
    assert.equal(paginacao('abc', 120).atual, 1);
  });
});
