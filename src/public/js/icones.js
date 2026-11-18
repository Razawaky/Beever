/**
 * Ícones em SVG usados pela interface inteira.
 *
 * A tela nunca escreve emoji: cada desenho tem um nome estável e sai daqui,
 * tanto no HTML renderizado no servidor quanto no JavaScript do navegador. O
 * `data-icone` anda junto para testes poderem localizar um símbolo sem depender
 * de classe visual.
 */

const CAMINHOS = {
  mel: '<path d="M12 3c2.6 3.2 5 6.3 5 9.3a5 5 0 0 1-10 0C7 9.3 9.4 6.2 12 3Z"/><path d="M9.6 13.4h4.8"/>',
  polen:
    '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="5.8" r="2"/><circle cx="17.4" cy="9.8" r="2"/><circle cx="15.4" cy="16.6" r="2"/><circle cx="8.6" cy="16.6" r="2"/><circle cx="6.6" cy="9.8" r="2"/>',
  patrimonio:
    '<path d="m3 11 9-7 9 7"/><path d="M5.5 9.8V20h13V9.8"/><path d="M10 20v-5h4v5"/>',
  fogo:
    'M12.6 3c.5 2.9-.9 4.2-2 5.6-1.3 1.6-1.8 3-1.2 4.4.3-1.4 1.1-2.3 2-2.9-.2 2.1 1.1 3.4 2.4 4.2 2.4 1.5 3.9 3.5 3.9 5.7a5.7 5.7 0 0 1-11.4 0c0-4.5 3.2-7 6.3-13Z',
  medalha:
    '<circle cx="12" cy="15" r="5"/><path d="m9 10-3-6h5l1 4m3 2 3-6h-5l-1 4"/><path d="m12 13 .9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9 15.1l2-.3L12 13Z"/>',
  cofre:
    '<path d="M3 10h18M12 3l9 5H3l9-5Z"/><path d="M6 10v9m4-9v9m4-9v9m4-9v9M3 20h18"/>',
  quebraCabeca:
    '<path d="M9 4h6v2a2 2 0 1 0 3.7 0H21v6h-2a2 2 0 1 0 0 4h2v6h-6v-2a2 2 0 1 0-4 0V22H5v-6h2a2 2 0 1 0 0-4H5V6h4V4Z"/>',
  gem: '<path d="M7 4h10l4 6-9 11L3 10l4-6Z"/><path d="M3 10h18M8 4l2 6 2 11 2-11 2-6"/>',
  abelha:
    '<ellipse cx="12" cy="13" rx="5" ry="6"/><path d="M9 8c0-2 1.3-3.5 3-3.5S15 6 15 8M9.5 11h5M9.5 14h5M10 17h4M7 9 4.5 7m12.5 2 2.5-2"/>',
  cadeado:
    '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1"/>',
  comemoracao:
    '<path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z"/>',
  calendario:
    '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4m8-4v4M3.5 10h17"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  ampulheta:
    '<path d="M7 3h10M7 21h10M8 3c0 4 4 5 4 9s-4 5-4 9m8-18c0 4-4 5-4 9s4 5 4 9"/>',
  carro:
    '<path d="M5 16h14l-1.5-5H6.5L5 16Z"/><path d="M4 16h16v2H4v-2Zm3 2v1m10-1v1"/><circle cx="8" cy="18" r="1"/><circle cx="16" cy="18" r="1"/>',
  loja: '<path d="M4 10h16v10H4V10Zm1-6h14l2 6H3l2-6Zm5 16v-6h4v6"/>',
  escudo: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-4"/>',
  mochila:
    '<path d="M7 8a5 5 0 0 1 10 0v12H7V8Zm3 0V6a2 2 0 0 1 4 0v2M9 13h6"/>',
  trofeu:
    '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H5v2a3 3 0 0 0 3 3m8-5h3v2a3 3 0 0 1-3 3m-4 5v3m-3 0h6"/>',
  gasto: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h6m-2-2 2 2-2 2m5-4h2m-2 4h2"/>',
  tendenciaBaixa: '<path d="m4 7 6 6 4-4 6 6m0 0h-5m5 0v-5"/>',
  tendenciaAlta: '<path d="m4 17 6-6 4 4 6-6m0 0h-5m5 0v5"/>',
  brilho:
    '<path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z"/>',
  check: '<path d="m5 13 4 4L19 7"/>',
  marcado: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>',
  desmarcado: '<rect x="4" y="4" width="16" height="16" rx="3"/>',
  acessibilidade:
    '<circle cx="12" cy="4" r="2"/><path d="M10 7v6h5l3 5"/><circle cx="11" cy="17" r="4"/><path d="m14 14 4 4"/>',
  setaAcima: '<path d="m6 15 6-6 6 6"/>',
  setaAbaixo: '<path d="m6 9 6 6 6-6"/>',
  setaDireita: '<path d="M9 6l6 6-6 6"/>',
  quadrado: '<rect x="5" y="5" width="14" height="14" rx="3"/>',
};

const CLASSE_PADRAO = 'h-5 w-5 shrink-0';

/**
 * Devolve o SVG como texto, para os templates EJS o escreverem com `<%- %>`.
 */
export function svgIcone(nome, classe = CLASSE_PADRAO) {
  const desenho = CAMINHOS[nome] ?? CAMINHOS.quadrado;
  const conteudo = desenho.startsWith('<') ? desenho : `<path d="${desenho}"/>`;

  return `<svg class="${classe}" data-icone="${nome}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${conteudo}</svg>`;
}

/** A mesma função, mas como nó DOM, para os scripts que montam a tela. */
export function elementoIcone(nome, classe = CLASSE_PADRAO) {
  const modelo = document.createElement('template');
  modelo.innerHTML = svgIcone(nome, classe).trim();
  return modelo.content.firstElementChild;
}
