import { consultar } from '../config/database.js';

/**
 * Acesso a `admins`. Ser administrador é ter linha aqui, nunca uma coluna em
 * `users` (RN-051), então toda leitura de quem é admin passa por este arquivo.
 */

export async function listar() {
  return consultar(
    `SELECT a.id, a.user_id, u.email, u.nickname, a.created_at
       FROM admins a
       JOIN users u ON u.id = a.user_id
      ORDER BY u.nickname`,
  );
}

export async function contar() {
  const linhas = await consultar('SELECT COUNT(*) AS total FROM admins');
  return Number(linhas[0]?.total ?? 0);
}
