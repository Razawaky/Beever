import { consultar, consultarEm } from '../config/database.js';
import { limiteSeguro } from '../utils/limite.js';

/**
 * `vaults` e `vault_transactions` — o cofre do jogador e o extrato dele.
 *
 * O cofre é uma linha por jogador, com o saldo e a taxa de rendimento própria
 * (RN-042: 2% por ciclo, configurável em banco). O extrato é uma linha por
 * movimento, e cada uma guarda o saldo que ficou depois dela — quem lê o
 * extrato não precisa somar nada para conferir.
 *
 * Nenhuma função aqui abre transação: quem controla a transação é o service,
 * porque depósito e saque só fazem sentido junto com o movimento na carteira.
 */

const CAMPOS = `id, user_id, balance, interest_rate, goal_amount, goal_due_at, created_at, updated_at`;

/** Cria o cofre zerado de quem ainda não tem. Quem já tem fica como está. */
export async function criarSeNaoExistir(idUsuario, conexao = null) {
  await consultarEm(conexao, 'INSERT IGNORE INTO vaults (user_id) VALUES (?)', [idUsuario]);
  return buscarPorUsuario(idUsuario, conexao);
}

export async function buscarPorUsuario(idUsuario, conexao = null) {
  const linhas = await consultarEm(conexao, `SELECT ${CAMPOS} FROM vaults WHERE user_id = ?`, [idUsuario]);
  return linhas[0] ?? null;
}

/**
 * Tranca o cofre até o fim da transação. Depósito e saque leem o saldo antes de
 * gravar o movimento, e sem a trava duas requisições simultâneas gravariam dois
 * extratos com o mesmo `balance_after`.
 */
export async function bloquearPorUsuario(conexao, idUsuario) {
  const linhas = await consultarEm(conexao, `SELECT ${CAMPOS} FROM vaults WHERE user_id = ? FOR UPDATE`, [
    idUsuario,
  ]);
  return linhas[0] ?? null;
}

/** Põe mel no cofre. Serve ao depósito, ao rendimento do ciclo e ao bônus da meta. */
export async function creditar(conexao, idUsuario, valor) {
  const resultado = await consultarEm(
    conexao,
    'UPDATE vaults SET balance = balance + ? WHERE user_id = ?',
    [valor, idUsuario],
  );
  return resultado.affectedRows;
}

/**
 * Tira mel do cofre, e só se houver. O `WHERE balance >= ?` faz a checagem e a
 * gravação na mesma instrução, igual ao `debitarMel` da carteira: zero linhas
 * afetadas quer dizer saldo insuficiente, nunca saldo negativo.
 */
export async function debitar(conexao, idUsuario, valor) {
  const resultado = await consultarEm(
    conexao,
    'UPDATE vaults SET balance = balance - ? WHERE user_id = ? AND balance >= ?',
    [valor, idUsuario, valor],
  );
  return resultado.affectedRows;
}

/**
 * Grava o movimento no extrato. `saldoDepois` é passado por quem já mexeu no
 * saldo na mesma transação — o extrato precisa contar o que o cofre viu, não o
 * que uma leitura posterior encontraria.
 */
export async function registrarTransacao(conexao, { idUsuario, tipo, valor, saldoDepois }) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO vault_transactions (user_id, transaction_type_id, amount, balance_after)
     VALUES (?, (SELECT id FROM vault_transaction_types WHERE slug = ?), ?, ?)`,
    [idUsuario, tipo, valor, saldoDepois],
  );
  return resultado.insertId;
}

export async function listarTransacoes(idUsuario, limite = 50) {
  return consultar(
    `SELECT t.id, t.amount, t.balance_after, t.created_at,
            tt.slug AS tipo, tt.name AS tipo_nome
       FROM vault_transactions t
       JOIN vault_transaction_types tt ON tt.id = t.transaction_type_id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ${limiteSeguro(limite)}`,
    [idUsuario],
  );
}

/**
 * `created_at` guarda segundo cheio, sem fração. Cortar o instante para baixo
 * evita perder o saque gravado no mesmo segundo do corte, que é o erro que
 * some em teste e aparece em produção.
 */
function noSegundoCheio(instante) {
  if (!(instante instanceof Date)) return instante;

  const cortado = new Date(instante);
  cortado.setMilliseconds(0);
  return cortado;
}

/**
 * Quanto o jogador sacou desde um instante. É o que a RN-043 pede: o mel sacado
 * no ciclo não rende naquele ciclo, e para descontá-lo é preciso saber quanto
 * saiu depois do último processamento.
 */
export async function totalSacadoDesde(idUsuario, desde, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    `SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM vault_transactions t
       JOIN vault_transaction_types tt ON tt.id = t.transaction_type_id
      WHERE t.user_id = ? AND tt.slug = 'saque' AND t.created_at >= ?`,
    [idUsuario, noSegundoCheio(desde)],
  );
  return Number(linhas[0]?.total ?? 0);
}

/** Define ou apaga a meta do cofre (RN-044). Meta apagada é os dois campos nulos. */
export async function definirMeta(conexao, idUsuario, { valor = null, prazo = null } = {}) {
  const resultado = await consultarEm(
    conexao,
    'UPDATE vaults SET goal_amount = ?, goal_due_at = ? WHERE user_id = ?',
    [valor, prazo, idUsuario],
  );
  return resultado.affectedRows;
}
