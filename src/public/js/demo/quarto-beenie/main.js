// Entrada da demo: primeiro o vídeo, depois o Phaser.
//
// O vídeo é HTML de propósito: autoplay, poster e legendas são mais
// previsíveis fora do canvas. Quando ele termina (ou é pulado), a camada é
// removida e o Phaser é criado já na cena do quarto.

import * as Phaser from '/js/vendor/demo/phaser.esm.min.js';
import { CenaBoot } from './cenas/CenaBoot.js';
import { CenaFim } from './cenas/CenaFim.js';
import { CenaMinigame } from './cenas/CenaMinigame.js';
import { CenaQuarto } from './cenas/CenaQuarto.js';
import { ALTURA, LARGURA } from './desenho.js';
import { estado } from './estadoDoJogo.js';
import { SEM_MOVIMENTO, anunciar, definirInstrucoes } from './interface.js';

const camadaDoVideo = document.getElementById('video-camada');
const video = document.getElementById('video-intro');
const botaoTocar = document.getElementById('video-tocar');
const botaoPular = document.getElementById('video-pular');
const palco = document.getElementById('jogo');
const botaoRever = document.getElementById('rever-intro');

let jogo = null;
let iniciando = false;

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
    render: {
      antialias: true,
      roundPixels: true,
    },
    callbacks: {
      postBoot: (instancia) => {
        instancia.canvas.setAttribute('aria-describedby', 'instrucoes status');
        instancia.canvas.setAttribute(
          'aria-label',
          'Quarto do Beenie: use as setas para girar e clique nos objetos',
        );
        instancia.canvas.setAttribute('role', 'application');
        instancia.canvas.setAttribute('tabindex', '0');
      },
    },
    scene: [CenaBoot, CenaQuarto, CenaMinigame, CenaFim],
  });

  if (new URLSearchParams(window.location.search).has('teste')) {
    globalThis.__beeverDemoQuarto = { jogo, estado };
  }
}

function liberarVideo() {
  if (!video) {
    iniciarJogo();
    return;
  }

  video.play().then(
    () => {
      if (botaoTocar) botaoTocar.hidden = true;
    },
    () => {
      if (botaoTocar) botaoTocar.hidden = false;
      anunciar('O navegador bloqueou o autoplay. Reproduza ou pule a introdução.');
    },
  );
}

if (video) {
  video.addEventListener('ended', iniciarJogo, { once: true });
  video.addEventListener('playing', () => {
    if (botaoTocar) botaoTocar.hidden = true;
  });
  video.addEventListener('error', () => {
    // Remover as fontes do vídeo no handoff pode disparar um erro tardio.
    // Depois que o jogo começou, esse erro não deve sobrescrever o status.
    if (iniciando) return;
    if (botaoTocar) botaoTocar.hidden = true;
    anunciar('Vídeo indisponível neste navegador. Use “Pular introdução” para jogar.');
  });

  if (SEM_MOVIMENTO) {
    if (botaoTocar) botaoTocar.hidden = false;
    anunciar('Introdução pronta. Reproduza o vídeo ou pule para o quarto.');
  } else {
    liberarVideo();
  }
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

botaoPular?.addEventListener('click', () => {
  iniciarJogo();
});

botaoRever?.addEventListener('click', () => {
  window.location.reload();
});

anunciar('Introdução do Quarto do Beenie. O vídeo tem 6 segundos e pode ser pulado.');
definirInstrucoes(
  'A introdução é um vídeo curto, sem áudio. Depois, use as setas para girar o quarto e clique nos objetos.',
);
