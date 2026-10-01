import { consultar, consultarEm } from '../config/database.js';

/**
 * Carteira do jogador: mel (`coins`) e pólen (`points_total`).
 *
 * Regra estrutural do schema novo: **o livro é a verdade, a carteira é cache**.
 * Toda entrada e saída grava em `coin_ledger` ou `point_ledger` e atualiza a
 * carteira na mesma transação. `npm run db:reconcile` compara os dois lados —
 * se este arquivo escrever num só, a reconciliação acusa na hora.
 *
 * Por isso as funções de crédito e débito exigem uma conexão de transação: não
 * existe "só atualizar o saldo".
 */

export async function criar(idUsuario, conexao = null) {
  const resultado = await consultarEm(conexao, 'INSERT INTO wallets (user_id) VALUES (?)', [idUsuario]);
  return resultado.insertId;
}

export async function buscarPorUsuario(idUsuario) {
  const linhas = await consultar('SELECT id, user_id, coins, points_total FROM wallets WHERE user_id = ?', [
    idUsuario,
  ]);
  return linhas[0] ?? null;
}

/**
 * Nome de coluna e nome de tabela não podem virar `?`, então são os dois únicos
 * pedaços de SQL deste projeto montados por interpolação. As listas abaixo são o
 * que impede isso de um dia receber texto de fora: quem chamar com outra coisa
 * estoura na hora, em vez de a consulta ser montada com o que veio.
 */
const COLUNAS_DE_SALDO = new Set(['coins', 'points_total']);
const LIVROS = new Set(['coin_ledger', 'point_ledger']);

async function saldoAtual(conexao, idUsuario, coluna) {
  if (!COLUNAS_DE_SALDO.has(coluna)) throw new Error(`Coluna de saldo desconhecida: "${coluna}"`);

  const [linhas] = await conexao.execute(`SELECT ${coluna} AS saldo FROM wallets WHERE user_id = ?`, [
    idUsuario,
  ]);
  return linhas[0]?.saldo ?? 0;
}

/**
 * O motivo entra por `SELECT ... FROM reward_reasons WHERE slug = ?`, então um
 * slug que não existe faz o `INSERT` gravar zero linhas em vez de estourar.
 * Silêncio aqui seria o pior desfecho possível: o saldo já foi mexido, o livro
 * ficaria sem o lançamento, e a divergência só apareceria no `db:reconcile`
 * dias depois, sem pista de origem. Por isso a checagem vira erro — dentro de
 * `emTransacao`, o rollback leva o crédito junto e a carteira não mente.
 */
async function lancar(conexao, tabela, { idUsuario, valor, motivo, referenciaTipo, referenciaId, saldoDepois }) {
  if (!LIVROS.has(tabela)) throw new Error(`Livro desconhecido: "${tabela}"`);

  const [resultado] = await conexao.execute(
    `INSERT INTO ${tabela} (user_id, amount, reason_id, reference_type, reference_id, balance_after)
     SELECT ?, ?, r.id, ?, ?, ? FROM reward_reasons r WHERE r.slug = ?`,
    [idUsuario, valor, referenciaTipo, referenciaId, saldoDepois, motivo],
  );

  if (resultado.affectedRows === 0) {
    throw new Error(`Motivo de recompensa desconhecido: "${motivo}". Nenhum lançamento foi gravado em ${tabela}.`);
  }
}

/**
 * Debita mel só se houver saldo — o `WHERE coins >= ?` faz a checagem e o
 * desconto na mesma instrução, então dois débitos simultâneos do mesmo usuário
 * nunca deixam o saldo negativo (a CHECK da tabela é a rede final; esta
 * consulta evita depender só dela). Devolve 0 quando falta saldo.
 */
export async function debitarMel(conexao, { idUsuario, quantidade, motivo, referenciaTipo = null, referenciaId = null }) {
  const [resultado] = await conexao.execute(
    'UPDATE wallets SET coins = coins - ? WHERE user_id = ? AND coins >= ?',
    [quantidade, idUsuario, quantidade],
  );
  if (resultado.affectedRows === 0) return 0;

  const saldo = await saldoAtual(conexao, idUsuario, 'coins');
  await lancar(conexao, 'coin_ledger', {
    idUsuario,
    valor: -quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
    saldoDepois: saldo,
  });

  return resultado.affectedRows;
}

export async function creditarMel(conexao, { idUsuario, quantidade, motivo, referenciaTipo = null, referenciaId = null }) {
  await conexao.execute('UPDATE wallets SET coins = coins + ? WHERE user_id = ?', [quantidade, idUsuario]);

  const saldo = await saldoAtual(conexao, idUsuario, 'coins');
  await lancar(conexao, 'coin_ledger', {
    idUsuario,
    valor: quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
    saldoDepois: saldo,
  });

  return saldo;
}

export async function creditarPolen(conexao, { idUsuario, quantidade, motivo, referenciaTipo = null, referenciaId = null }) {
  await conexao.execute('UPDATE wallets SET points_total = points_total + ? WHERE user_id = ?', [
    quantidade,
    idUsuario,
  ]);

  const saldo = await saldoAtual(conexao, idUsuario, 'points_total');
  await lancar(conexao, 'point_ledger', {
    idUsuario,
    valor: quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
    saldoDepois: saldo,
  });

  return saldo;
}
