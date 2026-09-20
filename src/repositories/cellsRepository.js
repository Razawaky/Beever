import { consultar, consultarEm } from '../config/database.js';

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

/**
 * As células do favo para o painel administrativo: sem filtro de faixa, com as
 * desativadas junto e dizendo se já existe conteúdo e se alguém já jogou.
 *
 * Ter jogado importa porque a edição do slug e da ordem muda de risco depois
 * que existe progresso pago em cima da célula.
 */
export async function listarDoFavoParaAdmin(idFavo) {
  return consultar(
    `SELECT ${CAMPOS}, c.is_active,
            (SELECT COUNT(*) FROM contents ct
              WHERE ct.cell_id = c.id AND ct.is_active = 1 AND ct.deleted_at IS NULL) AS versoes_de_conteudo,
            (SELECT COUNT(*) FROM cell_progress cp WHERE cp.cell_id = c.id) AS jogadores
       FROM cells c
       ${JOINS}
      WHERE c.hive_id = ? AND c.deleted_at IS NULL
      ORDER BY c.order_index, c.id`,
    [idFavo],
  );
}

/** Busca sem esconder o inativo: o painel precisa abrir o que desativou. */
export async function buscarParaAdmin(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}, c.is_active
       FROM cells c
       ${JOINS}
      WHERE c.id = ? AND c.deleted_at IS NULL`,
    [id],
  );
  return linhas[0] ?? null;
}

/** Os tipos de jogo do catálogo, para o formulário da célula escolher um. */
export async function listarTiposDeJogo() {
  return consultar('SELECT id, slug, name FROM game_types WHERE is_active = 1 ORDER BY name');
}

/** A maior ordem do favo, para a célula nova entrar no fim. */
export async function ultimaOrdemDoFavo(idFavo) {
  const linhas = await consultar(
    'SELECT COALESCE(MAX(order_index), 0) AS ultima FROM cells WHERE hive_id = ? AND deleted_at IS NULL',
    [idFavo],
  );
  return Number(linhas[0]?.ultima ?? 0);
}

/** A célula vizinha na direção pedida, que é com quem a ordem vai ser trocada. */
export async function buscarVizinha(idFavo, ordem, direcao) {
  const comparacao = direcao === 'cima' ? '<' : '>';
  const sentido = direcao === 'cima' ? 'DESC' : 'ASC';

  const linhas = await consultar(
    `SELECT c.id, c.order_index
       FROM cells c
      WHERE c.hive_id = ? AND c.deleted_at IS NULL AND c.order_index ${comparacao} ?
      ORDER BY c.order_index ${sentido}
      LIMIT 1`,
    [idFavo, ordem],
  );
  return linhas[0] ?? null;
}

export async function criar(
  { idFavo, idTipoDeJogo, idFaixa, ordem, titulo, segundosEstimados },
  conexao = null,
) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO cells (hive_id, game_type_id, age_band_id, order_index, title, estimated_seconds)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idFavo, idTipoDeJogo, idFaixa, ordem, titulo, segundosEstimados],
  );
  return resultado.insertId;
}

/** COALESCE mantém o valor atual quando o campo não é enviado. */
export async function atualizar(
  id,
  { idTipoDeJogo = null, idFaixa = null, titulo = null, segundosEstimados = null },
  conexao = null,
) {
  await consultarEm(
    conexao,
    `UPDATE cells
        SET game_type_id      = COALESCE(?, game_type_id),
            age_band_id       = COALESCE(?, age_band_id),
            title             = COALESCE(?, title),
            estimated_seconds = COALESCE(?, estimated_seconds)
      WHERE id = ? AND deleted_at IS NULL`,
    [idTipoDeJogo, idFaixa, titulo, segundosEstimados, id],
  );
}

export async function definirOrdem(id, ordem, conexao = null) {
  await consultarEm(conexao, 'UPDATE cells SET order_index = ? WHERE id = ? AND deleted_at IS NULL', [ordem, id]);
}

/** Célula nunca é apagada: `cell_progress` e as partidas apontam para ela. */
export async function definirAtivo(id, ativo, conexao = null) {
  await consultarEm(conexao, 'UPDATE cells SET is_active = ? WHERE id = ? AND deleted_at IS NULL', [
    ativo ? 1 : 0,
    id,
  ]);
}
