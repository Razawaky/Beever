// Cena principal: o quarto em quatro ângulos.
//
// A cena só orquestra. As paredes e os hotspots vêm de `dadosDoQuarto.js`;
// o desenho vem de `desenho.js`; o estado compartilhado vem de
// `estadoDoJogo.js`. A regra de ouro é: só cabe um item na mão por vez.
// O hexágono do item na mão fica fora das paredes para atravessar as quatro
// rotações sem precisar ser redesenhado.

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';
import { ICONES_DOS_ITENS, PAREDES, ROTULOS_DOS_ITENS } from '../dadosDoQuarto.js';
import {
  ALTURA,
  CORES,
  FONTES,
  LARGURA,
  desenharParede,
  garantirTexturaDeContorno,
} from '../desenho.js';
import { estado } from '../estadoDoJogo.js';
import { SEM_MOVIMENTO, anunciar, definirInstrucoes } from '../interface.js';

const TOTAL_DE_PAREDES = PAREDES.length;
// O Phaser pula objetos com alpha 0 no hit-test. Um alpha quase invisível
// mantém a área clicável sem mostrar a caixa do hotspot antes do hover.
const ALPHA_QUASE_INVISIVEL = 0.001;
// O centro do hexágono fica perto do canto e o raio ultrapassa as bordas
// superior e esquerda. O canvas recorta o desenho: sobram os lados internos,
// como se a casa de favo nascesse da moldura do jogo.
const SLOT_DA_MAO = Object.freeze({
  x: 42,
  y: 30,
  raio: 76,
  curva: 16,
  iconeMax: 90,
});
// Tamanho da expressão no canto inferior direito. Aumente os dois valores
// juntos para manter a proporção da arte (190 × 236).
const TAMANHO_DA_EXPRESSAO = Object.freeze({ largura: 190, altura: 236 });
// Quadrado decorativo do canto: fica acima do balão e abaixo da Beenie.
// Mude `angulo` (em graus) para girar; `tamanho` é o lado do quadrado em pixels.
const QUADRADO_DO_CANTO = Object.freeze({
  tamanho: 280,
  angulo: 45,
  x: 600,
  y: 630,
  preenchimento: CORES.painel,
  opacidade: 1,
});
const DICA_INICIAL =
  'Vamos arrumar meu quarto! Mexa nas setinhas para ver as paredes, e clique na porta quando achar que terminou tudo!';
const FALA_PEGAR = 'Beleza, vamos colocar no lugar!';
const FALA_TAREFA_CONCLUIDA = 'Oba! Já conseguimos arrumar algo!';
const FALA_PARCIAL = 'Boa! Acho que está bom.';
const FALAS_ERRO = Object.freeze([
  'Eu estou querendo arrumar, e não bagunçar!',
  'Acho que não é aqui...',
  'Sério?',
  'Vamos tentar colocar em outro canto.',
]);
const FALAS_MAOS_OCUPADAS = Object.freeze([
  'Calma lá, uma coisa de cada vez!',
  'Só tenho duas mãos ainda!',
  'Depois a gente pega isso.',
]);
// Balão único da abertura: ocupa a faixa inteira do rodapé, colado à borda
// inferior, numa camada abaixo da Beenie.
const BALAO_DA_DICA = Object.freeze({
  altura: 116,
  raio: Object.freeze({ tl: 16, tr: 16, br: 0, bl: 0 }),
});
// Duração de cada balão na tela, em milissegundos (1000 = 1 segundo).
// É só alterar o número da linha correspondente para ajustar uma fala.
const TEMPO_DAS_FALAS = Object.freeze({
  dica: 5200,
  pegar: 2600,
  tarefaConcluida: 3000,
  parcial: 2600,
  erro: 3000,
  maosOcupadas: 2600,
});
// As dicas em texto deram lugar às expressões do Beenie. As chaves antigas são
// mantidas para a cena final continuar usando as mesmas imagens.
const EXPRESSOES = Object.freeze({
  default: 'beenie-default',
  feliz: 'beenie-feliz',
  uou: 'beenie-uou',
  estrelas: 'beenie-estrelas',
  annoyed: 'beenie-annoyed',
});

// Depois de falar, a Beenie volta ao repouso combinado com a expressão usada:
// feliz/estrelas voltam ao normal; aborrecida fica aborrecida.
function chaveDeRepouso(chaveFalante) {
  return chaveFalante === EXPRESSOES.uou ? EXPRESSOES.annoyed : EXPRESSOES.default;
}

// Gera as seis pontas do hexágono já com os cantos arredondados. Cada canto
// recebe uma curva quadrática curta entre os pontos onde as arestas são cortadas.
function pontosDoHexagonoArredondado(raio, curva, segmentos = 6) {
  const vertices = [];
  for (let lado = 0; lado < 6; lado += 1) {
    const angulo = (Math.PI / 3) * lado + Math.PI / 6;
    vertices.push(
      new Phaser.Geom.Point(raio * Math.cos(angulo), raio * Math.sin(angulo)),
    );
  }

  const pontos = [];
  for (let i = 0; i < vertices.length; i += 1) {
    const atual = vertices[i];
    const anterior = vertices[(i - 1 + vertices.length) % vertices.length];
    const proximo = vertices[(i + 1) % vertices.length];

    const vetorAnterior = { x: anterior.x - atual.x, y: anterior.y - atual.y };
    const vetorProximo = { x: proximo.x - atual.x, y: proximo.y - atual.y };
    const tamanhoAnterior = Math.hypot(vetorAnterior.x, vetorAnterior.y);
    const tamanhoProximo = Math.hypot(vetorProximo.x, vetorProximo.y);
    const corte = Math.min(curva, tamanhoAnterior / 2, tamanhoProximo / 2);

    const entrada = {
      x: atual.x + (vetorAnterior.x / tamanhoAnterior) * corte,
      y: atual.y + (vetorAnterior.y / tamanhoAnterior) * corte,
    };
    const saida = {
      x: atual.x + (vetorProximo.x / tamanhoProximo) * corte,
      y: atual.y + (vetorProximo.y / tamanhoProximo) * corte,
    };

    for (let passo = 0; passo <= segmentos; passo += 1) {
      const t = passo / segmentos;
      const inverso = 1 - t;
      pontos.push(
        new Phaser.Geom.Point(
          inverso * inverso * entrada.x + 2 * inverso * t * atual.x + t * t * saida.x,
          inverso * inverso * entrada.y + 2 * inverso * t * atual.y + t * t * saida.y,
        ),
      );
    }
  }
  return pontos;
}

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
    this.iconeDaMao = null;
    this.itemDaMaoAtual = undefined;
    this.balaoFala = null;
    this.timerFala = null;
    this.chaveFalante = null;
    this.chaveRepouso = EXPRESSOES.default;
    this.estadoListener = () => this.atualizarIconeDaMao();
    this.completoListener = () => this.aoConcluirTudo();

    this.criarInterface();
    this.configurarEntrada();

    estado.on('mudou', this.estadoListener);
    estado.on('completo', this.completoListener);

    this.mostrarParede(estado.parede, 0, true);
    this.atualizarIconeDaMao();
    this.mostrarDicaInicial();

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
      this.limparFala();
      destruirContainer(this.paredeAtual);
    });
  }

  criarInterface() {
    this.criarSlotDaMao();
    this.criarQuadradoDoCanto();

    // Mesmo contorno claro do `.mascote-stroke` do app, aplicado ao retrato.
    Object.values(EXPRESSOES).forEach((chave) => garantirTexturaDeContorno(this, chave));
    const chaveDoContorno = garantirTexturaDeContorno(this, EXPRESSOES.default);

    this.contornoRetrato = this.add
      .image(LARGURA, ALTURA, chaveDoContorno ?? EXPRESSOES.default)
      .setOrigin(1, 1)
      .setDisplaySize(TAMANHO_DA_EXPRESSAO.largura, TAMANHO_DA_EXPRESSAO.altura)
      .setDepth(101.9)
      .setVisible(Boolean(chaveDoContorno));

    this.retrato = this.add
      .image(LARGURA, ALTURA, EXPRESSOES.default)
      .setOrigin(1, 1)
      .setDisplaySize(TAMANHO_DA_EXPRESSAO.largura, TAMANHO_DA_EXPRESSAO.altura)
      .setDepth(102);

    this.criarSeta(30, 286, -1);
    this.criarSeta(LARGURA - 30, 286, 1);
  }

  criarQuadradoDoCanto() {
    const { tamanho, angulo, x, y, preenchimento, opacidade, borda, espessura } =
      QUADRADO_DO_CANTO;

    const forma = this.add.graphics();
    forma
      .fillStyle(preenchimento, opacidade)
      .fillRect(-tamanho / 2, -tamanho / 2, tamanho, tamanho)
      .lineStyle(espessura, borda, 1)
      .strokeRect(-tamanho / 2, -tamanho / 2, tamanho, tamanho);

    // 101.5 mantém o quadrado entre o balão (101) e a Beenie (102).
    this.quadradoDoCanto = this.add.container(x, y, [forma]).setDepth(101.5);
    this.quadradoDoCanto.setAngle(angulo);
  }

  criarSlotDaMao() {
    this.slotDaMao = this.add
      .container(SLOT_DA_MAO.x, SLOT_DA_MAO.y)
      .setDepth(60);

    const hexagono = pontosDoHexagonoArredondado(SLOT_DA_MAO.raio, SLOT_DA_MAO.curva);

    // O preenchimento e a moldura são recortados pela borda do canvas; apenas
    // os lados internos aparecem, integrando o favo à moldura do jogo.
    const moldura = this.add.graphics();
    moldura.fillStyle(CORES.painel, 0.96).fillPoints(hexagono, true);
    this.slotDaMao.add(moldura);
  }

  atualizarIconeDaMao() {
    const item = estado.carregando;
    if (item === this.itemDaMaoAtual) return;
    this.itemDaMaoAtual = item;

    const icone = item ? ICONES_DOS_ITENS[item] : null;
    if (!icone) {
      this.iconeDaMao?.setVisible(false);
      return;
    }

    if (!this.iconeDaMao) {
      this.iconeDaMao = this.add.image(10, 10, icone.chave).setOrigin(0.5);
      this.slotDaMao.add(this.iconeDaMao);
    } else {
      this.iconeDaMao.setTexture(icone.chave);
    }

    const escala = Math.min(
      SLOT_DA_MAO.iconeMax / this.iconeDaMao.width,
      SLOT_DA_MAO.iconeMax / this.iconeDaMao.height,
    );
    this.iconeDaMao.setScale(escala).setAlpha(1).setVisible(true);

    if (!SEM_MOVIMENTO) {
      this.tweens.killTweensOf(this.iconeDaMao);
      this.iconeDaMao.setAlpha(0).setScale(escala * 0.8);
      this.tweens.add({
        targets: this.iconeDaMao,
        alpha: 1,
        scale: escala,
        duration: 180,
        ease: 'Back.out',
      });
    }
  }

  criarSeta(x, y, direcao) {
    const visual = this.add.container(x, y).setDepth(105);
    const fundo = this.add
      .circle(0, 0, 24, CORES.fundo, 0.76)
      .setStrokeStyle(2, CORES.mel, 0.6);

    // O glifo da fonte tem larguras laterais diferentes e, mesmo com origin
    // 0.5, a ponta da seta ficava fora do centro do círculo. Desenhar o
    // chevron como vetor deixa os pontos simétricos em torno de (0, 0).
    const seta = this.add.graphics();
    const pintarSeta = (cor) => {
      seta.clear();
      seta.lineStyle(5, cor, 1);
      seta.beginPath();
      if (direcao < 0) {
        seta.moveTo(6, -10);
        seta.lineTo(-6, 0);
        seta.lineTo(6, 10);
      } else {
        seta.moveTo(-6, -10);
        seta.lineTo(6, 0);
        seta.lineTo(-6, 10);
      }
      seta.strokePath();
    };
    pintarSeta(CORES.creme);
    visual.add([fundo, seta]);

    const zona = this.add
      .zone(x, y, 54, 54)
      .setInteractive({ useHandCursor: true })
      .setDepth(106);

    zona.on('pointerover', () => {
      fundo.setFillStyle(0x3a2c0b, 0.96);
      pintarSeta(CORES.mel);
    });
    zona.on('pointerout', () => {
      fundo.setFillStyle(CORES.fundo, 0.76);
      pintarSeta(CORES.creme);
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

    // Girar o quarto não mexe na expressão: ela só muda quando a Beenie
    // reage a um clique.
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
      this.mostrarExpressao(hotspot.emocao ?? 'default');
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
      this.falar(FALA_TAREFA_CONCLUIDA, EXPRESSOES.estrelas, TEMPO_DAS_FALAS.tarefaConcluida);
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
        const fala = FALAS_MAOS_OCUPADAS[Math.floor(Math.random() * FALAS_MAOS_OCUPADAS.length)];
        // A arte que fala precisa combinar com o repouso atual: feliz depois
        // de feliz/yeah, aborrecida depois de aborrecida.
        const chave =
          this.chaveRepouso === EXPRESSOES.annoyed ? EXPRESSOES.uou : EXPRESSOES.feliz;
        this.falar(fala, chave, TEMPO_DAS_FALAS.maosOcupadas);
        anunciar(mensagem);
        definirInstrucoes(`Na mão: ${naMao}. Termine de guardar antes de pegar outro item.`);
      }
      return;
    }

    this.redesenharParede();

    this.falar(FALA_PEGAR, EXPRESSOES.feliz, TEMPO_DAS_FALAS.pegar);
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
        const fala = FALAS_ERRO[Math.floor(Math.random() * FALAS_ERRO.length)];
        this.falar(fala, EXPRESSOES.uou, TEMPO_DAS_FALAS.erro);
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

      this.falar(FALA_TAREFA_CONCLUIDA, EXPRESSOES.estrelas, TEMPO_DAS_FALAS.tarefaConcluida);
      anunciar(
        `${hotspot.rotulo}: ${hotspot.mensagem} Você tem ${estado.moedas} de mel de demonstração.`,
      );
      definirInstrucoes(INSTRUCOES_PADRAO);
      return;
    }

    const faltam = requisitos.filter((item) => !estado.itens[item]).map(rotuloDoItem);
    const mensagem = `${rotuloDoItem(resultado.item)} no lugar. Ainda falta ${faltam.join(' e ')}.`;
    this.falar(FALA_PARCIAL, EXPRESSOES.default, TEMPO_DAS_FALAS.parcial);
    anunciar(mensagem);
    definirInstrucoes(`Na mão: livre. Pegue ${faltam.join(' e ')}.`);
  }

  aoConcluirTudo() {
    if (this.indoParaFim) return;

    this.mostrarExpressao('estrelas');
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

    this.mostrarExpressao(concluidas === total ? 'estrelas' : 'default');
    anunciar(`${mensagem} ${estado.moedas} de mel de demonstração.`);
    definirInstrucoes('Abrindo o resultado do protótipo…');

    this.time.delayedCall(SEM_MOVIMENTO ? 500 : 1400, () => this.scene.start('fim'));
  }

  mostrarDicaInicial() {
    this.falar(DICA_INICIAL, EXPRESSOES.feliz, TEMPO_DAS_FALAS.dica);
  }

  // A arte com boca aberta só aparece depois do repouso compatível: feliz vem
  // depois de feliz/yeah; aborrecida vem depois de aborrecida. Se o repouso
  // atual for outro, ele é ajustado sem pop antes da fala começar.
  prepararRepousoPara(chaveFalante) {
    if (chaveFalante === EXPRESSOES.feliz) {
      if (this.chaveRepouso === EXPRESSOES.annoyed) {
        this.definirRepouso(EXPRESSOES.default, false);
      }
      return;
    }

    if (chaveFalante === EXPRESSOES.uou) {
      if (this.chaveRepouso !== EXPRESSOES.annoyed) {
        this.definirRepouso(EXPRESSOES.annoyed, false);
      }
      return;
    }

    this.definirRepouso(chaveFalante, false);
  }

  falar(texto, chaveFalante, visivelMs) {
    this.limparFala();
    this.prepararRepousoPara(chaveFalante);

    const { altura, raio } = BALAO_DA_DICA;
    const x = LARGURA / 2;
    const y = ALTURA - altura / 2;
    // O texto fica à esquerda para não passar atrás da Beenie, mesmo com o
    // balão ocupando a largura inteira.
    // Reserva também a ponta do quadrado decorativo para o texto não ficar atrás dele.
    const espacoParaOCanto =
      TAMANHO_DA_EXPRESSAO.largura + QUADRADO_DO_CANTO.tamanho / 2;
    const larguraTexto = Math.max(320, LARGURA - espacoParaOCanto + 40);

    const balao = this.add.container(x, y).setDepth(101);
    const fundo = this.add.graphics();
    fundo
      .fillStyle(0xffffff, 0.98)
      .fillRoundedRect(-LARGURA / 2, -altura / 2, LARGURA, altura, raio);

    const mensagem = this.add.text(-LARGURA / 2 + 18, -altura / 2 + 14, texto, {
      fontFamily: FONTES.texto,
      fontSize: '16px',
      color: '#3a2c0b',
      lineSpacing: 4,
      wordWrap: { width: larguraTexto },
    });

    balao.add([fundo, mensagem]);
    balao.setScale(0.8).setAlpha(0);
    this.balaoFala = balao;
    this.chaveFalante = chaveFalante;

    this.aplicarExpressao(chaveFalante);

    if (SEM_MOVIMENTO) {
      balao.setScale(1).setAlpha(1);
    } else {
      this.tweens.add({
        targets: balao,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 220,
        ease: 'Back.out',
      });
    }

    const timer = this.time.delayedCall(visivelMs, () => {
      if (this.timerFala === timer) this.terminarFala(balao, chaveFalante);
    });
    this.timerFala = timer;
  }

  limparFala() {
    this.timerFala?.remove();
    if (this.balaoFala) {
      this.tweens.killTweensOf(this.balaoFala);
      this.balaoFala.destroy(true);
    }
    this.balaoFala = null;
    this.timerFala = null;
    this.chaveFalante = null;
  }

  terminarFala(balao, chaveFalante) {
    if (this.balaoFala !== balao) return;

    this.definirRepouso(chaveDeRepouso(chaveFalante));

    const finalizar = () => {
      this.tweens.killTweensOf(balao);
      balao.destroy(true);
      if (this.balaoFala === balao) {
        this.balaoFala = null;
        this.timerFala = null;
        this.chaveFalante = null;
      }
    };

    if (SEM_MOVIMENTO) {
      finalizar();
      return;
    }

    this.tweens.add({
      targets: balao,
      scaleX: 0.85,
      scaleY: 0.85,
      alpha: 0,
      duration: 180,
      ease: 'Sine.in',
      onComplete: finalizar,
    });
  }

  mostrarExpressao(emocao = 'default') {
    this.definirRepouso(EXPRESSOES[emocao] ?? EXPRESSOES.default);
  }

  definirRepouso(chave, animar = true) {
    this.chaveRepouso = chave;
    if (animar) this.aplicarExpressao(chave);
    else this.definirTextura(chave);
  }

  definirTextura(chave) {
    if (this.textures.exists(chave)) {
      this.retrato.setTexture(chave);
      const chaveDoContorno = garantirTexturaDeContorno(this, chave);
      if (chaveDoContorno && this.contornoRetrato) {
        this.contornoRetrato.setTexture(chaveDoContorno).setVisible(true);
      }
    }

    // Calcula a escala a partir da textura porque `setTexture` reinicia a
    // escala do Image: sem isto o pop terminaria com a arte no tamanho original.
    const escalaX = TAMANHO_DA_EXPRESSAO.largura / this.retrato.width;
    const escalaY = TAMANHO_DA_EXPRESSAO.altura / this.retrato.height;
    this.retrato.setScale(escalaX, escalaY);
    if (this.contornoRetrato) this.contornoRetrato.setScale(escalaX, escalaY);
  }

  aplicarExpressao(chave) {
    this.definirTextura(chave);

    if (SEM_MOVIMENTO) return;

    const escalaX = TAMANHO_DA_EXPRESSAO.largura / this.retrato.width;
    const escalaY = TAMANHO_DA_EXPRESSAO.altura / this.retrato.height;
    const alvos = this.contornoRetrato
      ? [this.contornoRetrato, this.retrato]
      : [this.retrato];

    // Um pop curto, como o clique na Beenie do painel: encolhe um pouco e
    // volta com leve overshoot. Sem deslocamento e sem rotação — a imagem
    // continua fixa no canto e não é clicável.
    this.tweens.killTweensOf(alvos);
    alvos.forEach((alvo) => alvo.setScale(escalaX * 0.88, escalaY * 0.88).setAlpha(1));
    this.tweens.add({
      targets: alvos,
      scaleX: escalaX,
      scaleY: escalaY,
      duration: 200,
      ease: 'Back.out',
      onComplete: () => {
        alvos.forEach((alvo) => alvo.setScale(escalaX, escalaY).setAlpha(1));
      },
    });
  }
}
