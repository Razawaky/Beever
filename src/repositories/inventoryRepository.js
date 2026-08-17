import { consultar, consultarEm } from '../config/database.js';

/**
 * `inventory` — o que o jogador possui, uma linha por unidade adquirida.
 *
 * Mudança de contrato em relação ao schema antigo, e ela é intencional: não
 * existe mais coluna `quantidade`. Cada unidade é uma linha própria porque
 * cada unidade tem vida própria — valor atual que valoriza ou deprecia
 * (`current_value`), ciclos de custo fixo em atraso (`overdue_cycles`), venda
 * com data e valor. Duas unidades do mesmo item podem estar em estados
 * diferentes, e uma coluna de contagem não conseguiria representar isso.
 *
 * O status vem de `inventory_statuses` (ativo, inadimplente, vendido) e é
 * resolvido por slug aqui dentro: quem chama fala a linguagem do domínio, não
 * a dos ids de tabela de apoio.
 */

const CAMPOS = `inv.id, inv.item_id, inv.purchase_id, inv.current_value, inv.overdue_cycles,
                inv.is_equipped, inv.acquired_at, inv.sold_at, inv.sold_value,
                s.slug AS status, i.name AS item_name, i.slug AS item_slug,
                i.counts_in_patrimony, i.upkeep_cost, i.income_per_cycle,
                c.name AS category_name`;

const JOINS = `JOIN items i ON i.id = inv.item_id
               JOIN item_categories c ON c.id = i.category_id
               JOIN inventory_statuses s ON s.id = inv.status_id`;

export async function listarPorUsuario(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM inventory inv
       ${JOINS}
      WHERE inv.user_id = ? AND s.slug <> 'vendido'
      ORDER BY inv.acquired_at DESC, inv.id DESC`,
    [idUsuario],
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}, inv.user_id
       FROM inventory inv
       ${JOINS}
      WHERE inv.id = ?`,
    [id],
  );
  return linhas[0] ?? null;
}

/**
 * Entrada no inventário. Nasce com o valor pago: a valorização e a depreciação
 * são trabalho do ciclo econômico, não da compra.
 *
 * Exige conexão porque a linha só faz sentido junto do débito na carteira e do
 * registro em `purchases` — as três na mesma transação, ou nenhuma.
 */
export async function adicionar(conexao, { idUsuario, idItem, idCompra = null, valorInicial }) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO inventory (user_id, item_id, purchase_id, status_id, current_value)
     VALUES (?, ?, ?, (SELECT id FROM inventory_statuses WHERE slug = 'ativo'), ?)`,
    [idUsuario, idItem, idCompra, valorInicial],
  );
  return resultado.insertId;
}

/** Quantas unidades do item o jogador tem em mãos — o vendido não conta. */
export async function contarDoItem(idUsuario, idItem) {
  const linhas = await consultar(
    `SELECT COUNT(*) AS total
       FROM inventory inv
       JOIN inventory_statuses s ON s.id = inv.status_id
      WHERE inv.user_id = ? AND inv.item_id = ? AND s.slug <> 'vendido'`,
    [idUsuario, idItem],
  );
  return Number(linhas[0]?.total ?? 0);
}

/** Atalho para o requisito de item pré-requisito da loja (RN-036). */
export async function possuiItem(idUsuario, idItem) {
  return (await contarDoItem(idUsuario, idItem)) > 0;
}

/**
 * Patrimônio em itens: só o que a regra manda contar (`counts_in_patrimony`) e
 * ainda está com o jogador. Cosmético não vira patrimônio.
 */
export async function valorTotalEmPatrimonio(idUsuario) {
  const linhas = await consultar(
    `SELECT COALESCE(SUM(inv.current_value), 0) AS total
       FROM inventory inv
       JOIN items i ON i.id = inv.item_id
       JOIN inventory_statuses s ON s.id = inv.status_id
      WHERE inv.user_id = ? AND s.slug <> 'vendido' AND i.counts_in_patrimony = 1`,
    [idUsuario],
  );
  return Number(linhas[0]?.total ?? 0);
}

/**
 * Marca a unidade como vendida. A condição de status vai no próprio `WHERE`,
 * então a checagem e a gravação acontecem na mesma instrução: vender duas
 * vezes em sequência rápida não credita mel duas vezes — a segunda chamada
 * devolve 0 linhas afetadas.
 *
 * O status entra por subconsulta em `inventory_statuses`, e não por join no
 * `UPDATE`, porque o MySQL recusa ler uma tabela que faz parte do alvo de um
 * update multi-tabela (erro 1093).
 */
export async function marcarComoVendido(conexao, id, valorVenda) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE inventory
        SET status_id = (SELECT id FROM inventory_statuses WHERE slug = 'vendido'),
            sold_at = NOW(),
            sold_value = ?,
            is_equipped = 0
      WHERE id = ?
        AND status_id <> (SELECT id FROM inventory_statuses WHERE slug = 'vendido')`,
    [valorVenda, id],
  );
  return resultado.affectedRows;
}
