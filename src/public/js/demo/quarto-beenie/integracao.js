// Ponte opcional entre o protótipo isolado e a atividade do jogo real.
//
// Sozinho, o quarto continua apenas uma demo: sem partida, sem servidor e sem
// aviso para ninguém. Quando a página da demo é copiada para a atividade, o
// `<body>` traz `data-quarto-beenie-integrado="1"` e os avisos seguem pela ponte
// local instalada por `quartoBeenie.js`. O modo antigo com `?integrado=1` em um
// iframe continua funcionando por `postMessage`. XP, pólen e mel continuam
// sendo decididos no backend.

const parametros = new URLSearchParams(window.location.search);

export const INTEGRADO_POR_QUERY = parametros.has('integrado');
export const INTEGRADO =
  INTEGRADO_POR_QUERY || document.body?.dataset?.quartoBeenieIntegrado === '1';
export const SEM_SOM =
  parametros.has('sem-som') || document.body?.classList?.contains('a11y-sem-som') || false;

const ORIGEM = 'quarto-beenie';

let estrelasDoServidor = null;
const observadoresDeEstrelas = new Set();

let proximaCelula = null;
const observadoresDeProximaCelula = new Set();

export function estrelasRecebidas() {
  return estrelasDoServidor;
}

export function definirEstrelasDoServidor(quantidade) {
  const valor = Math.min(3, Math.max(0, Math.round(Number(quantidade) || 0)));
  estrelasDoServidor = valor;
  for (const observador of observadoresDeEstrelas) observador(valor);
}

export function observarEstrelasDoServidor(observador) {
  observadoresDeEstrelas.add(observador);
  return () => observadoresDeEstrelas.delete(observador);
}

export function proximaCelulaRecebida() {
  return proximaCelula;
}

export function definirProximaCelula(celula) {
  proximaCelula = celula ?? null;
  for (const observador of observadoresDeProximaCelula) observador(proximaCelula);
}

export function observarProximaCelula(observador) {
  observadoresDeProximaCelula.add(observador);
  return () => observadoresDeProximaCelula.delete(observador);
}

export function publicar(tipo, dados = {}) {
  if (!INTEGRADO) return;

  const mensagem = { origem: ORIGEM, tipo, ...dados };

  if (window.parent !== window) {
    window.parent.postMessage(mensagem, window.location.origin);
    return;
  }

  globalThis.__quartoBeeniePonte?.(mensagem);
}

export function publicarProgresso(estado) {
  publicar('progresso', {
    concluidas: estado.tarefasConcluidas,
    total: estado.totalDeTarefas,
    tarefas: [...estadoTarefasFeitas(estado)],
  });
}

export function publicarFim({ tarefas, total }) {
  // Cada saída pela porta é uma tentativa nova: não reaproveita estrelas da
  // partida anterior enquanto a resposta do servidor não chega.
  estrelasDoServidor = null;
  publicar('final', { tarefas, total });
}

function estadoTarefasFeitas(estado) {
  return Object.keys(estado.tarefas).filter((id) => estado.tarefas[id]);
}
