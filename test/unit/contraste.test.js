import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * O contraste da identidade, conferido por conta e não por impressão (RNF-21).
 *
 * São duas perguntas diferentes. A primeira é se o texto se lê: razão de 4,5:1
 * para texto normal, que é o piso da WCAG AA. A segunda é se as cores que
 * precisam ser distinguidas entre si continuam distinguíveis para quem tem
 * daltonismo — e essa não se responde olhando, porque quem escreve o código
 * geralmente enxerga as três cores.
 *
 * Os valores saem do `@theme` do `tailwind.css`, que é a fonte da identidade:
 * se alguém trocar um token lá, este teste é quem reclama.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tokens = readFileSync(path.join(raiz, 'src/styles/tailwind.css'), 'utf8');

function corDoToken(nome) {
  const achado = new RegExp(`--color-${nome}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens);
  assert.ok(achado, `o token --color-${nome} existe no @theme`);
  return achado[1];
}

function canais(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

/** Luminância relativa da WCAG: o quanto a cor "acende", não o quanto ela é clara. */
function luminancia(hex) {
  const [vermelho, verde, azul] = canais(hex).map((canal) => {
    const proporcao = canal / 255;
    return proporcao <= 0.03928 ? proporcao / 12.92 : ((proporcao + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * vermelho + 0.7152 * verde + 0.0722 * azul;
}

function razaoDeContraste(frente, fundo) {
  const clara = Math.max(luminancia(frente), luminancia(fundo));
  const escura = Math.min(luminancia(frente), luminancia(fundo));
  return (clara + 0.05) / (escura + 0.05);
}

/**
 * Simula como a cor chega a quem tem cada tipo de daltonismo, pelas matrizes de
 * Brettel/Viénot. Não é para desenhar com o resultado: é para conferir se duas
 * cores que precisam ser diferentes continuam diferentes.
 */
const MATRIZES = {
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7],
  ],
  protanopia: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0.242, 0.758],
  ],
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.433, 0.567],
    [0, 0.475, 0.525],
  ],
};

function comDaltonismo(hex, tipo) {
  const [vermelho, verde, azul] = canais(hex);
  const matriz = MATRIZES[tipo];

  const convertido = matriz.map((linha) =>
    Math.round(Math.min(255, Math.max(0, linha[0] * vermelho + linha[1] * verde + linha[2] * azul))),
  );

  return `#${convertido.map((canal) => canal.toString(16).padStart(2, '0')).join('')}`;
}

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

    for (const tipo of Object.keys(MATRIZES)) {
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

    for (const tipo of Object.keys(MATRIZES)) {
      for (const nome of ['acerto-texto', 'atencao-texto', 'erro-texto']) {
        const razao = razaoDeContraste(comDaltonismo(corDoToken(nome), tipo), fundo);
        assert.ok(razao >= 4.5, `com ${tipo}, ${nome} cai para ${razao.toFixed(2)}:1 sobre cera`);
      }
    }
  });
});
