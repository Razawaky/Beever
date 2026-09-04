import { inicioDoDia } from '../../src/utils/diaDoJogador.js';

/**
 * Calendário simulado para os testes de sequência.
 *
 * A sequência recebe o instante por parâmetro em vez de ler o relógio do
 * processo, então uma corrida de várias semanas cabe num teste sem mexer na
 * hora da máquina. Este ajudante monta o instante de cada dia do roteiro.
 */

const MEIO_DIA_EM_MILISSEGUNDOS = 12 * 60 * 60 * 1000;

/**
 * O instante do meio-dia daquele dia no fuso do jogador. Meio-dia porque fica
 * longe das duas bordas: nem a virada do dia nem a do horário de verão
 * empurram o instante para a data vizinha.
 */
export function meioDiaDoJogador(dataISO, fuso) {
  return new Date(inicioDoDia(dataISO, fuso).getTime() + MEIO_DIA_EM_MILISSEGUNDOS);
}
