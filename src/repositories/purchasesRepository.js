import { consultar, consultarEm } from '../config/database.js';
import { limiteSeguro } from '../utils/limite.js';

/**
 * `purchases` — registro contábil do que foi pago, nunca recalculado.
 *
 * `price_at_purchase` e `total_price` são gravados, não derivados do preço
 * atual do item: se a loja mudar o preço amanhã, o extrato de ontem tem que
 * continuar contando a verdade de ontem.
 *
 * O banco confere a aritmética sozinho (`ck_purchases_total`:
 * total = preço × quantidade − desconto). Passar um total inventado aqui não
 * grava linha errada — estoura a constraint, que é o comportamento desejado.
 *
 * A compra sempre acontece dentro de transação junto do débito na carteira e
 * da entrada no inventário, então `criar` exige a conexão.
 */

export async function criar(
  conexao,
  { idUsuario, idItem, quantidade = 1, precoUnitario, desconto = 0, precoTotal },
) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO purchases (user_id, item_id, quantity, price_at_purchase, discount_applied, total_price)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idUsuario, idItem, quantidade, precoUnitario, desconto, precoTotal],
  );
  return resultado.insertId;
}

export async function listarPorUsuario(idUsuario, limite = 50) {
  return consultar(
    `SELECT p.id, p.item_id, i.name AS item_name, i.slug AS item_slug,
            p.quantity, p.price_at_purchase, p.discount_applied, p.total_price, p.purchased_at
       FROM purchases p
       JOIN items i ON i.id = p.item_id
      WHERE p.user_id = ?
      ORDER BY p.purchased_at DESC, p.id DESC
      LIMIT ${limiteSeguro(limite)}`,
    [idUsuario],
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT id, user_id, item_id, quantity, price_at_purchase, discount_applied, total_price, purchased_at
       FROM purchases
      WHERE id = ?`,
    [id],
  );
  return linhas[0] ?? null;
}

/** Quanto o jogador já gastou na loja — entra no cálculo de patrimônio e nos relatórios. */
/**
 * A compra mais recente daquele item pelo jogador.
 *
 * Serve ao reenvio idempotente: `idempotency_keys` guarda hash e não resposta,
 * então quem repete o pedido recebe a compra que o primeiro envio gravou — que
 * é justamente a mais recente daquele item.
 */
export async function buscarUltimaDoItem(idUsuario, idItem) {
  const linhas = await consultar(
    `SELECT id, user_id, item_id, quantity, price_at_purchase, discount_applied, total_price, purchased_at
       FROM purchases
      WHERE user_id = ? AND item_id = ?
      ORDER BY id DESC
      LIMIT 1`,
    [idUsuario, idItem],
  );
  return linhas[0] ?? null;
}

export async function totalGastoPorUsuario(idUsuario) {
  const linhas = await consultar(
    'SELECT COALESCE(SUM(total_price), 0) AS total FROM purchases WHERE user_id = ?',
    [idUsuario],
  );
  return Number(linhas[0]?.total ?? 0);
}
