// A parte da tela de jogo que é igual em todos os jogos (RF-JOG-08).
//
// Todo jogo abre a partida do mesmo jeito, mostra erro no mesmo lugar e termina
// no mesmo painel de resultado. O que muda de um jogo para o outro é só a área
// do meio, e é ela que mora no arquivo de cada jogo.
//
// Quem conta acerto e calcula recompensa é o servidor (RN-007): daqui só saem
// as respostas escolhidas. A tela de resultado é do `resultado.js`, para o
// arquivo comum a todos os jogos não virar uma tela.
import { mostrarResultado } from './resultado.js';

const carregando = document.getElementById('jogo-carregando');
const aviso = document.getElementById('jogo-erro');
const area = document.getElementById('jogo-area');
const avisoDeRepeticao = document.getElementById('jogo-repeticao');
const painelDePasso = document.getElementById('jogo-passo');
const barra = document.getElementById('jogo-barra');
const barraCaixa = document.getElementById('jogo-barra-caixa');

const midia = document.getElementById('jogo-midia');

const csrfToken = document.body.dataset.csrfToken;
const idCelula = Number(document.body.dataset.celulaId);

async function pedir(caminho, corpo, metodo = 'POST') {
  const resposta = await fetch(caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-csrf-token': csrfToken },
    credentials: 'include',
    body: JSON.stringify(corpo),
  });

  const dados = await resposta.json().catch(() => ({}));
  // O handler global responde `{ erro, codigo, requestId }`.
  if (!resposta.ok) throw new Error(dados.erro ?? 'Não foi possível continuar a atividade.');
  return dados;
}

export function mostrarErro(mensagem) {
  carregando.classList.add('hidden');
  area.classList.add('hidden');
  aviso.textContent = mensagem;
  aviso.classList.remove('hidden');
}

/** A barra usa classe, e não largura em `style`: a CSP não permite estilo inline. */
export function mostrarProgresso(texto, feitas, total) {
  const porcento = Math.round((feitas / total) * 100);
  const passo = Math.round(porcento / 5) * 5;

  painelDePasso.textContent = texto;
  barra.className = `h-full rounded-pilula bg-mel barra-${passo}`;
  barraCaixa.setAttribute('aria-valuenow', String(porcento));
}

// Guardado aqui para o jogo não precisar repassar o token a cada salvamento.
let tokenDaPartida = null;

/** Abre a partida, troca o "carregando" pela área do jogo e devolve o conteúdo. */
export async function abrirPartida() {
  const partida = await pedir('/partidas', { idCelula });

  tokenDaPartida = partida.token;
  if (partida.ehRepeticao) avisoDeRepeticao.classList.remove('hidden');

  // A imagem da atividade, quando o painel cadastrou uma. Fica aqui porque é
  // igual nos oito jogos, e o `alt` é vazio de propósito: a arte ilustra o
  // enunciado que já está escrito ao lado, então repeti-lo atrapalharia o leitor
  // de tela em vez de ajudar.
  if (partida.conteudo?.imagem) {
    midia.src = partida.conteudo.imagem;
    midia.classList.remove('hidden');
  }

  carregando.classList.add('hidden');
  area.classList.remove('hidden');
  return partida;
}

/**
 * Guarda no servidor o que já foi decidido, para a partida poder ser retomada
 * (RF-JOG-07).
 *
 * É rascunho, e não nota: o `.catch` existe porque perder um salvamento não
 * pode parar o jogo. A conta continua saindo do gabarito no fim (RN-007).
 */
export function salvarProgresso(respostasParciais) {
  return pedir(`/partidas/${tokenDaPartida}/estado`, { respostas: respostasParciais }, 'PUT').catch(() => false);
}

/** Manda as respostas e entrega o resultado para a tela que o mostra. */
export async function concluirPartida(token, respostas) {
  const dados = await pedir(`/partidas/${token}/resultado`, { respostas });

  area.classList.add('hidden');
  mostrarResultado(dados);
}
