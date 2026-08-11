import { consultar } from '../config/database.js';

/** Trilha de auditoria: quem fez, o quê, em qual entidade, e o estado antes/depois. */
export async function registrar({
  atorTipo,
  atorId = null,
  acao,
  entidade,
  entidadeId = null,
  estadoAnterior = null,
  estadoNovo = null,
}) {
  await consultar(
    `INSERT INTO auditoria (ator_tipo, ator_id, acao, entidade, entidade_id, estado_anterior, estado_novo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      atorTipo,
      atorId,
      acao,
      entidade,
      entidadeId,
      estadoAnterior ? JSON.stringify(estadoAnterior) : null,
      estadoNovo ? JSON.stringify(estadoNovo) : null,
    ]
  );
}
