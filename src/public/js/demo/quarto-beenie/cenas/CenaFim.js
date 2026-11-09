// Fim da demo: resumo das tarefas e moedas fictícias.
// O botão reinicia o quarto sem passar pelo vídeo de novo. Para rever a
// introdução, a própria página oferece o botão "Rever introdução".

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';
import { CORES, FONTES, LARGURA, criarFundoEscuro } from '../desenho.js';
import { estado } from '../estadoDoJogo.js';
import { SEM_MOVIMENTO, anunciar, definirInstrucoes } from '../interface.js';

export class CenaFim extends Phaser.Scene {
  constructor() {
    super('fim');
  }

  create() {
    this.reiniciando = false;

    criarFundoEscuro(this);
    this.add.circle(LARGURA / 2, 224, 170, CORES.mel, 0.08);
    this.add.circle(LARGURA / 2, 224, 120, CORES.mel, 0.06);

    this.add
      .text(LARGURA / 2, 42, 'Quarto arrumado!', {
        fontFamily: FONTES.display,
        fontSize: '48px',
        color: '#ffc200',
      })
      .setOrigin(0.5, 0);

    this.add
      .text(LARGURA / 2, 99, 'Missão concluída no protótipo do Beenie', {
        fontFamily: FONTES.texto,
        fontSize: '16px',
        color: '#bfae87',
      })
      .setOrigin(0.5, 0);

    const beenie = this.add.image(LARGURA / 2, 245, 'beenie-estrelas');
    beenie.setDisplaySize(112, 168);

    const textoMoedas = this.add
      .text(LARGURA / 2, 346, `${estado.moedas} mel (demo)`, {
        fontFamily: FONTES.display,
        fontSize: '36px',
        color: '#ffc200',
      })
      .setOrigin(0.5, 0);

    this.add
      .image(textoMoedas.x - textoMoedas.width / 2 - 22, 366, 'moeda')
      .setDisplaySize(28, 28)
      .setOrigin(0.5);

    this.add
      .text(
        LARGURA / 2,
        392,
        `${estado.tarefasConcluidas} de ${estado.totalDeTarefas} tarefas concluídas`,
        {
          fontFamily: FONTES.texto,
          fontSize: '18px',
          color: '#f5e8c8',
          fontStyle: 'bold',
        },
      )
      .setOrigin(0.5, 0);

    this.add
      .text(
        LARGURA / 2,
        424,
        'Nada foi creditado no Beever. No jogo real, o servidor calcula a recompensa.',
        {
          fontFamily: FONTES.texto,
          fontSize: '13px',
          color: '#bfae87',
          align: 'center',
          wordWrap: { width: 620 },
        },
      )
      .setOrigin(0.5, 0);

    this.criarBotao();

    if (!SEM_MOVIMENTO) {
      this.tweens.add({
        targets: beenie,
        y: '+=5',
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.tweens.add({
        targets: textoMoedas,
        scale: { from: 0.9, to: 1 },
        duration: 500,
        ease: 'Back.out',
      });
    }

    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.ENTER,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);
    this.input.keyboard?.once('keydown-ENTER', () => this.reiniciar());
    this.input.keyboard?.once('keydown-SPACE', () => this.reiniciar());

    this.cameras.main.fadeIn(SEM_MOVIMENTO ? 0 : 300, 27, 21, 8);
    anunciar(
      `Fim da demo: ${estado.tarefasConcluidas} tarefas e ${estado.moedas} de mel de demonstração.`,
    );
    definirInstrucoes('Clique em “Jogar de novo” ou aperte Enter para voltar ao quarto.');
  }

  criarBotao() {
    const botao = this.add.container(LARGURA / 2, 485);
    const fundo = this.add
      .rectangle(0, 0, 280, 50, CORES.mel)
      .setStrokeStyle(3, 0x9a7400);
    const texto = this.add
      .text(0, 0, 'Jogar de novo', {
        fontFamily: FONTES.texto,
        fontSize: '18px',
        color: '#241d0b',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    botao.add([fundo, texto]);

    const zona = this.add
      .zone(LARGURA / 2, 485, 280, 50)
      .setInteractive({ useHandCursor: true });
    zona.on('pointerover', () => fundo.setFillStyle(CORES.nectar, 1));
    zona.on('pointerout', () => fundo.setFillStyle(CORES.mel, 1));
    zona.on('pointerdown', () => this.reiniciar());

    this.add
      .text(LARGURA / 2, 520, 'Enter, Espaço ou clique para recomeçar', {
        fontFamily: FONTES.texto,
        fontSize: '12px',
        color: '#8f7d58',
      })
      .setOrigin(0.5, 0);
  }

  reiniciar() {
    if (this.reiniciando) return;
    this.reiniciando = true;
    estado.reiniciar();
    this.scene.start('quarto');
  }
}
