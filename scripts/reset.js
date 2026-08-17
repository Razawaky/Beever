#!/usr/bin/env node
import { fileURLToPath } from 'node:url';

import mysql from 'mysql2/promise';

import { env } from '../src/config/env.js';

/**
 * Apaga todas as tabelas do banco configurado, para recriá-lo do zero com
 * `npm run db:migrate`.
 *
 * Existe por um motivo concreto: quando uma migration já aplicada precisa
 * mudar, o runner se recusa a seguir (checksum) — e em desenvolvimento a saída
 * certa é recriar o banco, não remendar à mão.
 *
 * Só desenvolvimento, e só com confirmação explícita. Não faz backup: quem
 * roda isto está dizendo que os dados são descartáveis.
 */

const CONFIRMACAO = '--sim';

export function podeExecutar({ producao, argumentos, nomeBanco }) {
  if (producao) {
    return { permitido: false, motivo: 'O reset não pode ser executado com NODE_ENV=production.' };
  }

  if (!argumentos.includes(CONFIRMACAO)) {
    return {
      permitido: false,
      motivo:
        `Isto apaga TODAS as tabelas do banco "${nomeBanco}", sem backup.\n` +
        `Se for isso mesmo, rode: npm run db:reset -- ${CONFIRMACAO}`,
    };
  }

  return { permitido: true, motivo: null };
}

async function listarTabelas(conexao) {
  const [linhas] = await conexao.query(
    'SELECT table_name AS nome FROM information_schema.tables WHERE table_schema = DATABASE()',
  );
  return linhas.map((linha) => linha.nome);
}

export async function resetar({ conexao } = {}) {
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

  try {
    const tabelas = await listarTabelas(conn);
    if (tabelas.length === 0) return [];

    // Sem isto, a ordem de exclusão importaria por causa das foreign keys.
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const tabela of tabelas) {
        await conn.query(`DROP TABLE IF EXISTS \`${tabela}\``);
      }
    } finally {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    return tabelas;
  } finally {
    if (propria) await conn.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { permitido, motivo } = podeExecutar({
    producao: env.producao,
    argumentos: process.argv.slice(2),
    nomeBanco: env.banco.nome,
  });

  if (!permitido) {
    console.error(motivo);
    process.exit(1);
  }

  try {
    const removidas = await resetar();
    console.log(`Banco "${env.banco.nome}" limpo: ${removidas.length} tabela(s) removida(s).`);
    console.log('Próximo passo: npm run db:migrate && npm run db:seed');
    process.exit(0);
  } catch (erro) {
    console.error(`Falha no reset: ${erro.message}`);
    process.exit(1);
  }
}
