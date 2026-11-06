import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { calcularChecksum, conferirChecksums, listarMigrations, separarComandos } from '../../scripts/migrate.js';

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
      assert.ok(arquivos.includes('001_core_users.sql'));
      assert.ok(arquivos.includes('007_gamification.sql'));
    });

    it('não enxerga o schema arquivado em _legacy/', async () => {
      const arquivos = await listarMigrations();
      assert.ok(!arquivos.includes('001_schema_inicial.sql'));
      assert.ok(!arquivos.some((nome) => nome.includes('_legacy')));
    });
  });

  describe('calcularChecksum', () => {
    it('é estável para o mesmo conteúdo', () => {
      assert.equal(calcularChecksum('CREATE TABLE a (id INT);'), calcularChecksum('CREATE TABLE a (id INT);'));
    });

    it('muda quando o conteúdo muda, nem que seja um espaço', () => {
      assert.notEqual(calcularChecksum('SELECT 1;'), calcularChecksum('SELECT 1; '));
    });
  });

  describe('conferirChecksums', () => {
    it('acusa migration aplicada que foi editada depois', () => {
      const registradas = [{ versao: '001_core_users.sql', checksum: 'antigo' }];
      const atuais = new Map([['001_core_users.sql', 'novo']]);

      const { alteradas, sumidas, semChecksum } = conferirChecksums(registradas, atuais);

      assert.deepEqual(alteradas, ['001_core_users.sql']);
      assert.deepEqual(sumidas, []);
      assert.deepEqual(semChecksum, []);
    });

    it('não acusa nada quando o conteúdo continua igual', () => {
      const registradas = [{ versao: '001_core_users.sql', checksum: 'igual' }];
      const atuais = new Map([['001_core_users.sql', 'igual']]);

      assert.deepEqual(conferirChecksums(registradas, atuais).alteradas, []);
    });

    it('trata migration arquivada como aviso, não como erro', () => {
      const registradas = [{ versao: '001_schema_inicial.sql', checksum: 'qualquer' }];

      const { alteradas, sumidas } = conferirChecksums(registradas, new Map());

      assert.deepEqual(alteradas, []);
      assert.deepEqual(sumidas, ['001_schema_inicial.sql']);
    });

    it('separa as linhas gravadas antes de o checksum existir', () => {
      const registradas = [{ versao: '001_core_users.sql', checksum: null }];
      const atuais = new Map([['001_core_users.sql', 'novo']]);

      const { alteradas, semChecksum } = conferirChecksums(registradas, atuais);

      assert.deepEqual(alteradas, []);
      assert.deepEqual(semChecksum, ['001_core_users.sql']);
    });
  });

  after(() => {
    // Nada a limpar além do diretório temporário, que o SO descarta.
  });
});
