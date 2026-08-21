import * as progressRepository from '../repositories/progressRepository.js';
import * as streaksRepository from '../repositories/streaksRepository.js';
import * as coinsService from './coinsService.js';
import * as levelsService from './levelsService.js';

/**
 * Onde cada tipo de meta busca o número que mede o progresso.
 *
 * O tipo declara a fonte em `goal_types.progress_source`; aqui está quem sabe
 * consultá-la. Faltam duas — cofre e patrimônio —, que só passam a existir na
 * E09, e até lá a meta correspondente ficaria parada em zero. Parada e honesta:
 * melhor do que deixar concluir sem ter alcançado, que era o que acontecia.
 *
 * Este módulo existe separado do `goalsService` porque duas partes precisam da
 * mesma lista e por motivos diferentes: o `goalsService` a usa para atualizar o
 * progresso, e o `goalPlannerService` a usa para **não sortear** um tipo que
 * ninguém consegue medir (RN-015, "nunca gera meta impossível"). Deixar a lista
 * dentro de um dos dois obrigaria o outro a importá-lo, e os dois já conversam
 * na direção contrária.
 */
export const FONTES_DE_PROGRESSO = {
  // As chaves são os valores de `goal_types.progress_source`, tal como semeados.
  async coin_balance(idUsuario) {
    const carteira = await coinsService.obterCarteira(idUsuario);
    return carteira.mel;
  },
  async user_level(idUsuario) {
    const nivel = await levelsService.obterDoUsuario(idUsuario);
    return nivel?.nivel ?? 0;
  },
  async cell_completed(idUsuario) {
    return progressRepository.contarCelulasConcluidas(idUsuario);
  },
  async hive_completed(idUsuario) {
    return progressRepository.contarFavosConcluidos(idUsuario);
  },
  // A sequência de hoje, não o recorde: meta de manter sequência precisa cair
  // junto com o jogador quando ele quebra, e o `atualizarProgresso` deixa o
  // progresso descer justamente para isto.
  async streak_days(idUsuario) {
    const sequencia = await streaksRepository.buscarPorUsuario(idUsuario);
    return Number(sequencia?.current_days ?? 0);
  },
};

/** Nomes das fontes que o sistema sabe medir hoje. Cresce sozinho conforme as etapas entregam. */
export function fontesMensuraveis() {
  return Object.keys(FONTES_DE_PROGRESSO);
}

/** O valor de agora para uma fonte, ou `null` quando ninguém sabe medi-la ainda. */
export async function medir(fonte, idUsuario) {
  const consulta = FONTES_DE_PROGRESSO[fonte];
  if (!consulta) return null;
  return Number(await consulta(idUsuario));
}
