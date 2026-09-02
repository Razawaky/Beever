#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from '../src/config/env.js';

/**
 * Restaura o banco a partir de um dump de `backups/` (RNF-19).
 *
 * O backup só vale se voltar, e é este script que prova isso. Ele apaga as
 * tabelas que o dump traz, então tem as mesmas guardas do reset: recusa
 * produção e exige confirmação explícita.
 *
 * A senha vai por `MYSQL_PWD`, nunca na linha de comando.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const diretorioBackups = path.join(raiz, 'backups');
const CONFIRMACAO = '--sim';
const CONTAINER_COMPOSE = process.env.BACKUP_CONTAINER ?? 'mysql';

export function podeExecutar({ producao, argumentos, nomeBanco }) {
  if (producao) {
    return {
      permitido: false,
      motivo: 'A restauração não pode ser executada com NODE_ENV=production.',
    };
  }

  if (!argumentos.includes(CONFIRMACAO)) {
    return {
      permitido: false,
      motivo:
        `Isto sobrescreve as tabelas do banco "${nomeBanco}" com o conteúdo do dump.\n` +
        `Se for isso mesmo, rode: npm run db:restore -- ${CONFIRMACAO} [arquivo.sql]`,
    };
  }

  return { permitido: true, motivo: null };
}

/** Sem arquivo pedido, restaura o dump mais recente da pasta. */
export function escolherArquivo(nomes, pedido = null) {
  const dumps = nomes.filter((nome) => nome.endsWith('.sql')).sort();

  if (pedido) {
    if (!dumps.includes(pedido)) {
      throw new Error(`O arquivo "${pedido}" não existe em backups/.`);
    }
    return pedido;
  }

  if (dumps.length === 0) {
    throw new Error('Não há nenhum dump em backups/. Rode npm run db:backup antes.');
  }

  return dumps[dumps.length - 1];
}

/** Usa o cliente da máquina; se não houver, o do contêiner do compose. */
async function escolherComando() {
  const existeLocal = await new Promise((resolve) => {
    const teste = spawn('mysql', ['--version'], { stdio: 'ignore' });
    teste.on('error', () => resolve(false));
    teste.on('close', (codigo) => resolve(codigo === 0));
  });

  if (existeLocal) {
    return {
      comando: 'mysql',
      argumentos: [
        `--host=${env.banco.host}`,
        `--port=${env.banco.porta}`,
        `--user=${env.banco.usuario}`,
        `--database=${env.banco.nome}`,
      ],
    };
  }

  return {
    comando: 'docker',
    argumentos: [
      'compose',
      'exec',
      '-T',
      '-e',
      `MYSQL_PWD=${env.banco.senha}`,
      CONTAINER_COMPOSE,
      'mysql',
      `--user=${env.banco.usuario}`,
      `--database=${env.banco.nome}`,
    ],
  };
}

export async function restaurar(nomeArquivo) {
  const origem = path.join(diretorioBackups, nomeArquivo);

  const info = await stat(origem);
  if (info.size === 0) {
    throw new Error(`O dump "${nomeArquivo}" está vazio — não há o que restaurar.`);
  }

  const { comando, argumentos } = await escolherComando();

  await new Promise((resolve, reject) => {
    const processo = spawn(comando, argumentos, {
      cwd: raiz,
      env: { ...process.env, MYSQL_PWD: env.banco.senha },
    });

    let erro = '';
    createReadStream(origem).pipe(processo.stdin);
    processo.stderr.on('data', (pedaco) => {
      erro += pedaco.toString();
    });

    processo.on('error', reject);
    processo.on('close', (codigo) => {
      if (codigo === 0) return resolve();
      reject(new Error(`mysql terminou com código ${codigo}: ${erro.trim()}`));
    });
  });

  return { origem, bytes: info.size };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argumentos = process.argv.slice(2);

  const { permitido, motivo } = podeExecutar({
    producao: env.producao,
    argumentos,
    nomeBanco: env.banco.nome,
  });

  if (!permitido) {
    console.error(motivo);
    process.exit(1);
  }

  try {
    const pedido = argumentos.find((argumento) => argumento.endsWith('.sql')) ?? null;
    const escolhido = escolherArquivo(await readdir(diretorioBackups), pedido);
    const { bytes } = await restaurar(escolhido);
    console.log(`Banco "${env.banco.nome}" restaurado de ${escolhido} (${Math.round(bytes / 1024)} KB).`);
    process.exit(0);
  } catch (erro) {
    console.error(`Falha na restauração: ${erro.message}`);
    process.exit(1);
  }
}
