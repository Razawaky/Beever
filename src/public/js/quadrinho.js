// Quadrinho Interativo (RF-JOG-10). JS puro na página, como os outros jogos.
//
// Um painel por vez. Painel de narrativa só avança; painel de escolha espera a
// decisão antes de liberar o botão. Quem conta acerto é o servidor (RN-007).
import { abrirPartida, concluirPartida, mostrarErro, mostrarProgresso, salvarProgresso } from './partida.js';

const imagem = document.getElementById('quadrinho-imagem');
const texto = document.getElementById('quadrinho-texto');
const listaDeEscolhas = document.getElementById('quadrinho-escolhas');
const botaoAvancar = document.getElementById('quadrinho-avancar');

const CLASSES_DA_ESCOLHA =
  'w-full rounded-favo border-2 border-linha bg-white px-4 py-3 text-left font-medium text-tinta transition hover:border-ambar focus-visible:outline-[3px] focus-visible:outline-tinta focus-visible:outline-offset-2';

let paineis = [];
let respostas = [];
let indiceAtual = 0;
let escolhaAtual = null;
let token = null;

/** Quantas escolhas ficaram para trás até este painel: é o índice da resposta. */
function escolhasAntesDe(indice) {
  return paineis.slice(0, indice).filter((painel) => Array.isArray(painel.escolhas)).length;
}

/** Onde a história recomeça para quem já decidiu algumas coisas (RF-JOG-07). */
function painelDaProximaEscolha(feitas) {
  let vistas = 0;
  for (let indice = 0; indice < paineis.length; indice += 1) {
    if (!Array.isArray(paineis[indice].escolhas)) continue;
    if (vistas === feitas) return indice;
    vistas += 1;
  }
  return 0;
}

function marcarEscolhida(botaoEscolhido) {
  for (const botao of listaDeEscolhas.querySelectorAll('button')) {
    const escolhido = botao === botaoEscolhido;
    botao.setAttribute('aria-pressed', String(escolhido));
    botao.className = escolhido ? `${CLASSES_DA_ESCOLHA} border-mel bg-cera` : CLASSES_DA_ESCOLHA;
  }
}

function mostrarPainel() {
  const painel = paineis[indiceAtual];
  const temEscolha = Array.isArray(painel.escolhas);

  escolhaAtual = null;
  texto.textContent = painel.texto;
  listaDeEscolhas.replaceChildren();
  botaoAvancar.disabled = temEscolha;
  botaoAvancar.textContent = indiceAtual === paineis.length - 1 ? 'Terminar' : 'Continuar';
  mostrarProgresso(`Painel ${indiceAtual + 1} de ${paineis.length}`, indiceAtual, paineis.length);

  if (painel.imagem) {
    imagem.src = painel.imagem;
    imagem.classList.remove('hidden');
  } else {
    imagem.classList.add('hidden');
  }

  if (!temEscolha) return;

  painel.escolhas.forEach((escolha, indice) => {
    const item = document.createElement('li');
    const botao = document.createElement('button');

    botao.type = 'button';
    botao.textContent = escolha;
    botao.className = CLASSES_DA_ESCOLHA;
    botao.setAttribute('aria-pressed', 'false');
    botao.addEventListener('click', () => {
      escolhaAtual = indice;
      botaoAvancar.disabled = false;
      marcarEscolhida(botao);
    });

    item.append(botao);
    listaDeEscolhas.append(item);
  });

  texto.focus?.();
}

async function terminar() {
  botaoAvancar.disabled = true;
  botaoAvancar.textContent = 'Enviando…';

  try {
    await concluirPartida(token, respostas);
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

botaoAvancar.addEventListener('click', () => {
  if (Array.isArray(paineis[indiceAtual].escolhas)) {
    if (escolhaAtual === null) return;
    // Pela posição, e não por `push`: quem retomou a partida já tem respostas na
    // lista, e empilhar de novo duplicaria a decisão que ele já tinha tomado.
    respostas[escolhasAntesDe(indiceAtual)] = escolhaAtual;
    salvarProgresso(respostas);
  }

  indiceAtual += 1;
  if (indiceAtual < paineis.length) {
    mostrarPainel();
    return;
  }
  terminar();
});

async function comecar() {
  try {
    const partida = await abrirPartida();

    token = partida.token;
    paineis = partida.conteudo.paineis;
    // Quem voltou cai no painel da próxima decisão, com as anteriores guardadas.
    respostas = partida.estado?.respostas ?? [];
    indiceAtual = respostas.length > 0 ? painelDaProximaEscolha(respostas.length) : 0;
    mostrarPainel();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

comecar();
