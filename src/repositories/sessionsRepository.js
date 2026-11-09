import { consultar } from '../config/database.js';

/**
 * Acesso direto à tabela `sessions` do express-session, só para derrubar
 * sessões. Criar e ler sessão continua sendo trabalho do store.
 */

/**
 * Derruba todas as sessões de login de uma conta. O store grava a sessão como
 * JSON.
 *
 * A sessão tem dois ids: `usuarioId` (perfil ativo) e `contaUsuarioId` (quem
 * autenticou). Trocar de perfil mantém a mesma conta, então o reset de senha
 * precisa apagar também as sessões em que um perfil-filho está selecionado —
 * filtrar só por `usuarioId` deixaria os irmãos logados.
 */
export async function removerDoUsuario(usuarioId) {
  const resultado = await consultar(
    `DELETE FROM sessions
      WHERE JSON_EXTRACT(data, '$.usuarioId') = ?
         OR JSON_EXTRACT(data, '$.contaUsuarioId') = ?`,
    [usuarioId, usuarioId],
  );
  return resultado.affectedRows;
}
