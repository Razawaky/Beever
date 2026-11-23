// Fim da demo: resumo do que foi arrumado e do mel fictício.
// O jogador pode sair pela porta a qualquer momento; a recompensa é a soma
// das atividades concluídas, não um prêmio por completar tudo.
// O botão reinicia o quarto sem passar pelo vídeo de novo. Para rever a
// introdução, a própria página oferece o botão "Rever introdução".

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';
import { CORES, FONTES, LARGURA, criarFundoEscuro } from '../desenho.js';
import { IDS_DAS_TAREFAS, estado } from '../estadoDoJogo.js';
import { estrelasRecebidas, observarEstrelasDoServidor, observarProximaCelula, observarRecompensas, proximaCelulaRecebida, publicarFim, recompensasRecebidas } from '../integracao.js';
import { SEM_MOVIMENTO, anunciar, definirInstrucoes } from '../interface.js';

const TAMANHO_DA_NOTA = Object.freeze({ largura: 198, altura: 234 });
const POSICAO_DAS_ESTRELAS = 366;

// A demo isolada não tem servidor, mas usa a mesma faixa da RN-030: sair sem
// arrumar nada vale zero, até um erro vale três, até três vale duas e o resto
// cai no piso de uma estrela.
function estrelasDemo(concluidas, total) {
  if (concluidas === 0) return 0;
  const erros = total - concluidas;
  if (erros <= 1) return 3;
  if (erros <= 3) return 2;
  return 1;
}

function pontosDaEstrela(x, y, externo, interno) {
  const pontos = [];
  for (let indice = 0; indice < 10; indice += 1) {
    const angulo = -Math.PI / 2 + (indice * Math.PI) / 5;
    const raio = indice % 2 === 0 ? externo : interno;
    pontos.push(new Phaser.Geom.Point(x + Math.cos(angulo) * raio, y + Math.sin(angulo) * raio));
  }
  return pontos;
}

function notaPorTarefas(concluidas, total) {
  if (concluidas >= total) return { chave: 'score-otimo', rotulo: 'ótimo' };
  if (concluidas >= total - 2) return { chave: 'score-muito-bom', rotulo: 'muito bom' };
  if (concluidas >= 2) return { chave: 'score-meh', rotulo: 'meeh' };
  return { chave: 'score-ruim', rotulo: 'ruim' };
}

export class CenaFim extends Phaser.Scene {
  constructor() {
    super('fim');
  }

  create() {
    this.continuando = false;
    document.getElementById('quarto-resultado-recompensas')?.classList.add('hidden');

    const concluidas = IDS_DAS_TAREFAS.filter((id) => estado.tarefas[id]);
    const total = estado.totalDeTarefas;
    const tudoPronto = concluidas.length === total;
    const nadaFeito = concluidas.length === 0;

    // A demo isolada não tem ouvinte; a atividade integrada usa este aviso para
    // fechar a partida com o mesmo crédito que o servidor calcularia.
    publicarFim({ tarefas: concluidas, total });

    const titulo = tudoPronto
      ? 'Quarto arrumado!'
      : nadaFeito
        ? 'Você saiu do quarto'
        : 'Quarto parcialmente arrumado!';

    const subtitulo = tudoPronto
      ? ''
      : nadaFeito
        ? 'Você saiu sem concluir atividades. O mel é proporcional ao que foi feito.'
        : 'Você saiu antes de terminar. O mel é proporcional ao que foi feito.';

    const nota = notaPorTarefas(concluidas.length, total);
    let estrelas = estrelasRecebidas() ?? estrelasDemo(concluidas.length, total);
    this.desenharEstrelas(estrelas);

    const pararDeObservarEstrelas = observarEstrelasDoServidor((quantidade) => {
      estrelas = quantidade;
      this.desenharEstrelas(quantidade);
      this.anunciarResultado(estrelas, nota);
    });
    const pararDeObservarProxima = observarProximaCelula(() => {
      // A próxima célula chega após o servidor concluir a partida; o botão já
      // navega com o que estiver disponível no momento do clique.
    });
    const pararDeObservarRecompensas = observarRecompensas(() => {
      this.atualizarRecompensas();
      this.anunciarResultado(estrelas, nota);
    });
    this.events.once('shutdown', () => {
      pararDeObservarEstrelas();
      pararDeObservarProxima();
      pararDeObservarRecompensas();
      document.getElementById('quarto-resultado-recompensas')?.classList.add('hidden');
    });

    criarFundoEscuro(this);
    this.add.circle(LARGURA / 2, 224, 170, CORES.mel, 0.08);
    this.add.circle(LARGURA / 2, 224, 120, CORES.mel, 0.06);

    this.add
      .text(LARGURA / 2, 34, titulo, {
        fontFamily: FONTES.display,
        fontSize: titulo.length > 20 ? '34px' : '38px',
        color: '#ffc200',
        align: 'center',
      })
      .setOrigin(0.5, 0);

    this.add
      .text(LARGURA / 2, 88, subtitulo, {
        fontFamily: FONTES.texto,
        fontSize: '15px',
        color: '#bfae87',
        align: 'center',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5, 0);

    const imagemDaNota = this.add
      .image(LARGURA / 2, 232, nota.chave)
      .setDisplaySize(TAMANHO_DA_NOTA.largura, TAMANHO_DA_NOTA.altura)
      .setDepth(10);

    this.atualizarRecompensas();

    this.criarBotao();

    if (!SEM_MOVIMENTO) {
      this.tweens.add({
        targets: imagemDaNota,
        y: '+=5',
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.ENTER,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);
    this.input.keyboard?.once('keydown-ENTER', () => this.irParaProximaCelula());
    this.input.keyboard?.once('keydown-SPACE', () => this.irParaProximaCelula());

    this.cameras.main.fadeIn(SEM_MOVIMENTO ? 0 : 300, 27, 21, 8);
    this.anunciarResultado(estrelas, nota);
    definirInstrucoes('Resultado do quarto.');
  }

  desenharEstrelas(quantidade) {
    this.estrelasAtuais = quantidade;
    if (this.estrelasDesenhadas) {
      this.estrelasDesenhadas.forEach((estrela) => estrela.destroy());
    }
    this.estrelasDesenhadas = [];

    const espacamento = 46;
    const inicio = LARGURA / 2 - espacamento;

    for (let posicao = 0; posicao < 3; posicao += 1) {
      const pontos = pontosDaEstrela(inicio + posicao * espacamento, POSICAO_DAS_ESTRELAS, 17, 8);
      const ganha = posicao < quantidade;
      const desenho = this.add.graphics();

      desenho.fillStyle(ganha ? CORES.mel : CORES.tintaSuave, 0.9);
      desenho.fillPoints(pontos, true);
      desenho.lineStyle(2, ganha ? CORES.nectar : CORES.paredeSombra, 1);
      desenho.strokePoints(pontos, true);

      // Mesmo escalonamento da tela de resultado do app, sem `style` inline.
      if (ganha && !SEM_MOVIMENTO) {
        desenho.setAlpha(0);
        this.tweens.add({ targets: desenho, alpha: 1, duration: 300, delay: posicao * 150 });
      }

      this.estrelasDesenhadas.push(desenho);
    }
  }

  melExibido() {
    const recompensas = recompensasRecebidas();
    if (recompensas) return Math.max(0, Math.round((recompensas.mel || 0) + (recompensas.bonusDeMelPorNivel || 0)));
    return Math.max(0, Math.round(estado.moedas || 0));
  }

  atualizarRecompensas() {
    const recompensas = recompensasRecebidas();
    const container = document.getElementById('quarto-resultado-recompensas');
    const xp = document.getElementById('quarto-resultado-xp');
    const polen = document.getElementById('quarto-resultado-polen');
    const mel = document.getElementById('quarto-resultado-mel');
    if (!container || !xp || !polen || !mel) return;

    container.classList.remove('hidden');
    if (!recompensas) {
      xp.textContent = '+0';
      polen.textContent = '+0';
      mel.textContent = `+${this.melExibido()}`;
      return;
    }
    xp.textContent = `+${recompensas.xp}`;
    polen.textContent = `+${recompensas.polen}`;
    mel.textContent = `+${this.melExibido()}`;
  }

  anunciarResultado(estrelas, nota) {
    const recompensas = recompensasRecebidas();
    const mel = this.melExibido();
    const ganhos = recompensas
      ? ` ${mel} de mel, +${recompensas.xp} XP e +${recompensas.polen} de pólen.`
      : ` ${mel} de mel.`;
    anunciar(`Resultado:${ganhos} Nota ${nota.rotulo}. ${estrelas} de 3 estrelas.`);
  }

  criarBotao() {
    const botao = this.add.container(LARGURA / 2, 500);
    const fundo = this.add
      .rectangle(0, 0, 280, 50, CORES.mel)
      .setStrokeStyle(3, 0x9a7400);
    const texto = this.add
      .text(0, 0, 'Próxima célula', {
        fontFamily: FONTES.texto,
        fontSize: '18px',
        color: '#241d0b',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    botao.add([fundo, texto]);

    const zona = this.add
      .zone(LARGURA / 2, 500, 280, 50)
      .setInteractive({ useHandCursor: true });
    zona.on('pointerover', () => fundo.setFillStyle(CORES.nectar, 1));
    zona.on('pointerout', () => fundo.setFillStyle(CORES.mel, 1));
    zona.on('pointerdown', () => this.irParaProximaCelula());
  }

  irParaProximaCelula() {
    if (this.continuando) return;
    this.continuando = true;

    const proxima = proximaCelulaRecebida();
    if (proxima?.id && proxima?.idFavo) {
      window.location.href = `/trilha/${proxima.idFavo}/celula/${proxima.id}`;
      return;
    }

    const idFavo = document.body?.dataset?.favoId;
    if (idFavo) {
      window.location.href = `/painel/trilha/${idFavo}`;
      return;
    }

    window.location.href = '/painel/trilha';
  }
}
