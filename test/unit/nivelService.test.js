import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aplicarXp, calcularXpProximoNivel } from '../../src/services/nivelService.js';

describe('nivelService', () => {
  describe('calcularXpProximoNivel', () => {
    it('cresce linearmente com o nível', () => {
      assert.equal(calcularXpProximoNivel(1), 1000);
      assert.equal(calcularXpProximoNivel(5), 5000);
    });
  });

  describe('aplicarXp', () => {
    const inicial = { nivel: 1, xpAtual: 0, xpProximoNivel: 1000 };

    it('acumula XP sem subir de nível quando não atinge o limite', () => {
      const resultado = aplicarXp(inicial, 300);
      assert.deepEqual(resultado, { nivel: 1, xpAtual: 300, xpProximoNivel: 1000, subiuDeNivel: false });
    });

    it('sobe de nível e carrega o excedente', () => {
      const resultado = aplicarXp(inicial, 1200);
      assert.equal(resultado.nivel, 2);
      assert.equal(resultado.xpAtual, 200);
      assert.equal(resultado.xpProximoNivel, 2000);
      assert.equal(resultado.subiuDeNivel, true);
    });

    it('sobe vários níveis de uma vez quando o ganho é grande', () => {
      // 1000 sobe para o nível 2, mais 2000 sobe para o 3, sobrando 500.
      const resultado = aplicarXp(inicial, 3500);
      assert.equal(resultado.nivel, 3);
      assert.equal(resultado.xpAtual, 500);
    });

    it('sobe exatamente um nível quando o XP bate no limite', () => {
      const resultado = aplicarXp(inicial, 1000);
      assert.equal(resultado.nivel, 2);
      assert.equal(resultado.xpAtual, 0);
    });

    it('recusa XP negativo ou fracionado', () => {
      assert.throws(() => aplicarXp(inicial, -10), /não negativo/);
      assert.throws(() => aplicarXp(inicial, 1.5), /não negativo/);
    });
  });
});
