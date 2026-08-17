import { consultar } from '../config/database.js';

/** Acesso a dados de `meta`. Meta não tem `id_perfil` direto — vem do join com `cronograma`. */

export async function listarPorPerfil(idPerfil) {
  return consultar(
    `SELECT meta.id, meta.titulo, meta.descricao, meta.data_final, meta.status, meta.data_criacao
       FROM meta
       JOIN cronograma ON cronograma.id = meta.id_cronograma
      WHERE cronograma.id_perfil = ? AND meta.status = 'Ativo'
      ORDER BY meta.data_final`,
    [idPerfil]
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT meta.id, meta.titulo, meta.descricao, meta.data_final, meta.status, cronograma.id_perfil
       FROM meta
       JOIN cronograma ON cronograma.id = meta.id_cronograma
      WHERE meta.id = ?`,
    [id]
  );
  return linhas[0] ?? null;
}

export async function criar({ idCronograma, titulo, descricao, dataFinal }) {
  const resultado = await consultar(
    'INSERT INTO meta (id_cronograma, titulo, descricao, data_final) VALUES (?, ?, ?, ?)',
    [idCronograma, titulo, descricao, dataFinal]
  );
  return resultado.insertId;
}
