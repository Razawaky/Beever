// Listas Suspensas (RF-JOG-09). JS puro na página, como os outros jogos.
//
// A frase inteira fica à vista e cada lacuna é um `select`: a criança compara as
// escolhas entre si antes de confirmar. Quem conta acerto é o servidor (RN-007).
import { abrirPartida, concluirPartida, mostrarErro, mostrarProgresso, salvarProgresso } from './partida.js';

const enunciado = document.getElementById('listas-enunciado');
const caixaDasLacunas = document.getElementById('listas-lacunas');
const botaoConfirmar = document.getElementById('listas-confirmar');

const CLASSES_DO_SELECT =
  'w-full rounded-favo border-2 border-linha bg-white px-4 py-3 font-medium text-tinta focus-visible:outline-[3px] focus-visible:outline-tinta focus-visible:outline-offset-2';

let lacunas = [];
let respostas = [];
let token = null;

/** Só libera o botão quando toda lacuna tem escolha: em branco contaria erro. */
function atualizarBotao() {
  const respondidas = respostas.filter((escolha) => escolha !== null && escolha !== undefined).length;

  botaoConfirmar.disabled = respondidas < lacunas.length;
  mostrarProgresso(`${respondidas} de ${lacunas.length} lacunas`, respondidas, lacunas.length);
}

function montarLacuna(lacuna, indice) {
  const bloco = document.createElement('div');
  const rotulo = document.createElement('label');
  const select = document.createElement('select');
  const identificador = `lacuna-${indice}`;

  rotulo.textContent = lacuna.texto;
  rotulo.htmlFor = identificador;
  rotulo.className = 'mb-1 block text-sm font-medium text-tinta';

  select.id = identificador;
  select.className = CLASSES_DO_SELECT;

  const vazia = document.createElement('option');
  vazia.value = '';
  vazia.textContent = 'Escolha…';
  select.append(vazia);

  lacuna.opcoes.forEach((opcao, posicao) => {
    const item = document.createElement('option');
    item.value = String(posicao);
    item.textContent = opcao;
    select.append(item);
  });

  select.addEventListener('change', () => {
    respostas[indice] = select.value === '' ? null : Number(select.value);
    salvarProgresso(respostas);
    atualizarBotao();
  });

  bloco.append(rotulo, select);
  return bloco;
}

async function terminar() {
  botaoConfirmar.disabled = true;
  botaoConfirmar.textContent = 'Enviando…';

  try {
    await concluirPartida(token, respostas);
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

botaoConfirmar.addEventListener('click', terminar);

async function comecar() {
  try {
    const partida = await abrirPartida();

    token = partida.token;
    lacunas = partida.conteudo.lacunas;
    enunciado.textContent = partida.conteudo.enunciado;
    // Quem voltou continua de onde parou (RF-JOG-07).
    respostas = partida.estado?.respostas ?? [];

    caixaDasLacunas.replaceChildren(...lacunas.map(montarLacuna));
    lacunas.forEach((lacuna, indice) => {
      const escolhida = respostas[indice];
      if (escolhida === null || escolhida === undefined) return;
      document.getElementById(`lacuna-${indice}`).value = String(escolhida);
    });

    atualizarBotao();
    enunciado.focus?.();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

comecar();
