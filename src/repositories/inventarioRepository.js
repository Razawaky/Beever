import { consultar } from '../config/database.js';

/** Acesso a dados de `inventario` — itens que cada perfil já possui. */

export async function listarPorPerfil(idPerfil) {
  return consultar(
    `SELECT inventario.id_item, inventario.quantidade, inventario.data_aquisicao,
            item.nome, item.descricao, item.categoria
       FROM inventario
       JOIN item ON item.id = inventario.id_item
      WHERE inventario.id_perfil = ?
      ORDER BY inventario.data_aquisicao DESC`,
    [idPerfil]
  );
}

/**
 * Item novo vira linha nova; item repetido só soma quantidade — por isso o
 * `ON DUPLICATE KEY UPDATE`, apoiado na UNIQUE (id_perfil, id_item).
 */
export async function adicionarOuIncrementar(conexao, { idPerfil, idItem, quantidade = 1 }) {
  await conexao.execute(
    `INSERT INTO inventario (id_perfil, id_item, quantidade)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantidade = quantidade + VALUES(quantidade)`,
    [idPerfil, idItem, quantidade]
  );
}
