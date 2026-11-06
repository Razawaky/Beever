import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { apelidoParaRanque, ehApelidoPublico, motivoDeRecusa } from '../../src/services/apelidoPublico.js';

/**
 * A regra do apelido publicado no ranque da liga (RN-049, RF-GAM-03).
 *
 * O que estes casos protegem: o campo que outras crianças leem não pode virar
 * nome completo, telefone nem endereço de e-mail. A regra é imperfeita de
 * propósito — nenhum teste de texto impede alguém de digitar nome e sobrenome —,
 * e o que ela cobre está escrito aqui.
 */

describe('apelido que pode ser publicado', () => {
  it('aceita o apelido comum de criança', () => {
    for (const apelido of ['Bia', 'abelha_22', 'Rainha Bee', 'joão-pedro', 'Zé']) {
      assert.equal(ehApelidoPublico(apelido), true, `${apelido} deveria passar`);
    }
  });

  it('recusa nome completo, telefone e e-mail', () => {
    assert.match(motivoDeRecusa('Maria Clara Souza'), /nome completo/);
    assert.match(motivoDeRecusa('ana 988887777'), /telefone/);
    assert.match(motivoDeRecusa('ana@escola.com'), /letras, números/);
  });

  it('recusa o curto demais e o longo demais', () => {
    assert.match(motivoDeRecusa('a'), /ao menos 2/);
    assert.match(motivoDeRecusa('a'.repeat(21)), /no máximo 20/);
  });

  it('o espaço das pontas não conta, e o vazio é recusado', () => {
    assert.equal(ehApelidoPublico('  Bia  '), true);
    assert.match(motivoDeRecusa('   '), /ao menos 2/);
    assert.match(motivoDeRecusa(null), /ao menos 2/);
  });
});

describe('apelido no ranque', () => {
  it('o que passa na regra vai como está, sem o espaço das pontas', () => {
    assert.equal(apelidoParaRanque(' Bia ', 7), 'Bia');
  });

  it('o de conta antiga que não passa vira abelha sem nome', () => {
    assert.equal(apelidoParaRanque('Maria Clara Souza', 7), 'Abelha 7');
  });
});
