// Pontes pequenas entre as cenas Phaser e a página ao redor.
// A demo é isolada: nada aqui fala com o servidor ou com o jogo real.

const status = document.getElementById('status');
const instrucoes = document.getElementById('instrucoes');
const hudParede = document.getElementById('hud-parede');
const hudMel = document.getElementById('hud-mel');
const hudTarefas = document.getElementById('hud-tarefas');
const hudMao = document.getElementById('hud-mao');
const hudFavos = [...document.querySelectorAll('.demo__hud-favo')];

export const SEM_MOVIMENTO =
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function anunciar(texto) {
  if (status) status.textContent = texto;
}

export function definirInstrucoes(texto) {
  if (instrucoes) instrucoes.textContent = texto;
}

// O cabeçalho fica fora do canvas: o PNG 600×600 aparece inteiro e o HUD
// continua sendo texto de verdade, selecionável e lido por leitores de tela.
export function atualizarHud({
  indiceParede,
  totalDeParedes,
  nomeParede,
  moedas,
  tarefasConcluidas,
  totalDeTarefas,
  tarefas,
  itemNaMao,
}) {
  if (hudParede) hudParede.textContent = `${indiceParede + 1}/${totalDeParedes} · ${nomeParede}`;
  if (hudMel) hudMel.textContent = `${moedas} mel (demo)`;
  if (hudTarefas) hudTarefas.textContent = `Tarefas ${tarefasConcluidas}/${totalDeTarefas}`;
  if (hudMao) hudMao.textContent = itemNaMao ? `Na mão: ${itemNaMao}` : '';

  hudFavos.forEach((favo) => {
    favo.classList.toggle('demo__hud-favo--feito', Boolean(tarefas?.[favo.dataset.tarefa]));
  });
}
