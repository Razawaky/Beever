import { consultar } from '../config/database.js';

/**
 * `cells` — as células, que são as atividades dentro de um favo (RN-025).
 *
 * A ordem é a regra: a célula seguinte só abre quando a anterior é concluída
 * com ao menos uma estrela (RN-026), e quem garante que "a próxima" não seja
 * ambígua é a UNIQUE `(hive_id, order_index)`.
 *
 * As consultas trazem o progresso do jogador junto, por `LEFT JOIN`: célula
 * nunca jogada volta com estrelas zero em vez de sumir da lista.
 */

const CAMPOS = `c.id, c.hive_id, c.game_type_id, c.age_band_id, c.order_index,
                c.title, c.estimated_seconds,
                gt.slug AS game_type_slug, gt.name AS game_type_name,
                ab.code AS age_band_code`;

const JOINS = `JOIN game_types gt ON gt.id = c.game_type_id
               JOIN age_bands ab ON ab.id = c.age_band_id`;

const ATIVO = 'c.is_active = 1 AND c.deleted_at IS NULL';

/** Progresso do jogador na célula. Zero quando ele nunca a jogou. */
const PROGRESSO = `COALESCE(cp.stars, 0) AS stars,
                   COALESCE(cp.attempts, 0) AS attempts,
                   COALESCE(cp.errors, 0) AS errors,
                   COALESCE(cp.best_score, 0) AS best_score,
                   cp.first_completed_at, cp.last_completed_at`;

const JOIN_PROGRESSO = 'LEFT JOIN cell_progress cp ON cp.cell_id = c.id AND cp.user_id = ?';

/** Lista de interrogações para um `IN (?)`, porque `execute` não expande array. */
function marcadores(quantidade) {
  return Array(quantidade).fill('?').join(', ');
}

/**
 * As células do favo, em ordem, com o que este jogador já fez em cada uma.
 *
 * `codigosDeFaixa` filtra pela RN-029, que fala de célula e não só de favo: o
 * schema permite célula de faixa diferente da do favo, e sem este filtro ela
 * apareceria para quem é mais novo.
 */
export async function listarDoFavoComProgresso(idFavo, idUsuario, codigosDeFaixa = []) {
  if (codigosDeFaixa.length === 0) return [];

  return consultar(
    `SELECT ${CAMPOS}, ${PROGRESSO}
       FROM cells c
       ${JOINS}
       ${JOIN_PROGRESSO}
      WHERE c.hive_id = ? AND ${ATIVO} AND ab.code IN (${marcadores(codigosDeFaixa.length)})
      ORDER BY c.order_index, c.id`,
    [idUsuario, idFavo, ...codigosDeFaixa],
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM cells c
       ${JOINS}
      WHERE c.id = ? AND ${ATIVO}`,
    [id],
  );
  return linhas[0] ?? null;
}

/**
 * A célula imediatamente anterior dentro do favo. É ela que a RN-026 exige
 * concluída; `null` quer dizer que esta é a primeira, que abre sem pré-requisito.
 */
export async function buscarAnterior(celula) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM cells c
       ${JOINS}
      WHERE ${ATIVO} AND c.hive_id = ? AND c.order_index < ?
      ORDER BY c.order_index DESC
      LIMIT 1`,
    [celula.hive_id, celula.order_index],
  );
  return linhas[0] ?? null;
}

/**
 * Quantas células cada favo tem, para os favos pedidos — o denominador da
 * RN-027, e o número que a trilha mostra antes de o jogador tocar no favo.
 *
 * Em lote e com filtro de faixa: a trilha precisa de todos os favos de uma vez,
 * e contar sem o recorte da RN-029 daria um total que o jogador não enxerga.
 */
export async function contarPorFavos(idsDeFavo = [], codigosDeFaixa = []) {
  if (idsDeFavo.length === 0 || codigosDeFaixa.length === 0) return new Map();

  const linhas = await consultar(
    `SELECT c.hive_id, COUNT(*) AS total
       FROM cells c
       ${JOINS}
      WHERE c.hive_id IN (${marcadores(idsDeFavo.length)})
        AND ${ATIVO} AND ab.code IN (${marcadores(codigosDeFaixa.length)})
      GROUP BY c.hive_id`,
    [...idsDeFavo, ...codigosDeFaixa],
  );

  return new Map(linhas.map((linha) => [Number(linha.hive_id), Number(linha.total)]));
}
