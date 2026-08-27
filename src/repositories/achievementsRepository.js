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
 * O catálogo de um critério, do degrau mais baixo para o mais alto.
 *
 * É a lista que o service percorre para saber o que um número destrava. Vem
 * ordenada porque a tela mostra a escada, e ordenar em memória a cada chamada
 * seria refazer o que o índice já entrega pronto.
 */
export async function listarPorCriterio(tipo) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM achievements
      WHERE criterion_type = ? AND is_active = 1
      ORDER BY criterion_target, id`,
    [tipo],
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

/** Quais conquistas da lista o jogador já tem. Evita tentar desbloquear em vão. */
export async function listarDesbloqueadas(idUsuario, idsDeConquista) {
  if (idsDeConquista.length === 0) return [];

  const marcadores = idsDeConquista.map(() => '?').join(', ');
  const linhas = await consultar(
    `SELECT achievement_id FROM user_achievements
      WHERE user_id = ? AND achievement_id IN (${marcadores})`,
    [idUsuario, ...idsDeConquista],
  );
  return linhas.map((linha) => Number(linha.achievement_id));
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
