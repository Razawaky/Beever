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
