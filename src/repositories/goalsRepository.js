import { consultar, consultarEm } from '../config/database.js';

/**
 * `goals` — as metas do jogador.
 *
 * A meta agora é do usuário direto (`user_id`). No schema antigo ela pendurava
 * num cronograma que existia só para satisfazer uma foreign key, e o
 * `schedules` de hoje é outra coisa: disponibilidade da semana. O join com
 * cronograma some, e com ele o balde que ninguém pediu.
 *
 * O progresso é contagem, não porcentagem: `current_value` caminha até
 * `target_value`. O tipo da meta (`goal_types.progress_source`) diz de onde
 * esse número vem — mel acumulado, células concluídas, nível atingido — e é o
 * service que sabe consultar a fonte. Aqui só se grava o resultado.
 */

const CAMPOS = `g.id, g.user_id, g.title, g.target_value, g.current_value,
                g.reward_coins, g.reward_points, g.starts_at, g.due_at, g.completed_at,
                g.renewed_from_goal_id, g.created_at,
                gt.slug AS type_slug, gt.progress_source,
                gd.slug AS difficulty, gd.reward_multiplier,
                st.slug AS status`;

const JOINS = `JOIN goal_types gt ON gt.id = g.goal_type_id
               JOIN goal_difficulties gd ON gd.id = g.difficulty_id
               JOIN goal_statuses st ON st.id = g.status_id`;

export async function listarPorUsuario(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM goals g
       ${JOINS}
      WHERE g.user_id = ?
      ORDER BY g.due_at, g.id`,
    [idUsuario],
  );
}

export async function listarAtivasPorUsuario(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM goals g
       ${JOINS}
      WHERE g.user_id = ? AND st.slug = 'ativa'
      ORDER BY g.due_at, g.id`,
    [idUsuario],
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM goals g
       ${JOINS}
      WHERE g.id = ?`,
    [id],
  );
  return linhas[0] ?? null;
}

/**
 * Cria a meta já ativa. O prazo vem calculado de fora porque quem sabe a regra
 * de prazo é o service (`default_days` da dificuldade, ajustado pela faixa
 * etária) — o repository não decide data.
 */
export async function criar(
  conexao,
  { idUsuario, idTipo, idDificuldade, titulo, alvo, recompensaMoedas = 0, recompensaPontos = 0, prazo, renovadaDe = null },
) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO goals (user_id, goal_type_id, status_id, difficulty_id, title, target_value,
                        reward_coins, reward_points, due_at, renewed_from_goal_id)
     VALUES (?, ?, (SELECT id FROM goal_statuses WHERE slug = 'ativa'), ?, ?, ?, ?, ?, ?, ?)`,
    [idUsuario, idTipo, idDificuldade, titulo, alvo, recompensaMoedas, recompensaPontos, prazo, renovadaDe],
  );
  return resultado.insertId;
}

/**
 * Grava o progresso absoluto, limitado ao alvo. É absoluto e não incremental
 * porque a fonte da maioria das metas é um saldo — mel guardado, patrimônio,
 * nível — e somar deltas sobre um saldo que já é total daria número dobrado.
 */
export async function atualizarProgresso(conexao, id, valorAtual) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE goals
        SET current_value = LEAST(?, target_value)
      WHERE id = ?
        AND completed_at IS NULL
        AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'ativa')`,
    [valorAtual, id],
  );
  return resultado.affectedRows;
}

/**
 * Conclui a meta que foi de fato alcançada, uma vez só.
 *
 * As duas condições do `WHERE` são as mesmas da tarefa, pelos mesmos motivos:
 * `completed_at IS NULL` impede pagar duas vezes, e
 * `current_value >= target_value` impede pagar sem ter chegado lá. Este segundo
 * faltava, e a meta era um atalho ainda melhor que a tarefa — bastava criar uma
 * e concluir em seguida para levar a recompensa cheia.
 *
 * Quem move `current_value` é a sincronização do service, que lê a fonte
 * declarada pelo tipo da meta (mel acumulado, nível). O clique não move nada.
 */
export async function concluir(conexao, id) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE goals
        SET completed_at = NOW(),
            status_id = (SELECT id FROM goal_statuses WHERE slug = 'concluida')
      WHERE id = ?
        AND completed_at IS NULL
        AND current_value >= target_value`,
    [id],
  );
  return resultado.affectedRows;
}

/** Metas ativas com prazo vencido. O cron diário usa isto para expirar e oferecer renovação. */
export async function expirarVencidas(conexao = null) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE goals
        SET status_id = (SELECT id FROM goal_statuses WHERE slug = 'expirada')
      WHERE completed_at IS NULL
        AND due_at < NOW()
        AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'ativa')`,
  );
  return resultado.affectedRows;
}

/** Quantas metas ativas o jogador já tem — o limite por jogador é regra do service. */
export async function contarAtivas(idUsuario) {
  const linhas = await consultar(
    `SELECT COUNT(*) AS total
       FROM goals g
       JOIN goal_statuses st ON st.id = g.status_id
      WHERE g.user_id = ? AND st.slug = 'ativa'`,
    [idUsuario],
  );
  return Number(linhas[0]?.total ?? 0);
}

/**
 * Tipos e dificuldades disponíveis. Vêm do banco porque é lá que eles são
 * declarados e versionados pelo seed — uma lista equivalente escrita em
 * JavaScript sairia do ar no dia em que alguém acrescentasse um tipo.
 */
export async function buscarCatalogo() {
  const [tipos, dificuldades] = await Promise.all([
    consultar('SELECT id, slug, name, progress_source FROM goal_types ORDER BY id'),
    consultar(
      `SELECT id, slug, name, reward_multiplier, reward_coins, reward_points, default_days
         FROM goal_difficulties
        ORDER BY default_days`,
    ),
  ]);
  return { tipos, dificuldades };
}
