/**
 * Traduz "o que acabou de acontecer" em "qual critério de conquista avaliar"
 * (RF-GAM-01, T-13.2).
 *
 * Existe para que quem provoca o evento não precise conhecer o catálogo: o
 * fechamento da partida diz "concluí uma célula e fechei um favo", e não "vá ver
 * as conquistas de `favos-concluidos`". Se um dia o critério mudar de nome, muda
 * aqui e em nenhum outro lugar.
 *
 * Puro de propósito, como o `criteriosDeConquista`: é vocabulário, e vocabulário
 * se testa sem banco.
 */

/**
 * O que cada evento faz avaliar.
 *
 * Um evento pode mexer em mais de um critério — fechar um favo também conclui
 * uma célula —, e é por isso que o valor é lista.
 */
const EVENTOS = {
  'celula-concluida': ['celulas-concluidas'],
  'favo-concluido': ['favos-concluidos'],
  'patrimonio-mudou': ['patrimonio-total'],
  'cofre-mudou': ['cofre-guardado'],
};

export function ehEventoConhecido(evento) {
  return Object.hasOwn(EVENTOS, evento);
}

/**
 * Os critérios que a lista de eventos manda avaliar, sem repetição.
 *
 * Evento desconhecido é ignorado em silêncio, e não recusado: quem chama está no
 * meio de um fluxo que já pagou recompensa, e derrubar a partida por causa do
 * nome de um evento seria trocar um problema pequeno por um grande.
 */
export function criteriosDosEventos(eventos = []) {
  const criterios = eventos.filter(ehEventoConhecido).flatMap((evento) => EVENTOS[evento]);
  return [...new Set(criterios)];
}
