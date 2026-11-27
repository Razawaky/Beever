import mysql from 'mysql2/promise';

import { env } from '../../src/config/env.js';
import { migrar } from '../../scripts/migrate.js';
import { semear } from '../../scripts/seed.js';

/**
 * Arnês de banco para os testes de integração.
 *
 * Cria um banco descartável, aplica as migrations e o seed, entrega a conexão
 * e derruba tudo no fim. O banco de desenvolvimento nunca é tocado: os testes
 * escrevem em `beever_teste`, não em `beever`.
 *
 * Por que existe: até a E01 inteira, a prova de que o banco recusa dado
 * inválido era eu digitando comandos no terminal. Prova que não se repete
 * sozinha vira folclore na semana seguinte.
 *
 * Este arquivo lê `process.env` direto, o que o resto do projeto não faz. É de
 * propósito: criar e apagar banco exige credencial de root, e a aplicação não
 * deve nem saber que ela existe — por isso não passa por `src/config/env.js`.
 */

const NOME_BANCO_TESTE = process.env.DB_TEST_NAME ?? 'beever_teste';
const SENHA_ROOT = process.env.DB_ROOT_PASSWORD ?? 'root';
const OBRIGATORIO = process.env.TESTES_DE_BANCO === '1';

function conexaoRoot(banco) {
  return mysql.createConnection({
    host: env.banco.host,
    port: env.banco.porta,
    user: 'root',
    password: SENHA_ROOT,
    database: banco,
    multipleStatements: false,
  });
}

/**
 * Diz se dá para rodar os testes de banco.
 *
 * Sem MySQL no ar, o padrão é pular com aviso: quem acabou de clonar o projeto
 * não merece um erro incompreensível. Com `TESTES_DE_BANCO=1` — como o CI vai
 * rodar — a ausência do banco vira falha, para ninguém entregar código sem
 * que o banco tenha sido exercitado.
 */
export async function motivoParaPular() {
  try {
    const conexao = await conexaoRoot(undefined);
    await conexao.end();
    return null;
  } catch (erro) {
    if (OBRIGATORIO) {
      throw new Error(
        `TESTES_DE_BANCO=1 exige MySQL no ar, e a conexão falhou: ${erro.message}\n` +
          'Suba o banco com "docker compose up -d mysql".',
        { cause: erro },
      );
    }
    return `MySQL indisponível (${erro.code ?? erro.message}). Suba com "docker compose up -d mysql" para rodar estes testes.`;
  }
}

/**
 * Cria o banco de teste do zero, com schema e seed aplicados.
 *
 * @returns {Promise<{conexao: import('mysql2/promise').Connection, encerrar: () => Promise<void>}>}
 */
export async function criarBancoDeTeste() {
  const administrativa = await conexaoRoot(undefined);
  await administrativa.query(`DROP DATABASE IF EXISTS \`${NOME_BANCO_TESTE}\``);
  await administrativa.query(
    `CREATE DATABASE \`${NOME_BANCO_TESTE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  );
  await administrativa.end();

  const conexao = await conexaoRoot(NOME_BANCO_TESTE);
  await migrar({ conexao });
  await semear({ conexao });

  return {
    conexao,
    async encerrar() {
      await conexao.end();
      const limpeza = await conexaoRoot(undefined);
      await limpeza.query(`DROP DATABASE IF EXISTS \`${NOME_BANCO_TESTE}\``);
      await limpeza.end();
    },
  };
}

/** Id de um usuário semeado, para os testes não dependerem de auto-increment. */
export async function idDoUsuario(conexao, email) {
  const [linhas] = await conexao.query('SELECT id FROM users WHERE email = ?', [email]);
  if (linhas.length === 0) throw new Error(`Usuário ${email} não foi semeado`);
  return linhas[0].id;
}

/** Id de uma linha de catálogo pelo slug, para o mesmo motivo. */
export async function idPorSlug(conexao, tabela, slug) {
  const [linhas] = await conexao.query(`SELECT id FROM \`${tabela}\` WHERE slug = ?`, [slug]);
  if (linhas.length === 0) throw new Error(`${tabela} não tem a linha "${slug}"`);
  return linhas[0].id;
}
