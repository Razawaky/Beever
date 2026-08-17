import { consultar } from '../config/database.js';

/** Acesso a dados de `tarefa`. */

export async function listarPorMeta(idMeta) {
  return consultar(
    `SELECT id, id_meta, titulo, descricao, data_prazo, prioridade, progresso, status
       FROM tarefa
      WHERE id_meta = ? AND status = 'Ativo'
      ORDER BY data_prazo`,
    [idMeta]
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    'SELECT id, id_meta, id_perfil, titulo, progresso FROM tarefa WHERE id = ?',
    [id]
  );
  return linhas[0] ?? null;
}

export async function criar({ idMeta, idPerfil, titulo, descricao, dataPrazo, prioridade }) {
  const resultado = await consultar(
    `INSERT INTO tarefa (id_meta, id_perfil, titulo, descricao, data_inicio, data_prazo, prioridade)
     VALUES (?, ?, ?, ?, CURDATE(), ?, ?)`,
    [idMeta, idPerfil, titulo, descricao, dataPrazo, prioridade]
  );
  return resultado.insertId;
}

/**
 * Só marca concluída (progresso 100) se ainda não estava — o `AND progresso <
 * 100` faz a checagem e a gravação na mesma instrução, então clicar
 * "concluir" duas vezes rápido não credita pontos duas vezes.
 */
export async function concluir(conexao, id) {
  const [resultado] = await conexao.execute('UPDATE tarefa SET progresso = 100 WHERE id = ? AND progresso < 100', [
    id,
  ]);
  return resultado.affectedRows;
}
