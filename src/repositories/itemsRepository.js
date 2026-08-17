import { consultar } from '../config/database.js';

/**
 * Catálogo da loja: `items`, sua categoria e seus requisitos de compra.
 *
 * A categoria virou tabela própria (`item_categories`) — no schema antigo era
 * um texto solto na linha do item. Por isso toda leitura faz join: quem chama
 * continua recebendo o nome da categoria pronto, sem precisar saber disso.
 *
 * Item nunca é apagado de verdade. `deleted_at` guarda a baixa lógica porque
 * uma compra antiga aponta para ele (`purchases.item_id` é RESTRICT) e o
 * histórico do jogador não pode ficar órfão.
 */

const CAMPOS = `i.id, i.slug, i.name, i.description_kid, i.price, i.category_id,
                c.slug AS category_slug, c.name AS category_name,
                i.counts_in_patrimony, i.valuation_rate, i.valuation_floor_pct, i.valuation_cap_pct,
                i.upkeep_cost, i.income_per_cycle, i.upgrade_of_item_id, i.is_consumable`;

export async function listarAtivos() {
  return consultar(
    `SELECT ${CAMPOS}
       FROM items i
       JOIN item_categories c ON c.id = i.category_id
      WHERE i.is_active = 1 AND i.deleted_at IS NULL
      ORDER BY c.name, i.price, i.name`,
  );
}

export async function buscarAtivoPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM items i
       JOIN item_categories c ON c.id = i.category_id
      WHERE i.id = ? AND i.is_active = 1 AND i.deleted_at IS NULL`,
    [id],
  );
  return linhas[0] ?? null;
}

export async function buscarPorSlug(slug) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM items i
       JOIN item_categories c ON c.id = i.category_id
      WHERE i.slug = ?`,
    [slug],
  );
  return linhas[0] ?? null;
}

/**
 * Requisitos de compra do item (RN-036): nível mínimo, favo concluído, item
 * pré-requisito ou patrimônio mínimo. Quem decide se o jogador cumpre é o
 * service — aqui só sai a lista do que o item exige.
 */
export async function listarRequisitos(idItem) {
  return consultar(
    `SELECT r.id, t.slug AS requirement_type, r.required_level, r.required_hive_id,
            r.required_item_id, r.required_patrimony
       FROM item_requirements r
       JOIN item_requirement_types t ON t.id = r.requirement_type_id
      WHERE r.item_id = ?
      ORDER BY r.id`,
    [idItem],
  );
}
