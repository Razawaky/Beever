import { logger } from '../config/logger.js';
import * as rewardConfigsRepository from '../repositories/rewardConfigsRepository.js';
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

/**
 * Quanto pólen uma célula concluída vale. Conta, sem crédito.
 *
 * Mesmo desenho do XP: valor cheio de `reward_configs` (RN-006) e fator de
 * `reward_modifiers` na repetição, que para o pólen é zero — repetir célula não
 * rende progresso de meta nenhuma.
 *
 * A faixa é a da célula, não a do jogador: quem define o esforço é o conteúdo.
 *
 * Configuração faltando paga zero e vira alarme no log, em vez de estourar: o
 * buraco é de administração, e derrubar a partida da criança não o conserta.
 */
export async function calcularPolenDaCelula(
  { slugDoTipoDeJogo, codigoDaFaixa, estrelas, ehRepeticao = false },
  conexao = null,
) {
  if (!Number.isInteger(estrelas) || estrelas < 1) return 0;

  const configuracao = await rewardConfigsRepository.buscarConfiguracao(
    { slugDoTipoDeJogo, codigoDaFaixa, estrelas },
    conexao,
  );

  if (!configuracao) {
    logger.error(
      { slugDoTipoDeJogo, codigoDaFaixa, estrelas },
      'Sem configuração de recompensa: creditando zero de pólen',
    );
    return 0;
  }

  const polenCheio = Number(configuracao.points_amount);
  if (!ehRepeticao) return polenCheio;

  const modificador = await rewardConfigsRepository.buscarModificador(
    rewardConfigsRepository.REPETICAO_DE_CELULA,
    conexao,
  );
  if (!modificador) {
    logger.error('Modificador de repetição ausente: rode `npm run db:seed`. Repetição não pagou pólen');
    return 0;
  }

  return Math.round(polenCheio * modificador.points_factor);
}

/**
 * Calcula e credita o pólen de uma célula concluída.
 *
 * Recebe a célula já buscada (`cellsRepository.buscarPorId`), que traz o slug do
 * tipo de jogo e o código da faixa. Zero não vira lançamento: livro com linha de
 * valor zero suja o extrato e a reconciliação.
 */
export async function creditarPorCelula(conexao, idUsuario, { celula, estrelas, ehRepeticao = false }) {
  const quantidade = await calcularPolenDaCelula(
    {
      slugDoTipoDeJogo: celula.game_type_slug,
      codigoDaFaixa: celula.age_band_code,
      estrelas,
      ehRepeticao,
    },
    conexao,
  );

  if (quantidade === 0) return { polenCreditado: 0 };

  await creditar(conexao, idUsuario, quantidade, {
    motivo: 'conclusao-celula',
    referenciaTipo: 'cell',
    referenciaId: celula.id,
  });

  return { polenCreditado: quantidade };
}
