import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MATRIZES_DE_DALTONISMO,
  comDaltonismo,
  corDoToken,
  luminancia,
  razaoDeContraste,
} from '../helpers/acessibilidade.js';

/**
 * O contraste da identidade, conferido por conta e não por impressão (RNF-21).
 *
 * São duas perguntas diferentes. A primeira é se o texto se lê: razão de 4,5:1
 * para texto normal, que é o piso da WCAG AA. A segunda é se as cores que
 * precisam ser distinguidas entre si continuam distinguíveis para quem tem
 * daltonismo — e essa não se responde olhando, porque quem escreve o código
 * geralmente enxerga as três cores.
 *
 * Aqui se julga a paleta; se as telas usam pares aprovados é o que a
 * `acessibilidadeDasTelas` confere, com a mesma conta vinda do mesmo helper.
 */

describe('contraste da identidade', () => {
  it('todo texto da interface alcança 4,5:1 sobre o próprio fundo (RNF-21)', () => {
    const PARES = [
      { frente: corDoToken('tinta'), fundo: corDoToken('cera'), onde: 'texto do app' },
      { frente: corDoToken('tinta-suave'), fundo: corDoToken('cera'), onde: 'texto de apoio' },
      { frente: corDoToken('tinta'), fundo: '#ffffff', onde: 'texto dentro de card' },
      { frente: corDoToken('tinta'), fundo: corDoToken('mel'), onde: 'texto sobre botão' },
      { frente: corDoToken('cera'), fundo: corDoToken('breu'), onde: 'texto da landing' },
      { frente: corDoToken('mel'), fundo: corDoToken('breu'), onde: 'destaque da landing' },
      { frente: corDoToken('acerto-texto'), fundo: corDoToken('cera'), onde: 'palavra de acerto' },
      { frente: corDoToken('atencao-texto'), fundo: corDoToken('cera'), onde: 'palavra de atenção' },
      { frente: corDoToken('erro-texto'), fundo: corDoToken('cera'), onde: 'palavra de erro' },
    ];

    for (const par of PARES) {
      const razao = razaoDeContraste(par.frente, par.fundo);
      assert.ok(
        razao >= 4.5,
        `${par.onde}: ${par.frente} sobre ${par.fundo} dá ${razao.toFixed(2)}:1, abaixo de 4,5:1`,
      );
    }
  });

  it('amarelo nunca é texto sobre fundo claro, e o teste prova por que', () => {
    // A regra da seção 2.2 do design system não é gosto: o mel sobre cera
    // reprova, e é por isso que ele só existe como preenchimento.
    const razao = razaoDeContraste(corDoToken('mel'), corDoToken('cera'));
    assert.ok(razao < 4.5, `o mel sobre cera daria ${razao.toFixed(2)}:1 — se passar, a regra mudou`);
  });

  it('acerto, atenção e erro continuam distinguíveis com daltonismo', () => {
    // Verde e vermelho são a mesma cor para boa parte de quem tem deuteranopia
    // ou protanopia. O que os separa é a luminância — e é ela que precisa
    // sobreviver à simulação, porque a forma e a palavra já vêm por regra.
    const semanticas = ['acerto-texto', 'atencao-texto', 'erro-texto'].map(corDoToken);

    for (const tipo of Object.keys(MATRIZES_DE_DALTONISMO)) {
      const vistas = semanticas.map((cor) => comDaltonismo(cor, tipo));

      for (let i = 0; i < vistas.length; i += 1) {
        for (let j = i + 1; j < vistas.length; j += 1) {
          const distancia = Math.abs(luminancia(vistas[i]) - luminancia(vistas[j]));
          assert.ok(
            distancia >= 0.02,
            `com ${tipo}, ${semanticas[i]} e ${semanticas[j]} viram ${vistas[i]} e ${vistas[j]}, ` +
              `com diferença de luminância de ${distancia.toFixed(4)} — perto demais para diferenciar`,
          );
        }
      }
    }
  });

  it('as cores semânticas continuam legíveis com daltonismo, e não só diferentes', () => {
    const fundo = corDoToken('cera');

    for (const tipo of Object.keys(MATRIZES_DE_DALTONISMO)) {
      for (const nome of ['acerto-texto', 'atencao-texto', 'erro-texto']) {
        const razao = razaoDeContraste(comDaltonismo(corDoToken(nome), tipo), fundo);
        assert.ok(razao >= 4.5, `com ${tipo}, ${nome} cai para ${razao.toFixed(2)}:1 sobre cera`);
      }
    }
  });
});
