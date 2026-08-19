import { consultar, consultarEm } from '../config/database.js';
import { limiteSeguro } from '../utils/limite.js';

/**
 * `game_sessions` — uma partida jogada.
 *
 * Não confundir com a sessão de login: aquela vive no `express-session` e na
 * tabela `sessions`. Esta é domínio do jogo — estrelas, erros, duração e o que
 * a partida rendeu de XP, pólen e mel.
 *
 * A partida agora aponta para a **célula** (`cell_id`), não para um jogo solto:
 * a célula é que sabe qual conteúdo e qual tipo de jogo estão em cena, e é ela
 * que marca progresso na trilha.
 *
 * O `token` é a defesa contra o jogador (ou o navegador) mandar o mesmo
 * resultado duas vezes: quem abre a partida recebe o token, quem fecha precisa
 * apresentá-lo, e a UNIQUE do banco recusa o segundo uso. Por isso as colunas
 * de recompensa são gravadas aqui, no fechamento — elas são o registro do que
 * aquela partida pagou, e o crédito em si é do motor de recompensas.
 */

const CAMPOS = `gs.id, gs.user_id, gs.cell_id, gs.token, gs.started_at, gs.finished_at,
                gs.duration_seconds, gs.errors, gs.stars, gs.xp_awarded, gs.points_awarded,
                gs.coins_awarded, gs.is_replay, st.slug AS status`;

const JOINS = 'JOIN game_session_statuses st ON st.id = gs.status_id';

export async function iniciar(conexao, { idUsuario, idCelula, token, ehRepeticao = false }) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO game_sessions (user_id, cell_id, status_id, token, is_replay)
     VALUES (?, ?, (SELECT id FROM game_session_statuses WHERE slug = 'aberta'), ?, ?)`,
    [idUsuario, idCelula, token, ehRepeticao ? 1 : 0],
  );
  return resultado.insertId;
}

export async function buscarPorToken(token) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM game_sessions gs
       ${JOINS}
      WHERE gs.token = ?`,
    [token],
  );
  return linhas[0] ?? null;
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM game_sessions gs
       ${JOINS}
      WHERE gs.id = ?`,
    [id],
  );
  return linhas[0] ?? null;
}

/**
 * A partida aberta daquele token, travada para atualização.
 *
 * O `FOR UPDATE` é o que faz duas conclusões simultâneas virarem uma: a segunda
 * espera a primeira terminar e, quando chega a vez dela, a partida já está
 * fechada e a linha não volta mais. Sem a trava, as duas leriam "aberta" ao
 * mesmo tempo e as duas creditariam.
 */
export async function bloquearAbertaPorToken(conexao, token) {
  const linhas = await consultarEm(
    conexao,
    `SELECT ${CAMPOS}
       FROM game_sessions gs
       ${JOINS}
      WHERE gs.token = ? AND gs.finished_at IS NULL
      FOR UPDATE`,
    [token],
  );
  return linhas[0] ?? null;
}

/**
 * Fecha a partida e registra o que ela rendeu.
 *
 * A duração é calculada pelo banco a partir do `started_at` gravado na
 * abertura, não pelo cliente: um cronômetro que vem do navegador é um número
 * que o jogador controla, e a recompensa depende dele.
 *
 * Só fecha partida aberta (`finished_at IS NULL` no `WHERE`). Reenviar o mesmo
 * resultado devolve 0 linhas afetadas, e o service não credita nada — é a
 * mesma defesa da tarefa concluída duas vezes.
 */
export async function finalizar(conexao, { token, estrelas = 0, erros = 0, xp = 0, pontos = 0, moedas = 0 }) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE game_sessions
        SET status_id = (SELECT id FROM game_session_statuses WHERE slug = 'concluida'),
            finished_at = NOW(),
            duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()),
            stars = ?, errors = ?, xp_awarded = ?, points_awarded = ?, coins_awarded = ?
      WHERE token = ? AND finished_at IS NULL`,
    [estrelas, erros, xp, pontos, moedas, token],
  );
  return resultado.affectedRows;
}

/** Abandona a partida aberta — usado quando o jogador sai sem terminar. */
export async function abandonar(conexao, token) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE game_sessions
        SET status_id = (SELECT id FROM game_session_statuses WHERE slug = 'abandonada'),
            finished_at = NOW(),
            duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW())
      WHERE token = ? AND finished_at IS NULL`,
    [token],
  );
  return resultado.affectedRows;
}

export async function listarPorUsuario(idUsuario, limite = 20) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM game_sessions gs
       ${JOINS}
      WHERE gs.user_id = ?
      ORDER BY gs.started_at DESC, gs.id DESC
      LIMIT ${limiteSeguro(limite, { padrao: 20 })}`,
    [idUsuario],
  );
}

/** Quantas partidas concluídas o jogador tem na célula — é o que distingue estreia de repetição (RN-026). */
export async function contarConcluidasNaCelula(idUsuario, idCelula) {
  const linhas = await consultar(
    `SELECT COUNT(*) AS total
       FROM game_sessions gs
       JOIN game_session_statuses st ON st.id = gs.status_id
      WHERE gs.user_id = ? AND gs.cell_id = ? AND st.slug = 'concluida'`,
    [idUsuario, idCelula],
  );
  return Number(linhas[0]?.total ?? 0);
}
