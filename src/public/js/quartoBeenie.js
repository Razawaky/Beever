// Quarto do Beenie como atividade real.
//
// A casca já abriu a partida por `partida.js`: aqui só recebemos os avisos da
// página da demo que foi copiada para dentro da atividade, guardamos o rascunho
// a cada tarefa e mandamos fechar a partida quando a pessoa sai pela porta. XP,
// estrelas e mel continuam sendo decididos pelo servidor, com o gabarito do
// `contents.body`.
import { abrirPartida, concluirPartida, mostrarErro, mostrarProgresso, salvarProgresso } from './partida.js';
import { definirEstrelasDoServidor } from './demo/quarto-beenie/integracao.js';

let token = null;
let total = 6;
let tarefas = [];
let ultimaChave = '';
let finalEnviado = false;
let finalPendente = null;
let temporizador = null;

function receberMensagem(dados) {
  if (!dados || dados.origem !== 'quarto-beenie') return;

  if (dados.tipo === 'progresso') {
    const recebidas = Array.isArray(dados.tarefas) ? dados.tarefas : [];
    const chave = recebidas.join('|');
    if (chave === ultimaChave) return;

    ultimaChave = chave;
    tarefas = recebidas;
    total = Number(dados.total) || total;
    if (token) salvarProgresso(tarefas);
    mostrarProgresso(`Atividades arrumadas: ${tarefas.length} de ${total}`, tarefas.length, total);
    return;
  }

  if (dados.tipo !== 'final' || finalEnviado) return;
  finalEnviado = true;
  tarefas = Array.isArray(dados.tarefas) ? dados.tarefas : tarefas;
  total = Number(dados.total) || total;

  mostrarProgresso(`Atividades arrumadas: ${tarefas.length} de ${total}`, tarefas.length, total);

  if (!token) {
    finalPendente = { tarefas, total };
    return;
  }

  agendarConclusao();
}

function agendarConclusao() {
  // Deixa o quadro final do jogo aparecer antes de fechar a partida no
  // servidor. Não é valor nenhum: é só tempo de leitura da nota.
  const atraso = document.body.classList.contains('a11y-movimento-reduzido') ? 0 : 1200;
  temporizador = window.setTimeout(async () => {
    try {
      const dados = await concluirPartida(token, tarefas, { exibirResultado: false });
      definirEstrelasDoServidor(dados.estrelas);
    } catch (erro) {
      mostrarErro(erro.message);
    }
  }, atraso);
}

globalThis.__quartoBeeniePonte = receberMensagem;

window.addEventListener('pagehide', () => {
  globalThis.__quartoBeeniePonte = undefined;
  if (temporizador) window.clearTimeout(temporizador);
}, { once: true });

async function comecar() {
  try {
    const partida = await abrirPartida();
    token = partida.token;
    total = Number(partida.conteudo?.total) || total;
    mostrarProgresso(`Atividades arrumadas: ${tarefas.length} de ${total}`, tarefas.length, total);

    if (finalPendente) {
      tarefas = finalPendente.tarefas;
      total = finalPendente.total;
      finalPendente = null;
      agendarConclusao();
    }
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

comecar();
