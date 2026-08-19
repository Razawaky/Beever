import { consultar, consultarEm } from '../config/database.js';

/**
 * `achievements` e `user_achievements` — as conquistas do jogador.
 * O valor do bônus é da conquista (`reward_coins`), e a UNIQUE (user_id,
 * achievement_id) é o que impede desbloquear e pagar a mesma duas vezes.
 */

export async function buscarPorSlug(slug, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    `SELECT id, slug, name, description, reward_coins
       FROM achievements
      WHERE slug = ? AND is_active = 1`,
    [slug],
  );
  return linhas[0] ?? null;
}

/** Devolve `true` só quando a conquista foi desbloqueada agora. Repetição não grava. */
export async function desbloquear(conexao, { idUsuario, idConquista }) {
  const resultado = await consultarEm(
    conexao,
    'INSERT IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
    [idUsuario, idConquista],
  );
  return (resultado.affectedRows ?? 0) === 1;
}

export async function listarDoUsuario(idUsuario) {
  return consultar(
    `SELECT a.slug, a.name, a.description, a.reward_coins, ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
      WHERE ua.user_id = ?
      ORDER BY ua.unlocked_at, ua.id`,
    [idUsuario],
  );
}
