// Composição visual do quarto.
//
// Cada parede é um PNG 600×600 que ocupa o palco inteiro. Os itens são outros
// PNGs do mesmo tamanho, com transparência, desenhados exatamente na mesma
// posição. Isso mantém o alinhamento definido pela arte.
//
// O estado é consultado para escolher as camadas visíveis: itens que saíram do
// cenário, móveis abertos/fechados, cama arrumada e cortina aberta.

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';
import { ARTE } from './dadosDoQuarto.js';
import { estado } from './estadoDoJogo.js';

export const LARGURA = 600;
export const ALTURA = 600;

export const CORES = {
  fundo: 0x1b1508,
  painel: 0x241d0b,
  mel: 0xffc200,
  nectar: 0xffde00,
  creme: 0xf5e8c8,
  tinta: 0x241d0b,
  tintaSuave: 0x6b5a35,
  parede: 0xf4e4c3,
  paredeSombra: 0xb89a68,
  piso: 0xc98d55,
  pisoLinha: 0x8b5a2b,
  rodape: 0x9b6a3d,
  madeira: 0x9b6a3d,
  madeiraEscura: 0x7b4d2b,
  madeiraClara: 0xb97a45,
  azul: 0x5b8def,
  azulEscuro: 0x3e68c9,
  verde: 0x3fbf6f,
  verdeEscuro: 0x2f8f87,
  vermelho: 0xff6b6b,
  branco: 0xfff8e8,
  cera: 0xfffdf7,
};

// Mesmo efeito do `.mascote-stroke` do app: um contorno claro de 2 px em volta
// da silhueta. Como o Phaser não aplica filtros CSS, a silhueta branca é
// carimbada algumas vezes em volta e vira uma textura própria.
const DESLOCAMENTOS_DO_CONTORNO = [
  [-2, 0],
  [2, 0],
  [0, -2],
  [0, 2],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

export const FONTES = {
  texto: '"Beever Texto", system-ui, sans-serif',
  display: '"Beever Display", Georgia, serif',
};

export function desenharFavo(grafico, x, y, largura, altura, cor, alpha, raio = 42) {
  grafico.lineStyle(2, cor, alpha);

  const passoX = raio * Math.sqrt(3);
  const passoY = raio * 1.5;
  const colunas = Math.ceil(largura / passoX) + 2;
  const linhas = Math.ceil(altura / passoY) + 2;

  for (let linha = -1; linha < linhas; linha += 1) {
    for (let coluna = -1; coluna < colunas; coluna += 1) {
      const deslocamento = linha % 2 === 0 ? 0 : passoX / 2;
      const centroX = x + coluna * passoX + deslocamento;
      const centroY = y + linha * passoY;
      const hexagono = [];

      for (let lado = 0; lado < 6; lado += 1) {
        const angulo = (Math.PI / 3) * lado + Math.PI / 6;
        hexagono.push(
          new Phaser.Geom.Point(
            centroX + raio * Math.cos(angulo),
            centroY + raio * Math.sin(angulo),
          ),
        );
      }

      grafico.strokePoints(hexagono, true);
    }
  }
}

export function criarFundoEscuro(cena, container = cena.add.container(0, 0)) {
  const grafico = cena.add.graphics();
  container.add(grafico);

  grafico.fillStyle(CORES.fundo, 1).fillRect(0, 0, LARGURA, ALTURA);
  grafico.fillStyle(0x3a2c0b, 0.38).fillCircle(LARGURA / 2, ALTURA / 2, 320);
  desenharFavo(grafico, -40, -40, LARGURA + 80, ALTURA + 80, CORES.mel, 0.045, 42);
  grafico.fillStyle(CORES.fundo, 0.45).fillRect(0, 0, LARGURA, 18);
  grafico.fillStyle(CORES.fundo, 0.45).fillRect(0, ALTURA - 18, LARGURA, 18);

  return grafico;
}

function criarCanvasDeContorno(origem) {
  const silhueta = document.createElement('canvas');
  silhueta.width = origem.width;
  silhueta.height = origem.height;

  const contextoDaSilhueta = silhueta.getContext('2d');
  contextoDaSilhueta.drawImage(origem, 0, 0);
  contextoDaSilhueta.globalCompositeOperation = 'source-in';
  contextoDaSilhueta.fillStyle = '#fffdf7';
  contextoDaSilhueta.fillRect(0, 0, silhueta.width, silhueta.height);

  const contorno = document.createElement('canvas');
  contorno.width = silhueta.width;
  contorno.height = silhueta.height;

  const contexto = contorno.getContext('2d');
  DESLOCAMENTOS_DO_CONTORNO.forEach(([x, y]) => {
    contexto.drawImage(silhueta, x, y);
  });

  return contorno;
}

export function garantirTexturaDeContorno(cena, chave) {
  const chaveDoContorno = `${chave}--contorno`;
  if (cena.textures.exists(chaveDoContorno)) return chaveDoContorno;

  const origem = cena.textures.get(chave)?.getSourceImage?.();
  if (!origem) return null;

  cena.textures.addCanvas(chaveDoContorno, criarCanvasDeContorno(origem));
  return chaveDoContorno;
}

/**
 * Cada visual da parede é uma camada declarativa. A condição decide se ele
 * aparece no estado atual:
 *   item-nao-colocado → ainda está no cenário (e não está na mão);
 *   item-colocado     → já foi guardado no móvel;
 *   tarefa-aberta     → a atividade ainda não foi concluída;
 *   tarefa-concluida  → a atividade já foi concluída.
 */
function deveDesenhar(visual) {
  switch (visual.quando) {
    case 'item-nao-colocado':
      return !estado.itens[visual.item] && estado.carregando !== visual.item;
    case 'item-colocado':
      return Boolean(estado.itens[visual.item]);
    case 'tarefa-aberta':
      return !estado.tarefas[visual.tarefa];
    case 'tarefa-concluida':
      return Boolean(estado.tarefas[visual.tarefa]);
    default:
      return true;
  }
}

function visuaisDaParede(parede) {
  if (Array.isArray(parede.visuais)) return parede.visuais;

  // Compatibilidade com paredes antigas que ainda descrevem a imagem no
  // próprio hotspot. As paredes atuais usam `visuais` para permitir camadas
  // como cama + travesseiro + coberta.
  return parede.hotspots
    .filter((hotspot) => hotspot.imagem)
    .map((hotspot) => ({
      id: hotspot.id,
      imagem:
        hotspot.tarefa && estado.tarefas[hotspot.tarefa] && hotspot.imagemConcluida
          ? hotspot.imagemConcluida
          : hotspot.imagem,
    }));
}

export function desenharParede(cena, container, parede) {
  // A arte ocupa o palco inteiro: não há moldura nem sobra lateral.
  const fundo = cena.add
    .image(ARTE.x, ARTE.y, parede.fundo)
    .setOrigin(0, 0)
    .setDisplaySize(ARTE.largura, ARTE.altura);
  container.add(fundo);

  const itens = new Map();

  visuaisDaParede(parede).forEach((visual) => {
    if (!deveDesenhar(visual)) return;

    const chave = visual.imagem;
    if (!chave) return;

    const grupo = cena.add.container(ARTE.x, ARTE.y);
    const chaveDoContorno = visual.decorativo ? null : garantirTexturaDeContorno(cena, chave);
    let contorno = null;

    if (chaveDoContorno) {
      contorno = cena.add
        .image(0, 0, chaveDoContorno)
        .setOrigin(0, 0)
        .setDisplaySize(ARTE.largura, ARTE.altura)
        .setVisible(false);
      grupo.add(contorno);
    }

    const item = cena.add
      .image(0, 0, chave)
      .setOrigin(0, 0)
      .setDisplaySize(ARTE.largura, ARTE.altura);
    grupo.add(item);
    container.add(grupo);
    if (visual.id && !visual.decorativo) itens.set(visual.id, { item, contorno });
  });

  return itens;
}
