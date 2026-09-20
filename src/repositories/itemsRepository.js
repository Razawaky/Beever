import { consultar, consultarEm } from '../config/database.js';

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

const CAMPOS = `i.id, i.slug, i.name, i.description_kid, i.image_path, i.price, i.category_id,
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

/**
 * O catálogo inteiro para o painel administrativo: com o desativado junto e
 * dizendo quantas unidades já foram vendidas. As demais consultas escondem o
 * inativo de propósito, porque quem as chama é a loja do jogador.
 */
export async function listarParaAdmin() {
  return consultar(
    `SELECT ${CAMPOS}, i.is_active,
            (SELECT COUNT(*) FROM purchases p WHERE p.item_id = i.id) AS compras
       FROM items i
       JOIN item_categories c ON c.id = i.category_id
      WHERE i.deleted_at IS NULL
      ORDER BY c.name, i.price, i.name`,
  );
}

/** Busca sem esconder o inativo: o painel precisa abrir o que desativou. */
export async function buscarParaAdmin(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}, i.is_active
       FROM items i
       JOIN item_categories c ON c.id = i.category_id
      WHERE i.id = ? AND i.deleted_at IS NULL`,
    [id],
  );
  return linhas[0] ?? null;
}

/** As categorias e os comportamentos do catálogo, para os campos de escolha. */
export async function listarCategorias() {
  return consultar('SELECT id, slug, name FROM item_categories ORDER BY name');
}

export async function listarComportamentosDoCatalogo() {
  return consultar('SELECT id, slug, name FROM item_behaviors ORDER BY id');
}

export async function listarTiposDeRequisito() {
  return consultar('SELECT id, slug, name FROM item_requirement_types ORDER BY id');
}

export async function slugJaUsado(slug, idParaIgnorar = null) {
  const linhas = await consultar(
    'SELECT 1 FROM items WHERE slug = ? AND deleted_at IS NULL AND id <> COALESCE(?, 0) LIMIT 1',
    [slug, idParaIgnorar],
  );
  return linhas.length > 0;
}

export async function criar(dados, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO items (slug, name, description_kid, image_path, category_id, price,
                        counts_in_patrimony, valuation_rate, valuation_floor_pct, valuation_cap_pct,
                        upkeep_cost, income_per_cycle, upgrade_of_item_id, is_consumable)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dados.slug,
      dados.nome,
      dados.descricaoInfantil,
      dados.caminhoDaImagem,
      dados.idCategoria,
      dados.preco,
      dados.contaNoPatrimonio ? 1 : 0,
      dados.taxaDeValorizacao,
      dados.pisoPercentual,
      dados.tetoPercentual,
      dados.custoFixo,
      dados.rendaPorCiclo,
      dados.idItemDeOrigem,
      dados.ehConsumivel ? 1 : 0,
    ],
  );
  return resultado.insertId;
}

/** COALESCE mantém o valor atual quando o campo não é enviado — vale para a imagem. */
export async function atualizar(id, dados, conexao = null) {
  await consultarEm(
    conexao,
    `UPDATE items
        SET slug                = COALESCE(?, slug),
            name                = COALESCE(?, name),
            description_kid     = COALESCE(?, description_kid),
            image_path          = COALESCE(?, image_path),
            category_id         = COALESCE(?, category_id),
            price               = COALESCE(?, price),
            counts_in_patrimony = COALESCE(?, counts_in_patrimony),
            valuation_rate      = COALESCE(?, valuation_rate),
            valuation_floor_pct = COALESCE(?, valuation_floor_pct),
            valuation_cap_pct   = COALESCE(?, valuation_cap_pct),
            upkeep_cost         = COALESCE(?, upkeep_cost),
            income_per_cycle    = COALESCE(?, income_per_cycle),
            upgrade_of_item_id  = ?,
            is_consumable       = COALESCE(?, is_consumable)
      WHERE id = ? AND deleted_at IS NULL`,
    [
      dados.slug,
      dados.nome,
      dados.descricaoInfantil,
      dados.caminhoDaImagem,
      dados.idCategoria,
      dados.preco,
      dados.contaNoPatrimonio === null ? null : dados.contaNoPatrimonio ? 1 : 0,
      dados.taxaDeValorizacao,
      dados.pisoPercentual,
      dados.tetoPercentual,
      dados.custoFixo,
      dados.rendaPorCiclo,
      // Sem COALESCE de propósito: desfazer a linha de evolução é enviar vazio,
      // e com COALESCE o campo em branco seria lido como "não mexer".
      dados.idItemDeOrigem,
      dados.ehConsumivel === null ? null : dados.ehConsumivel ? 1 : 0,
      id,
    ],
  );
}

/** Item nunca é apagado: `purchases` e `inventory` apontam para ele. */
export async function definirAtivo(id, ativo, conexao = null) {
  await consultarEm(conexao, 'UPDATE items SET is_active = ? WHERE id = ? AND deleted_at IS NULL', [
    ativo ? 1 : 0,
    id,
  ]);
}

/**
 * Regrava o mapa de comportamentos do item. Apagar e inserir de novo é o que
 * mantém o mapa igual aos números: comportamento que deixou de valer some.
 */
export async function substituirComportamentos(idItem, slugsDeComportamento, conexao = null) {
  await consultarEm(conexao, 'DELETE FROM item_behaviors_map WHERE item_id = ?', [idItem]);
  if (slugsDeComportamento.length === 0) return;

  const marcadores = Array(slugsDeComportamento.length).fill('?').join(', ');
  await consultarEm(
    conexao,
    `INSERT INTO item_behaviors_map (item_id, behavior_id)
     SELECT ?, b.id FROM item_behaviors b WHERE b.slug IN (${marcadores})`,
    [idItem, ...slugsDeComportamento],
  );
}

/** Mesma ideia do mapa de comportamentos: a lista enviada passa a ser a verdade. */
export async function substituirRequisitos(idItem, requisitos, conexao = null) {
  await consultarEm(conexao, 'DELETE FROM item_requirements WHERE item_id = ?', [idItem]);

  for (const requisito of requisitos) {
    await consultarEm(
      conexao,
      `INSERT INTO item_requirements (item_id, requirement_type_id, required_level, required_hive_id,
                                      required_item_id, required_patrimony)
       SELECT ?, t.id, ?, ?, ?, ? FROM item_requirement_types t WHERE t.slug = ?`,
      [
        idItem,
        requisito.nivelMinimo,
        requisito.idFavo,
        requisito.idItem,
        requisito.patrimonioMinimo,
        requisito.tipo,
      ],
    );
  }
}
