import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bonusDeMelEntreNiveis,
  nivelParaXp,
  xpDoNivel,
  xpDoProximoNivel,
} from '../../src/services/levelsService.js';

/**
 * A parte de nível que dá para testar sem banco: dada uma curva, qual nível o
 * XP alcança.
 *
 * A curva daqui é sintética de propósito. O teste não valida os números do seed
 * — esses podem mudar quando o ritmo do jogo for ajustado, e um teste que
 * quebra a cada rebalanceamento vira ruído. O que se testa é a regra de leitura
 * da curva, que não muda.
 */

const CURVA = [
  { level: 1, required_xp: 0, reward_coins: 0 },
  { level: 2, required_xp: 280, reward_coins: 50 },
  { level: 3, required_xp: 520, reward_coins: 75 },
  { level: 4, required_xp: 800, reward_coins: 100 },
];

describe('levelsService', () => {
  describe('nivelParaXp', () => {
    it('começa no nível 1 com XP zero', () => {
      assert.equal(nivelParaXp(CURVA, 0), 1);
    });

    it('só sobe quando o XP alcança o degrau', () => {
      assert.equal(nivelParaXp(CURVA, 279), 1);
      assert.equal(nivelParaXp(CURVA, 280), 2);
    });

    it('pula vários níveis de uma vez quando o ganho é grande', () => {
      assert.equal(nivelParaXp(CURVA, 850), 4);
    });

    it('para no topo da curva em vez de extrapolar', () => {
      assert.equal(nivelParaXp(CURVA, 999999), 4);
    });
  });

  describe('xpDoProximoNivel', () => {
    it('devolve o XP acumulado do degrau seguinte', () => {
      assert.equal(xpDoProximoNivel(CURVA, 1), 280);
      assert.equal(xpDoProximoNivel(CURVA, 3), 800);
    });

    it('devolve null no topo, porque não existe próximo', () => {
      assert.equal(xpDoProximoNivel(CURVA, 4), null);
    });
  });

  describe('bonusDeMelEntreNiveis', () => {
    it('não paga nada quando o nível não mudou', () => {
      assert.equal(bonusDeMelEntreNiveis(CURVA, 2, 2), 0);
    });

    it('paga o bônus do degrau alcançado', () => {
      assert.equal(bonusDeMelEntreNiveis(CURVA, 1, 2), 50);
    });

    it('soma os degraus quando o ganho pula mais de um nível', () => {
      assert.equal(bonusDeMelEntreNiveis(CURVA, 1, 3), 125);
    });
  });

  describe('xpDoNivel', () => {
    it('devolve o XP exigido pelo nível', () => {
      assert.equal(xpDoNivel(CURVA, 3), 520);
    });

    it('recusa nível fora da curva em vez de devolver indefinido', () => {
      assert.throws(() => xpDoNivel(CURVA, 99), /Nível fora da curva/);
    });
  });
});
