// Desenho do quarto em quatro ângulos.
//
// Tudo é desenhado com formas do Phaser para a demo não depender de imagens
// de cenário. Cada função recebe um container e devolve a parede pronta.
// O estado só é consultado para mostrar o objeto já arrumado depois da tarefa.

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';
import { estado } from './estadoDoJogo.js';

export const LARGURA = 960;
export const ALTURA = 600;
export const ALTURA_DO_HUD = 72;
export const BASE_DO_CHAO = 380;

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
};

export const FONTES = {
  texto: '"Beever Texto", system-ui, sans-serif',
  display: '"Beever Display", Georgia, serif',
};

function pontos(...coordenadas) {
  const lista = [];
  for (let indice = 0; indice < coordenadas.length; indice += 2) {
    lista.push(new Phaser.Geom.Point(coordenadas[indice], coordenadas[indice + 1]));
  }
  return lista;
}

export function texto(cena, container, x, y, conteudo, opcoes = {}) {
  const objeto = cena.add.text(x, y, conteudo, {
    fontFamily: FONTES.texto,
    fontSize: '14px',
    color: '#241d0b',
    ...opcoes,
  });
  container.add(objeto);
  return objeto;
}

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
  grafico.fillStyle(0x3a2c0b, 0.38).fillCircle(LARGURA / 2, ALTURA / 2, 300);
  desenharFavo(grafico, -40, -40, LARGURA + 80, ALTURA + 80, CORES.mel, 0.045, 42);
  grafico.fillStyle(CORES.fundo, 0.45).fillRect(0, 0, LARGURA, 18);
  grafico.fillStyle(CORES.fundo, 0.45).fillRect(0, ALTURA - 18, LARGURA, 18);

  return grafico;
}

export function criarFundoDaParede(cena, container) {
  const grafico = cena.add.graphics();
  container.add(grafico);

  grafico.fillStyle(CORES.parede, 1).fillRect(0, 0, LARGURA, BASE_DO_CHAO);
  grafico.fillStyle(0xffffff, 0.1).fillEllipse(480, 34, 940, 280);
  grafico.fillStyle(CORES.paredeSombra, 0.14).fillRect(0, 0, LARGURA, 100);
  grafico.fillStyle(CORES.piso, 1).fillRect(0, BASE_DO_CHAO, LARGURA, ALTURA - BASE_DO_CHAO);
  grafico.fillStyle(CORES.rodape, 1).fillRect(0, BASE_DO_CHAO - 12, LARGURA, 12);
  grafico.fillStyle(0xffffff, 0.18).fillRect(0, BASE_DO_CHAO - 12, LARGURA, 3);

  grafico.lineStyle(1, CORES.pisoLinha, 0.28);
  for (let x = -120; x <= 1080; x += 120) {
    grafico.lineBetween(480 + (x - 480) * 0.3, BASE_DO_CHAO + 1, x, ALTURA);
  }

  grafico.lineStyle(1, CORES.pisoLinha, 0.16);
  for (let linha = 1; linha <= 4; linha += 1) {
    const y = BASE_DO_CHAO + linha * 26;
    grafico.lineBetween(0, y, LARGURA, y);
  }

  return grafico;
}

function seloConcluido(cena, container, x, y) {
  const grafico = cena.add.graphics();
  container.add(grafico);
  grafico.fillStyle(CORES.verde, 1).fillCircle(x, y, 12);
  grafico.lineStyle(2, 0xffffff, 0.9).strokeCircle(x, y, 12);

  const marca = cena.add
    .text(x, y, '✓', {
      fontFamily: FONTES.texto,
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  container.add(marca);
}

function desenharFrente(cena, container) {
  const grafico = criarFundoDaParede(cena, container);

  // Quadro com o desenho de uma abelha.
  grafico.fillStyle(CORES.branco, 0.55).fillRoundedRect(512, 112, 112, 112, 14);
  grafico.lineStyle(4, CORES.madeira, 1).strokeRoundedRect(512, 112, 112, 112, 14);
  grafico.fillStyle(CORES.mel, 0.9).fillCircle(568, 168, 31);
  grafico.fillStyle(CORES.tinta, 0.82).fillCircle(557, 162, 4);
  grafico.fillStyle(CORES.tinta, 0.82).fillCircle(579, 162, 4);
  grafico.lineStyle(3, CORES.tinta, 0.8).lineBetween(557, 181, 579, 181);
  grafico.fillStyle(0xffffff, 0.6).fillEllipse(550, 144, 24, 16);
  grafico.fillStyle(0xffffff, 0.6).fillEllipse(586, 144, 24, 16);

  // Tapete.
  grafico.fillStyle(0x63b7af, 1).fillRoundedRect(266, 404, 510, 82, 32);
  grafico.lineStyle(4, CORES.verdeEscuro, 1).strokeRoundedRect(266, 404, 510, 82, 32);
  grafico.lineStyle(2, 0xffffff, 0.2);
  for (let faixa = 0; faixa < 4; faixa += 1) {
    grafico.lineBetween(310 + faixa * 112, 414, 290 + faixa * 112, 476);
  }

  // Sombra e estrutura da cama.
  grafico.fillStyle(0x000000, 0.12).fillEllipse(278, 392, 400, 42);
  grafico.fillStyle(CORES.madeiraEscura, 1).fillRoundedRect(84, 214, 58, 166, 14);
  grafico.fillStyle(CORES.madeiraClara, 1).fillRoundedRect(94, 224, 38, 142, 10);
  grafico.fillStyle(CORES.madeiraEscura, 1).fillRoundedRect(122, 368, 18, 30, 5);
  grafico.fillStyle(CORES.madeiraEscura, 1).fillRoundedRect(432, 368, 18, 30, 5);
  grafico.fillStyle(CORES.madeira, 1).fillRoundedRect(120, 306, 330, 84, 12);
  grafico.fillStyle(CORES.madeiraEscura, 1).fillRoundedRect(120, 368, 330, 22, 8);
  grafico.fillStyle(CORES.branco, 1).fillRoundedRect(128, 286, 318, 68, 16);
  grafico.lineStyle(2, 0xd9c79c, 1).strokeRoundedRect(128, 286, 318, 68, 16);

  // Travesseiro.
  grafico.fillStyle(0xffffff, 1).fillRoundedRect(146, 264, 104, 50, 18);
  grafico.lineStyle(2, 0xe3d3b0, 1).strokeRoundedRect(146, 264, 104, 50, 18);

  // Cobertor: bagunçado ou dobrado.
  if (estado.tarefas.cama) {
    grafico.fillStyle(CORES.azul, 1).fillRoundedRect(236, 280, 204, 74, 12);
    grafico.fillStyle(0x7ea5ff, 1).fillRoundedRect(236, 280, 204, 20, 10);
    grafico.lineStyle(2, CORES.azulEscuro, 1).strokeRoundedRect(236, 280, 204, 74, 12);
    grafico.lineStyle(2, CORES.azulEscuro, 0.45).lineBetween(236, 310, 440, 310);
    seloConcluido(cena, container, 444, 246);
  } else {
    const cobertor = pontos(
      240,
      286,
      438,
      280,
      448,
      344,
      332,
      358,
      258,
      338,
      228,
      310,
    );
    grafico.fillStyle(CORES.azul, 1).fillPoints(cobertor, true);
    grafico.lineStyle(3, CORES.azulEscuro, 1).strokePoints(cobertor, true);
    grafico.lineStyle(3, 0x7ea5ff, 0.75);
    grafico.lineBetween(270, 300, 350, 345);
    grafico.lineBetween(330, 292, 415, 338);
    grafico.lineBetween(300, 318, 365, 348);
    grafico.fillStyle(CORES.azul, 1).fillPoints(pontos(430, 330, 456, 338, 448, 378, 424, 366), true);
  }

  // Janela com cortina.
  grafico.fillStyle(CORES.madeira, 1).fillRoundedRect(636, 112, 198, 164, 12);
  grafico.fillStyle(0x8fd3ff, 1).fillRoundedRect(648, 124, 174, 140, 8);
  grafico.fillStyle(0xffe28a, 1).fillCircle(780, 158, 22);
  grafico.fillStyle(0xffffff, 0.85).fillEllipse(692, 172, 58, 22);
  grafico.fillStyle(0xffffff, 0.7).fillEllipse(720, 180, 40, 16);
  grafico.lineStyle(3, CORES.madeira, 1);
  grafico.lineBetween(735, 124, 735, 264);
  grafico.lineBetween(648, 194, 822, 194);
  grafico.fillStyle(CORES.mel, 0.9).fillPoints(pontos(626, 112, 666, 112, 650, 276, 626, 276), true);
  grafico.fillStyle(CORES.mel, 0.9).fillPoints(pontos(846, 112, 806, 112, 822, 276, 846, 276), true);
  grafico.fillStyle(CORES.madeira, 1).fillRoundedRect(620, 268, 230, 16, 6);

  // Caixa de brinquedos.
  const todosOsBrinquedos = ['brinquedo-bola', 'brinquedo-bloco', 'brinquedo-foguete'].every(
    (id) => estado.tarefas[id],
  );
  grafico.fillStyle(0x000000, 0.12).fillEllipse(770, 480, 200, 24);
  grafico.fillStyle(0xd08a4a, 1).fillRoundedRect(682, 398, 176, 82, 10);
  grafico.fillStyle(0xb9753b, 1).fillRect(682, 458, 176, 22);
  grafico.lineStyle(3, CORES.madeiraEscura, 1).strokeRoundedRect(682, 398, 176, 82, 10);
  grafico.lineStyle(2, CORES.madeiraEscura, 1).lineBetween(682, 458, 858, 458);
  if (todosOsBrinquedos) {
    grafico.fillStyle(0xe3a35d, 1).fillRoundedRect(674, 386, 192, 20, 8);
    seloConcluido(cena, container, 858, 374);
  } else {
    grafico.fillStyle(0xe3a35d, 1).fillPoints(pontos(674, 386, 866, 392, 858, 412, 674, 406), true);
  }
  texto(cena, container, 770, 440, 'BRINQUEDOS', {
    fontFamily: FONTES.texto,
    fontSize: '12px',
    color: '#7b4d2b',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  // Bola.
  if (!estado.tarefas['brinquedo-bola']) {
    grafico.fillStyle(CORES.vermelho, 1).fillCircle(338, 438, 23);
    grafico.fillStyle(0xffffff, 0.9).fillCircle(338, 438, 9);
    grafico.lineStyle(3, 0xc94f4f, 1).strokeCircle(338, 438, 23);
    grafico.lineStyle(2, 0xffffff, 0.7).lineBetween(320, 430, 356, 446);
  }

  // Bloco.
  if (!estado.tarefas['brinquedo-bloco']) {
    const bloco = cena.add
      .rectangle(414, 440, 46, 46, 0xffd166)
      .setStrokeStyle(3, 0xbf8a00)
      .setAngle(-8);
    container.add(bloco);
    texto(cena, container, 414, 440, 'A', {
      fontSize: '24px',
      color: '#7b4d2b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // Foguete.
  if (!estado.tarefas['brinquedo-foguete']) {
    grafico.fillStyle(0x7bd389, 1).fillRoundedRect(486, 408, 34, 48, 10);
    grafico.fillStyle(CORES.vermelho, 1).fillTriangle(486, 408, 520, 408, 503, 382);
    grafico.fillStyle(0xffffff, 1).fillCircle(503, 430, 9);
    grafico.fillStyle(CORES.azulEscuro, 1).fillCircle(503, 430, 5);
    grafico.fillStyle(CORES.mel, 1).fillTriangle(490, 456, 516, 456, 503, 483);
    grafico.lineStyle(2, 0x4f9e60, 1).lineBetween(486, 438, 520, 438);
  }
}

function desenharDireita(cena, container) {
  const grafico = criarFundoDaParede(cena, container);

  // Mural de recados.
  grafico.fillStyle(CORES.madeira, 1).fillRoundedRect(644, 98, 204, 142, 12);
  grafico.fillStyle(0xd9b07a, 1).fillRoundedRect(654, 108, 184, 122, 8);
  const recados = [
    { x: 682, y: 130, cor: 0xfff3b0, angulo: -6 },
    { x: 730, y: 138, cor: 0xffb3b3, angulo: 5 },
    { x: 690, y: 178, cor: 0xbfe6ff, angulo: 4 },
  ];
  recados.forEach((recado) => {
    const nota = cena.add
      .rectangle(recado.x, recado.y, 42, 34, recado.cor)
      .setAngle(recado.angulo)
      .setStrokeStyle(1, 0x9b6a3d, 0.4);
    container.add(nota);
  });

  // Cadeira atrás da mesa.
  grafico.fillStyle(CORES.madeiraEscura, 1).fillRoundedRect(204, 270, 20, 92, 6);
  grafico.fillStyle(0xa96b3e, 1).fillRoundedRect(194, 344, 112, 18, 8);
  grafico.fillStyle(CORES.madeiraEscura, 1).fillRect(206, 362, 10, 86);
  grafico.fillStyle(CORES.madeiraEscura, 1).fillRect(290, 362, 10, 86);

  // Mesa de estudos.
  grafico.fillStyle(0x000000, 0.1).fillEllipse(502, 480, 444, 28);
  grafico.fillStyle(CORES.madeira, 1).fillRoundedRect(300, 300, 420, 26, 10);
  grafico.fillStyle(CORES.madeiraEscura, 1).fillRoundedRect(300, 322, 420, 14, 6);
  grafico.fillStyle(0x8d5a2d, 1).fillRect(320, 334, 16, 140);
  grafico.fillStyle(0x8d5a2d, 1).fillRect(684, 334, 16, 140);
  grafico.fillStyle(CORES.madeiraClara, 1).fillRoundedRect(590, 336, 100, 54, 8);
  grafico.lineStyle(2, CORES.madeiraEscura, 1).strokeRoundedRect(590, 336, 100, 54, 8);
  grafico.fillStyle(CORES.mel, 1).fillCircle(640, 362, 5);

  // Luminária.
  grafico.fillStyle(0xffe28a, 0.13).fillCircle(650, 214, 76);
  grafico.fillStyle(CORES.mel, 1).fillCircle(650, 294, 24);
  grafico.fillStyle(CORES.mel, 1).fillRoundedRect(642, 220, 16, 62, 6);
  grafico.fillStyle(CORES.mel, 1).fillTriangle(616, 220, 684, 220, 650, 184);
  grafico.lineStyle(3, 0x9a7400, 1).strokeTriangle(616, 220, 684, 220, 650, 184);

  // Livros: espalhados ou organizados.
  if (estado.tarefas.livros) {
    const cores = [0xff6b6b, 0x5b8def, 0xffd166, 0x7bd389];
    cores.forEach((cor, indice) => {
      grafico.fillStyle(cor, 1).fillRoundedRect(376, 282 - indice * 15, 128 - indice * 8, 13, 4);
      grafico.lineStyle(1, 0x000000, 0.16).strokeRoundedRect(
        376,
        282 - indice * 15,
        128 - indice * 8,
        13,
        4,
      );
    });
    seloConcluido(cena, container, 538, 278);
  } else {
    const livros = [
      { x: 390, y: 280, cor: 0xff6b6b, angulo: -12 },
      { x: 466, y: 288, cor: 0x5b8def, angulo: 8 },
      { x: 548, y: 276, cor: 0xffd166, angulo: -4 },
      { x: 522, y: 294, cor: 0x7bd389, angulo: 15 },
    ];
    livros.forEach((livro) => {
      const objeto = cena.add
        .rectangle(livro.x, livro.y, 78, 14, livro.cor)
        .setAngle(livro.angulo)
        .setStrokeStyle(2, 0x000000, 0.18);
      container.add(objeto);
    });
  }

  // Mochila.
  grafico.fillStyle(0x000000, 0.1).fillEllipse(190, 492, 150, 20);
  grafico.fillStyle(CORES.azul, 1).fillRoundedRect(140, 390, 104, 108, 26);
  grafico.lineStyle(4, CORES.azulEscuro, 1).strokeRoundedRect(140, 390, 104, 108, 26);
  grafico.fillStyle(CORES.azulEscuro, 1).fillRoundedRect(158, 406, 68, 42, 14);
  grafico.lineStyle(5, CORES.azulEscuro, 1).lineBetween(160, 392, 150, 344);
  grafico.lineStyle(5, CORES.azulEscuro, 1).lineBetween(224, 392, 234, 344);

  // Vaso de lápis.
  if (estado.tarefas.livros) {
    grafico.fillStyle(0xffd166, 1).fillRoundedRect(560, 256, 32, 38, 6);
    grafico.lineStyle(2, 0xbf8a00, 1).strokeRoundedRect(560, 256, 32, 38, 6);
    grafico.lineStyle(4, 0xff6b6b, 1).lineBetween(568, 252, 566, 226);
    grafico.lineStyle(4, 0x5b8def, 1).lineBetween(578, 252, 582, 230);
  }
}

function desenharTras(cena, container) {
  const grafico = criarFundoDaParede(cena, container);

  // Porta.
  grafico.fillStyle(CORES.madeira, 1).fillRoundedRect(86, 132, 232, 352, 10);
  grafico.fillStyle(CORES.madeiraClara, 1).fillRoundedRect(100, 146, 204, 324, 8);
  grafico.lineStyle(3, CORES.madeiraEscura, 1).strokeRoundedRect(100, 146, 204, 324, 8);
  grafico.lineStyle(3, CORES.madeiraEscura, 0.8);
  grafico.strokeRoundedRect(120, 166, 164, 112, 6);
  grafico.strokeRoundedRect(120, 300, 164, 140, 6);
  grafico.fillStyle(CORES.mel, 1).fillCircle(278, 318, 9);
  grafico.fillStyle(0x9a7400, 1).fillCircle(278, 318, 4);
  grafico.fillStyle(CORES.branco, 1).fillCircle(200, 210, 34);
  grafico.lineStyle(3, CORES.madeira, 1).strokeCircle(200, 210, 34);
  texto(cena, container, 200, 210, 'BEENIE', {
    fontSize: '11px',
    color: '#7b4d2b',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  // Estante.
  grafico.fillStyle(CORES.madeira, 1).fillRoundedRect(566, 100, 280, 260, 12);
  grafico.fillStyle(0x7b4d2b, 1).fillRect(578, 112, 256, 236);
  grafico.fillStyle(CORES.madeiraClara, 1).fillRect(578, 170, 256, 10);
  grafico.fillStyle(CORES.madeiraClara, 1).fillRect(578, 240, 256, 10);
  grafico.fillStyle(CORES.madeiraClara, 1).fillRect(578, 310, 256, 10);
  grafico.fillStyle(0x8d5a2d, 1).fillRect(578, 112, 10, 236);
  grafico.fillStyle(0x8d5a2d, 1).fillRect(824, 112, 10, 236);

  // Potes de mel e livros na estante.
  const potes = [
    { x: 606, y: 132, cor: 0xffc200 },
    { x: 646, y: 138, cor: 0xffde00 },
    { x: 744, y: 132, cor: 0xffc200 },
  ];
  potes.forEach((pote) => {
    grafico.fillStyle(pote.cor, 0.95).fillRoundedRect(pote.x, pote.y, 26, 30, 7);
    grafico.fillStyle(0xffffff, 0.32).fillRect(pote.x + 5, pote.y + 5, 4, 16);
    grafico.fillStyle(0x7b4d2b, 1).fillRect(pote.x - 2, pote.y - 6, 30, 7);
  });
  const livrosEstante = [
    { x: 604, y: 206, cor: 0xff6b6b },
    { x: 618, y: 202, cor: 0x5b8def },
    { x: 632, y: 208, cor: 0xffd166 },
    { x: 746, y: 276, cor: 0x7bd389 },
    { x: 760, y: 272, cor: 0xff6b6b },
  ];
  livrosEstante.forEach((livro) => {
    grafico.fillStyle(livro.cor, 1).fillRoundedRect(livro.x, livro.y, 12, 30, 3);
  });

  // Mesinha do cofre.
  grafico.fillStyle(0x000000, 0.12).fillEllipse(420, 480, 210, 24);
  grafico.fillStyle(CORES.madeira, 1).fillRoundedRect(314, 358, 232, 20, 8);
  grafico.fillStyle(0x8d5a2d, 1).fillRect(334, 378, 16, 110);
  grafico.fillStyle(0x8d5a2d, 1).fillRect(510, 378, 16, 110);

  // Cofre: fechado antes do minigame, aberto depois.
  if (estado.tarefas.cofre) {
    grafico.fillStyle(0xffc200, 0.17).fillCircle(420, 300, 116);
    grafico.fillStyle(0x3c4b40, 1).fillRoundedRect(350, 244, 140, 112, 14);
    grafico.lineStyle(4, 0xd8a43b, 1).strokeRoundedRect(350, 244, 140, 112, 14);
    grafico.fillStyle(0x1e2822, 1).fillRoundedRect(362, 256, 116, 88, 8);
    grafico.fillStyle(CORES.mel, 1).fillRoundedRect(372, 310, 96, 24, 8);
    grafico.fillStyle(CORES.nectar, 1).fillCircle(390, 312, 8);
    grafico.fillStyle(CORES.nectar, 1).fillCircle(418, 312, 8);
    grafico.fillStyle(CORES.nectar, 1).fillCircle(446, 312, 8);
    grafico.fillStyle(0x4b5c50, 1).fillPoints(pontos(492, 250, 566, 266, 566, 356, 492, 342), true);
    grafico.lineStyle(3, 0xd8a43b, 1).strokePoints(
      pontos(492, 250, 566, 266, 566, 356, 492, 342),
      true,
    );
    grafico.fillStyle(0xd8a43b, 1).fillCircle(510, 300, 10);
    seloConcluido(cena, container, 566, 246);
  } else {
    grafico.fillStyle(0x000000, 0.14).fillEllipse(420, 362, 170, 22);
    grafico.fillStyle(0x3c4b40, 1).fillRoundedRect(350, 244, 140, 112, 14);
    grafico.lineStyle(4, 0xd8a43b, 1).strokeRoundedRect(350, 244, 140, 112, 14);
    grafico.fillStyle(0x2b372f, 1).fillRoundedRect(362, 256, 116, 88, 8);
    grafico.lineStyle(3, 0xd8a43b, 0.8).strokeRoundedRect(362, 256, 116, 88, 8);
    grafico.fillStyle(0xd8a43b, 1).fillCircle(444, 300, 16);
    grafico.fillStyle(0x2b372f, 1).fillCircle(444, 300, 10);
    grafico.lineStyle(3, 0xd8a43b, 1).lineBetween(444, 300, 444, 286);
    grafico.fillStyle(0xd8a43b, 1).fillRoundedRect(372, 294, 18, 8, 4);
    grafico.fillStyle(0xd8a43b, 0.8);
    [
      [364, 258],
      [476, 258],
      [364, 342],
      [476, 342],
    ].forEach(([x, y]) => grafico.fillCircle(x, y, 3));
  }

  // Plantinha.
  grafico.fillStyle(0xc86b3c, 1).fillRoundedRect(830, 404, 54, 48, 8);
  grafico.fillStyle(0x8d4a28, 1).fillRect(826, 400, 62, 8);
  grafico.fillStyle(0x3f9e5b, 1).fillEllipse(856, 372, 72, 58);
  grafico.fillStyle(0x58b874, 1).fillEllipse(840, 354, 38, 46);
  grafico.fillStyle(0x58b874, 1).fillEllipse(872, 356, 34, 42);
}

function desenharEsquerda(cena, container) {
  const grafico = criarFundoDaParede(cena, container);

  // Armário.
  grafico.fillStyle(CORES.madeiraEscura, 1).fillRoundedRect(66, 104, 284, 22, 8);
  grafico.fillStyle(CORES.madeira, 1).fillRoundedRect(74, 116, 268, 362, 14);
  grafico.fillStyle(CORES.madeiraClara, 1).fillRoundedRect(86, 128, 118, 336, 8);
  grafico.fillStyle(CORES.madeiraClara, 1).fillRoundedRect(208, 128, 118, 336, 8);
  grafico.lineStyle(3, CORES.madeiraEscura, 1).lineBetween(204, 132, 204, 460);
  grafico.lineStyle(2, CORES.madeiraEscura, 0.55);
  grafico.strokeRoundedRect(98, 146, 94, 140, 6);
  grafico.strokeRoundedRect(98, 300, 94, 146, 6);
  grafico.strokeRoundedRect(220, 146, 94, 140, 6);
  grafico.strokeRoundedRect(220, 300, 94, 146, 6);
  grafico.fillStyle(CORES.mel, 1).fillCircle(190, 300, 6);
  grafico.fillStyle(CORES.mel, 1).fillCircle(218, 300, 6);

  // Espelho.
  grafico.fillStyle(0xd8a43b, 1).fillRoundedRect(414, 104, 212, 300, 36);
  grafico.fillStyle(0xbfe6df, 1).fillRoundedRect(430, 120, 180, 268, 28);
  grafico.fillStyle(0xffffff, 0.22).fillPoints(
    pontos(430, 350, 480, 120, 540, 120, 470, 388),
    true,
  );
  grafico.lineStyle(3, 0xffffff, 0.4).lineBetween(470, 350, 552, 160);
  grafico.lineStyle(2, 0xffffff, 0.25).lineBetween(500, 380, 590, 200);

  // Cesto de roupas.
  grafico.fillStyle(0x000000, 0.12).fillEllipse(734, 482, 220, 24);
  grafico.fillStyle(0xc78d55, 1).fillRoundedRect(640, 370, 186, 104, 18);
  grafico.lineStyle(4, CORES.madeiraEscura, 1).strokeRoundedRect(640, 370, 186, 104, 18);
  grafico.fillStyle(0xe0aa6e, 1).fillRoundedRect(628, 360, 210, 24, 12);
  grafico.lineStyle(2, CORES.madeiraEscura, 0.45);
  for (let linha = 390; linha < 470; linha += 16) {
    grafico.lineBetween(648, linha, 818, linha);
  }
  for (let coluna = 660; coluna < 818; coluna += 28) {
    grafico.lineBetween(coluna, 376, coluna + 14, 472);
  }

  if (estado.tarefas.roupa) {
    grafico.fillStyle(CORES.vermelho, 1).fillPoints(
      pontos(670, 366, 720, 348, 744, 366, 706, 386),
      true,
    );
    grafico.fillStyle(CORES.azul, 1).fillRoundedRect(748, 346, 56, 26, 12);
    seloConcluido(cena, container, 620, 404);
  } else {
    // Camiseta no chão.
    grafico.fillStyle(CORES.vermelho, 1).fillPoints(
      pontos(532, 424, 576, 410, 594, 432, 582, 450, 600, 470, 560, 480, 544, 454, 522, 446),
      true,
    );
    grafico.lineStyle(2, 0xc94f4f, 1).strokePoints(
      pontos(532, 424, 576, 410, 594, 432, 582, 450, 600, 470, 560, 480, 544, 454, 522, 446),
      true,
    );

    // Calça.
    grafico.fillStyle(CORES.azul, 1).fillRoundedRect(602, 430, 34, 58, 8);
    grafico.fillStyle(CORES.azul, 1).fillRoundedRect(646, 438, 34, 54, 8);
    grafico.fillStyle(CORES.azulEscuro, 1).fillRect(604, 424, 76, 12);

    // Meia.
    grafico.fillStyle(0xffd166, 1).fillRoundedRect(694, 446, 42, 24, 10);
    grafico.fillStyle(0xffffff, 1).fillRoundedRect(724, 446, 16, 24, 8);
  }

  // Plantinha.
  grafico.fillStyle(0xc86b3c, 1).fillRoundedRect(842, 402, 50, 48, 8);
  grafico.fillStyle(0x8d4a28, 1).fillRect(838, 398, 58, 8);
  grafico.fillStyle(0x3f9e5b, 1).fillEllipse(866, 370, 66, 56);
  grafico.fillStyle(0x58b874, 1).fillEllipse(850, 354, 34, 42);
  grafico.fillStyle(0x58b874, 1).fillEllipse(880, 356, 30, 40);
}

export function desenharParede(cena, container, parede) {
  switch (parede.id) {
    case 'frente':
      desenharFrente(cena, container);
      break;
    case 'direita':
      desenharDireita(cena, container);
      break;
    case 'tras':
      desenharTras(cena, container);
      break;
    case 'esquerda':
      desenharEsquerda(cena, container);
      break;
    default:
      criarFundoDaParede(cena, container);
      break;
  }
}
