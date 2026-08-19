// Quiz do Favo (RF-JOG-01). JS puro na página, como os outros três.
//
// A tela não sabe contar acerto nem calcular recompensa: ela abre a partida,
// mostra uma pergunta de cada vez e manda as respostas escolhidas. Quem conta é
// o servidor, com o gabarito do banco (RN-007).
const carregando = document.getElementById('quiz-carregando');
const aviso = document.getElementById('quiz-erro');
const jogo = document.getElementById('quiz-jogo');
const enunciado = document.getElementById('quiz-enunciado');
const listaDeAlternativas = document.getElementById('quiz-alternativas');
const botaoConfirmar = document.getElementById('quiz-confirmar');
const numeroDaPergunta = document.getElementById('quiz-numero');
const totalDePerguntas = document.getElementById('quiz-total');
const barra = document.getElementById('quiz-barra');
const barraCaixa = document.getElementById('quiz-barra-caixa');
const avisoDeRepeticao = document.getElementById('quiz-repeticao');
const resultado = document.getElementById('quiz-resultado');

const csrfToken = document.body.dataset.csrfToken;
const idCelula = Number(document.body.dataset.celulaId);

const CLASSES_DA_ALTERNATIVA =
  'w-full rounded-favo border-2 border-linha bg-white px-4 py-3 text-left font-medium text-tinta transition hover:border-ambar focus-visible:outline-[3px] focus-visible:outline-tinta focus-visible:outline-offset-2';

let perguntas = [];
let respostas = [];
let indiceAtual = 0;
let escolhaAtual = null;
let token = null;

function mostrarErro(mensagem) {
  carregando.classList.add('hidden');
  jogo.classList.add('hidden');
  aviso.textContent = mensagem;
  aviso.classList.remove('hidden');
}

async function pedir(caminho, corpo) {
  const resposta = await fetch(caminho, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-csrf-token': csrfToken },
    credentials: 'include',
    body: JSON.stringify(corpo),
  });

  const dados = await resposta.json().catch(() => ({}));
  // O handler global responde `{ erro, codigo, requestId }`.
  if (!resposta.ok) throw new Error(dados.erro ?? 'Não foi possível continuar a atividade.');
  return dados;
}

/** A barra usa classe, e não largura em `style`: a CSP não permite estilo inline. */
function atualizarBarra() {
  const feitas = Math.round((indiceAtual / perguntas.length) * 100);
  const passo = Math.round(feitas / 5) * 5;

  barra.className = `h-full rounded-pilula bg-mel barra-${passo}`;
  barraCaixa.setAttribute('aria-valuenow', String(feitas));
}

function marcarEscolhida(botaoEscolhido) {
  for (const botao of listaDeAlternativas.querySelectorAll('button')) {
    const escolhido = botao === botaoEscolhido;
    botao.setAttribute('aria-pressed', String(escolhido));
    botao.className = escolhido
      ? `${CLASSES_DA_ALTERNATIVA} border-mel bg-cera`
      : CLASSES_DA_ALTERNATIVA;
  }
}

function mostrarPergunta() {
  const pergunta = perguntas[indiceAtual];

  escolhaAtual = null;
  botaoConfirmar.disabled = true;
  botaoConfirmar.textContent = indiceAtual === perguntas.length - 1 ? 'Terminar' : 'Confirmar';
  numeroDaPergunta.textContent = String(indiceAtual + 1);
  enunciado.textContent = pergunta.enunciado;
  listaDeAlternativas.replaceChildren();
  atualizarBarra();

  pergunta.alternativas.forEach((alternativa, indice) => {
    const item = document.createElement('li');
    const botao = document.createElement('button');

    botao.type = 'button';
    botao.textContent = alternativa;
    botao.className = CLASSES_DA_ALTERNATIVA;
    botao.setAttribute('aria-pressed', 'false');
    botao.addEventListener('click', () => {
      escolhaAtual = indice;
      botaoConfirmar.disabled = false;
      marcarEscolhida(botao);
    });

    item.append(botao);
    listaDeAlternativas.append(item);
  });

  enunciado.focus?.();
}

function mostrarResultado(dados) {
  jogo.classList.add('hidden');
  resultado.classList.remove('hidden');

  document.getElementById('quiz-estrelas').textContent =
    `${'★'.repeat(dados.estrelas)}${'☆'.repeat(3 - dados.estrelas)} — ${dados.estrelas} de 3 estrelas`;
  document.getElementById('quiz-ganhos').textContent =
    `Você ganhou ${dados.xp} de XP, ${dados.polen} de pólen e ${dados.mel} de mel.`;

  if (dados.subiuDeNivel) {
    const nivel = document.getElementById('quiz-nivel');
    nivel.textContent = `Você chegou ao nível ${dados.nivel}! Bônus de ${dados.bonusDeMelPorNivel} de mel.`;
    nivel.classList.remove('hidden');
  }
}

async function terminar() {
  botaoConfirmar.disabled = true;
  botaoConfirmar.textContent = 'Enviando…';

  try {
    mostrarResultado(await pedir(`/partidas/${token}/resultado`, { respostas }));
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

botaoConfirmar.addEventListener('click', () => {
  if (escolhaAtual === null) return;

  respostas[indiceAtual] = escolhaAtual;
  indiceAtual += 1;

  if (indiceAtual < perguntas.length) {
    mostrarPergunta();
    return;
  }
  terminar();
});

async function comecar() {
  try {
    const partida = await pedir('/partidas', { idCelula });

    token = partida.token;
    perguntas = partida.conteudo.perguntas;
    respostas = [];
    totalDePerguntas.textContent = String(perguntas.length);
    if (partida.ehRepeticao) avisoDeRepeticao.classList.remove('hidden');

    carregando.classList.add('hidden');
    jogo.classList.remove('hidden');
    mostrarPergunta();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

comecar();
