import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sortearAtividade } from '../../src/services/sorteioDeConteudo.js';

/**
 * O sorteio da atividade (T-12.5), sem sorte envolvida: o sorteador entra como
 * parâmetro, e cada caso passa um que devolve exatamente o número que o teste
 * precisa. Testar `Math.random` provaria estatística, não regra.
 */

const ACERVO = [{ id: 1 }, { id: 2 }, { id: 3 }];

/** Um sorteador que sempre aponta para a mesma posição da lista. */
const sempre = (posicao) => () => posicao / 10;

describe('sorteio da atividade do acervo', () => {
  it('acervo vazio não devolve atividade nenhuma', () => {
    assert.equal(sortearAtividade([], null, sempre(0)), null);
  });

  it('escolhe pela posição que o sorteador aponta', () => {
    assert.equal(sortearAtividade(ACERVO, null, () => 0).id, 1);
    assert.equal(sortearAtividade(ACERVO, null, () => 0.99).id, 3);
  });

  it('não repete a atividade da partida anterior', () => {
    // Sem a última jogada fora da conta, o sorteador zerado devolveria a 1.
    assert.equal(sortearAtividade(ACERVO, 1, () => 0).id, 2);
    assert.equal(sortearAtividade(ACERVO, 2, () => 0).id, 1);
  });

  it('com uma atividade só, repetir é melhor do que não ter jogo', () => {
    assert.equal(sortearAtividade([{ id: 7 }], 7, () => 0).id, 7);
  });

  it('a última jogada que não está mais no acervo não tira ninguém da conta', () => {
    assert.equal(sortearAtividade(ACERVO, 99, () => 0).id, 1);
  });
});
