/**
 * Endereço legível a partir de um texto: minúsculas, sem acento e com hífen no
 * lugar do espaço.
 *
 * Mora aqui porque três lugares precisam da mesma regra — o favo, o item e os
 * identificadores das caixas e itens que o painel monta dentro de uma atividade
 * —, e três cópias divergiriam na primeira mudança.
 */
export function slugDeTexto(texto, tamanhoMaximo = 60) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, tamanhoMaximo);
}
