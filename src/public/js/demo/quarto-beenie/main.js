// Entrada da demo: primeiro o vídeo, depois o Phaser.
//
// O vídeo é HTML de propósito: poster e controles são mais previsíveis fora
// do canvas. Ele começa pausado; o play central inicia a reprodução, o botão
// no canto superior direito alterna o som e “Pular vídeo” abre o quarto.

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';
import { CenaBoot } from './cenas/CenaBoot.js';
import { CenaFim } from './cenas/CenaFim.js';
import { CenaQuarto } from './cenas/CenaQuarto.js';
import { ALTURA, LARGURA } from './desenho.js';
import { estado } from './estadoDoJogo.js';
import { INTEGRADO_POR_QUERY, SEM_SOM, publicarProgresso } from './integracao.js';
import { SEM_MOVIMENTO, anunciar, definirInstrucoes } from './interface.js';

// A página copiada para a atividade mostra a demo inteira: só o rodapé foi
// retirado. A classe que esconde os outros blocos continua valendo apenas para
// o modo antigo, em iframe.
if (INTEGRADO_POR_QUERY) document.documentElement.classList.add('demo-integrado');

const camadaDoVideo = document.getElementById('video-camada');
const video = document.getElementById('video-intro');
const botaoTocar = document.getElementById('video-tocar');
const botaoSom = document.getElementById('video-som');
const botaoPular = document.getElementById('video-pular');
const palco = document.getElementById('jogo');
const botaoRever = document.getElementById('rever-intro');
const hud = document.querySelector('.demo__hud');

let jogo = null;
let iniciando = false;

// A página de jogo real usa estes avisos para salvar rascunho e, na saída,
// fechar a partida. Fora do modo integrado `publicarProgresso` não faz nada.
estado.on('mudou', () => publicarProgresso(estado));
publicarProgresso(estado);

function esperar(milissegundos) {
  return new Promise((resolver) => {
    window.setTimeout(resolver, milissegundos);
  });
}

function pararVideo() {
  if (!video) return;
  video.pause();

  while (video.firstChild) video.removeChild(video.firstChild);
  video.removeAttribute('src');
  video.load();
}

async function iniciarJogo() {
  if (iniciando) return;
  iniciando = true;

  pararVideo();

  if (camadaDoVideo) {
    camadaDoVideo.classList.add('saindo');
    await esperar(SEM_MOVIMENTO ? 0 : 420);
    camadaDoVideo.remove();
  }

  if (!palco) return;
  palco.hidden = false;
  if (hud) hud.hidden = false;
  if (botaoRever) botaoRever.hidden = false;

  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* A fonte de fallback mantém o protótipo legível. */
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
    // O loader padrão do Phaser baixa a imagem via XHR e entrega um `blob:` para
    // a tag <img>. Como a CSP do app aceita apenas `'self'` e `data:` em
    // `img-src`, pedimos o carregamento direto no elemento <img>.
    loader: {
      imageLoadType: 'HTMLImageElement',
    },
    render: {
      antialias: true,
      roundPixels: true,
    },
    callbacks: {
      postBoot: (instancia) => {
        instancia.canvas.setAttribute('aria-describedby', 'instrucoes status');
        instancia.canvas.setAttribute(
          'aria-label',
          'Quarto do Beenie: use as setas para girar, pegue um item por vez, clique no móvel para guardar e clique na porta para sair quando quiser',
        );
        instancia.canvas.setAttribute('role', 'application');
        instancia.canvas.setAttribute('tabindex', '0');
      },
    },
    scene: [CenaBoot, CenaQuarto, CenaFim],
  });

  if (new URLSearchParams(window.location.search).has('teste')) {
    globalThis.__beeverDemoQuarto = { jogo, estado };
  }
}

function atualizarBotaoSom() {
  if (!botaoSom || !video) return;

  const comSom = !video.muted && video.volume > 0;
  const rotulo = comSom ? 'Mutar som' : 'Ativar som';
  botaoSom.setAttribute('aria-pressed', String(comSom));
  botaoSom.setAttribute('aria-label', rotulo);
  botaoSom.title = rotulo;
}

function alternarSom() {
  if (!video || iniciando) return;

  video.muted = !video.muted;
  if (!video.muted && video.volume === 0) video.volume = 1;
  atualizarBotaoSom();
  anunciar(video.muted ? 'Som desligado.' : 'Som ligado.');
}

function liberarVideo() {
  if (!video) {
    iniciarJogo();
    return;
  }
  if (iniciando) return;

  // O clique no play central autoriza o áudio. Se a pessoa já mutou pelo canto
  // superior direito, o estado dela é respeitado.
  const promessa = video.play();
  promessa?.catch(() => {
    if (iniciando) return;
    anunciar('Não foi possível reproduzir o vídeo. Use “Pular vídeo” para entrar no quarto.');
  });
}

if (video) {
  // O clique no play autoriza áudio. A preferência "sem som" da conta vem da
  // classe do body na atividade, ou da query no modo antigo em iframe.
  video.muted = SEM_SOM;
  video.volume = SEM_SOM ? 0 : 1;
  atualizarBotaoSom();

  video.addEventListener('ended', iniciarJogo, { once: true });
  video.addEventListener('playing', () => {
    if (botaoTocar) botaoTocar.hidden = true;
  });
  video.addEventListener('pause', () => {
    if (!iniciando && !video.ended && botaoTocar) botaoTocar.hidden = false;
  });
  video.addEventListener('volumechange', atualizarBotaoSom);
  video.addEventListener('error', () => {
    // Remover as fontes do vídeo no handoff pode disparar um erro tardio.
    // Depois que o jogo começou, esse erro não deve sobrescrever o status.
    if (iniciando) return;
    if (botaoTocar) botaoTocar.hidden = false;
    anunciar('Vídeo indisponível neste navegador. Use “Pular vídeo” para jogar.');
  });

  if (botaoTocar) botaoTocar.hidden = false;
} else {
  iniciarJogo();
}

botaoTocar?.addEventListener('click', () => {
  if (!video) {
    iniciarJogo();
    return;
  }
  liberarVideo();
});

botaoSom?.addEventListener('click', alternarSom);

botaoPular?.addEventListener('click', () => {
  iniciarJogo();
});

botaoRever?.addEventListener('click', () => {
  window.location.reload();
});

anunciar(
  'Introdução do Quarto do Beenie. Use o play central para assistir, o botão no canto superior direito para ligar ou desligar o som e “Pular vídeo” para ir ao quarto.',
);
definirInstrucoes(
  'Use o play central para assistir à introdução, o botão no canto superior direito para mutar e “Pular vídeo” para começar.',
);
