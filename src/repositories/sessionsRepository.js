import { consultar } from '../config/database.js';

/**
 * Acesso direto à tabela `sessions` do express-session, só para derrubar
 * sessões. Criar e ler sessão continua sendo trabalho do store.
 */

/** Derruba todas as sessões de login de um usuário. O store grava a sessão como JSON. */
export async function removerDoUsuario(usuarioId) {
  const resultado = await consultar("DELETE FROM sessions WHERE JSON_EXTRACT(data, '$.usuarioId') = ?", [
    usuarioId,
  ]);
  return resultado.affectedRows;
}
