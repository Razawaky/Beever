// Pontes pequenas entre as cenas Phaser e a página ao redor.
// A demo é isolada: nada aqui fala com o servidor ou com o jogo real.

const status = document.getElementById('status');
const instrucoes = document.getElementById('instrucoes');

export const SEM_MOVIMENTO =
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function anunciar(texto) {
  if (status) status.textContent = texto;
}

export function definirInstrucoes(texto) {
  if (instrucoes) instrucoes.textContent = texto;
}
