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
 * O status vem de `inventory_statuses` (ativo, inadimplente, vendido,
 * consumido) e é resolvido por slug aqui dentro: quem chama fala a linguagem do
 * domínio, não a dos ids de tabela de apoio.
 *
 * "Em mãos" é o que não foi vendido nem consumido — é essa a conta que a tela
 * de inventário e os requisitos da loja querem.
 */

const CAMPOS = `inv.id, inv.item_id, inv.purchase_id, inv.current_value, inv.overdue_cycles,
                inv.is_equipped, inv.acquired_at, inv.sold_at, inv.sold_value,
                s.slug AS status, i.name AS item_name, i.slug AS item_slug,
                i.counts_in_patrimony, i.upkeep_cost, i.income_per_cycle,
                c.name AS category_name, p.price_at_purchase AS purchase_price`;

const JOINS = `JOIN items i ON i.id = inv.item_id
               JOIN item_categories c ON c.id = i.category_id
               JOIN inventory_statuses s ON s.id = inv.status_id
               LEFT JOIN purchases p ON p.id = inv.purchase_id`;

export async function listarPorUsuario(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM inventory inv
       ${JOINS}
      WHERE inv.user_id = ? AND s.slug NOT IN ('vendido', 'consumido')
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
      WHERE inv.user_id = ? AND inv.item_id = ? AND s.slug NOT IN ('vendido', 'consumido')`,
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
      WHERE inv.user_id = ? AND s.slug NOT IN ('vendido', 'consumido') AND i.counts_in_patrimony = 1`,
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

/** Quantas unidades ativas do item o jogador tem — é a verdade sobre o escudo (RN-022). */
export async function contarAtivosDoItem(idUsuario, idItem, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    `SELECT COUNT(*) AS total
       FROM inventory inv
       JOIN inventory_statuses s ON s.id = inv.status_id
      WHERE inv.user_id = ? AND inv.item_id = ? AND s.slug = 'ativo'`,
    [idUsuario, idItem],
  );
  return Number(linhas[0]?.total ?? 0);
}

/**
 * A unidade ativa mais antiga do item, travada para uso.
 *
 * O `FOR UPDATE` existe porque quem chama vem consumir: duas avaliações ao
 * mesmo tempo pegariam a mesma linha e gastariam um escudo só duas vezes.
 */
export async function bloquearUnidadeAtivaDoItem(conexao, idUsuario, idItem) {
  const linhas = await consultarEm(
    conexao,
    `SELECT inv.id
       FROM inventory inv
       JOIN inventory_statuses s ON s.id = inv.status_id
      WHERE inv.user_id = ? AND inv.item_id = ? AND s.slug = 'ativo'
      ORDER BY inv.acquired_at, inv.id
      LIMIT 1
      FOR UPDATE`,
    [idUsuario, idItem],
  );
  return linhas[0] ?? null;
}

/**
 * Marca a unidade como consumida — item de uso único que acabou de ser gasto.
 *
 * A condição de status vai no `WHERE`, como na venda: consumir a mesma unidade
 * duas vezes devolve 0 linhas afetadas em vez de gastar dois escudos.
 */
export async function marcarComoConsumido(conexao, id) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE inventory
        SET status_id = (SELECT id FROM inventory_statuses WHERE slug = 'consumido'),
            is_equipped = 0
      WHERE id = ?
        AND status_id = (SELECT id FROM inventory_statuses WHERE slug = 'ativo')`,
    [id],
  );
  return (resultado.affectedRows ?? 0) === 1;
}

/**
 * As unidades que o ciclo econômico precisa olhar: as que ainda estão com o
 * jogador, com os números do item que decidem o efeito de cada ciclo.
 *
 * Inclui as inadimplentes de propósito — elas continuam cobrando e continuam
 * contando os ciclos em atraso até serem vendidas pela RN-037.
 */
export async function listarParaCiclo(idUsuario, conexao = null) {
  return consultarEm(
    conexao,
    `SELECT inv.id, inv.item_id, inv.current_value, inv.overdue_cycles, s.slug AS status,
            i.slug AS item_slug, i.name AS item_name, i.price,
            i.valuation_rate, i.valuation_floor_pct, i.valuation_cap_pct,
            i.upkeep_cost, i.income_per_cycle, i.counts_in_patrimony
       FROM inventory inv
       ${JOINS}
      WHERE inv.user_id = ? AND s.slug IN ('ativo', 'inadimplente')
      ORDER BY inv.id`,
    [idUsuario],
  );
}

/**
 * Aplica um ciclo de valorização ou depreciação na unidade (RN-034).
 *
 * A conta inteira mora na instrução, com o piso e o teto do próprio item: ler o
 * valor, calcular fora e gravar depois abriria a janela entre a leitura e a
 * escrita, que é onde dois ciclos simultâneos estouram o limite. O sinal vem de
 * `valuation_rate` — positivo valoriza, negativo deprecia —, e a referência do
 * piso e do teto é o que a unidade custou, não o preço de hoje na loja.
 */
export async function aplicarCicloDeValor(conexao, id) {
  const referencia = 'COALESCE(p.price_at_purchase, i.price)';
  const resultado = await consultarEm(
    conexao,
    `UPDATE inventory inv
       JOIN items i ON i.id = inv.item_id
       LEFT JOIN purchases p ON p.id = inv.purchase_id
        SET inv.current_value = LEAST(
              GREATEST(
                ROUND(inv.current_value * (1 + i.valuation_rate / 100)),
                FLOOR(${referencia} * i.valuation_floor_pct / 100)
              ),
              FLOOR(${referencia} * i.valuation_cap_pct / 100)
            )
      WHERE inv.id = ?`,
    [id],
  );
  return resultado.affectedRows;
}

/**
 * Marca a unidade como inadimplente e conta mais um ciclo em atraso (RN-037).
 * Chamada quando o saldo não cobriu o custo fixo — nunca vira dívida negativa,
 * o item é que fica devendo.
 */
export async function marcarInadimplente(conexao, id) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE inventory
        SET status_id = (SELECT id FROM inventory_statuses WHERE slug = 'inadimplente'),
            overdue_cycles = overdue_cycles + 1
      WHERE id = ?
        AND status_id IN (SELECT id FROM inventory_statuses WHERE slug IN ('ativo', 'inadimplente'))`,
    [id],
  );
  return resultado.affectedRows;
}

/** O jogador pagou o que devia: a unidade volta a ativa e o atraso zera. */
export async function regularizar(conexao, id) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE inventory
        SET status_id = (SELECT id FROM inventory_statuses WHERE slug = 'ativo'),
            overdue_cycles = 0
      WHERE id = ?
        AND status_id = (SELECT id FROM inventory_statuses WHERE slug = 'inadimplente')`,
    [id],
  );
  return resultado.affectedRows;
}

/**
 * As unidades que já passaram do limite de ciclos em atraso e a RN-037 manda
 * vender por 50%. Quem vende é o service — aqui só sai a lista.
 */
export async function listarInadimplentesVencidas(idUsuario, ciclosLimite, conexao = null) {
  return consultarEm(
    conexao,
    `SELECT inv.id, inv.item_id, inv.current_value, inv.overdue_cycles,
            i.slug AS item_slug, i.name AS item_name
       FROM inventory inv
       ${JOINS}
      WHERE inv.user_id = ? AND s.slug = 'inadimplente' AND inv.overdue_cycles >= ?
      ORDER BY inv.id`,
    [idUsuario, ciclosLimite],
  );
}

/**
 * A unidade escolhida pelo jogador, travada para uso.
 *
 * Diferente de `bloquearUnidadeAtivaDoItem`, que pega a mais antiga qualquer:
 * na troca do upgrade quem escolhe a unidade é o jogador. O dono entra no
 * `WHERE` para ninguém dar de entrada a casa de outro.
 */
export async function bloquearUnidadeAtiva(conexao, idUnidade, idUsuario) {
  const linhas = await consultarEm(
    conexao,
    `SELECT inv.id, inv.item_id, inv.current_value
       FROM inventory inv
       JOIN inventory_statuses s ON s.id = inv.status_id
      WHERE inv.id = ? AND inv.user_id = ? AND s.slug = 'ativo'
      FOR UPDATE`,
    [idUnidade, idUsuario],
  );
  return linhas[0] ?? null;
}
