// Beenie interativa do painel: camadas (base + mãos), reações por contexto e
// balão de fala com digitação. Exporta uma API reutilizável para que o modo
// tutorial futuro possa dirigir a mesma mascote sem duplicar comportamento.

const REDUZ_MOVIMENTO = window.matchMedia('(prefers-reduced-motion: reduce)');

const MAOS = {
  esquerda: {
    descansando: '/img/clicks/mao/esquerda/L_mao_descanso.webp',
    cara: '/img/clicks/mao/esquerda/L_mao_rosto.webp',
    peito: '/img/clicks/mao/esquerda/L_mao_peito.webp',
    mostrando: '/img/clicks/mao/esquerda/L_mao_apresentando.webp',
    apontando: '/img/clicks/mao/esquerda/L_mao_aponta.webp',
    queixo: '/img/clicks/mao/esquerda/L_mao_queixo.webp',
    cintura: '/img/clicks/mao/esquerda/L_mao_cintura.webp',
    acena: '/img/clicks/mao/esquerda/L_mao_acena.webp',
  },
  direita: {
    descansando: '/img/clicks/mao/direita/R_mao_descanso.webp',
    cara: '/img/clicks/mao/direita/R_mao_rosto.webp',
    peito: '/img/clicks/mao/direita/R_mao_peito.webp',
    mostrando: '/img/clicks/mao/direita/R_mao_apresentando.webp',
    apontando: '/img/clicks/mao/direita/R_mao_aponta.webp',
    queixo: '/img/clicks/mao/direita/R_mao_queixo.webp',
    cintura: '/img/clicks/mao/direita/R_mao_cintura.webp',
    acena: '/img/clicks/mao/direita/R_mao_acena.webp',
  },
};

const EXPRESSOES = {
  normal: '/img/clicks/beenie/beenie_click_default.webp',
  falando: '/img/clicks/beenie/beenie_click_default_speak.webp',
  eita: '/img/clicks/beenie/beenie_click_eita.webp',
  oops: '/img/clicks/beenie/beenie_click_ops.webp',
  smirk: '/img/clicks/beenie/beenie_click_smirk.webp',
  amazed: '/img/clicks/beenie/beenie_click_amazed.webp',
  uhh: '/img/clicks/beenie/beenie_click_uhhh.webp',
  rindo: '/img/clicks/beenie/beenie_click_rindo.webp',
};

// Dicionário de poses: expressão + mãos + falas que combinam entre si.
// `falas` aceita string ou array; array sorteia uma fala da pose.
export const POSES_BEENIE = {
  boasVindas: {
    expressao: 'falando',
    maoEsquerda: 'descansando',
    maoDireita: 'acena',
    falas: [
      'Oi! Que bom te ver por aqui!',
      'Bzz! Pronta pra aprender hoje?',
      'Olá! A colmeia sentiu sua falta!',
    ],
  },
  incentivoMostrando: {
    expressao: 'falando',
    maoEsquerda: 'descansando',
    maoDireita: 'mostrando',
    falas: [
      'Cada atividade te deixa mais forte!',
      'Olha sua trilha: tem muita coisa boa te esperando!',
      'Pequenos passos também contam. Continua!',
    ],
  },
  incentivoCintura: {
    expressao: 'smirk',
    maoEsquerda: 'cintura',
    maoDireita: 'descansando',
    falas: [
      'Você está mandando bem, hein?',
      'Foco no objetivo: eu tô de olho!',
      'Com esse ritmo, vai longe!',
    ],
  },
  dicaQueixo: {
    expressao: 'falando',
    maoEsquerda: 'descansando',
    maoDireita: 'queixo',
    falas: [
      'Dica: fazer um pouco todo dia vale mais que fazer tudo de uma vez.',
      'Lembra de conferir suas tarefas de hoje!',
      'Que tal guardar um pouco de mel no cofre?',
    ],
  },
  cosquinhaPeito: {
    expressao: 'rindo',
    maoEsquerda: 'peito',
    maoDireita: 'peito',
    falas: [
      'Ei, ei! Isso faz cócegas! Hahaha!',
      'Para, para! Bzz hahaha!',
    ],
  },
  impacienteCara: {
    expressao: 'uhh',
    maoEsquerda: 'descansando',
    maoDireita: 'cara',
    falas: [
      'Tá bom, tá bom... já entendi que você gosta de clicar!',
      'Uhh... vamos voltar pra trilha?',
    ],
  },
  impacienteEita: {
    expressao: 'eita',
    maoEsquerda: 'cintura',
    maoDireita: 'mostrando',
    falas: [
      'Eita! Calma aí, eu não sou botão de videogame!',
      'Muitos cliques! Que tal jogar uma atividade de verdade?',
    ],
  },
  repouso: {
    expressao: 'normal',
    maoEsquerda: 'descansando',
    maoDireita: 'descansando',
    falas: [''],
  },
};

const PROGRESSAO = [
  { ate: 1, poses: ['boasVindas'] },
  { ate: 4, poses: ['incentivoMostrando', 'incentivoCintura', 'dicaQueixo'] },
  { ate: Infinity, poses: ['cosquinhaPeito', 'impacienteCara', 'impacienteEita'] },
];

function semSom() {
  return document.body.classList.contains('a11y-sem-som');
}

function escolher(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function resolverFala(falas) {
  if (Array.isArray(falas)) return escolher(falas.filter(Boolean));
  return typeof falas === 'string' ? falas : '';
}

function caminhoDaMao(lado, nome) {
  return MAOS[lado]?.[nome] || MAOS[lado].descansando;
}

function caminhoDaExpressao(nome) {
  return EXPRESSOES[nome] || EXPRESSOES.normal;
}

function preCarregar(caminhos) {
  for (const caminho of caminhos) {
    if (!caminho) continue;
    const img = new Image();
    img.src = caminho;
  }
}

// Blip sutil sintetizado (sem arquivo externo), respeitando modo sem som.
let contextoAudio = null;
function tocarBlip() {
  if (semSom()) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  try {
    if (!contextoAudio) contextoAudio = new Ctx();
    if (contextoAudio.state === 'suspended') contextoAudio.resume().catch(() => {});
    const agora = contextoAudio.currentTime;
    const osc = contextoAudio.createOscillator();
    const ganho = contextoAudio.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520 + Math.random() * 120, agora);
    ganho.gain.setValueAtTime(0.0001, agora);
    ganho.gain.exponentialRampToValueAtTime(0.018, agora + 0.01);
    ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 0.045);
    osc.connect(ganho);
    ganho.connect(contextoAudio.destination);
    osc.start(agora);
    osc.stop(agora + 0.05);
  } catch {
    // Sem áudio disponível: a fala visual continua funcionando.
  }
}

export function criarBeenieInterativa({
  botao,
  imagemBase,
  imagemMaoEsquerda,
  imagemMaoDireita,
  balaoFala,
  poses = POSES_BEENIE,
  aoMudarPose,
} = {}) {
  if (!botao || !imagemBase || !imagemMaoEsquerda || !imagemMaoDireita) {
    return null;
  }

  let cliquesSeguidos = 0;
  let timerReset = null;
  let timerFala = null;
  let timerDigitar = null;
  let timerRepouso = null;
  let falaAtualId = 0;
  let poseAtual = null;
  let ultimoNomePose = null;

  const todosOsCaminhos = [
    ...Object.values(EXPRESSOES),
    ...Object.values(MAOS.esquerda),
    ...Object.values(MAOS.direita),
  ];
  preCarregar(todosOsCaminhos);

  function limparTimersDeFala() {
    falaAtualId += 1;
    if (timerDigitar) { clearTimeout(timerDigitar); timerDigitar = null; }
    if (timerFala) { clearTimeout(timerFala); timerFala = null; }
    if (timerRepouso) { clearTimeout(timerRepouso); timerRepouso = null; }
  }

  function esconderBalao() {
    if (!balaoFala) return;
    balaoFala.textContent = '';
    balaoFala.classList.add('hidden');
  }

  function mostrarBalao(texto) {
    if (!balaoFala) return;
    balaoFala.classList.remove('hidden');
    balaoFala.textContent = texto;
  }

  function digitar(texto, aoTerminar) {
    if (!balaoFala) {
      aoTerminar?.();
      return;
    }
    balaoFala.classList.remove('hidden');

    const reduzir = REDUZ_MOVIMENTO.matches;
    if (reduzir || !texto) {
      balaoFala.textContent = texto;
      aoTerminar?.();
      return;
    }

    balaoFala.textContent = '';
    let indice = 0;
    const id = ++falaAtualId;

    const passo = () => {
      if (id !== falaAtualId) return;
      if (indice >= texto.length) {
        aoTerminar?.();
        return;
      }
      const char = texto[indice];
      balaoFala.textContent += char;
      indice += 1;
      if (indice % 3 === 0 && /\S/.test(char)) tocarBlip();
      timerDigitar = setTimeout(passo, char === '.' || char === '!' || char === '?' ? 55 : 24);
    };
    passo();
  }

  function aplicarCamadas({ expressao, maoEsquerda, maoDireita }) {
    const srcBase = caminhoDaExpressao(expressao);
    const srcEsq = caminhoDaMao('esquerda', maoEsquerda);
    const srcDir = caminhoDaMao('direita', maoDireita);
    if (imagemBase.getAttribute('src') !== srcBase) imagemBase.src = srcBase;
    if (imagemMaoEsquerda.getAttribute('src') !== srcEsq) imagemMaoEsquerda.src = srcEsq;
    if (imagemMaoDireita.getAttribute('src') !== srcDir) imagemMaoDireita.src = srcDir;
  }

  function mudarPoseFala(entrada = {}, opcoes = {}) {
    const nomePose = typeof entrada === 'string' ? entrada : null;
    const pose = nomePose ? poses[nomePose] : entrada;
    if (!pose) return null;
    if (nomePose) ultimoNomePose = nomePose;

    const fala = resolverFala(pose.falas ?? pose.fala ?? '');
    const duracao = Number.isFinite(opcoes.duracao) ? opcoes.duracao : 4200;
    const manter = opcoes.manter === true;

    limparTimersDeFala();
    poseAtual = pose;
    aplicarCamadas(pose);
    aoMudarPose?.({ ...pose, fala });

    if (!fala) {
      esconderBalao();
      return { ...pose, fala };
    }

    digitar(fala, () => {
      if (manter) return;
      timerFala = setTimeout(() => {
        esconderBalao();
        if (!opcoes.manterPose) {
          aplicarCamadas(POSES_BEENIE.repouso);
          poseAtual = POSES_BEENIE.repouso;
        }
      }, duracao);
    });

    return { ...pose, fala };
  }

  function posePorCliques(qtd) {
    const faixa = PROGRESSAO.find((f) => qtd <= f.ate) || PROGRESSAO[PROGRESSAO.length - 1];
    const candidatas = faixa.poses.filter((nome) => nome !== ultimoNomePose);
    const nome = escolher(candidatas.length > 0 ? candidatas : faixa.poses);
    ultimoNomePose = nome;
    return poses[nome] || POSES_BEENIE.repouso;
  }

  function agendarResetCliques() {
    if (timerReset) clearTimeout(timerReset);
    timerReset = setTimeout(() => {
      cliquesSeguidos = 0;
      timerReset = null;
    }, 4500);
  }

  function aoClicar() {
    cliquesSeguidos += 1;
    agendarResetCliques();
    const pose = posePorCliques(cliquesSeguidos);
    mudarPoseFala(pose);
  }

  botao.addEventListener('click', aoClicar);

  return {
    mudarPoseFala,
    obterPoseAtual: () => poseAtual,
    resetarCliques: () => { cliquesSeguidos = 0; },
    destruir: () => {
      botao.removeEventListener('click', aoClicar);
      if (timerReset) clearTimeout(timerReset);
      limparTimersDeFala();
      esconderBalao();
    },
  };
}
