import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { nomeDoDia } from '../../src/services/schedulesService.js';

/**
 * O nome do dia da semana, que o calendário da sequência escreve em cada
 * quadrinho. É função pura e a convenção de 0 a 6 é do próprio service, então
 * dá para exercitá-la sem banco nenhum.
 */

describe('nome do dia da semana', () => {
  it('vai de domingo a sábado, na convenção do JavaScript', () => {
    const nomes = [0, 1, 2, 3, 4, 5, 6].map((dia) => nomeDoDia(dia));

    assert.deepEqual(nomes, ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']);
  });

  it('aceita o dia em texto, que é como a agenda chega do formulário', () => {
    assert.equal(nomeDoDia('3'), 'quarta');
  });

  // A tela desenha o quadrinho mesmo assim: nome vazio é feio, página quebrada é pior.
  it('devolve texto vazio para dia fora da faixa, em vez de quebrar a tela', () => {
    assert.equal(nomeDoDia(7), '');
    assert.equal(nomeDoDia(-1), '');
    assert.equal(nomeDoDia(undefined), '');
  });
});
