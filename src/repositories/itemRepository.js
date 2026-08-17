import { consultar } from '../config/database.js';

/** Acesso a dados de `item` — catálogo da loja. */

export async function listarAtivos() {
  return consultar(
    `SELECT id, nome, descricao, preco, categoria
       FROM item
      WHERE status = 'Ativo'
      ORDER BY categoria, nome`
  );
}

export async function buscarAtivoPorId(id) {
  const linhas = await consultar(
    `SELECT id, nome, descricao, preco, categoria
       FROM item
      WHERE id = ? AND status = 'Ativo'`,
    [id]
  );
  return linhas[0] ?? null;
}
