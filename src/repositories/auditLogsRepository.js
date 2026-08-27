import { consultar } from '../config/database.js';
import { deslocamentoSeguro, limiteSeguro } from '../utils/limite.js';

/**
 * Trilha de auditoria (RN-010): quem fez, o quê, em qual entidade, e o estado
 * antes e depois.
 *
 * A tabela é append-only garantida por gatilho (RNF-17): `UPDATE` e `DELETE`
 * são recusados pelo banco. Este repository só sabe inserir, e é assim que
 * deve continuar.
 *
 * O tipo de ator chega como slug — `usuario`, `admin` ou `sistema` — e é
 * resolvido pelo próprio SQL. Slug inexistente faz o `INSERT` gravar zero
 * linhas, e isso vira erro: auditoria que some calada é pior do que operação
 * que falha alto, porque a RNF-17 promete que toda ação crítica deixou rastro.
 */

const ATORES = { usuario: 'usuario', admin: 'admin', sistema: 'sistema' };

export async function registrar({
  atorTipo = ATORES.usuario,
  atorId = null,
  acao,
  entidade,
  entidadeId = null,
  estadoAnterior = null,
  estadoNovo = null,
  ipHash = null,
  requestId = null,
}) {
  const resultado = await consultar(
    `INSERT INTO audit_logs (actor_type_id, actor_id, action, entity_type, entity_id,
                             before_state, after_state, ip_hash, request_id)
     SELECT t.id, ?, ?, ?, ?, ?, ?, ?, ? FROM audit_actor_types t WHERE t.slug = ?`,
    [
      atorId,
      acao,
      entidade,
      entidadeId,
      estadoAnterior ? JSON.stringify(estadoAnterior) : null,
      estadoNovo ? JSON.stringify(estadoNovo) : null,
      ipHash,
      requestId,
      atorTipo,
    ],
  );

  if (resultado.affectedRows === 0) {
    throw new Error(`Tipo de ator desconhecido na auditoria: "${atorTipo}". Nada foi registrado.`);
  }
}

/**
 * Monta o `WHERE` da consulta com filtros (RF-ADM-05).
 *
 * Cada filtro é opcional e vira um pedaço de SQL com o valor parametrizado —
 * nada do que vem de fora entra no texto da consulta. Quem sanea o que é filtro
 * válido é o service; aqui só se traduz filtro em cláusula.
 */
function condicoes(filtros) {
  const partes = [];
  const valores = [];

  if (filtros.atorTipo) {
    partes.push('t.slug = ?');
    valores.push(filtros.atorTipo);
  }
  if (filtros.atorId) {
    partes.push('l.actor_id = ?');
    valores.push(filtros.atorId);
  }
  if (filtros.acao) {
    partes.push('l.action = ?');
    valores.push(filtros.acao);
  }
  if (filtros.entidade) {
    partes.push('l.entity_type = ?');
    valores.push(filtros.entidade);
  }
  if (filtros.entidadeId) {
    partes.push('l.entity_id = ?');
    valores.push(filtros.entidadeId);
  }
  if (filtros.requestId) {
    partes.push('l.request_id = ?');
    valores.push(filtros.requestId);
  }
  if (filtros.de) {
    partes.push('l.created_at >= ?');
    valores.push(filtros.de);
  }
  if (filtros.ate) {
    partes.push('l.created_at <= ?');
    valores.push(filtros.ate);
  }

  return { sql: partes.length > 0 ? `WHERE ${partes.join(' AND ')}` : '', valores };
}

const CAMPOS_DA_CONSULTA = `l.id, t.slug AS ator_tipo, l.actor_id, l.action, l.entity_type,
                            l.entity_id, l.before_state, l.after_state, l.ip_hash,
                            l.request_id, l.created_at`;

/** Uma página da trilha, na ordem em que as ações aconteceram, da mais nova. */
export async function listarComFiltros(filtros = {}, { limite = 50, deslocamento = 0 } = {}) {
  const { sql, valores } = condicoes(filtros);

  return consultar(
    `SELECT ${CAMPOS_DA_CONSULTA}
       FROM audit_logs l
       JOIN audit_actor_types t ON t.id = l.actor_type_id
       ${sql}
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ${limiteSeguro(limite)} OFFSET ${deslocamentoSeguro(deslocamento)}`,
    valores,
  );
}

/** Quantas linhas o mesmo filtro devolve. É o "de quantas" da tela. */
export async function contarComFiltros(filtros = {}) {
  const { sql, valores } = condicoes(filtros);

  const linhas = await consultar(
    `SELECT COUNT(*) AS total
       FROM audit_logs l
       JOIN audit_actor_types t ON t.id = l.actor_type_id
       ${sql}`,
    valores,
  );
  return Number(linhas[0]?.total ?? 0);
}

/** As ações que já aconteceram, para o filtro oferecer uma lista em vez de texto livre. */
export async function listarAcoes() {
  const linhas = await consultar('SELECT DISTINCT action FROM audit_logs ORDER BY action');
  return linhas.map((linha) => linha.action);
}

/** Consulta da tela de auditoria do admin (RF-ADM-04). Usa o índice por entidade. */
export async function listarPorEntidade(entidade, entidadeId, limite = 50) {
  return consultar(
    `SELECT l.id, t.slug AS ator_tipo, l.actor_id, l.action, l.entity_type, l.entity_id,
            l.before_state, l.after_state, l.ip_hash, l.request_id, l.created_at
       FROM audit_logs l
       JOIN audit_actor_types t ON t.id = l.actor_type_id
      WHERE l.entity_type = ? AND l.entity_id = ?
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ${limiteSeguro(limite)}`,
    [entidade, entidadeId],
  );
}
