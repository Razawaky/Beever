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
  publicar('final', { tarefas, total });
}

function estadoTarefasFeitas(estado) {
  return Object.keys(estado.tarefas).filter((id) => estado.tarefas[id]);
}
