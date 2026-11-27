// Protótipo isolado do jogo "Segure e Solte".
//
// Nada aqui importa `partida.js`, abre sessão, fala com o banco ou credita
// moeda. É uma demonstração de linguagem: abertura desenhada no Phaser,
// minigame de clique e segure, e um placar de moedas fictícias no fim.
//
// O arquivo mora em `src/public/js/demo/` para o lint aplicar os globals de
// navegador, como acontece com os outros scripts servidos ao cliente.

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';

const LARGURA = 720;
const ALTURA = 480;
const TOTAL_DE_RODADAS = 5;
const MOEDAS_POR_ACERTO = 10;
const TEXTO_DAS_INSTRUCOES =
  'Clique e segure — ou mantenha Espaço — para encher o cofre. Solte dentro da faixa verde.';

// Cada rodada tem uma faixa diferente. O jogador segura para subir o mel e
// solta quando a marca estiver dentro da zona verde.
const METAS = [
  { min: 0.26, max: 0.4 },
  { min: 0.52, max: 0.66 },
  { min: 0.7, max: 0.84 },
  { min: 0.36, max: 0.5 },
  { min: 0.58, max: 0.72 },
];

const CORES = {
  mel: 0xffc200,
  nectar: 0xffde00,
  tinta: 0x241d0b,
  creme: 0xf5e8c8,
  verde: 0x3fbf6f,
  erro: 0xff8a65,
  fundo: 0x1b1508,
};

const FONTE_TEXTO = '"Beever Texto", system-ui, sans-serif';
const FONTE_DISPLAY = '"Beever Display", Georgia, serif';

const palco = document.getElementById('jogo');
const status = document.getElementById('status');
const instrucoes = document.getElementById('instrucoes');
const botaoReiniciar = document.getElementById('reiniciar');

const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let jogo = null;

function anunciar(texto) {
  status.textContent = texto;
}

function desenharHexagono(grafico, x, y, raio) {
  const pontos = [];
  for (let lado = 0; lado < 6; lado += 1) {
    const angulo = (Math.PI / 3) * lado + Math.PI / 6;
    pontos.push(new Phaser.Geom.Point(x + raio * Math.cos(angulo), y + raio * Math.sin(angulo)));
  }
  grafico.strokePoints(pontos, true);
}

function desenharFundo(cena) {
  const grafico = cena.add.graphics();

  grafico.fillStyle(CORES.fundo, 1).fillRect(0, 0, LARGURA, ALTURA);
  grafico.fillStyle(0x3a2c0b, 0.38).fillCircle(LARGURA / 2, ALTURA / 2, 280);

  // Favo de fundo, bem discreto: textura, não ruído.
  grafico.lineStyle(2, CORES.mel, 0.055);
  const raio = 44;
  for (let linha = -1; linha < 9; linha += 1) {
    for (let coluna = -1; coluna < 11; coluna += 1) {
      const deslocamento = linha % 2 === 0 ? 0 : (raio * Math.sqrt(3)) / 2;
      const x = coluna * raio * Math.sqrt(3) + deslocamento;
      const y = linha * raio * 1.5;
      desenharHexagono(grafico, x, y, raio);
    }
  }

  grafico.fillStyle(CORES.fundo, 0.45).fillRect(0, 0, LARGURA, 16);
  grafico.fillStyle(CORES.fundo, 0.45).fillRect(0, ALTURA - 16, LARGURA, 16);
}

function criarAbelha(cena, x, y) {
  const abelha = cena.add.container(x, y);

  const asaEsquerda = cena.add.ellipse(-12, -34, 34, 24, 0xffffff, 0.55).setAngle(-24);
  const asaDireita = cena.add.ellipse(12, -34, 34, 24, 0xffffff, 0.42).setAngle(24);
  const ferrao = cena.add.triangle(-36, 0, 0, -7, 0, 7, -14, 0, CORES.tinta);
  const corpo = cena.add.ellipse(0, 0, 72, 52, CORES.mel);
  const listraEsquerda = cena.add.rectangle(-14, 0, 9, 48, CORES.tinta);
  const listraDireita = cena.add.rectangle(10, 0, 9, 48, CORES.tinta);
  const olho = cena.add.circle(25, -9, 5, CORES.tinta);
  const brilho = cena.add.circle(27, -11, 1.6, 0xffffff);

  abelha.add([asaEsquerda, asaDireita, ferrao, corpo, listraEsquerda, listraDireita, olho, brilho]);

  return { abelha, asaEsquerda, asaDireita };
}

class CenaAbertura extends Phaser.Scene {
  constructor() {
    super('abertura');
  }

  create() {
    desenharFundo(this);

    this.indo = false;

    const titulo = this.add
      .text(LARGURA / 2, 54, 'Beever', {
        fontFamily: FONTE_DISPLAY,
        fontSize: '64px',
        color: '#ffc200',
      })
      .setOrigin(0.5);

    const subtitulo = this.add
      .text(LARGURA / 2, 98, 'apresenta', {
        fontFamily: FONTE_TEXTO,
        fontSize: '18px',
        color: '#bfae87',
        letterSpacing: 4,
      })
      .setOrigin(0.5);

    const { abelha, asaEsquerda, asaDireita } = criarAbelha(this, LARGURA / 2, 172);

    const jarro = this.add.graphics();
    jarro.fillStyle(0x0d0a04, 0.55).fillRoundedRect(315, 320, 90, 82, 14);
    jarro.lineStyle(3, CORES.mel, 0.55).strokeRoundedRect(315, 320, 90, 82, 14);
    jarro.fillStyle(CORES.mel, 0.78).fillRoundedRect(325, 354, 70, 38, 8);
    jarro.lineStyle(2, CORES.nectar, 0.55).strokeRoundedRect(325, 354, 70, 38, 8);

    const gota = this.add.circle(LARGURA / 2, 208, 9, CORES.mel);

    const tituloDoJogo = this.add
      .text(LARGURA / 2, 278, 'SEGURE E SOLTE', {
        fontFamily: FONTE_DISPLAY,
        fontSize: '42px',
        color: '#f5e8c8',
      })
      .setOrigin(0.5);

    const legenda = this.add
      .text(LARGURA / 2, 312, 'um protótipo de jogo', {
        fontFamily: FONTE_TEXTO,
        fontSize: '17px',
        color: '#bfae87',
      })
      .setOrigin(0.5);

    const dica = this.add
      .text(LARGURA / 2, 442, 'Clique, toque ou aperte Espaço para começar', {
        fontFamily: FONTE_TEXTO,
        fontSize: '17px',
        color: '#ffc200',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    if (!semMovimento) {
      this.tweens.add({
        targets: abelha,
        y: '+=10',
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.tweens.add({
        targets: [asaEsquerda, asaDireita],
        scaleY: 0.55,
        duration: 110,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.tweens.add({
        targets: gota,
        y: 340,
        alpha: 0,
        duration: 950,
        repeat: -1,
        repeatDelay: 450,
        ease: 'Quad.in',
      });
      this.tweens.add({
        targets: titulo,
        scale: { from: 0.82, to: 1 },
        duration: 560,
        ease: 'Back.out',
      });
      this.tweens.add({
        targets: subtitulo,
        alpha: { from: 0, to: 1 },
        duration: 500,
        delay: 220,
      });
      this.tweens.add({
        targets: [tituloDoJogo, legenda],
        alpha: { from: 0, to: 1 },
        y: '+=10',
        duration: 500,
        delay: 700,
      });
      this.tweens.add({
        targets: dica,
        alpha: { from: 0.45, to: 1 },
        duration: 850,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    ]);

    const comecar = () => {
      if (this.indo) return;
      this.indo = true;
      anunciar('Rodada 1 de 5. Segure e solte dentro da faixa verde.');

      if (semMovimento) {
        this.scene.start('jogo');
        return;
      }

      this.cameras.main.fadeOut(240, 27, 21, 8);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('jogo'));
    };

    this.input.once('pointerdown', comecar);
    this.input.keyboard?.once('keydown-SPACE', comecar);
    this.input.keyboard?.once('keydown-ENTER', comecar);
    this.time.delayedCall(semMovimento ? 2000 : 5600, comecar);
  }
}

class CenaJogo extends Phaser.Scene {
  constructor() {
    super('jogo');
  }

  create() {
    desenharFundo(this);

    this.rodada = 0;
    this.acertos = 0;
    this.moedas = 0;
    this.forca = 0;
    this.carregando = false;
    this.segurando = false;
    this.respondendo = false;
    this.esperandoSoltar = false;
    this.ignorarPrimeiroToque = true;
    this.meta = METAS[0];

    this.teclas = this.input.keyboard.addKeys({ espaco: 'SPACE', enter: 'ENTER' });
    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    ]);

    this.input.on('pointerdown', () => {
      if (!this.podeJogar()) return;
      this.segurando = true;
      if (this.esperandoSoltar) return;
      this.carregando = true;
      this.esperandoSoltar = false;
    });
    this.input.on('pointerup', () => {
      this.segurando = false;
      if (this.carregando) this.soltar();
    });
    this.input.on('pointerupoutside', () => {
      this.segurando = false;
      if (this.carregando) this.soltar();
    });

    this.game.events.on('blur', this.cancelarCarga, this);
    this.events.once('shutdown', () => {
      this.game.events.off('blur', this.cancelarCarga, this);
    });

    this.criarInterface();
    this.proximaRodada();
  }

  criarInterface() {
    const estiloTopo = {
      fontFamily: FONTE_TEXTO,
      fontSize: '18px',
      color: '#f5e8c8',
      fontStyle: 'bold',
    };

    this.textoRodada = this.add.text(36, 30, '', estiloTopo).setOrigin(0, 0.5);
    this.textoMoedas = this.add
      .text(LARGURA - 36, 30, 'Moedas (demo): 0', estiloTopo)
      .setOrigin(1, 0.5);

    this.add
      .text(LARGURA / 2, 72, 'Encha o cofre e solte na faixa verde', {
        fontFamily: FONTE_DISPLAY,
        fontSize: '25px',
        color: '#ffc200',
      })
      .setOrigin(0.5);

    this.grafico = this.add.graphics();

    this.textoPorcentagem = this.add
      .text(505, 172, '0%', {
        fontFamily: FONTE_DISPLAY,
        fontSize: '54px',
        color: '#f5e8c8',
      })
      .setOrigin(0, 0.5);

    this.textoMeta = this.add
      .text(505, 226, '', {
        fontFamily: FONTE_TEXTO,
        fontSize: '17px',
        color: '#bfae87',
      })
      .setOrigin(0, 0);

    this.add
      .text(505, 268, 'Segure para\nsubir o mel', {
        fontFamily: FONTE_TEXTO,
        fontSize: '16px',
        color: '#bfae87',
        lineSpacing: 5,
      })
      .setOrigin(0, 0);

    this.textoFeedback = this.add
      .text(LARGURA / 2, 426, 'Segure para encher o cofre', {
        fontFamily: FONTE_TEXTO,
        fontSize: '20px',
        color: '#f5e8c8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(LARGURA / 2, 458, 'Clique/toque e segure · ou mantenha Espaço', {
        fontFamily: FONTE_TEXTO,
        fontSize: '14px',
        color: '#8f7d58',
      })
      .setOrigin(0.5);
  }

  podeJogar() {
    return !this.respondendo && this.rodada < TOTAL_DE_RODADAS;
  }

  proximaRodada() {
    if (this.rodada >= TOTAL_DE_RODADAS) {
      this.terminar();
      return;
    }

    this.meta = METAS[this.rodada];
    this.forca = 0;
    this.carregando = false;
    this.segurando = false;
    this.respondendo = false;
    this.esperandoSoltar =
      this.ignorarPrimeiroToque || this.teclas.espaco.isDown || this.teclas.enter.isDown;
    this.ignorarPrimeiroToque = false;

    this.textoRodada.setText(`Rodada ${this.rodada + 1} de ${TOTAL_DE_RODADAS}`);
    this.textoMoedas.setText(`Moedas (demo): ${this.moedas}`);
    this.textoMeta.setText(
      `Meta: ${Math.round(this.meta.min * 100)}% a ${Math.round(this.meta.max * 100)}%`,
    );
    this.textoFeedback.setText('Segure para encher o cofre').setColor('#f5e8c8');
    this.textoPorcentagem.setColor('#f5e8c8');
    this.atualizarVisual();

    anunciar(
      `Rodada ${this.rodada + 1} de ${TOTAL_DE_RODADAS}. Solte entre ` +
        `${Math.round(this.meta.min * 100)}% e ${Math.round(this.meta.max * 100)}%.`,
    );
  }

  update(_tempo, delta) {
    if (!this.podeJogar()) return;

    const tecla = this.teclas.espaco.isDown || this.teclas.enter.isDown;

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

    this.forca = Math.min(1, this.forca + delta / 2200);
    this.atualizarVisual();
  }

  soltar() {
    if (!this.carregando || this.respondendo) return;

    this.carregando = false;
    this.respondendo = true;

    const acertou = this.forca >= this.meta.min && this.forca <= this.meta.max;

    if (acertou) {
      this.acertos += 1;
      this.moedas += MOEDAS_POR_ACERTO;
      this.textoFeedback
        .setText(`Boa! +${MOEDAS_POR_ACERTO} moedas (demo)`)
        .setColor('#3fbf6f');
      this.textoPorcentagem.setColor('#3fbf6f');
      this.textoMoedas.setText(`Moedas (demo): ${this.moedas}`);
      this.celebrar();
      anunciar(
        `Acertou! ${Math.round(this.forca * 100)}% e ${MOEDAS_POR_ACERTO} moedas de demonstração.`,
      );
    } else {
      this.textoFeedback
        .setText(
          `Quase! A faixa era ${Math.round(this.meta.min * 100)}% a ` +
            `${Math.round(this.meta.max * 100)}%`,
        )
        .setColor('#ff8a65');
      this.textoPorcentagem.setColor('#ff8a65');
      anunciar(
        `Não foi dessa vez: ${Math.round(this.forca * 100)}%. A faixa era ` +
          `${Math.round(this.meta.min * 100)}% a ${Math.round(this.meta.max * 100)}%.`,
      );
    }

    this.atualizarVisual();

    this.time.delayedCall(semMovimento ? 750 : 1150, () => {
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

  celebrar() {
    if (semMovimento) return;

    for (let particula = 0; particula < 12; particula += 1) {
      const ponto = this.add
        .circle(
          LARGURA / 2 + Phaser.Math.Between(-30, 30),
          250,
          Phaser.Math.Between(3, 6),
          CORES.mel,
        )
        .setDepth(20);

      this.tweens.add({
        targets: ponto,
        x: ponto.x + Phaser.Math.Between(-120, 120),
        y: ponto.y + Phaser.Math.Between(-120, 60),
        alpha: 0,
        duration: Phaser.Math.Between(500, 800),
        ease: 'Cubic.out',
        onComplete: () => ponto.destroy(),
      });
    }
  }

  atualizarVisual() {
    if (!this.grafico) return;

    const x = 250;
    const y = 108;
    const largura = 220;
    const altura = 290;
    const margem = 14;
    const alturaInterna = altura - margem * 2;
    const base = y + altura - margem;

    const grafico = this.grafico;
    grafico.clear();

    grafico.fillStyle(0x0d0a04, 0.65).fillRoundedRect(x, y, largura, altura, 26);

    const alturaDoMel = alturaInterna * this.forca;
    if (alturaDoMel > 0) {
      grafico.fillStyle(CORES.mel, 0.95).fillRect(x + margem, base - alturaDoMel, largura - margem * 2, alturaDoMel);
      grafico.fillStyle(CORES.nectar, 1).fillRect(
        x + margem,
        Math.max(y + margem, base - alturaDoMel - 5),
        largura - margem * 2,
        5,
      );
    }

    const topoFaixa = base - alturaInterna * this.meta.max;
    const alturaFaixa = alturaInterna * (this.meta.max - this.meta.min);
    grafico.fillStyle(CORES.verde, 0.22).fillRect(x + margem, topoFaixa, largura - margem * 2, alturaFaixa);
    grafico.lineStyle(2, CORES.verde, 0.9).strokeRect(
      x + margem,
      topoFaixa,
      largura - margem * 2,
      alturaFaixa,
    );

    grafico.lineStyle(2, CORES.mel, 0.25);
    for (let marca = 0; marca <= 10; marca += 1) {
      const yDaMarca = base - alturaInterna * (marca / 10);
      grafico.lineBetween(x + largura - margem + 8, yDaMarca, x + largura - margem + 18, yDaMarca);
    }

    grafico.lineStyle(4, CORES.mel, 0.8).strokeRoundedRect(x, y, largura, altura, 26);
    grafico.lineStyle(2, CORES.nectar, 0.35).strokeRoundedRect(x + 8, y + 8, largura - 16, altura - 16, 20);
    grafico.fillStyle(CORES.mel, 0.9).fillRoundedRect(x + 60, y - 10, largura - 120, 18, 9);

    this.textoPorcentagem.setText(`${Math.round(this.forca * 100)}%`);
  }

  terminar() {
    this.scene.start('fim', {
      acertos: this.acertos,
      total: TOTAL_DE_RODADAS,
      moedas: this.moedas,
    });
  }
}

class CenaFim extends Phaser.Scene {
  constructor() {
    super('fim');
  }

  init(dados) {
    this.dados = dados;
  }

  create() {
    desenharFundo(this);

    const { acertos, total, moedas } = this.dados;

    const medalha = this.add.circle(LARGURA / 2, 152, 60, CORES.mel);
    this.add.circle(LARGURA / 2, 152, 46, CORES.nectar).setAlpha(0.7);
    this.add
      .text(LARGURA / 2, 152, `${acertos}`, {
        fontFamily: FONTE_DISPLAY,
        fontSize: '58px',
        color: '#241d0b',
      })
      .setOrigin(0.5);

    this.add
      .text(LARGURA / 2, 242, 'Fim da demo', {
        fontFamily: FONTE_DISPLAY,
        fontSize: '42px',
        color: '#ffc200',
      })
      .setOrigin(0.5);

    this.add
      .text(LARGURA / 2, 288, `${acertos} de ${total} acertos`, {
        fontFamily: FONTE_TEXTO,
        fontSize: '24px',
        color: '#f5e8c8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(LARGURA / 2, 326, `+${moedas} moedas (demo)`, {
        fontFamily: FONTE_TEXTO,
        fontSize: '20px',
        color: '#3fbf6f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(
        LARGURA / 2,
        374,
        'No Beever, este desempenho viraria estrelas\ne o servidor pagaria o mel de verdade.',
        {
          fontFamily: FONTE_TEXTO,
          fontSize: '15px',
          color: '#bfae87',
          align: 'center',
          lineSpacing: 4,
        },
      )
      .setOrigin(0.5);

    this.add
      .text(LARGURA / 2, 438, 'Clique, toque ou aperte Espaço para jogar de novo', {
        fontFamily: FONTE_TEXTO,
        fontSize: '16px',
        color: '#ffc200',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    if (!semMovimento) {
      this.tweens.add({
        targets: medalha,
        scale: { from: 0.6, to: 1 },
        duration: 500,
        ease: 'Back.out',
      });
    }

    this.input.once('pointerdown', reiniciarDemo);
    this.input.keyboard?.once('keydown-SPACE', reiniciarDemo);
    this.input.keyboard?.once('keydown-ENTER', reiniciarDemo);

    anunciar(
      `Você fez ${acertos} de ${total} e ganhou ${moedas} moedas de demonstração. ` +
        'Nada foi creditado no Beever.',
    );
    instrucoes.textContent =
      'Clique em “Jogar de novo” ou no palco para repetir o protótipo.';
    botaoReiniciar.hidden = false;
  }
}

function reiniciarDemo() {
  if (!jogo) return;

  botaoReiniciar.hidden = true;
  instrucoes.textContent = TEXTO_DAS_INSTRUCOES;
  anunciar('Rodada 1 de 5. Segure e solte dentro da faixa verde.');

  jogo.scene.stop('fim');
  jogo.scene.start('jogo');
}

async function iniciar() {
  if (!palco) return;

  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* A fonte de fallback já mantém o protótipo legível. */
    }
  }

  jogo = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'jogo',
    width: LARGURA,
    height: ALTURA,
    backgroundColor: '#1b1508',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      roundPixels: true,
    },
    callbacks: {
      postBoot: (instancia) => {
        instancia.canvas.setAttribute('aria-describedby', 'instrucoes status');
        instancia.canvas.setAttribute('tabindex', '0');
      },
    },
    scene: [CenaAbertura, CenaJogo, CenaFim],
  });

  botaoReiniciar.addEventListener('click', reiniciarDemo);
  anunciar('Abertura do protótipo. Clique, toque ou aperte Espaço para começar.');

  // Ajuda a inspecionar o protótipo no console quando aberto com ?teste=1.
  // Não é usado pelo jogo e não expõe nada fora desta página de demo.
  if (new URLSearchParams(window.location.search).has('teste')) {
    globalThis.__beeverDemoFavoClick = jogo;
  }
}

iniciar().catch((erro) => {
  console.error(erro);
  anunciar('Não foi possível carregar o protótipo.');
});
