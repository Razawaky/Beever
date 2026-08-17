import { consultar } from '../config/database.js';

/**
 * Trilha de auditoria (RN-010): quem fez, o quê, em qual entidade, e o estado
 * antes e depois.
 *
 * A tabela é append-only garantida por gatilho (RNF-17): `UPDATE` e `DELETE`
 * são recusados pelo banco. Este repository só sabe inserir, e é assim que
 * deve continuar.
 *
 * O tipo de ator chega como slug — `usuario`, `admin` ou `sistema` — e é
 * resolvido pelo próprio SQL. Slug inexistente não grava linha nenhuma, o que
 * é melhor do que gravar auditoria com ator errado.
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
}) {
  await consultar(
    `INSERT INTO audit_logs (actor_type_id, actor_id, action, entity_type, entity_id, before_state, after_state, ip_hash)
     SELECT t.id, ?, ?, ?, ?, ?, ?, ? FROM audit_actor_types t WHERE t.slug = ?`,
    [
      atorId,
      acao,
      entidade,
      entidadeId,
      estadoAnterior ? JSON.stringify(estadoAnterior) : null,
      estadoNovo ? JSON.stringify(estadoNovo) : null,
      ipHash,
      atorTipo,
    ],
  );
}

/** Consulta da tela de auditoria do admin (RF-ADM-04). Usa o índice por entidade. */
export async function listarPorEntidade(entidade, entidadeId, limite = 50) {
  return consultar(
    `SELECT l.id, t.slug AS ator_tipo, l.actor_id, l.action, l.entity_type, l.entity_id,
            l.before_state, l.after_state, l.created_at
       FROM audit_logs l
       JOIN audit_actor_types t ON t.id = l.actor_type_id
      WHERE l.entity_type = ? AND l.entity_id = ?
      ORDER BY l.created_at DESC
      LIMIT ?`,
    [entidade, entidadeId, limite],
  );
}
