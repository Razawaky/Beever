// Cena principal: o quarto em quatro ângulos.
//
// A cena só orquestra. As paredes e os hotspots vêm de `dadosDoQuarto.js`;
// o desenho vem de `desenho.js`; o estado compartilhado vem de
// `estadoDoJogo.js`. O minigame do cofre é uma cena separada, lançada por cima.

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';
import { PAREDES } from '../dadosDoQuarto.js';
import {
  ALTURA_DO_HUD,
  CORES,
  FONTES,
  LARGURA,
  desenharParede,
} from '../desenho.js';
import { IDS_DAS_TAREFAS, estado } from '../estadoDoJogo.js';
import { SEM_MOVIMENTO, anunciar, definirInstrucoes } from '../interface.js';

const TOTAL_DE_PAREDES = PAREDES.length;
// O Phaser pula objetos com alpha 0 no hit-test. Um alpha quase invisível
// mantém a área clicável sem mostrar a caixa do hotspot antes do hover.
const ALPHA_QUASE_INVISIVEL = 0.001;

function destruirContainer(container) {
  if (!container) return;
  container.tweensDosMarcadores?.forEach((tween) => tween.stop());
  container.destroy(true);
}

export class CenaQuarto extends Phaser.Scene {
  constructor() {
    super('quarto');
  }

  create() {
    this.emTransicao = false;
    this.indoParaFim = false;
    this.paredeAtual = null;
    this.estadoListener = () => this.atualizarHud();
    this.completoListener = () => this.aoCompletar();

    this.criarInterface();
    this.configurarEntrada();

    estado.on('mudou', this.estadoListener);
    estado.on('completo', this.completoListener);
    this.game.events.on('minigame:resultado', this.receberResultadoDoMinigame, this);

    this.mostrarParede(estado.parede, 0, true);
    this.atualizarHud();

    if (estado.completo) {
      this.time.delayedCall(250, () => this.aoCompletar());
    }

    this.cameras.main.fadeIn(SEM_MOVIMENTO ? 0 : 280, 27, 21, 8);
    definirInstrucoes(
      'Use as setas ← → ou os botões laterais para girar o quarto. Clique nos brilhos para interagir.',
    );
    anunciar('Quarto do Beenie. Gire o cômodo e clique nos objetos com brilho.');

    this.events.once('shutdown', () => {
      estado.off('mudou', this.estadoListener);
      estado.off('completo', this.completoListener);
      this.game.events.off('minigame:resultado', this.receberResultadoDoMinigame, this);
      destruirContainer(this.paredeAtual);
    });
  }

  criarInterface() {
    const barra = this.add.graphics().setDepth(100);
    barra.fillStyle(CORES.painel, 0.96).fillRect(0, 0, LARGURA, ALTURA_DO_HUD);
    barra.lineStyle(2, CORES.mel, 0.32).lineBetween(0, ALTURA_DO_HUD - 1, LARGURA, ALTURA_DO_HUD - 1);

    this.add
      .text(24, 9, 'Quarto do Beenie', {
        fontFamily: FONTES.display,
        fontSize: '26px',
        color: '#f5e8c8',
      })
      .setDepth(101);
    this.add
      .text(25, 44, 'protótipo · 4 ângulos', {
        fontFamily: FONTES.texto,
        fontSize: '11px',
        color: '#bfae87',
        fontStyle: 'bold',
      })
      .setDepth(101);

    this.textoParede = this.add
      .text(LARGURA / 2, 12, '', {
        fontFamily: FONTES.texto,
        fontSize: '17px',
        color: '#ffc200',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(101);

    this.graficoProgresso = this.add.graphics().setDepth(101);

    this.textoMoedas = this.add
      .text(LARGURA - 24, 10, '0 mel (demo)', {
        fontFamily: FONTES.texto,
        fontSize: '18px',
        color: '#f5e8c8',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(101);

    this.iconeMoeda = this.add
      .image(0, 23, 'moeda')
      .setDisplaySize(20, 20)
      .setOrigin(1, 0.5)
      .setDepth(101);

    this.textoTarefas = this.add
      .text(LARGURA - 24, 39, '', {
        fontFamily: FONTES.texto,
        fontSize: '12px',
        color: '#bfae87',
      })
      .setOrigin(1, 0)
      .setDepth(101);

    const painelDialogo = this.add.graphics().setDepth(100);
    painelDialogo
      .fillStyle(CORES.painel, 0.92)
      .fillRoundedRect(48, 504, LARGURA - 96, 84, 18);
    painelDialogo
      .lineStyle(2, CORES.mel, 0.35)
      .strokeRoundedRect(48, 504, LARGURA - 96, 84, 18);

    this.add.circle(88, 552, 36, CORES.mel, 0.12).setDepth(101);

    this.retrato = this.add
      .image(88, 586, 'beenie-default')
      .setOrigin(0.5, 1)
      .setDisplaySize(62, 93)
      .setDepth(102);

    this.add
      .text(128, 510, 'BEENIE', {
        fontFamily: FONTES.texto,
        fontSize: '10px',
        color: '#ffc200',
        fontStyle: 'bold',
      })
      .setDepth(102);

    this.textoDialogo = this.add
      .text(128, 526, '', {
        fontFamily: FONTES.texto,
        fontSize: '16px',
        color: '#f5e8c8',
        lineSpacing: 4,
        wordWrap: { width: LARGURA - 200 },
      })
      .setDepth(102);

    this.criarSeta(32, 286, -1, '‹');
    this.criarSeta(LARGURA - 32, 286, 1, '›');
  }

  criarSeta(x, y, direcao, simbolo) {
    const visual = this.add.container(x, y).setDepth(105);
    const fundo = this.add
      .circle(0, 0, 26, CORES.fundo, 0.76)
      .setStrokeStyle(2, CORES.mel, 0.6);
    const seta = this.add
      .text(0, 0, simbolo, {
        fontFamily: FONTES.display,
        fontSize: '42px',
        color: '#f5e8c8',
      })
      .setOrigin(0.5, 0.44);
    visual.add([fundo, seta]);

    const zona = this.add
      .zone(x, y, 58, 58)
      .setInteractive({ useHandCursor: true })
      .setDepth(106);

    zona.on('pointerover', () => {
      fundo.setFillStyle(0x3a2c0b, 0.96);
      seta.setColor('#ffc200');
    });
    zona.on('pointerout', () => {
      fundo.setFillStyle(CORES.fundo, 0.76);
      seta.setColor('#f5e8c8');
    });
    zona.on('pointerdown', () => this.girar(direcao));
  }

  configurarEntrada() {
    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    ]);
    this.input.keyboard?.on('keydown-LEFT', () => this.girar(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.girar(1));
  }

  girar(direcao) {
    if (this.emTransicao || this.indoParaFim) return;
    const proximo = (estado.parede + direcao + TOTAL_DE_PAREDES) % TOTAL_DE_PAREDES;
    this.mostrarParede(proximo, direcao);
  }

  mostrarParede(indice, direcao = 1, imediato = false) {
    if (this.emTransicao) return;

    const indiceNormalizado = ((indice % TOTAL_DE_PAREDES) + TOTAL_DE_PAREDES) % TOTAL_DE_PAREDES;
    const parede = PAREDES[indiceNormalizado];
    const novo = this.add
      .container(imediato ? 0 : direcao * LARGURA, 0)
      .setDepth(10);

    desenharParede(this, novo, parede);
    this.criarHotspots(novo, parede);

    const anterior = this.paredeAtual;
    this.paredeAtual = novo;
    estado.definirParede(indiceNormalizado);
    this.mostrarDialogo(parede.dica, 'default');

    if (imediato || !anterior || SEM_MOVIMENTO) {
      destruirContainer(anterior);
      novo.setPosition(0, 0);
      this.emTransicao = false;
      return;
    }

    this.emTransicao = true;
    this.tweens.add({
      targets: anterior,
      x: -direcao * LARGURA,
      alpha: 0,
      duration: 280,
      ease: 'Cubic.inOut',
    });
    this.tweens.add({
      targets: novo,
      x: 0,
      duration: 280,
      ease: 'Cubic.inOut',
      onComplete: () => {
        destruirContainer(anterior);
        this.emTransicao = false;
      },
    });
  }

  redesenharParede() {
    if (!this.paredeAtual) return;
    const parede = PAREDES[estado.parede];
    destruirContainer(this.paredeAtual);

    const novo = this.add.container(0, 0).setDepth(10);
    desenharParede(this, novo, parede);
    this.criarHotspots(novo, parede);
    this.paredeAtual = novo;
  }

  criarHotspots(container, parede) {
    container.tweensDosMarcadores = [];

    parede.hotspots.forEach((hotspot) => {
      if (hotspot.tarefa && estado.tarefas[hotspot.tarefa]) return;

      const alvo = this.add
        .rectangle(hotspot.x, hotspot.y, hotspot.w, hotspot.h, CORES.mel, 0)
        .setOrigin(0, 0)
        .setStrokeStyle(2, CORES.mel, 0.95)
        .setAlpha(ALPHA_QUASE_INVISIVEL);
      container.add(alvo);

      const corDoMarcador =
        hotspot.tipo === 'inspecao'
          ? 0xffffff
          : hotspot.tipo === 'minigame'
            ? CORES.nectar
            : CORES.mel;
      const centroX = hotspot.x + hotspot.w / 2;
      const centroY = hotspot.y + hotspot.h / 2;
      const marcador = this.add.container(centroX, centroY);
      const brilho = this.add.circle(
        0,
        0,
        hotspot.tipo === 'minigame' ? 13 : 10,
        corDoMarcador,
        0.22,
      );
      const nucleo = this.add.circle(0, 0, hotspot.tipo === 'minigame' ? 5 : 4, corDoMarcador, 1);
      marcador.add([brilho, nucleo]);
      container.add(marcador);

      if (!SEM_MOVIMENTO) {
        const tween = this.tweens.add({
          targets: brilho,
          scale: 1.8,
          alpha: 0,
          duration: hotspot.tipo === 'minigame' ? 900 : 1250,
          repeat: -1,
          ease: 'Sine.out',
        });
        container.tweensDosMarcadores.push(tween);
      }

      // Objetos no alto da parede precisam do rótulo abaixo deles para não
      // ficarem escondidos atrás do HUD.
      const rotuloAbaixo = hotspot.y < 130;
      const etiqueta = this.add
        .text(centroX, rotuloAbaixo ? hotspot.y + 8 : hotspot.y - 7, hotspot.rotulo, {
          fontFamily: FONTES.texto,
          fontSize: '13px',
          color: '#fff8e8',
          backgroundColor: '#1b1508',
          padding: { x: 8, y: 5 },
        })
        .setOrigin(0.5, rotuloAbaixo ? 0 : 1)
        .setAlpha(0);
      container.add(etiqueta);

      alvo.setInteractive({ useHandCursor: true });
      alvo.on('pointerover', () => {
        alvo.setAlpha(1);
        alvo.setFillStyle(CORES.mel, 0.08);
        etiqueta.setAlpha(1);
        marcador.setVisible(false);
      });
      alvo.on('pointerout', () => {
        alvo.setAlpha(ALPHA_QUASE_INVISIVEL);
        alvo.setFillStyle(CORES.mel, 0);
        etiqueta.setAlpha(0);
        marcador.setVisible(true);
      });
      alvo.on('pointerdown', () => this.interagir(hotspot));
    });
  }

  interagir(hotspot) {
    if (this.emTransicao || this.indoParaFim) return;

    if (hotspot.tipo === 'inspecao') {
      this.mostrarDialogo(hotspot.mensagem, hotspot.emocao ?? 'default');
      anunciar(`${hotspot.rotulo}: ${hotspot.mensagem}`);
      return;
    }

    if (hotspot.tipo === 'minigame') {
      if (estado.tarefas[hotspot.tarefa]) return;
      this.mostrarDialogo(hotspot.mensagem, hotspot.emocao ?? 'estrelas');
      anunciar('Cofre aberto. Minigame de clique e segure em 3 rodadas.');
      definirInstrucoes(
        'Minigame do cofre: clique e segure — ou mantenha Espaço — e solte na faixa verde.',
      );
      this.scene.launch('minigame');
      this.scene.pause();
      return;
    }

    if (hotspot.tipo !== 'tarefa') return;

    const concluiu = estado.concluirTarefa(hotspot.tarefa, hotspot.moedas);
    if (!concluiu) return;

    this.redesenharParede();
    if (!estado.completo) {
      this.mostrarDialogo(hotspot.mensagem, hotspot.emocao ?? 'feliz');
      anunciar(
        `${hotspot.rotulo}: ${hotspot.mensagem} Você tem ${estado.moedas} de mel de demonstração.`,
      );
    }
  }

  receberResultadoDoMinigame(dados = {}) {
    if (this.indoParaFim || estado.tarefas.cofre) {
      this.atualizarHud();
      return;
    }

    const moedas = Number.isFinite(dados.moedas) ? dados.moedas : 0;
    const acertos = Number.isFinite(dados.acertos) ? dados.acertos : 0;
    const concluiu = estado.concluirTarefa('cofre', moedas);
    if (!concluiu) return;

    this.redesenharParede();
    if (!estado.completo) {
      this.mostrarDialogo(
        `Cofre aberto! ${acertos} acerto(s) e +${moedas} mel (demo). O quarto está quase pronto.`,
        'estrelas',
      );
      anunciar(
        `Cofre aberto com ${acertos} acertos. Você ganhou ${moedas} de mel de demonstração.`,
      );
      definirInstrucoes(
        'Use as setas ← → ou os botões laterais para girar o quarto. Clique nos brilhos para interagir.',
      );
    }
  }

  aoCompletar() {
    if (this.indoParaFim) return;
    this.indoParaFim = true;

    this.mostrarDialogo(
      `Quarto arrumado! O Beenie ganhou ${estado.moedas} de mel (demo) nas tarefas.`,
      'estrelas',
    );
    anunciar(
      `Quarto arrumado! ${estado.tarefasConcluidas} tarefas concluídas e ${estado.moedas} de mel de demonstração.`,
    );
    definirInstrucoes('Tudo pronto. Abrindo o resumo do protótipo…');

    this.time.delayedCall(SEM_MOVIMENTO ? 500 : 1600, () => this.scene.start('fim'));
  }

  atualizarHud() {
    if (!this.textoParede) return;

    const parede = PAREDES[estado.parede];
    this.textoParede.setText(`${estado.parede + 1}/${TOTAL_DE_PAREDES} · ${parede.nome}`);
    this.textoMoedas.setText(`${estado.moedas} mel (demo)`);
    this.iconeMoeda.x = this.textoMoedas.x - this.textoMoedas.width - 8;
    this.textoTarefas.setText(
      `Tarefas ${estado.tarefasConcluidas}/${estado.totalDeTarefas}`,
    );

    this.graficoProgresso.clear();
    const espacamento = 17;
    const largura = (estado.totalDeTarefas - 1) * espacamento;
    const inicio = LARGURA / 2 - largura / 2;

    IDS_DAS_TAREFAS.forEach((id, indice) => {
      const x = inicio + indice * espacamento;
      const feita = estado.tarefas[id];
      this.graficoProgresso.fillStyle(feita ? CORES.mel : 0x3a2f16, 1).fillCircle(x, 49, 4);
      if (!feita) {
        this.graficoProgresso.lineStyle(1, CORES.mel, 0.55).strokeCircle(x, 49, 4);
      }
    });
  }

  mostrarDialogo(texto, emocao = 'default') {
    if (!this.textoDialogo) return;

    this.textoDialogo.setText(texto);
    const chave = `beenie-${emocao}`;
    if (this.textures.exists(chave)) this.retrato.setTexture(chave);

    if (!SEM_MOVIMENTO) {
      this.tweens.killTweensOf(this.retrato);
      this.retrato.setAlpha(0.55);
      this.tweens.add({
        targets: this.retrato,
        alpha: 1,
        duration: 180,
        ease: 'Sine.out',
      });
    }
  }
}
