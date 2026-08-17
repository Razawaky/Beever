import * as perfilRepository from '../repositories/perfilRepository.js';
import { ErroAplicacao, erroValidacao } from '../utils/erros.js';

/**
 * Moedas são a recompensa gasta na loja — cálculo e regra separados de XP
 * (nivelService) e de pontos, como o documento do projeto exige.
 */

export async function debitar(conexao, idPerfil, quantidade) {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw erroValidacao('Quantidade de moedas a debitar precisa ser um inteiro positivo');
  }

  const afetadas = await perfilRepository.debitarMoedas(conexao, idPerfil, quantidade);
  if (afetadas === 0) {
    throw new ErroAplicacao('Moedas insuficientes', { status: 422, codigo: 'MOEDAS_INSUFICIENTES' });
  }
}
