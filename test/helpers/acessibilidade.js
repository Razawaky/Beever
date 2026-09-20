import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Ferramentas de varredura de acessibilidade, compartilhadas pelos testes.
 *
 * Mora aqui porque a T-14.7 passa a rodar a mesma bateria em todas as telas, e
 * a conta de contraste já era feita em dois lugares diferentes.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tokens = readFileSync(path.join(raiz, 'src/styles/tailwind.css'), 'utf8');

/** Cores que o Tailwind traz prontas e o projeto usa junto com os tokens. */
const CORES_DO_TAILWIND = { white: '#ffffff', black: '#000000' };

/** Lê a cor de um token do `@theme`, que é a fonte da identidade. */
export function corDoToken(nome) {
  if (CORES_DO_TAILWIND[nome]) return CORES_DO_TAILWIND[nome];

  const achado = new RegExp(`--color-${nome}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens);
  assert.ok(achado, `o token --color-${nome} existe no @theme`);
  return achado[1];
}

/** Diz se o nome é cor conhecida, para separar `text-mel` de `text-sm`. */
export function ehCorConhecida(nome) {
  return Boolean(CORES_DO_TAILWIND[nome]) || new RegExp(`--color-${nome}:`).test(tokens);
}

function canais(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

/** Luminância relativa da WCAG: o quanto a cor "acende", não o quanto ela é clara. */
export function luminancia(hex) {
  const [vermelho, verde, azul] = canais(hex).map((canal) => {
    const proporcao = canal / 255;
    return proporcao <= 0.03928 ? proporcao / 12.92 : ((proporcao + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * vermelho + 0.7152 * verde + 0.0722 * azul;
}

export function razaoDeContraste(frente, fundo) {
  const clara = Math.max(luminancia(frente), luminancia(fundo));
  const escura = Math.min(luminancia(frente), luminancia(fundo));
  return (clara + 0.05) / (escura + 0.05);
}

/**
 * Simula como a cor chega a quem tem cada tipo de daltonismo, pelas matrizes de
 * Brettel/Viénot. Não é para desenhar com o resultado: é para conferir se duas
 * cores que precisam ser diferentes continuam diferentes.
 */
export const MATRIZES_DE_DALTONISMO = {
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

export function comDaltonismo(hex, tipo) {
  const [vermelho, verde, azul] = canais(hex);
  const matriz = MATRIZES_DE_DALTONISMO[tipo];

  const convertido = matriz.map((linha) =>
    Math.round(Math.min(255, Math.max(0, linha[0] * vermelho + linha[1] * verde + linha[2] * azul))),
  );

  return `#${convertido.map((canal) => canal.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Recorta as tags de abertura do HTML já renderizado. Só serve para HTML de
 * verdade: em `.ejs` cru o `%>` faz o recorte parar no lugar errado.
 */
function tagsDeAbertura(html, nomes) {
  return html.match(new RegExp(`<(?:${nomes.join('|')})\\b[^>]*>`, 'g')) ?? [];
}

function atributo(tag, nome) {
  const achado = new RegExp(`${nome}="([^"]*)"`).exec(tag);
  return achado ? achado[1] : null;
}

/**
 * Tudo que recebe teclado numa página. Âncora sem `href` é alvo de rolagem e
 * campo escondido não é focável, então nenhum dos dois entra.
 */
export function elementosFocaveis(html) {
  const tags = tagsDeAbertura(html, ['a', 'button', 'summary', 'input', 'select', 'textarea']);

  return tags.filter((tag) => {
    if (tag.startsWith('<a') && !tag.includes('href=')) return false;
    if (tag.startsWith('<input') && atributo(tag, 'type') === 'hidden') return false;
    if (tag.includes('tabindex="-1"')) return false;
    return true;
  });
}

/**
 * Apaga o foco quem escreve `outline-none` e não põe nada no lugar. O contorno
 * padrão vem do `tema.css` e vale para toda tela, então o que sobra é procurar
 * quem o desliga.
 */
export function apagaOFoco(tag) {
  const classes = (atributo(tag, 'class') ?? '').split(/\s+/);
  const desliga = classes.some((classe) => /^(focus(-visible)?:)?outline-none$/.test(classe));
  if (!desliga) return false;

  const repoe = classes.some(
    (classe) => /^focus(-visible)?:/.test(classe) && /(outline-\[|outline-[a-z]|ring|border-)/.test(classe),
  );

  return !repoe;
}

/**
 * Alvo de toque de 44 px (RNF-22). Cobra só de quem se parece com botão, porque
 * link dentro de frase é exceção da própria WCAG e não deve virar bloco.
 */
export function pareceBotao(tag) {
  const classes = atributo(tag, 'class') ?? '';
  if (tag.startsWith('<input')) return ['submit', 'button', 'reset'].includes(atributo(tag, 'type') ?? '');
  if (tag.startsWith('<button')) return true;
  return /rounded-(favo|pilula)/.test(classes) && /(bg-|border)/.test(classes);
}

export function temAlvoDeToque(tag) {
  // Altura declarada resolve sozinha; padding vertical de 12 px para cada lado
  // soma 44 px com uma linha de texto, que é o menor caso do projeto.
  return (atributo(tag, 'class') ?? '').split(/\s+/).some((classe) => {
    const semVariante = classe.replace(/^[a-z-]+:/, '');
    const altura = /^(?:min-)?h-(\d+)$/.exec(semVariante);
    if (altura) return Number(altura[1]) >= 11;

    const espaco = /^p[y]?-(\d+)$/.exec(semVariante);
    return Boolean(espaco) && Number(espaco[1]) >= 3;
  });
}

/** Os níveis de título na ordem em que aparecem, para achar salto e h1 repetido. */
export function niveisDeTitulo(html) {
  return (html.match(/<h[1-6]\b/g) ?? []).map((titulo) => Number(titulo.slice(2)));
}

/**
 * Campos sem nome que o leitor de tela consiga ler. Botão e campo escondido
 * ficam de fora: o texto deles já é o nome.
 */
export function camposSemRotulo(html) {
  const rotulos = new Set(
    (html.match(/<label\b[^>]*for="([^"]+)"/g) ?? []).map((rotulo) => atributo(rotulo, 'for')),
  );

  // Campo escrito dentro do próprio `<label>` também tem nome, e é o formato que
  // as caixas de marcar do projeto usam.
  const envolvidos = new Set();
  for (const rotulo of html.match(/<label\b[\s\S]*?<\/label>/g) ?? []) {
    for (const campo of tagsDeAbertura(rotulo, ['input', 'select', 'textarea'])) envolvidos.add(campo);
  }

  return tagsDeAbertura(html, ['input', 'select', 'textarea']).filter((tag) => {
    const tipo = atributo(tag, 'type');
    if (tag.startsWith('<input') && ['hidden', 'submit', 'button', 'reset'].includes(tipo ?? '')) return false;
    if (atributo(tag, 'aria-label') || atributo(tag, 'aria-labelledby')) return false;
    if (envolvidos.has(tag)) return false;
    return !rotulos.has(atributo(tag, 'id'));
  });
}

/**
 * Pares de cor escritos no mesmo elemento, que são os únicos que dá para julgar
 * sem navegador: fundo herdado exigiria montar a árvore inteira.
 */
export function paresDeCorNoMesmoElemento(html) {
  const pares = [];

  for (const tag of html.match(/<[a-z][a-z0-9]*\b[^>]*class="[^"]*"[^>]*>/g) ?? []) {
    const classes = (atributo(tag, 'class') ?? '').split(/\s+/);
    const fundo = classes.find((classe) => /^bg-[a-z-]+$/.test(classe))?.slice(3);
    const frente = classes.find((classe) => /^text-[a-z-]+$/.test(classe))?.slice(5);

    if (!fundo || !frente) continue;
    if (!ehCorConhecida(fundo) || !ehCorConhecida(frente)) continue;

    pares.push({ fundo, frente, tag });
  }

  return pares;
}

/**
 * Larguras fixas maiores que a tela de 320 px da RNF-20. Tabela larga é o caso
 * legítimo, e por isso a conferência dela é separada.
 */
export function largurasFixasDemais(html, minimo = 320) {
  return (html.match(/(?:min-)?w-\[(\d+)px\]/g) ?? []).filter(
    (classe) => Number(/(\d+)/.exec(classe)[1]) > minimo,
  );
}

/**
 * Tabela precisa de rolagem horizontal própria, senão ela é quem estica a
 * página inteira no celular. O invólucro é procurado nos 400 caracteres
 * anteriores, que é onde ele fica quando existe.
 */
export function tabelasSemRolagem(html) {
  const semRolagem = [];
  let posicao = html.indexOf('<table');

  while (posicao !== -1) {
    const antes = html.slice(Math.max(0, posicao - 400), posicao);
    if (!antes.includes('overflow-x-auto')) {
      semRolagem.push(html.slice(posicao, posicao + 120).replace(/\s+/g, ' '));
    }
    posicao = html.indexOf('<table', posicao + 1);
  }

  return semRolagem;
}
