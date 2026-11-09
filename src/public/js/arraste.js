// Arraste e Classifique (RF-JOG-02). JS puro na página, como os outros jogos.
//
// A carta pode ir para a caixa de três jeitos, e os três fazem a mesma coisa:
// arrastando com o mouse ou o dedo, tocando na carta e depois no botão da
// caixa, ou chegando nesses mesmos botões pelo teclado. A RNF-23 pede a
// alternativa por clique e teclado, então ela não é um extra: é o mesmo caminho
// que o arrastar usa por baixo.
//
// Como sempre, quem corrige é o servidor (RN-007): daqui sai só a caixa
// escolhida para cada carta.
import { abrirPartida, concluirPartida, mostrarErro, mostrarProgresso, salvarProgresso } from './partida.js';

const enunciado = document.getElementById('arraste-enunciado');
const monte = document.getElementById('arraste-monte');
const painelDeCaixas = document.getElementById('arraste-caixas');
const botaoTerminar = document.getElementById('arraste-terminar');
const aviso = document.getElementById('arraste-aviso');

const CLASSES_DA_CARTA =
  'w-full cursor-pointer rounded-favo border-2 border-linha bg-white px-4 py-3 text-left font-medium text-tinta transition hover:border-ambar focus-visible:outline-[3px] focus-visible:outline-tinta focus-visible:outline-offset-2';
const CLASSES_DA_CAIXA = 'rounded-favo border-2 border-linha bg-white p-4 transition';
const CLASSES_DO_BOTAO_SOLTAR =
  'mt-3 w-full rounded-pilula border-2 border-linha px-3 py-2 text-sm font-semibold text-tinta transition hover:border-ambar focus-visible:outline-[3px] focus-visible:outline-tinta focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40';

let cartas = [];
let categorias = [];
// Em que caixa cada carta está. `null` é carta que ainda não saiu do monte.
let caixaDaCarta = [];
let cartaSelecionada = null;
let token = null;

function nomeDaCaixa(idDaCaixa) {
  return categorias.find((categoria) => categoria.id === idDaCaixa)?.nome ?? '';
}

function anunciar(mensagem) {
  aviso.textContent = mensagem;
}

function cartasColocadas() {
  return caixaDaCarta.filter((caixa) => caixa !== null).length;
}

function atualizarProgresso() {
  const colocadas = cartasColocadas();

  mostrarProgresso(`${colocadas} de ${cartas.length} cartas classificadas`, colocadas, cartas.length);
  botaoTerminar.disabled = colocadas < cartas.length;
}

function selecionar(indiceDaCarta) {
  cartaSelecionada = cartaSelecionada === indiceDaCarta ? null : indiceDaCarta;
  desenhar();

  // Desenhar troca os botões por outros novos, e quem escolheu pelo teclado
  // ficaria sem foco nenhum: o foco volta para a mesma carta.
  document.querySelector(`[data-carta="${indiceDaCarta}"]`)?.focus();

  if (cartaSelecionada === null) return;
  anunciar(`Carta "${cartas[cartaSelecionada].texto}" escolhida. Agora escolha uma caixa.`);
}

function colocar(indiceDaCarta, idDaCaixa) {
  // Soltar qualquer outra coisa em cima da caixa não pode virar jogada.
  if (!cartas[indiceDaCarta]) return;

  caixaDaCarta[indiceDaCarta] = idDaCaixa;
  cartaSelecionada = null;
  anunciar(`Carta "${cartas[indiceDaCarta].texto}" foi para a caixa ${nomeDaCaixa(idDaCaixa)}.`);
  desenhar();
  atualizarProgresso();
  salvarProgresso(caixaDaCarta);

  // Depois de colocar, o teclado precisa de um lugar para cair: a próxima carta
  // do monte, ou o botão de terminar quando o monte acabou.
  const proximaCarta = monte.querySelector('button');
  (proximaCarta ?? botaoTerminar).focus();
}

function criarCarta(indiceDaCarta) {
  const botao = document.createElement('button');
  const escolhida = cartaSelecionada === indiceDaCarta;

  botao.type = 'button';
  botao.textContent = cartas[indiceDaCarta].texto;
  botao.className = escolhida ? `${CLASSES_DA_CARTA} border-mel bg-cera` : CLASSES_DA_CARTA;
  botao.draggable = true;
  botao.dataset.carta = String(indiceDaCarta);
  botao.setAttribute('aria-pressed', String(escolhida));
  botao.addEventListener('click', () => selecionar(indiceDaCarta));

  // Arrastar é o mesmo que escolher a carta: quem solta em cima da caixa faz o
  // que o botão "Colocar aqui" faria.
  botao.addEventListener('dragstart', (evento) => {
    cartaSelecionada = indiceDaCarta;
    evento.dataTransfer.setData('text/plain', String(indiceDaCarta));
    evento.dataTransfer.effectAllowed = 'move';
  });

  return botao;
}

/** Uma caixa: o nome, as cartas que já caíram nela e o botão de soltar. */
function criarCaixa(categoria) {
  const secao = document.createElement('section');
  const titulo = document.createElement('h3');
  const lista = document.createElement('ul');
  const botaoSoltar = document.createElement('button');

  secao.className = CLASSES_DA_CAIXA;
  titulo.className = 'font-display text-lg text-tinta';
  titulo.textContent = categoria.nome;
  lista.className = 'mt-3 flex min-h-16 flex-col gap-2';

  cartas.forEach((carta, indice) => {
    if (caixaDaCarta[indice] !== categoria.id) return;
    const item = document.createElement('li');
    item.append(criarCarta(indice));
    lista.append(item);
  });

  botaoSoltar.type = 'button';
  botaoSoltar.textContent = 'Colocar aqui';
  botaoSoltar.className = CLASSES_DO_BOTAO_SOLTAR;
  botaoSoltar.disabled = cartaSelecionada === null;
  botaoSoltar.addEventListener('click', () => colocar(cartaSelecionada, categoria.id));

  secao.addEventListener('dragover', (evento) => {
    // Sem o preventDefault o navegador não deixa soltar nada aqui.
    evento.preventDefault();
    secao.className = `${CLASSES_DA_CAIXA} border-mel bg-cera`;
  });
  secao.addEventListener('dragleave', () => {
    secao.className = CLASSES_DA_CAIXA;
  });
  secao.addEventListener('drop', (evento) => {
    evento.preventDefault();
    colocar(Number(evento.dataTransfer.getData('text/plain')), categoria.id);
  });

  secao.append(titulo, lista, botaoSoltar);
  return secao;
}

function desenhar() {
  monte.replaceChildren();
  cartas.forEach((carta, indice) => {
    if (caixaDaCarta[indice] !== null) return;
    const item = document.createElement('li');
    item.append(criarCarta(indice));
    monte.append(item);
  });

  painelDeCaixas.replaceChildren();
  for (const categoria of categorias) painelDeCaixas.append(criarCaixa(categoria));
}

botaoTerminar.addEventListener('click', async () => {
  botaoTerminar.disabled = true;
  botaoTerminar.textContent = 'Enviando…';

  try {
    await concluirPartida(token, caixaDaCarta);
  } catch (erro) {
    mostrarErro(erro.message);
  }
});

async function comecar() {
  try {
    const partida = await abrirPartida();

    token = partida.token;
    cartas = partida.conteudo.cartas;
    categorias = partida.conteudo.categorias;
    // Quem voltou encontra as cartas nas caixas em que as deixou (RF-JOG-07).
    caixaDaCarta = partida.estado?.respostas ?? cartas.map(() => null);
    enunciado.textContent = partida.conteudo.enunciado;

    desenhar();
    atualizarProgresso();
    enunciado.focus?.();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

comecar();
