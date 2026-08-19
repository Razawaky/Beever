#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

import { env } from '../src/config/env.js';
import { separarComandos } from './migrate.js';

/**
 * Dados de desenvolvimento.
 *
 * O seed é um runner, não um script de INSERTs: o conteúdo mora em
 * `scripts/seeds/*.sql`, aplicado em ordem lexical. Assim o dado de exemplo
 * fica separado do schema (migration nunca carrega seed) e continua legível
 * como SQL, que é a linguagem em que ele é discutido.
 *
 * Idempotente: os catálogos usam ON DUPLICATE KEY UPDATE sobre chave natural, e
 * as contas de demonstração são recriadas do zero a cada execução. Rodar duas
 * vezes seguidas deixa o banco no mesmo estado — inclusive os livros, que sem
 * isso dobrariam e quebrariam a reconciliação.
 *
 * Nunca em produção: as senhas abaixo são públicas.
 */

const CUSTO_BCRYPT = 10;
const diretorioSeeds = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seeds');

const CONTAS = {
  admin: { email: 'admin@beever.dev', senha: 'admin1234', rotulo: 'admin' },
  demo: { email: 'ana@beever.dev', senha: 'beever123', rotulo: 'comum' },
};

// Conferido depois do seed: prova que o dado de exemplo cobre o que a etapa
// pede — trilha, economia, metas e sequência, não só tabelas de domínio.
const CONTAGENS = [
  ['levels', 'níveis'],
  ['age_bands', 'faixas de idade'],
  ['game_types', 'tipos de jogo'],
  ['reward_configs', 'configurações de recompensa'],
  ['reward_modifiers', 'fatores de recompensa'],
  ['items', 'itens do catálogo'],
  ['item_requirements', 'requisitos de compra'],
  ['hives', 'favos'],
  ['cells', 'células'],
  ['contents', 'conteúdos'],
  ['users', 'usuários'],
  ['cell_progress', 'células concluídas pelo demo'],
  ['goals', 'metas'],
  ['tasks', 'tarefas'],
  ['inventory', 'itens no inventário'],
];

export async function listarSeeds(diretorio = diretorioSeeds) {
  const arquivos = await readdir(diretorio);
  return arquivos.filter((nome) => nome.endsWith('.sql')).sort();
}

async function aplicar(conexao, diretorio, arquivo) {
  const sql = await readFile(path.join(diretorio, arquivo), 'utf8');

  await conexao.beginTransaction();
  try {
    for (const comando of separarComandos(sql)) {
      await conexao.query(comando);
    }
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw new Error(`Falha no seed ${arquivo}: ${erro.message}`, { cause: erro });
  }
}

async function contar(conexao) {
  const resumo = {};
  for (const [tabela, rotulo] of CONTAGENS) {
    const [linhas] = await conexao.query(`SELECT COUNT(*) AS total FROM \`${tabela}\``);
    resumo[rotulo] = linhas[0].total;
  }
  return resumo;
}

export async function semear({ diretorio = diretorioSeeds, conexao } = {}) {
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
    // bcrypt não roda em SQL, então os hashes entram como variável de sessão e
    // o arquivo 06 os consome. Melhor do que hash fixo no arquivo, que
    // esconderia qual é a senha.
    await conn.query('SET @admin_hash = ?, @demo_hash = ?', [
      await bcrypt.hash(CONTAS.admin.senha, CUSTO_BCRYPT),
      await bcrypt.hash(CONTAS.demo.senha, CUSTO_BCRYPT),
    ]);

    const arquivos = await listarSeeds(diretorio);
    for (const arquivo of arquivos) {
      await aplicar(conn, diretorio, arquivo);
    }

    return { arquivos, resumo: await contar(conn) };
  } finally {
    if (propria) await conn.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (env.producao) {
    console.error('O seed não pode ser executado com NODE_ENV=production.');
    process.exit(1);
  }

  try {
    const { arquivos, resumo } = await semear();
    arquivos.forEach((arquivo) => console.log(`Aplicado: ${arquivo}`));

    console.log('\nEstado do banco depois do seed:');
    console.table(resumo);

    console.log('Contas de desenvolvimento:');
    Object.values(CONTAS).forEach((conta) => console.log(`  [${conta.rotulo}] ${conta.email} / ${conta.senha}`));
    console.log('\nConfira os saldos com: npm run db:reconcile');
    process.exit(0);
  } catch (erro) {
    console.error(`Falha no seed: ${erro.message}`);
    process.exit(1);
  }
}
