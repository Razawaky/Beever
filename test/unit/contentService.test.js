import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ESTADOS, estadoDoFavo, estadosDasCelulas, faixasVisiveis } from '../../src/services/contentService.js';

/**
 * As regras de desbloqueio sem banco: são elas que decidem o que a criança vê, e
 * merecem teste que roda em milissegundos e não depende de MySQL no ar.
 */

const FAIXAS = [
  { code: 'A', min_age: 6 },
  { code: 'B', min_age: 9 },
  { code: 'C', min_age: 12 },
];

function favo(extras = {}) {
  return {
    id: 2,
    unlock_percent: 80,
    required_patrimony: 0,
    required_item_id: null,
    required_item_name: null,
    anterior_id: 1,
    ...extras,
  };
}

function celula(ordem, { estrelas = 0, concluidaEm = null } = {}) {
  return { id: ordem, order_index: ordem, stars: estrelas, first_completed_at: concluidaEm };
}

describe('contentService — faixas visíveis (RN-029)', () => {
  it('o jogador vê a própria faixa e as anteriores', () => {
    assert.deepEqual(faixasVisiveis(FAIXAS, 'A'), ['A']);
    assert.deepEqual(faixasVisiveis(FAIXAS, 'B'), ['A', 'B']);
    assert.deepEqual(faixasVisiveis(FAIXAS, 'C'), ['A', 'B', 'C']);
  });

  it('sem faixa definida não vê nada, em vez de ver tudo', () => {
    assert.deepEqual(faixasVisiveis(FAIXAS, null), []);
    assert.deepEqual(faixasVisiveis(FAIXAS, 'Z'), []);
  });
});

describe('contentService — estado do favo (RN-027, RN-028)', () => {
  it('o primeiro favo da faixa abre sem pré-requisito', () => {
    const resultado = estadoDoFavo({ favo: favo({ anterior_id: null }), progressoDoAnterior: null });
    assert.equal(resultado.estado, ESTADOS.disponivel);
  });

  it('abaixo do percentual o favo fica travado', () => {
    const resultado = estadoDoFavo({ favo: favo(), progressoDoAnterior: { percent: 79 } });

    assert.equal(resultado.estado, ESTADOS.travadoPorPercentual);
    assert.match(resultado.motivo, /80%/);
  });

  it('no percentual exato o favo abre — 80% é "pelo menos 80%"', () => {
    const resultado = estadoDoFavo({ favo: favo(), progressoDoAnterior: { percent: 80 } });
    assert.equal(resultado.estado, ESTADOS.disponivel);
  });

  it('favo sem progresso registrado no anterior conta como zero, não como completo', () => {
    const resultado = estadoDoFavo({ favo: favo(), progressoDoAnterior: null });
    assert.equal(resultado.estado, ESTADOS.travadoPorPercentual);
  });

  it('exige o item do inventário, e o nome dele aparece no motivo', () => {
    const exigente = favo({ required_item_id: 7, required_item_name: 'Cofrinho de madeira' });

    const semItem = estadoDoFavo({ favo: exigente, progressoDoAnterior: { percent: 100 }, temItemExigido: false });
    assert.equal(semItem.estado, ESTADOS.travadoPorItem);
    assert.match(semItem.motivo, /Cofrinho de madeira/);

    const comItem = estadoDoFavo({ favo: exigente, progressoDoAnterior: { percent: 100 }, temItemExigido: true });
    assert.equal(comItem.estado, ESTADOS.disponivel);
  });

  it('exige patrimônio mínimo (RN-028)', () => {
    const exigente = favo({ required_patrimony: 500 });

    const pobre = estadoDoFavo({ favo: exigente, progressoDoAnterior: { percent: 100 }, patrimonio: 499 });
    assert.equal(pobre.estado, ESTADOS.travadoPorPatrimonio);

    const rico = estadoDoFavo({ favo: exigente, progressoDoAnterior: { percent: 100 }, patrimonio: 500 });
    assert.equal(rico.estado, ESTADOS.disponivel);
  });

  it('o percentual é checado antes do que se tem: quem não jogou não é cobrado por item', () => {
    const exigente = favo({ required_item_id: 7, required_patrimony: 500 });
    const resultado = estadoDoFavo({ favo: exigente, progressoDoAnterior: { percent: 10 }, patrimonio: 0 });

    assert.equal(resultado.estado, ESTADOS.travadoPorPercentual, 'primeiro o que depende de jogar');
  });
});

describe('contentService — estado das células (RN-026)', () => {
  it('a primeira abre e as seguintes esperam a anterior', () => {
    const estados = estadosDasCelulas([celula(1), celula(2), celula(3)]);

    assert.equal(estados[0].estado, ESTADOS.disponivel);
    assert.equal(estados[1].estado, ESTADOS.travadoPorCelulaAnterior);
    assert.equal(estados[2].estado, ESTADOS.travadoPorCelulaAnterior);
  });

  it('concluir com uma estrela abre a próxima', () => {
    const estados = estadosDasCelulas([
      celula(1, { estrelas: 1, concluidaEm: new Date() }),
      celula(2),
      celula(3),
    ]);

    assert.equal(estados[0].estado, ESTADOS.concluido);
    assert.equal(estados[1].estado, ESTADOS.disponivel);
    assert.equal(estados[2].estado, ESTADOS.travadoPorCelulaAnterior, 'abre uma de cada vez');
  });

  it('tentativa sem estrela não conta como concluída', () => {
    const estados = estadosDasCelulas([celula(1, { estrelas: 0, concluidaEm: new Date() }), celula(2)]);

    assert.equal(estados[0].estado, ESTADOS.disponivel, 'ainda dá para refazer');
    assert.equal(estados[1].estado, ESTADOS.travadoPorCelulaAnterior);
  });

  it('célula já concluída continua aberta para repetir', () => {
    const estados = estadosDasCelulas([
      celula(1, { estrelas: 3, concluidaEm: new Date() }),
      celula(2, { estrelas: 2, concluidaEm: new Date() }),
    ]);

    assert.ok(estados.every((linha) => linha.estado === ESTADOS.concluido));
    assert.ok(estados.every((linha) => linha.concluida));
  });
});
