/**
 * O ícone de cada família de conquista. A arte definitiva é do usuário e ainda
 * não existe, então a tela usa emoji e a troca acontece só aqui (DT-103), como
 * já é o caso do catálogo do mascote.
 */
export const ICONES = {
  'sequencia-dias': '🔥',
  'favos-concluidos': '🍯',
  'celulas-concluidas': '🧩',
  'patrimonio-total': '💎',
  'cofre-guardado': '🏦',
};

/** Critério sem ícone cai na abelha em vez de deixar buraco na tela. */
export function iconeDaConquista(criterio) {
  return ICONES[criterio] ?? '🐝';
}
