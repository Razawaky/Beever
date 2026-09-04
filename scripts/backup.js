#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from '../src/config/env.js';

/**
 * Backup do banco (RNF-19).
 *
 * Gera um dump completo em `backups/`, com data e hora no nome, e descarta os
 * mais antigos que o período de retenção. Diferente do reset e do seed, este
 * script **pode e deve** rodar em produção — é lá que ele importa.
 *
 * A senha vai por `MYSQL_PWD` no ambiente do processo filho, nunca na linha de
 * comando: argumento de processo é visível para qualquer usuário da máquina.
 *
 * Periodicidade recomendada, documentada em iniciar-proj.md: diária, fora do
 * horário de uso, com retenção de 7 dias.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const diretorioBackups = path.join(raiz, 'backups');
const DIAS_DE_RETENCAO = Number(process.env.BACKUP_RETENCAO_DIAS ?? 7);
const CONTAINER_COMPOSE = process.env.BACKUP_CONTAINER ?? 'mysql';

function carimboDeTempo(agora = new Date()) {
  const doisDigitos = (numero) => String(numero).padStart(2, '0');
  return [
    agora.getFullYear(),
    doisDigitos(agora.getMonth() + 1),
    doisDigitos(agora.getDate()),
    '-',
    doisDigitos(agora.getHours()),
    doisDigitos(agora.getMinutes()),
  ].join('');
}

/** Descobre se existe `mysqldump` na máquina; senão, usa o do contêiner. */
async function escolherComando() {
  const existeLocal = await new Promise((resolve) => {
    const teste = spawn('mysqldump', ['--version'], { stdio: 'ignore' });
    teste.on('error', () => resolve(false));
    teste.on('close', (codigo) => resolve(codigo === 0));
  });

  const argumentosDump = [
    `--host=${env.banco.host}`,
    `--port=${env.banco.porta}`,
    `--user=${env.banco.usuario}`,
    '--single-transaction',
    '--routines',
    '--events',
    '--triggers',
    env.banco.nome,
  ];

  if (existeLocal) return { comando: 'mysqldump', argumentos: argumentosDump };

  // Sem cliente local: o dump sai de dentro do contêiner do compose, onde o
  // banco é sempre localhost.
  return {
    comando: 'docker',
    argumentos: [
      'compose',
      'exec',
      '-T',
      '-e',
      `MYSQL_PWD=${env.banco.senha}`,
      CONTAINER_COMPOSE,
      'mysqldump',
      `--user=${env.banco.usuario}`,
      '--single-transaction',
      '--routines',
      '--events',
      '--triggers',
      env.banco.nome,
    ],
  };
}

// Só o que a rotina cria: `beever-AAAAMMDD-HHMM.sql`. Dump guardado à mão, com
// outro nome, é marco que alguém quis manter — a retenção não encosta nele.
const NOME_AUTOMATICO = /^beever-\d{8}-\d{4}\.sql$/;

export function ehBackupAntigo(nomeArquivo, modificadoEm, agora = Date.now(), dias = DIAS_DE_RETENCAO) {
  if (!NOME_AUTOMATICO.test(nomeArquivo)) return false;
  const idadeEmDias = (agora - modificadoEm) / (1000 * 60 * 60 * 24);
  return idadeEmDias > dias;
}

async function limparAntigos() {
  const removidos = [];
  for (const nome of await readdir(diretorioBackups)) {
    const caminho = path.join(diretorioBackups, nome);
    const info = await stat(caminho);
    if (ehBackupAntigo(nome, info.mtimeMs)) {
      await unlink(caminho);
      removidos.push(nome);
    }
  }
  return removidos;
}

export async function gerarBackup() {
  await mkdir(diretorioBackups, { recursive: true });

  const destino = path.join(diretorioBackups, `beever-${carimboDeTempo()}.sql`);
  const { comando, argumentos } = await escolherComando();

  await new Promise((resolve, reject) => {
    const arquivo = createWriteStream(destino);
    const processo = spawn(comando, argumentos, {
      cwd: raiz,
      env: { ...process.env, MYSQL_PWD: env.banco.senha },
    });

    let erro = '';
    processo.stdout.pipe(arquivo);
    processo.stderr.on('data', (pedaco) => {
      erro += pedaco.toString();
    });

    processo.on('error', reject);
    processo.on('close', (codigo) => {
      arquivo.end();
      if (codigo === 0) return resolve();
      reject(new Error(`mysqldump terminou com código ${codigo}: ${erro.trim()}`));
    });
  });

  const info = await stat(destino);
  if (info.size === 0) {
    throw new Error('O dump saiu vazio — nada foi salvo que preste. Confira as credenciais e o banco.');
  }

  return { destino, bytes: info.size, removidos: await limparAntigos() };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { destino, bytes, removidos } = await gerarBackup();
    console.log(`Backup gravado: ${path.relative(raiz, destino)} (${Math.round(bytes / 1024)} KB)`);
    if (removidos.length > 0) {
      console.log(`Removidos por retenção (${DIAS_DE_RETENCAO} dias): ${removidos.join(', ')}`);
    }
    process.exit(0);
  } catch (erro) {
    console.error(`Falha no backup: ${erro.message}`);
    process.exit(1);
  }
}
