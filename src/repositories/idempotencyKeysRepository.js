import { consultarEm } from '../config/database.js';

/**
 * `idempotency_keys` — o registro de que uma operação já rodou.
 *
 * A tabela guarda a chave, o dono, o nome da operação e um **hash** do pedido.
 * Não guarda a resposta: quem precisa devolver o resultado de um reenvio busca
 * na tabela de domínio (a partida em `game_sessions`, a compra em `purchases`).
 *
 * A UNIQUE da chave é a garantia de verdade. Duas requisições simultâneas com a
 * mesma chave disputam o `INSERT`, e só uma ganha.
 */

/**
 * Tenta reservar a chave. Devolve `true` quando esta chamada é a primeira.
 *
 * `INSERT IGNORE` em vez de conferir antes e gravar depois: entre a consulta e
 * a escrita cabe a segunda requisição, e aí as duas se achariam a primeira.
 */
export async function reservar(conexao, { chave, idUsuario, operacao, hashDoPedido = null }) {
  const resultado = await consultarEm(
    conexao,
    `INSERT IGNORE INTO idempotency_keys (idempotency_key, user_id, operation, response_hash)
     VALUES (?, ?, ?, ?)`,
    [chave, idUsuario, operacao, hashDoPedido],
  );
  return resultado.affectedRows === 1;
}

export async function buscar(chave, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    'SELECT id, idempotency_key, user_id, operation, response_hash, created_at FROM idempotency_keys WHERE idempotency_key = ?',
    [chave],
  );
  return linhas[0] ?? null;
}
