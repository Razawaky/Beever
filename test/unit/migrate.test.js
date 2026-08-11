import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { listarMigrations, separarComandos } from '../../scripts/migrate.js';

describe('runner de migrations', () => {
  describe('separarComandos', () => {
    it('separa comandos pelo ponto e vírgula', () => {
      const comandos = separarComandos('CREATE TABLE a (id INT);\nCREATE TABLE b (id INT);');
      assert.equal(comandos.length, 2);
      assert.match(comandos[0], /CREATE TABLE a/);
      assert.match(comandos[1], /CREATE TABLE b/);
    });

    it('descarta linhas de comentário', () => {
      const comandos = separarComandos('-- cria a tabela\nCREATE TABLE a (id INT);');
      assert.equal(comandos.length, 1);
      assert.ok(!comandos[0].includes('cria a tabela'));
    });

    it('ignora ponto e vírgula final sem gerar comando vazio', () => {
      assert.equal(separarComandos('SELECT 1;').length, 1);
      assert.equal(separarComandos('\n\n   \n').length, 0);
    });
  });

  describe('listarMigrations', () => {
    let diretorio;

    it('devolve só arquivos .sql, em ordem lexical', async () => {
      diretorio = await mkdtemp(path.join(tmpdir(), 'beever-migrations-'));
      await writeFile(path.join(diretorio, '002_segunda.sql'), 'SELECT 1;');
      await writeFile(path.join(diretorio, '001_primeira.sql'), 'SELECT 1;');
      await writeFile(path.join(diretorio, 'README.md'), 'não é migration');

      assert.deepEqual(await listarMigrations(diretorio), ['001_primeira.sql', '002_segunda.sql']);
    });

    it('enxerga as migrations reais do projeto', async () => {
      const arquivos = await listarMigrations();
      assert.ok(arquivos.includes('001_schema_inicial.sql'));
    });
  });

  after(() => {
    // Nada a limpar além do diretório temporário, que o SO descarta.
  });
});
