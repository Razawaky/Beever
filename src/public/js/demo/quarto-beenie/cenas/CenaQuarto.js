// Cena principal: o quarto em quatro ângulos.
//
// A cena só orquestra. As paredes e os hotspots vêm de `dadosDoQuarto.js`;
// o desenho vem de `desenho.js`; o estado compartilhado vem de
// `estadoDoJogo.js`. A regra de ouro é: só cabe um item na mão por vez.

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';
import { PAREDES, ROTULOS_DOS_ITENS } from '../dadosDoQuarto.js';
import { CORES, FONTES, LARGURA, desenharParede } from '../desenho.js';
import { estado } from '../estadoDoJogo.js';
import { SEM_MOVIMENTO, anunciar, atualizarHud, definirInstrucoes } from '../interface.js';

const TOTAL_DE_PAREDES = PAREDES.length;
// O Phaser pula objetos com alpha 0 no hit-test. Um alpha quase invisível
// mantém a área clicável sem mostrar a caixa do hotspot antes do hover.
const ALPHA_QUASE_INVISIVEL = 0.001;
const INSTRUCOES_PADRAO =
  'Use as setas ← → ou os botões laterais para girar o quarto. Clique nos objetos para pegar e guardar um item por vez. Clique na porta para sair quando quiser; o mel é proporcional ao que arrumou.';

function hotspotDisponivel(hotspot) {
  if (hotspot.tarefa && estado.tarefas[hotspot.tarefa]) return false;
  if (hotspot.item && (estado.itens[hotspot.item] || estado.carregando === hotspot.item)) {
    return false;
  }
  return true;
}

function rotuloDoItem(item) {
  return ROTULOS_DOS_ITENS[item] ?? 'esse item';
}

function destruirContainer(container) {
  if (!container) return;
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
    this.completoListener = () => this.aoConcluirTudo();

    this.criarInterface();
    this.configurarEntrada();

    estado.on('mudou', this.estadoListener);
    estado.on('completo', this.completoListener);

    this.mostrarParede(estado.parede, 0, true);
    this.atualizarHud();

    if (estado.completo) {
      this.time.delayedCall(250, () => this.aoConcluirTudo());
    }

    this.cameras.main.fadeIn(SEM_MOVIMENTO ? 0 : 280, 27, 21, 8);
    definirInstrucoes(INSTRUCOES_PADRAO);
    anunciar(
      'Quarto do Beenie. Gire o cômodo, pegue um item por vez e clique no móvel para guardar. Clique na porta quando quiser sair e ver o resultado.',
    );

    this.events.once('shutdown', () => {
      estado.off('mudou', this.estadoListener);
      estado.off('completo', this.completoListener);
      destruirContainer(this.paredeAtual);
    });
  }

  criarInterface() {
    const painelDialogo = this.add.graphics().setDepth(100);
    painelDialogo
      .fillStyle(CORES.painel, 0.92)
      .fillRoundedRect(24, 504, LARGURA - 48, 84, 18);
    painelDialogo
      .lineStyle(2, CORES.mel, 0.35)
      .strokeRoundedRect(24, 504, LARGURA - 48, 84, 18);

    this.add.circle(64, 552, 34, CORES.mel, 0.12).setDepth(101);

    this.retrato = this.add
      .image(64, 586, 'beenie-default')
      .setOrigin(0.5, 1)
      .setDisplaySize(58, 87)
      .setDepth(102);

    this.add
      .text(104, 510, 'BEENIE', {
        fontFamily: FONTES.texto,
        fontSize: '10px',
        color: '#ffc200',
        fontStyle: 'bold',
      })
      .setDepth(102);

    this.textoDialogo = this.add
      .text(104, 526, '', {
        fontFamily: FONTES.texto,
        fontSize: '15px',
        color: '#f5e8c8',
        lineSpacing: 4,
        wordWrap: { width: LARGURA - 164 },
      })
      .setDepth(102);

    this.criarSeta(30, 286, -1, '‹');
    this.criarSeta(LARGURA - 30, 286, 1, '›');
  }

  criarSeta(x, y, direcao, simbolo) {
    const visual = this.add.container(x, y).setDepth(105);
    const fundo = this.add
      .circle(0, 0, 24, CORES.fundo, 0.76)
      .setStrokeStyle(2, CORES.mel, 0.6);
    const seta = this.add
      .text(0, 0, simbolo, {
        fontFamily: FONTES.display,
        fontSize: '38px',
        color: '#f5e8c8',
      })
      .setOrigin(0.5, 0.44);
    visual.add([fundo, seta]);

    const zona = this.add
      .zone(x, y, 54, 54)
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

    const itens = desenharParede(this, novo, parede);
    this.criarHotspots(novo, parede, itens);

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
    const itens = desenharParede(this, novo, parede);
    this.criarHotspots(novo, parede, itens);
    this.paredeAtual = novo;
  }

  criarHotspots(container, parede, itens) {
    parede.hotspots.forEach((hotspot) => {
      if (!hotspotDisponivel(hotspot)) return;

      const visual = itens?.get(hotspot.visual ?? hotspot.id);
      const alvo = this.add
        .rectangle(hotspot.x, hotspot.y, hotspot.w, hotspot.h, CORES.mel, 0)
        .setOrigin(0, 0)
        .setAlpha(ALPHA_QUASE_INVISIVEL);
      container.add(alvo);

      const centroX = hotspot.x + hotspot.w / 2;
      // Objetos no alto da parede recebem o rótulo abaixo para ele não sair
      // do palco quando o hotspot encosta na borda superior.
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
        visual?.contorno?.setVisible(true);
        etiqueta.setAlpha(1);
      });
      alvo.on('pointerout', () => {
        visual?.contorno?.setVisible(false);
        etiqueta.setAlpha(0);
      });
      alvo.on('pointerdown', () => this.interagir(hotspot));
    });
  }

  interagir(hotspot) {
    if (this.emTransicao || this.indoParaFim) return;

    if (hotspot.tipo === 'sair') {
      this.sairDoQuarto();
      return;
    }

    if (hotspot.tipo === 'inspecao') {
      this.mostrarDialogo(hotspot.mensagem, hotspot.emocao ?? 'default');
      anunciar(`${hotspot.rotulo}: ${hotspot.mensagem}`);
      return;
    }

    if (hotspot.tipo === 'pegar') {
      this.pegarItem(hotspot);
      return;
    }

    if (hotspot.tipo === 'guardar') {
      this.guardarItem(hotspot);
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
      definirInstrucoes(INSTRUCOES_PADRAO);
    }
  }

  pegarItem(hotspot) {
    const resultado = estado.pegar(hotspot.item);

    if (!resultado.ok) {
      if (resultado.motivo === 'maos-ocupadas') {
        const naMao = rotuloDoItem(resultado.carregando);
        const mensagem = `Você só pode carregar um item por vez. Coloque ${naMao} no lugar antes de pegar outra coisa.`;
        this.mostrarDialogo(mensagem, 'default');
        anunciar(mensagem);
        definirInstrucoes(`Na mão: ${naMao}. Termine de guardar antes de pegar outro item.`);
      }
      return;
    }

    this.redesenharParede();

    this.mostrarDialogo(hotspot.mensagem, hotspot.emocao ?? 'feliz');
    anunciar(`${hotspot.rotulo}: ${hotspot.mensagem}`);
    definirInstrucoes(hotspot.mensagem);
  }

  guardarItem(hotspot) {
    const resultado = estado.guardarEm(hotspot.aceita);

    if (!resultado.ok) {
      let mensagem = hotspot.mensagemVazio;
      if (resultado.motivo === 'item-errado') {
        mensagem = `Esse lugar não recebe ${rotuloDoItem(resultado.item)}. Olhe o brilho do lugar certo.`;
      }
      if (mensagem) {
        this.mostrarDialogo(mensagem, 'default');
        anunciar(mensagem);
      }
      return;
    }

    const requisitos = hotspot.completaCom ?? [];
    const terminou = requisitos.every((item) => estado.itens[item]);
    const concluiu =
      terminou && hotspot.tarefa
        ? estado.concluirTarefa(hotspot.tarefa, hotspot.moedas)
        : false;

    this.redesenharParede();

    if (concluiu) {
      if (estado.completo) return;

      this.mostrarDialogo(hotspot.mensagem, hotspot.emocao ?? 'feliz');
      anunciar(
        `${hotspot.rotulo}: ${hotspot.mensagem} Você tem ${estado.moedas} de mel de demonstração.`,
      );
      definirInstrucoes(INSTRUCOES_PADRAO);
      return;
    }

    const faltam = requisitos.filter((item) => !estado.itens[item]).map(rotuloDoItem);
    const mensagem = `${rotuloDoItem(resultado.item)} no lugar. Ainda falta ${faltam.join(' e ')}.`;
    this.mostrarDialogo(mensagem, 'feliz');
    anunciar(mensagem);
    definirInstrucoes(`Na mão: livre. Pegue ${faltam.join(' e ')}.`);
  }

  aoConcluirTudo() {
    if (this.indoParaFim) return;

    this.mostrarDialogo(
      'Tudo arrumado! Clique na porta para sair e ver o resultado.',
      'estrelas',
    );
    anunciar('Todas as atividades concluídas. Clique na porta para sair e ver o resultado.');
    definirInstrucoes('Tudo pronto. Clique na porta para sair quando quiser.');
  }

  sairDoQuarto() {
    if (this.indoParaFim) return;
    this.indoParaFim = true;

    const concluidas = estado.tarefasConcluidas;
    const total = estado.totalDeTarefas;
    const naMao = estado.carregando
      ? ` Item na mão: ${rotuloDoItem(estado.carregando)}.`
      : '';
    let mensagem = `Você saiu com ${concluidas} de ${total} atividades concluídas.`;

    if (concluidas === 0) mensagem = 'Você saiu sem arrumar nada.';
    if (concluidas === total) mensagem = `Quarto arrumado! Você concluiu todas as ${total} atividades.`;

    mensagem += `${naMao} Vamos ver o resultado.`;

    this.mostrarDialogo(mensagem, concluidas === total ? 'estrelas' : 'default');
    anunciar(`${mensagem} ${estado.moedas} de mel de demonstração.`);
    definirInstrucoes('Abrindo o resultado do protótipo…');

    this.time.delayedCall(SEM_MOVIMENTO ? 500 : 1400, () => this.scene.start('fim'));
  }

  atualizarHud() {
    const parede = PAREDES[estado.parede];

    atualizarHud({
      indiceParede: estado.parede,
      totalDeParedes: TOTAL_DE_PAREDES,
      nomeParede: parede.nome,
      moedas: estado.moedas,
      tarefasConcluidas: estado.tarefasConcluidas,
      totalDeTarefas: estado.totalDeTarefas,
      tarefas: estado.tarefas,
      itemNaMao: estado.carregando ? rotuloDoItem(estado.carregando) : '',
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
