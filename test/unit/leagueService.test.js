import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  grupoComVaga,
  intervaloDaSemana,
  periodoDaLiga,
  ranquear,
  semanaDe,
} from '../../src/services/leagueService.js';

/**
 * As contas da liga (T-13.3), sem banco: a semana, o empate e a vaga no grupo.
 *
 * O empate é o caso que mais importa. Duas crianças com o mesmo pólen dividem a
 * posição, e a seguinte pula — dois primeiros lugares não podem ter um segundo
 * lugar entre eles.
 */

const membro = (nickname, polen) => ({ user_id: nickname.length, nickname, polen });

describe('a semana da liga', () => {
  it('vai de domingo a sábado, em UTC', () => {
    // 2026-08-27 é uma quinta-feira.
    const semana = semanaDe(new Date('2026-08-27T15:00:00Z'));

    assert.equal(semana.domingo, '2026-08-23');
    assert.equal(semana.sabado, '2026-08-29');
  });

  it('o domingo é o primeiro dia da própria semana, e não da anterior', () => {
    const semana = semanaDe(new Date('2026-08-23T03:00:00Z'));

    assert.equal(semana.domingo, '2026-08-23');
    assert.equal(semana.hoje, '2026-08-23');
  });

  it('o intervalo cobre a semana inteira, do primeiro ao último segundo', () => {
    const { de, ate } = intervaloDaSemana({ domingo: '2026-08-23', sabado: '2026-08-29' });

    assert.equal(de, '2026-08-23 00:00:00');
    assert.equal(ate, '2026-08-29 23:59:59');
  });
});

describe('ranqueamento', () => {
  it('ordena do maior pólen para o menor', () => {
    const ranque = ranquear([membro('ana', 10), membro('bruno', 30), membro('cida', 20)]);

    assert.deepEqual(
      ranque.map((linha) => [linha.nickname, linha.posicao]),
      [
        ['bruno', 1],
        ['cida', 2],
        ['ana', 3],
      ],
    );
  });

  it('empate divide a posição, e a seguinte pula', () => {
    const ranque = ranquear([membro('ana', 30), membro('bruno', 30), membro('cida', 10)]);

    assert.deepEqual(
      ranque.map((linha) => [linha.nickname, linha.posicao]),
      [
        ['ana', 1],
        ['bruno', 1],
        ['cida', 3],
      ],
      'dois primeiros lugares não podem ter um segundo entre eles',
    );
  });

  it('quem não ganhou pólen fica por último, e não some da lista', () => {
    const ranque = ranquear([membro('ana', 0), membro('bruno', 5)]);

    assert.equal(ranque[1].nickname, 'ana');
    assert.equal(ranque[1].posicao, 2);
  });

  it('o pólen volta como número, e não como o texto que o banco devolve', () => {
    const ranque = ranquear([{ user_id: 1, nickname: 'ana', polen: '42' }]);
    assert.strictEqual(ranque[0].polen, 42);
  });

  it('lista vazia não quebra', () => {
    assert.deepEqual(ranquear([]), []);
  });
});

describe('vaga no grupo', () => {
  it('entra no primeiro grupo com vaga', () => {
    const grupos = [
      { id: 1, membros: 30 },
      { id: 2, membros: 4 },
    ];
    assert.equal(grupoComVaga(grupos).id, 2);
  });

  it('com todos cheios, não há grupo — quem chama abre um novo', () => {
    assert.equal(grupoComVaga([{ id: 1, membros: 30 }]), null);
    assert.equal(grupoComVaga([]), null);
  });
});

describe('período da liga em palavra', () => {
  it('a tela recebe dia e mês prontos, e não data ISO', () => {
    assert.equal(periodoDaLiga({ comecaEm: '2026-08-30', terminaEm: '2026-09-05' }), '30/08 a 05/09');
  });
});
