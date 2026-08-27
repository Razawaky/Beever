import { consultar, consultarEm } from '../config/database.js';

/**
 * `hives` — os favos, que são os módulos da trilha (RN-025).
 *
 * O favo carrega os requisitos de desbloqueio: o percentual do favo anterior
 * (RN-027), patrimônio mínimo e item exigido (RN-028). Quem decide se está
 * desbloqueado é o `ContentService`; aqui só se lê o que a regra precisa.
 *
 * A faixa etária chega de fora como lista (RN-029) e entra no `WHERE`, para não
 * trazer o catálogo inteiro e descartar em memória.
 */

const CAMPOS = `h.id, h.slug, h.title, h.description, h.order_index,
                h.unlock_percent, h.required_patrimony, h.required_item_id,
                h.age_band_id, ab.code AS age_band_code,
                i.name AS required_item_name`;

const JOINS = `JOIN age_bands ab ON ab.id = h.age_band_id
               LEFT JOIN items i ON i.id = h.required_item_id`;

const ATIVO = 'h.is_active = 1 AND h.deleted_at IS NULL';

/** Lista de interrogações para um `IN (?)`, porque `execute` não expande array. */
function marcadores(quantidade) {
  return Array(quantidade).fill('?').join(', ');
}

/**
 * Os favos que o jogador pode ver, na ordem da trilha.
 *
 * `codigosDeFaixa` é a faixa dele e as anteriores (RN-029). Lista vazia devolve
 * lista vazia: sem faixa não há trilha, e trazer tudo seria o contrário da regra.
 */
export async function listarPorFaixas(codigosDeFaixa = []) {
  if (codigosDeFaixa.length === 0) return [];

  return consultar(
    `SELECT ${CAMPOS}
       FROM hives h
       ${JOINS}
      WHERE ${ATIVO} AND ab.code IN (${marcadores(codigosDeFaixa.length)})
      ORDER BY ab.min_age, h.order_index, h.id`,
    codigosDeFaixa,
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM hives h
       ${JOINS}
      WHERE h.id = ? AND ${ATIVO}`,
    [id],
  );
  return linhas[0] ?? null;
}

export async function buscarPorSlug(slug) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM hives h
       ${JOINS}
      WHERE h.slug = ? AND ${ATIVO}`,
    [slug],
  );
  return linhas[0] ?? null;
}

/**
 * O favo imediatamente anterior na trilha, dentro da mesma faixa.
 *
 * É dele que sai o percentual da RN-027: o favo seguinte só abre quando este
 * chega ao `unlock_percent`. Devolve `null` no primeiro favo da faixa, que é o
 * que abre sem pré-requisito.
 */
export async function buscarAnterior(favo) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM hives h
       ${JOINS}
      WHERE ${ATIVO} AND h.age_band_id = ? AND h.order_index < ?
      ORDER BY h.order_index DESC
      LIMIT 1`,
    [favo.age_band_id, favo.order_index],
  );
  return linhas[0] ?? null;
}

/**
 * Tudo o que existe, inclusive o que está desativado — a lista do painel
 * administrativo. As demais consultas deste arquivo escondem o inativo de
 * propósito, porque quem as chama é a trilha do jogador.
 */
export async function listarParaAdmin() {
  return consultar(
    `SELECT ${CAMPOS}, h.is_active, h.created_at,
            (SELECT COUNT(*) FROM cells c WHERE c.hive_id = h.id AND c.deleted_at IS NULL) AS total_celulas
       FROM hives h
       ${JOINS}
      WHERE h.deleted_at IS NULL
      ORDER BY ab.min_age, h.order_index, h.id`,
  );
}

/** Busca sem esconder o inativo: o painel precisa abrir o que desativou. */
export async function buscarParaAdmin(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}, h.is_active
       FROM hives h
       ${JOINS}
      WHERE h.id = ? AND h.deleted_at IS NULL`,
    [id],
  );
  return linhas[0] ?? null;
}

/** O maior `order_index` da faixa, para o favo novo entrar no fim da trilha. */
export async function ultimaOrdemDaFaixa(idFaixa) {
  const linhas = await consultar(
    'SELECT COALESCE(MAX(order_index), 0) AS ultima FROM hives WHERE age_band_id = ? AND deleted_at IS NULL',
    [idFaixa],
  );
  return Number(linhas[0]?.ultima ?? 0);
}

export async function criar({ slug, titulo, descricao, ordem, idFaixa, percentualDeDesbloqueio }, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO hives (slug, title, description, order_index, age_band_id, unlock_percent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [slug, titulo, descricao, ordem, idFaixa, percentualDeDesbloqueio],
  );
  return resultado.insertId;
}

/** COALESCE mantém o valor atual quando o campo não é enviado. */
export async function atualizar(
  id,
  { slug = null, titulo = null, descricao = null, idFaixa = null, percentualDeDesbloqueio = null },
  conexao = null,
) {
  await consultarEm(
    conexao,
    `UPDATE hives
        SET slug           = COALESCE(?, slug),
            title          = COALESCE(?, title),
            description    = COALESCE(?, description),
            age_band_id    = COALESCE(?, age_band_id),
            unlock_percent = COALESCE(?, unlock_percent)
      WHERE id = ? AND deleted_at IS NULL`,
    [slug, titulo, descricao, idFaixa, percentualDeDesbloqueio, id],
  );
}

/** Favo nunca é apagado: `cell_progress` e as partidas apontam para as células dele. */
export async function definirAtivo(id, ativo, conexao = null) {
  await consultarEm(conexao, 'UPDATE hives SET is_active = ? WHERE id = ? AND deleted_at IS NULL', [
    ativo ? 1 : 0,
    id,
  ]);
}

export async function slugJaUsado(slug, idParaIgnorar = null) {
  const linhas = await consultar(
    'SELECT 1 FROM hives WHERE slug = ? AND deleted_at IS NULL AND id <> COALESCE(?, 0) LIMIT 1',
    [slug, idParaIgnorar],
  );
  return linhas.length > 0;
}
