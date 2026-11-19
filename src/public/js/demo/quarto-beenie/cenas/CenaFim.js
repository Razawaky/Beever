// Fim da demo: resumo do que foi arrumado e do mel fictício.
// O jogador pode sair pela porta a qualquer momento; a recompensa é a soma
// das atividades concluídas, não um prêmio por completar tudo.
// O botão reinicia o quarto sem passar pelo vídeo de novo. Para rever a
// introdução, a própria página oferece o botão "Rever introdução".

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';
import { ROTULOS_DAS_TAREFAS } from '../dadosDoQuarto.js';
import { CORES, FONTES, LARGURA, criarFundoEscuro } from '../desenho.js';
import { IDS_DAS_TAREFAS, estado } from '../estadoDoJogo.js';
import { publicarFim } from '../integracao.js';
import { SEM_MOVIMENTO, anunciar, definirInstrucoes } from '../interface.js';

function rotularTarefas(ids) {
  return ids.map((id) => ROTULOS_DAS_TAREFAS[id] ?? id).join(', ');
}

const TAMANHO_DA_NOTA = Object.freeze({ largura: 198, altura: 234 });

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
    this.reiniciando = false;

    const concluidas = IDS_DAS_TAREFAS.filter((id) => estado.tarefas[id]);
    const pendentes = IDS_DAS_TAREFAS.filter((id) => !estado.tarefas[id]);
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
      ? 'Todas as atividades concluídas no protótipo do Beenie'
      : nadaFeito
        ? 'Você saiu sem concluir atividades. O mel é proporcional ao que foi feito.'
        : 'Você saiu antes de terminar. O mel é proporcional ao que foi feito.';

    const nota = notaPorTarefas(concluidas.length, total);
    const textoConcluidas = concluidas.length
      ? `Concluídas: ${rotularTarefas(concluidas)}`
      : 'Concluídas: nenhuma';
    const textoPendentes = pendentes.length
      ? `Pendentes: ${rotularTarefas(pendentes)}`
      : 'Pendentes: nenhuma';

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

    const textoMoedas = this.add
      .text(LARGURA / 2, 320, `${estado.moedas} mel (demo)`, {
        fontFamily: FONTES.display,
        fontSize: '34px',
        color: '#ffc200',
      })
      .setOrigin(0.5, 0);

    this.add
      .image(textoMoedas.x - textoMoedas.width / 2 - 22, 338, 'moeda')
      .setDisplaySize(28, 28)
      .setOrigin(0.5);

    this.add
      .text(
        LARGURA / 2,
        362,
        `${concluidas.length} de ${total} atividades concluídas`,
        {
          fontFamily: FONTES.texto,
          fontSize: '17px',
          color: '#f5e8c8',
          fontStyle: 'bold',
        },
      )
      .setOrigin(0.5, 0);

    this.add
      .text(LARGURA / 2, 392, textoConcluidas, {
        fontFamily: FONTES.texto,
        fontSize: '13px',
        color: '#f5e8c8',
        align: 'center',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5, 0);

    this.add
      .text(LARGURA / 2, 414, textoPendentes, {
        fontFamily: FONTES.texto,
        fontSize: '13px',
        color: '#bfae87',
        align: 'center',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5, 0);

    this.add
      .text(
        LARGURA / 2,
        444,
        'Nada foi creditado no Beever. No jogo real, o servidor calcula a recompensa.',
        {
          fontFamily: FONTES.texto,
          fontSize: '12px',
          color: '#bfae87',
          align: 'center',
          wordWrap: { width: 520 },
        },
      )
      .setOrigin(0.5, 0);

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
      `Fim da demo: ${concluidas.length} de ${total} atividades e ${estado.moedas} de mel de demonstração. Resultado: ${nota.rotulo}.`,
    );
    definirInstrucoes('Clique em “Jogar de novo” ou aperte Enter para voltar ao quarto.');
  }

  criarBotao() {
    const botao = this.add.container(LARGURA / 2, 500);
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
      .zone(LARGURA / 2, 500, 280, 50)
      .setInteractive({ useHandCursor: true });
    zona.on('pointerover', () => fundo.setFillStyle(CORES.nectar, 1));
    zona.on('pointerout', () => fundo.setFillStyle(CORES.mel, 1));
    zona.on('pointerdown', () => this.reiniciar());

    this.add
      .text(LARGURA / 2, 535, 'Enter, Espaço ou clique para recomeçar', {
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
