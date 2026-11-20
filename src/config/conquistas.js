/**
 * O ícone de cada família de conquista. Os desenhos moram em
 * `src/public/js/icones.js`, que serve tanto ao HTML quanto ao JavaScript da
 * tela; aqui só fica o nome estável de cada um (DT-103).
 */
export const ICONES = {
  'sequencia-dias': 'fogo',
  'favos-concluidos': 'mel',
  'celulas-concluidas': 'quebraCabeca',
  'patrimonio-total': 'gem',
  'cofre-guardado': 'cofre',
};

/** Critério sem ícone cai na abelha em vez de deixar buraco na tela. */
export function iconeDaConquista(criterio) {
  return ICONES[criterio] ?? 'abelha';
}
