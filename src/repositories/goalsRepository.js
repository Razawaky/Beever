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

/**
 * As metas deste jogador que passaram do prazo e ainda constam como ativas.
 *
 * Existe para a expiração poder ser auditada: quem expira precisa saber o que
 * expirou, e um `UPDATE` só devolve quantas linhas mudaram.
 */
export async function listarVencidasPorUsuario(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM goals g
       ${JOINS}
      WHERE g.user_id = ? AND st.slug = 'ativa' AND g.completed_at IS NULL AND g.due_at < NOW()
      ORDER BY g.due_at`,
    [idUsuario],
  );
}

/**
 * Expira as metas vencidas de um jogador só.
 *
 * A versão global existe para uma rotina diária que ainda não há. Esta é a que o
 * jogo usa: a expiração acontece quando o jogador abre a tela, do mesmo jeito
 * preguiçoso das tarefas do dia e do ciclo econômico.
 */
export async function expirarVencidasDoUsuario(conexao, idUsuario) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE goals
        SET status_id = (SELECT id FROM goal_statuses WHERE slug = 'expirada')
      WHERE user_id = ?
        AND completed_at IS NULL
        AND due_at < NOW()
        AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'ativa')`,
    [idUsuario],
  );
  return resultado.affectedRows;
}

/** Metas ativas com prazo vencido, de todo mundo. Para uma rotina diária, quando houver. */
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
 * As três linhas da RN-014: faixa de dias por semana, quantas metas ativas ela
 * recebe e com que dificuldade — e, pela dificuldade, com que prazo e que
 * recompensa. Vêm todas, e quem escolhe a faixa é o planejador, para que essa
 * escolha possa ser testada sem banco.
 *
 * Semana vazia não tem linha, de propósito: é erro de preenchimento
 * (RF-ONB-03), não um plano de jogo.
 */
export async function listarRegrasDePlano() {
  return consultar(
    `SELECT r.id, r.min_weekdays, r.max_weekdays, r.active_goals,
            d.id AS difficulty_id, d.slug AS difficulty, d.default_days,
            d.reward_coins, d.reward_points, d.reward_multiplier
       FROM goal_plan_rules r
       JOIN goal_difficulties d ON d.id = r.difficulty_id
      ORDER BY r.min_weekdays`,
  );
}

/**
 * Os tipos de meta que têm régua de alvo, com a régua junto.
 *
 * Ter linha aqui é condição para o tipo ser sorteado, mas não é a única: o
 * planejador ainda confere se existe consulta capaz de medir a
 * `progress_source` do tipo. Uma coisa é saber o tamanho do alvo, outra é saber
 * dizer quanto o jogador já andou.
 */
export async function listarRegrasDeAlvo() {
  return consultar(
    `SELECT t.id AS goal_type_id, t.slug, t.name, t.progress_source,
            r.base_per_session, r.min_increment, r.max_increment, r.rounding_step
       FROM goal_target_rules r
       JOIN goal_types t ON t.id = r.goal_type_id
      ORDER BY t.id`,
  );
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
