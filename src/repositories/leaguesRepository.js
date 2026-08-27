import { consultar, consultarEm } from '../config/database.js';

/**
 * `leagues`, `league_members` e `league_prizes` — a liga semanal (RF-GAM-02).
 *
 * Cada grupo da semana é uma linha de `leagues` com o mesmo domingo e nome
 * diferente; a UNIQUE `(starts_on, name)` é o que impede dois grupos iguais na
 * mesma semana.
 *
 * `league_members.points` é cache, como `wallets` é cache do livro: a verdade do
 * pólen está no `point_ledger`, e quem escreve aqui é o service, na leitura.
 */

const CAMPOS = 'l.id, l.name, l.starts_on, l.ends_on';

/** Os grupos daquela semana, do mais antigo para o mais novo. */
export async function listarDaSemana(domingo) {
  return consultar(
    `SELECT ${CAMPOS}, COUNT(m.id) AS membros
       FROM leagues l
       LEFT JOIN league_members m ON m.league_id = l.id
      WHERE l.starts_on = ?
      GROUP BY l.id, l.name, l.starts_on, l.ends_on
      ORDER BY l.id`,
    [domingo],
  );
}

export async function criarGrupo(domingo, sabado, nome, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    'INSERT INTO leagues (name, starts_on, ends_on) VALUES (?, ?, ?)',
    [nome, domingo, sabado],
  );
  return resultado.insertId;
}

/** O grupo em que o jogador está naquela semana. `null` se ele ainda não entrou. */
export async function buscarGrupoDoJogador(idUsuario, domingo) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}, m.points, m.final_rank
       FROM league_members m
       JOIN leagues l ON l.id = m.league_id
      WHERE m.user_id = ? AND l.starts_on = ?`,
    [idUsuario, domingo],
  );
  return linhas[0] ?? null;
}

/** Entrar é `INSERT IGNORE`: duas visitas simultâneas não põem o jogador duas vezes. */
export async function entrar(idLiga, idUsuario, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    'INSERT IGNORE INTO league_members (league_id, user_id, points) VALUES (?, ?, 0)',
    [idLiga, idUsuario],
  );
  return (resultado.affectedRows ?? 0) === 1;
}

/**
 * Os membros do grupo com o pólen da semana somado do livro.
 *
 * A soma vem do `point_ledger` e não da coluna `points`: a coluna é cache, e
 * cache que a tela lê sem conferir é cache que mente. Quem grava o cache é o
 * service, depois desta leitura.
 */
export async function listarMembrosComPolen(idLiga, de, ate) {
  return consultar(
    `SELECT m.user_id, u.nickname, p.avatar_id, m.final_rank,
            COALESCE(SUM(pl.amount), 0) AS polen
       FROM league_members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN profiles p ON p.user_id = m.user_id
       LEFT JOIN point_ledger pl
              ON pl.user_id = m.user_id AND pl.created_at BETWEEN ? AND ?
      WHERE m.league_id = ?
      GROUP BY m.user_id, u.nickname, p.avatar_id, m.final_rank
      ORDER BY polen DESC, u.nickname`,
    [de, ate, idLiga],
  );
}

/** Grava o cache de pontos de um membro. */
export async function atualizarPontos(idLiga, idUsuario, pontos, conexao = null) {
  await consultarEm(conexao, 'UPDATE league_members SET points = ? WHERE league_id = ? AND user_id = ?', [
    pontos,
    idLiga,
    idUsuario,
  ]);
}

/** Fecha a posição do membro. Só grava uma vez: `final_rank IS NULL` é a trava. */
export async function gravarPosicaoFinal(idLiga, idUsuario, posicao, pontos, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE league_members SET final_rank = ?, points = ?
      WHERE league_id = ? AND user_id = ? AND final_rank IS NULL`,
    [posicao, pontos, idLiga, idUsuario],
  );
  return (resultado.affectedRows ?? 0) === 1;
}

/**
 * As ligas já encerradas que ainda têm membro sem posição final.
 *
 * É a pergunta que a visita faz para saber o que fechar — o mesmo desenho
 * preguiçoso do ciclo econômico (RN-036), sem depender de cron.
 */
export async function listarPendentesDeFechamento(hoje) {
  return consultar(
    `SELECT DISTINCT ${CAMPOS}
       FROM leagues l
       JOIN league_members m ON m.league_id = l.id
      WHERE l.ends_on < ? AND m.final_rank IS NULL
      ORDER BY l.starts_on, l.id`,
    [hoje],
  );
}

/** O prêmio de cada posição do pódio. Posição fora do pódio não tem linha. */
export async function listarPremios() {
  return consultar('SELECT final_rank, reward_coins FROM league_prizes ORDER BY final_rank');
}
