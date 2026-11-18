// Cena de carregamento: acontece depois do vídeo e antes do quarto.
// Carrega os retratos do Beenie, a moeda, as imagens do quarto em /img
// e os ícones do hexágono de item na mão.

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';
import { ICONES_DOS_ITENS, IMAGENS_DO_QUARTO } from '../dadosDoQuarto.js';
import { CORES, FONTES, LARGURA, criarFundoEscuro } from '../desenho.js';
import { anunciar, definirInstrucoes } from '../interface.js';

export class CenaBoot extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    criarFundoEscuro(this);

    this.add
      .text(LARGURA / 2, 250, 'Preparando o quarto…', {
        fontFamily: FONTES.display,
        fontSize: '34px',
        color: '#ffc200',
      })
      .setOrigin(0.5);

    this.add
      .text(LARGURA / 2, 292, 'Carregando o Beenie e o quarto', {
        fontFamily: FONTES.texto,
        fontSize: '16px',
        color: '#bfae87',
      })
      .setOrigin(0.5);

    const barra = this.add.graphics();
    barra.fillStyle(0x3a2f16, 1).fillRoundedRect(130, 330, 340, 12, 6);
    const preenchimento = this.add.graphics();

    this.load.on('progress', (progresso) => {
      preenchimento.clear();
      preenchimento
        .fillStyle(CORES.mel, 1)
        .fillRoundedRect(130, 330, Math.max(12, 340 * progresso), 12, 6);
    });

    this.load.image('beenie-default', '/img/clicks/beenie_click_default.webp');
    this.load.image('beenie-feliz', '/img/clicks/beenie_click_yeah.webp');
    this.load.image('beenie-uou', '/img/clicks/beenie_click_uhhhhh.webp');
    this.load.image('beenie-estrelas', '/img/clicks/beenie_click_stars.webp');
    this.load.image('moeda', '/img/mel-moeda-virtual.png');

    IMAGENS_DO_QUARTO.forEach((imagem) => {
      this.load.image(imagem.chave, imagem.caminho);
    });

    Object.values(ICONES_DOS_ITENS).forEach((icone) => {
      this.load.image(icone.chave, icone.caminho);
    });

    anunciar('Carregando o quarto do Beenie…');
    definirInstrucoes('O vídeo terminou. O quarto está sendo preparado.');
  }

  create() {
    this.scene.start('quarto');
  }
}
