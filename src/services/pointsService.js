import * as walletsRepository from '../repositories/walletsRepository.js';
import { erroValidacao } from '../utils/erros.js';

/**
 * Pólen — mede progresso em tarefas e metas. Recompensa separada de XP
 * (`levelsService`) e de mel (`coinsService`).
 *
 * O `PONTOS_POR_TAREFA_CONCLUIDA = 10` que morava aqui foi embora, e essa era a
 * outra metade da DT-04: quanto uma tarefa paga é dado do catálogo
 * (`task_types.reward_points`), não número escrito em código. Quem concluir a
 * tarefa lê a recompensa da própria tarefa e chama `creditar` com ela.
 *
 * Pólen só entra, nunca sai — não há débito neste service, e é de propósito.
 */

export async function creditar(conexao, idUsuario, quantidade, { motivo, referenciaTipo = null, referenciaId = null }) {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw erroValidacao('Quantidade de pólen a creditar precisa ser um inteiro positivo');
  }

  return walletsRepository.creditarPolen(conexao, {
    idUsuario,
    quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
  });
}
