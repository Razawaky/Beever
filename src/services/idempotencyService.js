import { createHash } from 'node:crypto';

import { emTransacao } from '../config/database.js';
import * as idempotencyKeysRepository from '../repositories/idempotencyKeysRepository.js';
import { ErroAplicacao, erroAcessoNegado } from '../utils/erros.js';

/**
 * "Isto roda uma vez só" (RN-009, RNF-16).
 *
 * O chamador dá uma chave e uma função; esta roda dentro de uma transação, e a
 * chave é reservada na mesma transação. Rollback leva a chave junto — chave
 * gravada de operação que falhou impediria a retentativa legítima.
 *
 * A tabela guarda hash, não resposta. Por isso o reenvio é respondido por
 * `aoRepetir`, que busca o resultado na tabela de domínio: a partida em
 * `game_sessions`, a compra em `purchases`.
 */

/** Marca interna de "esta chamada não foi a primeira". Nunca sai deste arquivo. */
class OperacaoJaExecutada extends Error {}

function hashDoPedido(pedido) {
  if (pedido === null || pedido === undefined) return null;
  return createHash('sha256').update(JSON.stringify(pedido)).digest('hex');
}

/**
 * Confere se o reenvio é o mesmo pedido de antes.
 *
 * Chave repetida com conteúdo diferente é bug do cliente ou tentativa de
 * burlar: tratar como repetição engoliria em silêncio a operação que a pessoa
 * de fato pediu.
 */
function exigirMesmoPedido(registro, idUsuario, hash) {
  if (Number(registro.user_id) !== Number(idUsuario)) {
    throw erroAcessoNegado('Esta chave de idempotência é de outro jogador');
  }

  if (registro.response_hash !== null && hash !== null && registro.response_hash !== hash) {
    throw new ErroAplicacao('Esta chave já foi usada para outro pedido', {
      status: 409,
      codigo: 'CHAVE_REUTILIZADA',
    });
  }
}

export async function executarUmaVezSo({ chave, idUsuario, operacao, pedido = null }, { executar, aoRepetir }) {
  const hash = hashDoPedido(pedido);

  try {
    return await emTransacao(async (conexao) => {
      const primeira = await idempotencyKeysRepository.reservar(conexao, {
        chave,
        idUsuario,
        operacao,
        hashDoPedido: hash,
      });

      if (!primeira) throw new OperacaoJaExecutada();
      return executar(conexao);
    });
  } catch (erro) {
    if (!(erro instanceof OperacaoJaExecutada)) throw erro;
  }

  const registro = await idempotencyKeysRepository.buscar(chave);
  exigirMesmoPedido(registro, idUsuario, hash);
  return aoRepetir();
}
