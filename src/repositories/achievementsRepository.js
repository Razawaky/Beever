import { consultar, consultarEm } from '../config/database.js';

/**
 * `achievements` e `user_achievements` — as conquistas do jogador.
 * O valor do bônus é da conquista (`reward_coins`), e a UNIQUE (user_id,
 * achievement_id) é o que impede desbloquear e pagar a mesma duas vezes.
 */

const CAMPOS = 'id, slug, name, description, criterion_type, criterion_target, reward_coins';

export async function buscarPorSlug(slug, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    `SELECT ${CAMPOS}
       FROM achievements
      WHERE slug = ? AND is_active = 1`,
    [slug],
  );
  return linhas[0] ?? null;
}

/**
 * A escada de um critério com o que o jogador já tem marcado, do degrau mais
 * baixo para o mais alto.
 *
 * O `unlocked_at` vem no mesmo `SELECT` de propósito: perguntar depois "quais
 * destas ele já tem" fazia o número de consultas depender de o jogador ter
 * cruzado um degrau ou não, e a Colmeia tem teste que conta consulta (RNF-04).
 * A escada tem quatro linhas — trazê-la inteira é mais barato do que a segunda
 * viagem ao banco.
 */
export async function listarCriterioComEstado(idUsuario, tipo) {
  return consultar(
    `SELECT ${CAMPOS.split(', ').map((campo) => `a.${campo}`).join(', ')},
            ua.unlocked_at
       FROM achievements a
       LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
      WHERE a.criterion_type = ? AND a.is_active = 1
      ORDER BY a.criterion_target, a.id`,
    [idUsuario, tipo],
  );
}

/** O catálogo inteiro, com o que cada jogador já desbloqueou marcado. */
export async function listarCatalogoDoUsuario(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS.split(', ').map((campo) => `a.${campo}`).join(', ')},
            ua.unlocked_at
       FROM achievements a
       LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
      WHERE a.is_active = 1
      ORDER BY a.criterion_type, a.criterion_target, a.id`,
    [idUsuario],
  );
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
