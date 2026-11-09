import { logger } from '../config/logger.js';
import * as rewardConfigsRepository from '../repositories/rewardConfigsRepository.js';
import * as walletsRepository from '../repositories/walletsRepository.js';
import { ErroAplicacao, erroValidacao } from '../utils/erros.js';

/**
 * Mel — a moeda gasta na loja. Recompensa separada de XP (`levelsService`) e de
 * pólen (`pointsService`), como o documento do projeto exige.
 *
 * Toda operação exige conexão de transação e um motivo. O motivo não é enfeite
 * de log: ele vira `reason_id` no `coin_ledger`, e o livro é o que o
 * `db:reconcile` confere contra o saldo da carteira. Crédito sem motivo válido
 * falha, de propósito.
 */

function exigirQuantidadeValida(quantidade, acao) {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw erroValidacao(`Quantidade de mel a ${acao} precisa ser um inteiro positivo`);
  }
}

export async function debitar(conexao, idUsuario, quantidade, { motivo, referenciaTipo = null, referenciaId = null }) {
  exigirQuantidadeValida(quantidade, 'debitar');

  const afetadas = await walletsRepository.debitarMel(conexao, {
    idUsuario,
    quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
  });

  // Zero linhas afetadas aqui significa uma coisa só: o `WHERE coins >= ?` não
  // encontrou saldo. A checagem e o desconto acontecem na mesma instrução, então
  // não existe janela entre "conferi" e "debitei".
  if (afetadas === 0) {
    throw new ErroAplicacao('Mel insuficiente', { status: 422, codigo: 'MEL_INSUFICIENTE' });
  }
}

/**
 * Credita mel. Existe desde sempre no schema e **não tinha implementação** até
 * aqui — era metade da dívida DT-03: mel só saía da carteira, nunca entrava.
 * Quem chama hoje é a conclusão de tarefa; célula, meta e ciclo econômico
 * entram na E06.
 */
export async function creditar(conexao, idUsuario, quantidade, { motivo, referenciaTipo = null, referenciaId = null }) {
  exigirQuantidadeValida(quantidade, 'creditar');

  return walletsRepository.creditarMel(conexao, {
    idUsuario,
    quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
  });
}

export async function obterCarteira(idUsuario) {
  const carteira = await walletsRepository.buscarPorUsuario(idUsuario);
  if (!carteira) return { mel: 0, polen: 0 };
  return { mel: Number(carteira.coins), polen: Number(carteira.points_total) };
}

/**
 * Quanto mel uma célula concluída vale. Conta, sem crédito.
 *
 * Mesmo desenho do XP e do pólen: valor cheio de `reward_configs` (RN-006) e
 * fator de `reward_modifiers` na repetição, que para o mel é zero — é a RN-008
 * escrita por extenso, e o que impede farming de moeda.
 *
 * A faixa é a da célula, não a do jogador: quem define o esforço é o conteúdo.
 *
 * Configuração faltando paga zero e vira alarme no log, em vez de estourar: o
 * buraco é de administração, e derrubar a partida da criança não o conserta.
 */
export async function calcularMelDaCelula(
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
      'Sem configuração de recompensa: creditando zero de mel',
    );
    return 0;
  }

  const melCheio = Number(configuracao.coins_amount);
  if (!ehRepeticao) return melCheio;

  const modificador = await rewardConfigsRepository.buscarModificador(
    rewardConfigsRepository.REPETICAO_DE_CELULA,
    conexao,
  );
  if (!modificador) {
    logger.error('Modificador de repetição ausente: rode `npm run db:seed`. Repetição não pagou mel');
    return 0;
  }

  return Math.round(melCheio * modificador.coins_factor);
}

/**
 * Calcula e credita o mel de uma célula concluída.
 *
 * Recebe a célula já buscada (`cellsRepository.buscarPorId`), que traz o slug do
 * tipo de jogo e o código da faixa. Zero não vira lançamento: livro com linha de
 * valor zero suja o extrato e a reconciliação.
 */
export async function creditarPorCelula(conexao, idUsuario, { celula, estrelas, ehRepeticao = false }) {
  const quantidade = await calcularMelDaCelula(
    {
      slugDoTipoDeJogo: celula.game_type_slug,
      codigoDaFaixa: celula.age_band_code,
      estrelas,
      ehRepeticao,
    },
    conexao,
  );

  if (quantidade === 0) return { melCreditado: 0 };

  await creditar(conexao, idUsuario, quantidade, {
    motivo: 'conclusao-celula',
    referenciaTipo: 'cell',
    referenciaId: celula.id,
  });

  return { melCreditado: quantidade };
}

/**
 * Paga o bônus que a curva de `levels` promete a cada degrau alcançado.
 *
 * Quem calcula o valor é o `levelsService` (`bonusDeMelPorNivel`); quem credita
 * é este service, porque mel entra por uma porta só. O motivo fica fixado aqui
 * de propósito: motivo vira `reason_id` no livro, e deixá-lo a cargo do chamador
 * é como um extrato ganha lançamento com o rótulo errado.
 */
export async function creditarBonusDeNivel(conexao, idUsuario, quantidade, { nivel }) {
  if (quantidade === 0) return { melCreditado: 0 };

  await creditar(conexao, idUsuario, quantidade, {
    motivo: 'subida-de-nivel',
    referenciaTipo: 'level',
    referenciaId: nivel,
  });

  return { melCreditado: quantidade };
}
