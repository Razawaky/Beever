import * as gameSessionsRepository from '../repositories/gameSessionsRepository.js';
import * as progressRepository from '../repositories/progressRepository.js';
import * as streaksRepository from '../repositories/streaksRepository.js';
import * as vaultsRepository from '../repositories/vaultsRepository.js';

/**
 * Onde cada tipo de tarefa busca o número que mede o progresso.
 * O tipo declara a fonte em `task_types.progress_source`; aqui está quem sabe
 * consultá-la. Diferente da meta, a tarefa mede dentro de uma janela: vale o que
 * o jogador fez entre a criação da tarefa e o prazo dela, não o total da vida.
 */

export const FONTES_DE_PROGRESSO = {
  async cell_completed(idUsuario, janela) {
    const conclusoes = await gameSessionsRepository.listarConclusoesNoIntervalo(idUsuario, janela.inicio, janela.fim);
    return conclusoes.length;
  },
  async active_days(idUsuario, janela) {
    const eventos = await streaksRepository.listarEventos(idUsuario, janela.dataInicial, janela.dataFinal);
    return eventos.filter((evento) => evento.tipo === 'cumprido').length;
  },
  async hive_completed(idUsuario, janela) {
    return progressRepository.contarFavosConcluidosNoIntervalo(idUsuario, janela.inicio, janela.fim);
  },
  async vault_deposit(idUsuario, janela) {
    return vaultsRepository.totalDepositadoEntre(idUsuario, janela.inicio, janela.fim);
  },
};

/** Fontes que o sistema sabe medir hoje. */
export function fontesMensuraveis() {
  return Object.keys(FONTES_DE_PROGRESSO);
}

/** O valor de agora para uma fonte, ou `null` quando ninguém sabe medi-la ainda. */
export async function medir(fonte, idUsuario, janela) {
  const consulta = FONTES_DE_PROGRESSO[fonte];
  if (!consulta) return null;
  return Number(await consulta(idUsuario, janela));
}
