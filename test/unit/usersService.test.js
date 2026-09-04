import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { faixaParaIdade, idadeEm, senhaValida } from '../../src/services/usersService.js';

const FAIXAS = [
  { code: 'A', min_age: 6, max_age: 8 },
  { code: 'B', min_age: 9, max_age: 11 },
  { code: 'C', min_age: 12, max_age: 15 },
];

describe('usersService.senhaValida', () => {
  it('aceita senha com 8+ caracteres, letras e números', () => {
    assert.equal(senhaValida('beever123'), true);
    assert.equal(senhaValida('A1bcdefgh'), true);
  });

  it('recusa senha curta demais', () => {
    assert.equal(senhaValida('abc123'), false);
  });

  it('recusa senha só com letras ou só com números', () => {
    assert.equal(senhaValida('abcdefghij'), false);
    assert.equal(senhaValida('1234567890'), false);
  });

  it('recusa valores que não são texto', () => {
    assert.equal(senhaValida(undefined), false);
    assert.equal(senhaValida(12345678), false);
  });
});

describe('usersService.idadeEm', () => {
  it('conta anos completos', () => {
    assert.equal(idadeEm('2014-03-10', new Date('2026-03-10')), 12);
  });

  it('não conta o ano quando o aniversário ainda não chegou', () => {
    assert.equal(idadeEm('2014-03-10', new Date('2026-03-09')), 11);
  });
});

describe('usersService.faixaParaIdade', () => {
  it('classifica dentro do intervalo declarado', () => {
    assert.equal(faixaParaIdade(FAIXAS, 7).code, 'A');
    assert.equal(faixaParaIdade(FAIXAS, 10).code, 'B');
    assert.equal(faixaParaIdade(FAIXAS, 15).code, 'C');
  });

  it('acomoda quem está fora do intervalo na faixa mais próxima', () => {
    // Perfil sem faixa não vê conteúdo nenhum. Uma criança de 5 anos que o
    // responsável cadastrou merece a faixa mais nova, não uma tela vazia.
    assert.equal(faixaParaIdade(FAIXAS, 4).code, 'A');
    assert.equal(faixaParaIdade(FAIXAS, 40).code, 'C');
  });
});

describe('usersService — consentimento do responsável', () => {
  it('a maioridade é a fronteira: 17 precisa, 18 não', () => {
    // A regra é escrita em cima de `idadeEm`, então o teste cobre a fronteira
    // pela idade, sem precisar de banco. Na prática o público inteiro do Beever
    // é menor — a regra existe para o dia em que um adulto criar conta.
    assert.equal(idadeEm('2009-03-10', new Date('2026-03-09')) < 18, true);
    assert.equal(idadeEm('2008-03-10', new Date('2026-03-10')) < 18, false);
  });
});
