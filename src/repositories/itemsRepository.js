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
 *
 * Vem em lote porque a vitrine pede os requisitos do catálogo inteiro de uma
 * vez, e uma consulta por item seria N+1 na abertura da loja. O nome do item
 * pré-requisito já vem no join, para o service não voltar ao banco só por ele.
 */
export async function listarRequisitosDosItens(idsDeItens) {
  if (idsDeItens.length === 0) return [];

  const marcadores = Array(idsDeItens.length).fill('?').join(', ');
  return consultar(
    `SELECT r.item_id, r.id, t.slug AS requirement_type, r.required_level, r.required_hive_id,
            r.required_item_id, r.required_patrimony, pre.name AS required_item_name
       FROM item_requirements r
       JOIN item_requirement_types t ON t.id = r.requirement_type_id
       LEFT JOIN items pre ON pre.id = r.required_item_id
      WHERE r.item_id IN (${marcadores})
      ORDER BY r.item_id, r.id`,
    idsDeItens,
  );
}

/** Os requisitos de um item só. */
export async function listarRequisitos(idItem) {
  return listarRequisitosDosItens([idItem]);
}

/**
 * Os comportamentos econômicos de um lote de itens (RN-034 e RN-035).
 *
 * Recebe uma lista de ids e devolve uma linha por par item/comportamento,
 * porque um item pode ter mais de um — carro deprecia **e** cobra custo fixo. O
 * ciclo econômico pede os comportamentos de tudo que o jogador possui de uma
 * vez, e uma consulta por unidade seria N+1 na entrada de quem ficou semanas
 * fora.
 */
export async function listarComportamentosDosItens(idsDeItens) {
  if (idsDeItens.length === 0) return [];

  const marcadores = Array(idsDeItens.length).fill('?').join(', ');
  return consultar(
    `SELECT m.item_id, b.slug AS behavior, b.name AS behavior_name
       FROM item_behaviors_map m
       JOIN item_behaviors b ON b.id = m.behavior_id
      WHERE m.item_id IN (${marcadores})
      ORDER BY m.item_id, b.id`,
    idsDeItens,
  );
}

/** Os comportamentos de um item só. Atalho para a tela da loja explicar o que a compra faz. */
export async function listarComportamentos(idItem) {
  return listarComportamentosDosItens([idItem]);
}

/**
 * Os itens que são melhoria deste (`upgrade_of_item_id`). É o que a loja usa
 * para oferecer a casa maior a quem já tem a menor, com o desconto da RF-LOJ.
 */
export async function listarUpgradesDe(idItem) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM items i
       JOIN item_categories c ON c.id = i.category_id
      WHERE i.upgrade_of_item_id = ? AND i.is_active = 1 AND i.deleted_at IS NULL
      ORDER BY i.price`,
    [idItem],
  );
}
