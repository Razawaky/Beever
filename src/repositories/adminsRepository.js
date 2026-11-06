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

/** Promove a conta. `INSERT IGNORE` porque promover quem já é admin não é erro. */
export async function promover(idUsuario) {
  const resultado = await consultar('INSERT IGNORE INTO admins (user_id) VALUES (?)', [idUsuario]);
  return resultado.affectedRows > 0;
}

export async function rebaixar(idUsuario) {
  const resultado = await consultar('DELETE FROM admins WHERE user_id = ?', [idUsuario]);
  return resultado.affectedRows > 0;
}

export async function ehAdministrador(idUsuario) {
  const linhas = await consultar('SELECT 1 FROM admins WHERE user_id = ? LIMIT 1', [idUsuario]);
  return linhas.length > 0;
}
