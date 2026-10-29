// Minigame do cofre: uma cena separada, lançada por cima do quarto.
// Quando termina, devolve o resultado pelo event bus do jogo e o quarto
// decide quanto mel fictício somar.

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';
import {
  ALTURA,
  CORES,
  FONTES,
  LARGURA,
  criarFundoEscuro,
} from '../desenho.js';
import { SEM_MOVIMENTO, anunciar, definirInstrucoes } from '../interface.js';

const TOTAL_DE_RODADAS = 3;
const MOEDAS_POR_ACERTO = 5;
const METAS = [
  { min: 0.24, max: 0.42 },
  { min: 0.5, max: 0.68 },
  { min: 0.7, max: 0.86 },
];

const X_DO_MEDIDOR = 292;
const Y_DO_MEDIDOR = 158;
const LARGURA_DO_MEDIDOR = 160;
const ALTURA_DO_MEDIDOR = 274;

export class CenaMinigame extends Phaser.Scene {
  constructor() {
    super('minigame');
  }

  create() {
    this.rodada = 0;
    this.acertos = 0;
    this.moedas = 0;
    this.forca = 0;
    this.carregando = false;
    this.segurando = false;
    this.respondendo = false;
    this.esperandoSoltar = Boolean(this.input.activePointer?.isDown);
    this.finalizado = false;
    this.podeFechar = false;

    this.teclas = this.input.keyboard?.addKeys({ espaco: 'SPACE', enter: 'ENTER' });
    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    ]);

    criarFundoEscuro(this);
    this.criarPainel();
    this.configurarEntrada();

    this.proximaRodada();
    this.cameras.main.fadeIn(SEM_MOVIMENTO ? 0 : 180, 27, 21, 8);
  }

  criarPainel() {
    const painel = this.add.graphics().setDepth(2);
    painel.fillStyle(CORES.painel, 0.98).fillRoundedRect(170, 56, 620, 488, 26);
    painel.lineStyle(3, CORES.mel, 0.72).strokeRoundedRect(170, 56, 620, 488, 26);
    painel.lineStyle(2, CORES.nectar, 0.28).strokeRoundedRect(182, 68, 596, 464, 20);

    this.add
      .text(LARGURA / 2, 84, 'Cofre do Beenie', {
        fontFamily: FONTES.display,
        fontSize: '38px',
        color: '#ffc200',
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    this.add
      .text(LARGURA / 2, 127, '3 rodadas · solte o mel dentro da faixa verde', {
        fontFamily: FONTES.texto,
        fontSize: '15px',
        color: '#bfae87',
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    this.textoMoedas = this.add
      .text(748, 90, 'Mel (demo): 0', {
        fontFamily: FONTES.texto,
        fontSize: '13px',
        color: '#f5e8c8',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(3);

    this.graficoMedidor = this.add.graphics().setDepth(3);
    this.textoPorcentagem = this.add
      .text(548, 176, '0%', {
        fontFamily: FONTES.display,
        fontSize: '58px',
        color: '#f5e8c8',
      })
      .setOrigin(0, 0)
      .setDepth(3);
    this.textoMeta = this.add
      .text(548, 244, '', {
        fontFamily: FONTES.texto,
        fontSize: '16px',
        color: '#bfae87',
      })
      .setOrigin(0, 0)
      .setDepth(3);
    this.textoRodada = this.add
      .text(548, 280, '', {
        fontFamily: FONTES.texto,
        fontSize: '18px',
        color: '#ffc200',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0)
      .setDepth(3);
    this.textoFeedback = this.add
      .text(LARGURA / 2, 438, '', {
        fontFamily: FONTES.texto,
        fontSize: '19px',
        color: '#f5e8c8',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(LARGURA / 2, 494, 'Clique/toque e segure · ou mantenha Espaço', {
        fontFamily: FONTES.texto,
        fontSize: '13px',
        color: '#8f7d58',
      })
      .setOrigin(0.5)
      .setDepth(3);
  }

  configurarEntrada() {
    this.input.on('pointerdown', () => {
      if (!this.podeJogar()) return;
      this.segurando = true;
      if (this.esperandoSoltar) return;
      this.carregando = true;
    });
    this.input.on('pointerup', () => {
      this.segurando = false;
      if (this.carregando) this.soltar();
    });
    this.input.on('gameout', () => {
      this.segurando = false;
      if (this.carregando) this.soltar();
    });

    this.game.events.on('blur', this.cancelarCarga, this);
    this.events.once('shutdown', () => {
      this.game.events.off('blur', this.cancelarCarga, this);
    });
  }

  podeJogar() {
    return !this.respondendo && !this.finalizado && this.rodada < TOTAL_DE_RODADAS;
  }

  proximaRodada() {
    if (this.rodada >= TOTAL_DE_RODADAS) {
      this.mostrarResultado();
      return;
    }

    this.meta = METAS[this.rodada];
    this.forca = 0;
    this.carregando = false;
    this.segurando = false;
    this.respondendo = false;
    this.esperandoSoltar = Boolean(
      this.input.activePointer?.isDown ||
        this.teclas?.espaco.isDown ||
        this.teclas?.enter.isDown,
    );

    this.corFeedback = '#f5e8c8';
    this.corPorcentagem = '#f5e8c8';
    this.textoFeedback.setText('Segure para encher o cofre');
    this.textoRodada.setText(`Rodada ${this.rodada + 1} de ${TOTAL_DE_RODADAS}`);
    this.textoMeta.setText(
      `Meta: ${Math.round(this.meta.min * 100)}% a ${Math.round(this.meta.max * 100)}%`,
    );
    this.textoMoedas.setText(`Mel (demo): ${this.moedas}`);
    this.atualizarVisual();

    anunciar(
      `Cofre, rodada ${this.rodada + 1} de ${TOTAL_DE_RODADAS}. ` +
        `Solte entre ${Math.round(this.meta.min * 100)}% e ${Math.round(this.meta.max * 100)}%.`,
    );
  }

  update(_tempo, delta) {
    if (!this.podeJogar()) return;

    const tecla = Boolean(this.teclas?.espaco.isDown || this.teclas?.enter.isDown);

    if (this.esperandoSoltar) {
      if (!tecla && !this.segurando) this.esperandoSoltar = false;
      return;
    }

    const segurando = this.segurando || tecla;

    if (!segurando) {
      if (this.carregando) this.soltar();
      return;
    }

    if (!this.carregando) this.carregando = true;
    this.forca = Math.min(1, this.forca + delta / 1700);
    this.atualizarVisual();
  }

  soltar() {
    if (!this.carregando || this.respondendo || this.finalizado) return;

    this.carregando = false;
    this.respondendo = true;

    const acertou = this.forca >= this.meta.min && this.forca <= this.meta.max;

    if (acertou) {
      this.acertos += 1;
      this.moedas += MOEDAS_POR_ACERTO;
      this.corFeedback = '#3fbf6f';
      this.corPorcentagem = '#3fbf6f';
      this.textoFeedback.setText(`Boa! +${MOEDAS_POR_ACERTO} mel (demo)`);
      this.textoMoedas.setText(`Mel (demo): ${this.moedas}`);
      this.celebrar();
      anunciar(
        `Acertou! ${Math.round(this.forca * 100)}% e ${MOEDAS_POR_ACERTO} de mel de demonstração.`,
      );
    } else {
      this.corFeedback = '#ff8a65';
      this.corPorcentagem = '#ff8a65';
      this.textoFeedback.setText(
        `Quase! A faixa era ${Math.round(this.meta.min * 100)}% a ` +
          `${Math.round(this.meta.max * 100)}%`,
      );
      anunciar(
        `Não foi dessa vez: ${Math.round(this.forca * 100)}%. A faixa era ` +
          `${Math.round(this.meta.min * 100)}% a ${Math.round(this.meta.max * 100)}%.`,
      );
    }

    this.atualizarVisual();

    this.time.delayedCall(SEM_MOVIMENTO ? 600 : 1050, () => {
      this.rodada += 1;
      this.proximaRodada();
    });
  }

  cancelarCarga() {
    this.segurando = false;
    this.carregando = false;
    this.forca = 0;
    this.atualizarVisual();
  }

  atualizarVisual() {
    if (!this.graficoMedidor || !this.meta) return;

    const grafico = this.graficoMedidor;
    const x = X_DO_MEDIDOR;
    const y = Y_DO_MEDIDOR;
    const largura = LARGURA_DO_MEDIDOR;
    const altura = ALTURA_DO_MEDIDOR;
    const margem = 14;
    const alturaInterna = altura - margem * 2;
    const base = y + altura - margem;

    grafico.clear();
    grafico.fillStyle(0x0d0a04, 0.78).fillRoundedRect(x, y, largura, altura, 24);
    grafico.fillStyle(0x3a2f16, 0.5).fillRoundedRect(
      x + 8,
      y + 8,
      largura - 16,
      altura - 16,
      18,
    );

    const alturaDoMel = alturaInterna * this.forca;
    if (alturaDoMel > 0) {
      grafico.fillStyle(CORES.mel, 0.96).fillRoundedRect(
        x + margem,
        base - alturaDoMel,
        largura - margem * 2,
        alturaDoMel,
        6,
      );
      grafico.fillStyle(CORES.nectar, 1).fillRect(
        x + margem,
        Math.max(y + margem, base - alturaDoMel - 5),
        largura - margem * 2,
        5,
      );
    }

    const topoDaFaixa = base - alturaInterna * this.meta.max;
    const alturaDaFaixa = alturaInterna * (this.meta.max - this.meta.min);
    grafico.fillStyle(CORES.verde, 0.22).fillRect(
      x + margem,
      topoDaFaixa,
      largura - margem * 2,
      alturaDaFaixa,
    );
    grafico.lineStyle(2, CORES.verde, 0.95).strokeRect(
      x + margem,
      topoDaFaixa,
      largura - margem * 2,
      alturaDaFaixa,
    );

    grafico.lineStyle(2, CORES.mel, 0.22);
    for (let marca = 0; marca <= 10; marca += 1) {
      const yDaMarca = base - alturaInterna * (marca / 10);
      grafico.lineBetween(x + largura - margem + 8, yDaMarca, x + largura - margem + 18, yDaMarca);
    }

    grafico.lineStyle(4, CORES.mel, 0.82).strokeRoundedRect(x, y, largura, altura, 24);
    grafico.lineStyle(2, CORES.nectar, 0.34).strokeRoundedRect(
      x + 8,
      y + 8,
      largura - 16,
      altura - 16,
      18,
    );
    grafico.fillStyle(CORES.mel, 0.9).fillRoundedRect(
      x + 46,
      y - 10,
      largura - 92,
      18,
      9,
    );

    this.textoPorcentagem.setText(`${Math.round(this.forca * 100)}%`);
    this.textoPorcentagem.setColor(this.corPorcentagem ?? '#f5e8c8');
    this.textoFeedback.setColor(this.corFeedback ?? '#f5e8c8');
  }

  celebrar() {
    if (SEM_MOVIMENTO) return;

    for (let particula = 0; particula < 12; particula += 1) {
      const ponto = this.add
        .circle(
          LARGURA / 2 + Phaser.Math.Between(-40, 40),
          400,
          Phaser.Math.Between(3, 6),
          CORES.mel,
        )
        .setDepth(40);

      this.tweens.add({
        targets: ponto,
        x: ponto.x + Phaser.Math.Between(-140, 140),
        y: ponto.y + Phaser.Math.Between(-150, 40),
        alpha: 0,
        duration: Phaser.Math.Between(500, 850),
        ease: 'Cubic.out',
        onComplete: () => ponto.destroy(),
      });
    }
  }

  mostrarResultado() {
    if (this.finalizado) return;
    this.finalizado = true;
    this.respondendo = true;

    const bloqueio = this.add
      .rectangle(LARGURA / 2, ALTURA / 2, LARGURA, ALTURA, 0x0a0803, 0.72)
      .setDepth(50)
      .setInteractive();
    bloqueio.on('pointerdown', () => this.tentarFechar());

    const cartao = this.add.graphics().setDepth(51);
    cartao.fillStyle(CORES.painel, 1).fillRoundedRect(280, 148, 400, 304, 24);
    cartao.lineStyle(3, CORES.mel, 0.82).strokeRoundedRect(280, 148, 400, 304, 24);

    this.add
      .text(LARGURA / 2, 180, 'Cofre aberto!', {
        fontFamily: FONTES.display,
        fontSize: '42px',
        color: '#ffc200',
      })
      .setOrigin(0.5, 0)
      .setDepth(52);

    this.add
      .text(LARGURA / 2, 240, `${this.acertos} de ${TOTAL_DE_RODADAS} acertos`, {
        fontFamily: FONTES.texto,
        fontSize: '22px',
        color: '#f5e8c8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(52);

    this.add
      .text(LARGURA / 2, 278, `+${this.moedas} mel (demo)`, {
        fontFamily: FONTES.texto,
        fontSize: '20px',
        color: '#3fbf6f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(52);

    this.add
      .text(
        LARGURA / 2,
        316,
        'Este valor é só da demo.\nNada é creditado no Beever.',
        {
          fontFamily: FONTES.texto,
          fontSize: '13px',
          color: '#bfae87',
          align: 'center',
          lineSpacing: 4,
        },
      )
      .setOrigin(0.5, 0)
      .setDepth(52);

    const botao = this.add.container(LARGURA / 2, 392).setDepth(52);
    const fundoBotao = this.add
      .rectangle(0, 0, 264, 48, CORES.mel)
      .setStrokeStyle(3, 0x9a7400);
    const textoBotao = this.add
      .text(0, 0, 'Voltar ao quarto', {
        fontFamily: FONTES.texto,
        fontSize: '17px',
        color: '#241d0b',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    botao.add([fundoBotao, textoBotao]);

    const zona = this.add
      .zone(LARGURA / 2, 392, 264, 48)
      .setInteractive({ useHandCursor: true })
      .setDepth(53);
    zona.on('pointerover', () => fundoBotao.setFillStyle(CORES.nectar, 1));
    zona.on('pointerout', () => fundoBotao.setFillStyle(CORES.mel, 1));
    zona.on('pointerdown', () => this.tentarFechar());

    this.add
      .text(LARGURA / 2, 428, 'Clique ou aperte Enter para continuar', {
        fontFamily: FONTES.texto,
        fontSize: '12px',
        color: '#8f7d58',
      })
      .setOrigin(0.5, 0)
      .setDepth(52);

    this.input.keyboard?.on('keydown-ENTER', () => this.tentarFechar());
    this.input.keyboard?.on('keydown-SPACE', () => this.tentarFechar());

    this.time.delayedCall(SEM_MOVIMENTO ? 250 : 500, () => {
      this.podeFechar = true;
    });

    anunciar(
      `Cofre aberto com ${this.acertos} de ${TOTAL_DE_RODADAS} acertos e ${this.moedas} de mel de demonstração.`,
    );
    definirInstrucoes('Clique em “Voltar ao quarto” ou aperte Enter para continuar.');
  }

  tentarFechar() {
    if (!this.podeFechar) return;
    this.podeFechar = false;

    const dados = { acertos: this.acertos, moedas: this.moedas };
    this.scene.resume('quarto');
    this.game.events.emit('minigame:resultado', dados);
    this.scene.stop();
  }
}
