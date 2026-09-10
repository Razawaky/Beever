import { consultar, consultarEm } from '../config/database.js';

/**
 * Acesso a `password_reset_tokens`. Recebe e devolve só o hash do token:
 * o token em si nunca chega ao banco.
 */

/** Um pedido novo aposenta os links anteriores do mesmo usuário. */
export async function invalidarAbertosDoUsuario(usuarioId) {
  await consultar(
    'UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL',
    [usuarioId],
  );
}

export async function criar({ usuarioId, tokenHash, validadeEmMinutos }) {
  await consultar(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))`,
    [usuarioId, tokenHash, validadeEmMinutos],
  );
}

export async function existeValidoPorHash(tokenHash) {
  const linhas = await consultar(
    `SELECT 1 FROM password_reset_tokens
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()
      LIMIT 1`,
    [tokenHash],
  );
  return linhas.length > 0;
}

/** Só devolve token não usado e não vencido. O FOR UPDATE impede que dois envios usem o mesmo link. */
export async function travarValidoPorHash(conexao, tokenHash) {
  const linhas = await consultarEm(
    conexao,
    `SELECT id, user_id
       FROM password_reset_tokens
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()
      FOR UPDATE`,
    [tokenHash],
  );
  return linhas[0] ?? null;
}

export async function marcarUsado(conexao, id) {
  await consultarEm(conexao, 'UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?', [id]);
}
