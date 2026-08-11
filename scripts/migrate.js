#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import mysql from 'mysql2/promise';

import { env } from '../src/config/env.js';

/**
 * Runner de migrations. Sem ORM: schema muda só por script versionado em
 * `migrations/`, nunca ALTER manual. Aplica os arquivos em ordem alfabética e
 * anota em `schema_migrations` o que já rodou, então rodar de novo é seguro.
 *
 * Atenção: CREATE/ALTER TABLE faz o MySQL commitar sozinho no meio da
 * transação, então uma migration que falha no meio pode deixar tabela
 * criada. Mantenha cada arquivo pequeno.
 */

const diretorioMigrations = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const TABELA_CONTROLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    versao      VARCHAR(255) NOT NULL,
    aplicada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (versao)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

/**
 * Divide o arquivo em comandos individuais. O driver só aceita múltiplos
 * comandos em uma chamada quando `multipleStatements` está ligado, o que
 * preferimos evitar; então separamos aqui, ignorando comentários.
 */
export function separarComandos(sql) {
  return sql
    .split('\n')
    .filter((linha) => !linha.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((comando) => comando.trim())
    .filter((comando) => comando.length > 0);
}

export async function listarMigrations(diretorio = diretorioMigrations) {
  const arquivos = await readdir(diretorio);
  return arquivos.filter((nome) => nome.endsWith('.sql')).sort();
}

async function aplicar(conexao, diretorio, arquivo) {
  const sql = await readFile(path.join(diretorio, arquivo), 'utf8');
  const comandos = separarComandos(sql);

  await conexao.beginTransaction();
  try {
    for (const comando of comandos) {
      await conexao.query(comando);
    }
    await conexao.query('INSERT INTO schema_migrations (versao) VALUES (?)', [arquivo]);
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw new Error(`Falha na migration ${arquivo}: ${erro.message}`, { cause: erro });
  }
}

export async function migrar({ diretorio = diretorioMigrations, conexao } = {}) {
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

  const aplicadas = [];
  try {
    await conn.query(TABELA_CONTROLE);
    const [linhas] = await conn.query('SELECT versao FROM schema_migrations');
    const jaAplicadas = new Set(linhas.map((linha) => linha.versao));

    for (const arquivo of await listarMigrations(diretorio)) {
      if (jaAplicadas.has(arquivo)) continue;
      await aplicar(conn, diretorio, arquivo);
      aplicadas.push(arquivo);
    }
  } finally {
    if (propria) await conn.end();
  }

  return aplicadas;
}

// Só executa quando chamado pela linha de comando, não quando importado nos testes.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const aplicadas = await migrar();
    if (aplicadas.length === 0) {
      console.log('Nenhuma migration pendente. Banco já está atualizado.');
    } else {
      aplicadas.forEach((arquivo) => console.log(`Aplicada: ${arquivo}`));
      console.log(`\n${aplicadas.length} migration(s) aplicada(s).`);
    }
    process.exit(0);
  } catch (erro) {
    console.error(erro.message);
    process.exit(1);
  }
}
