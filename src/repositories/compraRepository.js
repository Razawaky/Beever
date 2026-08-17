import { consultar } from '../config/database.js';

/** Acesso a dados de `compra` — histórico imutável do que foi pago. */

export async function criar(conexao, { idPerfil, idItem, quantidade, precoUnitario, precoTotal }) {
  const [resultado] = await conexao.execute(
    `INSERT INTO compra (id_perfil, id_item, quantidade, preco_unitario, preco_total)
     VALUES (?, ?, ?, ?, ?)`,
    [idPerfil, idItem, quantidade, precoUnitario, precoTotal]
  );
  return resultado.insertId;
}

export async function listarPorPerfil(idPerfil) {
  return consultar(
    `SELECT compra.id, compra.id_item, item.nome, compra.quantidade, compra.preco_total, compra.data_compra
       FROM compra
       JOIN item ON item.id = compra.id_item
      WHERE compra.id_perfil = ?
      ORDER BY compra.data_compra DESC`,
    [idPerfil]
  );
}
