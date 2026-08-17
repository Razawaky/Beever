import * as perfilRepository from '../repositories/perfilRepository.js';
import { erroValidacao } from '../utils/erros.js';

/**
 * Pontos medem progresso em tarefas/metas — recompensa separada de XP
 * (nivelService) e de moedas (moedasService), como o documento do projeto
 * exige.
 */

const PONTOS_POR_TAREFA_CONCLUIDA = 10;

export async function creditar(conexao, idPerfil, quantidade) {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw erroValidacao('Quantidade de pontos a creditar precisa ser um inteiro positivo');
  }
  await perfilRepository.creditarPontos(conexao, idPerfil, quantidade);
}

export function pontosPorTarefaConcluida() {
  return PONTOS_POR_TAREFA_CONCLUIDA;
}
