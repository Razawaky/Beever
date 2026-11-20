import mysql from 'mysql2/promise';

import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Pool de conexões MySQL — singleton do processo inteiro.
 *
 * O código antigo abria e fechava uma conexão por consulta, o que não sustenta
 * os 30 usuários simultâneos exigidos. Aqui a conexão é emprestada do pool e
 * devolvida automaticamente ao fim de cada `query`.
 */
export const pool = mysql.createPool({
  host: env.banco.host,
  port: env.banco.porta,
  user: env.banco.usuario,
  password: env.banco.senha,
  database: env.banco.nome,
  waitForConnections: true,
  connectionLimit: env.banco.limitePool,
  queueLimit: 0,
  // Mesma collation do schema (migrations/README.md). Divergir aqui produz
  // "Illegal mix of collations" em join com literal, que é um erro difícil de
  // ler para um bug que não existe.
  charset: 'utf8mb4_0900_ai_ci',
  timezone: 'Z',
  // Garante que TODA consulta parametrizada use prepared statements de verdade.
  namedPlaceholders: false,
});

/**
 * Executa uma consulta parametrizada e devolve apenas as linhas.
 * `pool.execute` usa prepared statements; nunca concatene SQL com dados.
 */
export async function consultar(sql, parametros = []) {
  const [linhas] = await pool.execute(sql, parametros);
  return linhas;
}

/**
 * Mesma coisa, mas dentro de uma transação quando houver conexão.
 *
 * Existe para o repository poder ser chamado dos dois jeitos — solto ou dentro
 * de `emTransacao` — sem duplicar cada função. Sem isso, criar uma conta
 * (usuário + perfil + carteira + nível) não teria como ser tudo ou nada.
 */
export async function consultarEm(conexao, sql, parametros = []) {
  if (!conexao) return consultar(sql, parametros);
  const [linhas] = await conexao.execute(sql, parametros);
  return linhas;
}

/**
 * Executa várias operações dentro de uma transação. Recebe um callback que usa
 * a conexão emprestada; faz commit no sucesso e rollback em qualquer erro.
 *
 * Usado pelos repositories em operações que precisam ser atômicas — comprar um
 * item debita moedas, grava a compra e atualiza o inventário de uma vez só.
 */
export async function emTransacao(callback) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const resultado = await callback(conexao);
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

/** Fecha o pool. Chamado apenas no desligamento da aplicação. */
export async function fecharPool() {
  await pool.end();
  logger.info('Pool de conexões MySQL encerrado');
}
