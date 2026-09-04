#!/usr/bin/env node
import { fileURLToPath } from 'node:url';

import mysql from 'mysql2/promise';

import { env } from '../src/config/env.js';

/**
 * Confere se o saldo em cache bate com a soma dos livros.
 *
 * O modelo tem duas representações do mesmo número de propósito: o livro
 * (append-only, é a verdade) e o cache em `wallets` / `user_levels` (é
 * performance). Toda operação atualiza os dois na mesma transação — mas "é para
 * atualizar" não é prova. Este script é a prova, e é o que a etapa E01 exige
 * como critério de aceite.
 *
 * Só lê. Nunca corrige nada sozinho: divergência de saldo é incidente para
 * investigar, não para o script decidir qual dos dois lados está certo.
 *
 * Sai com código 1 se achar divergência, para poder virar passo de CI.
 */

const CONFERENCIAS = [
  {
    nome: 'mel (wallets.coins x coin_ledger)',
    sql: `
      SELECT w.user_id, w.coins AS cache, COALESCE(SUM(l.amount), 0) AS livro
        FROM wallets w
        LEFT JOIN coin_ledger l ON l.user_id = w.user_id
       GROUP BY w.user_id, w.coins
      HAVING w.coins <> COALESCE(SUM(l.amount), 0)`,
  },
  {
    nome: 'pólen (wallets.points_total x point_ledger)',
    sql: `
      SELECT w.user_id, w.points_total AS cache, COALESCE(SUM(l.amount), 0) AS livro
        FROM wallets w
        LEFT JOIN point_ledger l ON l.user_id = w.user_id
       GROUP BY w.user_id, w.points_total
      HAVING w.points_total <> COALESCE(SUM(l.amount), 0)`,
  },
  {
    nome: 'XP (user_levels.xp_total x xp_ledger)',
    sql: `
      SELECT u.user_id, u.xp_total AS cache, COALESCE(SUM(l.amount), 0) AS livro
        FROM user_levels u
        LEFT JOIN xp_ledger l ON l.user_id = u.user_id
       GROUP BY u.user_id, u.xp_total
      HAVING u.xp_total <> COALESCE(SUM(l.amount), 0)`,
  },
  {
    nome: 'cofre (vaults.balance x vault_transactions)',
    sql: `
      SELECT v.user_id, v.balance AS cache, COALESCE(SUM(t.amount), 0) AS livro
        FROM vaults v
        LEFT JOIN vault_transactions t ON t.user_id = v.user_id
       GROUP BY v.user_id, v.balance
      HAVING v.balance <> COALESCE(SUM(t.amount), 0)`,
  },
  {
    // RN-003: o nível é derivado do XP pela tabela `levels`. Se o cache disser
    // um nível que a curva não sustenta, alguém calculou por fórmula em algum
    // lugar — que é exatamente o que a regra proíbe.
    nome: 'nível (user_levels.level x curva de levels)',
    sql: `
      SELECT ul.user_id, ul.level AS cache,
             (SELECT MAX(l.level) FROM levels l WHERE l.required_xp <= ul.xp_total) AS livro
        FROM user_levels ul
       HAVING cache <> livro`,
  },
  {
    // xp_next_level é cópia do degrau seguinte da curva, guardada para a barra
    // de progresso não fazer mais um join por página. Cópia que não confere é
    // barra de progresso mentindo para a criança.
    nome: 'próximo nível (user_levels.xp_next_level x curva de levels)',
    sql: `
      SELECT ul.user_id, ul.xp_next_level AS cache,
             COALESCE((SELECT MIN(l.required_xp) FROM levels l WHERE l.required_xp > ul.xp_total), 0) AS livro
        FROM user_levels ul
       HAVING cache <> livro`,
  },
  {
    // hive_progress é desnormalização declarada: a verdade é cell_progress.
    // Sem esta conferência, a trilha pode mostrar um favo concluído que não
    // está — e liberar o favo seguinte por engano (RN-027).
    nome: 'progresso do favo (hive_progress x cell_progress)',
    sql: `
      SELECT hp.user_id, hp.hive_id, hp.completed_cells AS cache,
             (SELECT COUNT(*)
                FROM cell_progress cp
                JOIN cells c ON c.id = cp.cell_id
               WHERE cp.user_id = hp.user_id
                 AND c.hive_id = hp.hive_id
                 AND cp.first_completed_at IS NOT NULL) AS livro
        FROM hive_progress hp
       HAVING cache <> livro`,
  },
];

export async function reconciliar({ conexao } = {}) {
  const propria = !conexao;
  const conn =
    conexao ??
    (await mysql.createConnection({
      host: env.banco.host,
      port: env.banco.porta,
      user: env.banco.usuario,
      password: env.banco.senha,
      database: env.banco.nome,
      multipleStatements: false,
    }));

  const resultado = [];
  try {
    for (const conferencia of CONFERENCIAS) {
      const [linhas] = await conn.query(conferencia.sql);
      resultado.push({ nome: conferencia.nome, divergencias: linhas });
    }
  } finally {
    if (propria) await conn.end();
  }

  return resultado;
}

export function contarDivergencias(resultado) {
  return resultado.reduce((total, item) => total + item.divergencias.length, 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const resultado = await reconciliar();

    for (const item of resultado) {
      if (item.divergencias.length === 0) {
        console.log(`OK  ${item.nome}`);
        continue;
      }
      console.error(`FALHA  ${item.nome} — ${item.divergencias.length} usuário(s) divergente(s):`);
      console.table(item.divergencias);
    }

    const total = contarDivergencias(resultado);
    if (total === 0) {
      console.log('\nLivros e saldos em cache batem.');
      process.exit(0);
    }

    console.error(`\n${total} divergência(s). O livro é a verdade — investigue antes de corrigir o cache.`);
    process.exit(1);
  } catch (erro) {
    console.error(`Falha na reconciliação: ${erro.message}`);
    process.exit(1);
  }
}
