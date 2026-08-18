import { consultar, consultarEm } from '../config/database.js';

/**
 * `tasks` — as tarefas diárias e semanais do jogador.
 *
 * Duas mudanças de contrato em relação ao schema antigo, ambas de propósito:
 *
 * 1. A tarefa **não pertence mais a uma meta**. Ela é do usuário direto
 *    (`user_id`) e nasce de um `task_type` do catálogo, que carrega o texto, o
 *    alvo padrão e a recompensa. Título e descrição saem do tipo, não da linha
 *    da tarefa — é isso que permite gerar as tarefas do dia sem inventar texto.
 * 2. O progresso deixou de ser porcentagem e virou contagem:
 *    `current_value` sobe até `target_value`. "Conclua 3 células hoje" é 0/3,
 *    1/3, 2/3 — não 33%.
 *
 * O status usa `goal_statuses`, a mesma tabela das metas: o ciclo de vida é
 * idêntico (ativa, concluída, expirada, renovada) e duplicar a tabela só
 * criaria dois vocabulários para a mesma coisa.
 */

const CAMPOS = `t.id, t.user_id, t.task_type_id, t.target_value, t.current_value,
                t.reward_points, t.reward_coins, t.due_at, t.completed_at, t.created_at,
                tt.slug AS type_slug, tt.name AS title, tt.progress_source,
                sc.slug AS scope, st.slug AS status`;

const JOINS = `JOIN task_types tt ON tt.id = t.task_type_id
               JOIN task_scopes sc ON sc.id = tt.scope_id
               JOIN goal_statuses st ON st.id = t.status_id`;

export async function listarPorUsuario(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM tasks t
       ${JOINS}
      WHERE t.user_id = ?
      ORDER BY t.due_at, t.id`,
    [idUsuario],
  );
}

export async function listarAtivasPorUsuario(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM tasks t
       ${JOINS}
      WHERE t.user_id = ? AND st.slug = 'ativa'
      ORDER BY t.due_at, t.id`,
    [idUsuario],
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM tasks t
       ${JOINS}
      WHERE t.id = ?`,
    [id],
  );
  return linhas[0] ?? null;
}

/**
 * Cria a tarefa a partir do tipo. Alvo e recompensa podem vir de fora — a
 * geração automática pode ajustar por faixa etária — mas o padrão é o que o
 * catálogo declara, via `COALESCE`, para não haver dois lugares definindo o
 * mesmo número.
 */
export async function criar(conexao, { idUsuario, idTipo, alvo = null, pontos = null, moedas = null, prazo }) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO tasks (user_id, task_type_id, status_id, target_value, reward_points, reward_coins, due_at)
     SELECT ?, tt.id,
            (SELECT id FROM goal_statuses WHERE slug = 'ativa'),
            COALESCE(?, tt.default_target),
            COALESCE(?, tt.reward_points),
            COALESCE(?, tt.reward_coins),
            ?
       FROM task_types tt
      WHERE tt.id = ?`,
    [idUsuario, alvo, pontos, moedas, prazo, idTipo],
  );
  return resultado.insertId;
}

/**
 * Soma progresso sem passar do alvo (`LEAST`), e só enquanto a tarefa está
 * ativa. Deixar o `current_value` ultrapassar o `target_value` faria a barra
 * da interface passar de 100% e, pior, mudaria a conta de recompensa.
 */
export async function registrarProgresso(conexao, id, incremento = 1) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE tasks
        SET current_value = LEAST(current_value + ?, target_value)
      WHERE id = ?
        AND completed_at IS NULL
        AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'ativa')`,
    [incremento, id],
  );
  return resultado.affectedRows;
}

/**
 * Conclui a tarefa — e só conclui o que foi de fato cumprido.
 *
 * Duas condições no mesmo `WHERE`, cada uma fechando um buraco:
 *
 * - `completed_at IS NULL` faz a checagem e a gravação na mesma instrução, então
 *   clicar "concluir" duas vezes rápido não credita recompensa duas vezes.
 * - `current_value >= target_value` impede o atalho que a auditoria da E02
 *   encontrou: criar tarefa e concluir na sequência, sem cumprir nada, pagava a
 *   recompensa cheia. Em loop, era mel infinito. Quem decide que o alvo foi
 *   atingido é o progresso registrado pelo servidor, nunca o clique.
 *
 * Não se grava mais `current_value = target_value` aqui: o valor já tem que
 * estar lá. Igualar na conclusão era justamente o que mascarava o abuso.
 */
export async function concluir(conexao, id) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE tasks
        SET completed_at = NOW(),
            status_id = (SELECT id FROM goal_statuses WHERE slug = 'concluida')
      WHERE id = ?
        AND completed_at IS NULL
        AND current_value >= target_value`,
    [id],
  );
  return resultado.affectedRows;
}

/** Marca como expiradas as tarefas ativas cujo prazo passou. Roda no cron diário. */
export async function expirarVencidas(conexao = null) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE tasks
        SET status_id = (SELECT id FROM goal_statuses WHERE slug = 'expirada')
      WHERE completed_at IS NULL
        AND due_at < NOW()
        AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'ativa')`,
  );
  return resultado.affectedRows;
}

/**
 * Catálogo de tipos de tarefa. É de onde saem o texto, o alvo padrão e a
 * recompensa de cada tarefa criada — o service não inventa nenhum dos três.
 */
export async function listarTipos() {
  return consultar(
    `SELECT tt.id, tt.slug, tt.name, tt.progress_source, tt.default_target,
            tt.reward_points, tt.reward_coins, sc.slug AS scope
       FROM task_types tt
       JOIN task_scopes sc ON sc.id = tt.scope_id
      WHERE tt.is_active = 1
      ORDER BY sc.slug, tt.name`,
  );
}

/**
 * Tarefas ativas do jogador num escopo (`diaria` ou `semanal`) criadas a partir
 * de um instante. É o que o gerador consulta para não criar em duplicidade — a
 * pergunta que ele faz é "já existe tarefa diária de hoje?".
 */
export async function listarAtivasPorEscopoDesde(idUsuario, escopo, desde) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM tasks t
       ${JOINS}
      WHERE t.user_id = ? AND sc.slug = ? AND st.slug = 'ativa' AND t.created_at >= ?
      ORDER BY t.id`,
    [idUsuario, escopo, desde],
  );
}
