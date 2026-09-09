import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * Documentação do TCC não pode envelhecer sozinha (T-15.2, T-15.3, T-15.4).
 *
 * Cada documento tem seções obrigatórias, cita arquivos que devem existir e
 * (no caso dos diagramas) usa Mermaid que deve ser bem formado. Se o código
 * mudar de lugar ou o arquivo for renomeado, o teste reprova antes que a
 * banca perceba.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REQUISITOS = 'docs/01-REQUISITOS-E-REGRAS.md';
const MIGRATIONS = 'migrations';

const CODIGO = /\b(RF-[A-Z]{3}-\d{2}|RNF-\d{2}|RN-\d{3})\b/g;
const PASTAS = '(?:src|test|scripts|migrations|docs|\\.github)';
const CAMINHO = new RegExp('`(' + PASTAS + '/[A-Za-z0-9_\\-./]+\\.(?:js|ejs|sql|md|css|json|yml))`', 'g');

function ler(arquivo) {
  return readFileSync(path.join(raiz, arquivo), 'utf8');
}

function achar(texto, expressao) {
  return new Set(texto.match(expressao) ?? []);
}

function titulos(texto) {
  return texto.split('\n').filter((l) => l.startsWith('#')).join('\n').toLowerCase();
}

/** As tabelas que as migrations criam. `_legacy/` fica de fora: não é o schema atual. */
function tabelasDasMigrations() {
  const nomes = new Set();

  for (const arquivo of readdirSync(path.join(raiz, MIGRATIONS))) {
    if (!arquivo.endsWith('.sql')) continue;
    const sql = readFileSync(path.join(raiz, MIGRATIONS, arquivo), 'utf8');
    for (const [, nome] of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?`?([a-z_][a-z0-9_]*)`?/gi)) {
      nomes.add(nome.toLowerCase());
    }
  }

  return [...nomes];
}

/**
 * Os nomes que aparecem na figura ER.
 *
 * Basta olhar as palavras do bloco: se o nome da tabela não está lá, ela não
 * está no desenho. Rótulo de relacionamento também entra na conta, o que só
 * torna a conferência mais permissiva — nunca mais rígida do que deveria.
 */
function tabelasDaFiguraEr(texto) {
  const bloco = blocosMermaid(texto).find((b) => b.trim().startsWith('erDiagram')) ?? '';
  return new Set(bloco.match(/[a-z_][a-z0-9_]*/g) ?? []);
}

function blocosMermaid(texto) {
  const blocos = [];
  const regex = /```mermaid\n([\s\S]*?)```/g;
  let m;
  while ((m = regex.exec(texto)) !== null) {
    blocos.push(m[1]);
  }
  return blocos;
}

// ── T-15.2: Diagramas do TCC ────────────────────────────────────────────────

describe('T-15.2 — diagramas do TCC', () => {
  const DOC = 'docs/22-DIAGRAMAS-DO-TCC.md';
  const ESPERADOS = [
    'diagrama de entidades',
    'diagrama de casos de uso',
    'diagrama de classes',
    'diagrama de sequência',
  ];

  it('o documento existe', () => {
    assert.ok(existsSync(path.join(raiz, DOC)));
  });

  it('tem as quatro seções de diagrama', () => {
    const t = titulos(ler(DOC));
    for (const nome of ESPERADOS) {
      assert.ok(t.includes(nome), `falta a seção "${nome}"`);
    }
  });

  it('tem pelo menos um bloco Mermaid por diagrama', () => {
    const texto = ler(DOC);
    const blocos = blocosMermaid(texto);
    assert.ok(blocos.length >= 4, `esperado ≥4 blocos Mermaid, encontrado ${blocos.length}`);
  });

  it('todo bloco Mermaid tem tipo válido', () => {
    const tiposValidos = ['erDiagram', 'classDiagram', 'sequenceDiagram', 'usecase', 'actor', 'flowchart', 'graph'];
    const texto = ler(DOC);
    const blocos = blocosMermaid(texto);
    for (const bloco of blocos) {
      const primeiraLinha = bloco.split('\n').find((l) => l.trim());
      const tipo = primeiraLinha.split(/\s/)[0];
      assert.ok(
        tiposValidos.some((v) => tipo.startsWith(v)),
        `bloco Mermaid com tipo desconhecido: "${tipo}"`,
      );
    }
  });

  it('toda tabela criada nas migrations aparece na figura ER', () => {
    const naFigura = tabelasDaFiguraEr(ler(DOC));
    const ausentes = tabelasDasMigrations().filter((tabela) => !naFigura.has(tabela)).sort();

    assert.deepEqual(ausentes, [], 'tabela do schema que ficou de fora do diagrama ER');
  });

  it('todo requisito citado nos diagramas existe no documento de requisitos', () => {
    const nosRequisitos = achar(ler(REQUISITOS), CODIGO);
    const inventados = [...achar(ler(DOC), CODIGO)].filter((c) => !nosRequisitos.has(c)).sort();
    assert.deepEqual(inventados, [], 'requisito inventado nos diagramas');
  });

  it('toda referência de arquivo citada existe no disco', () => {
    const sumidos = [];
    for (const [, caminho] of ler(DOC).matchAll(CAMINHO)) {
      if (!existsSync(path.join(raiz, caminho))) sumidos.push(caminho);
    }
    assert.deepEqual([...new Set(sumidos)].sort(), [], 'arquivo citado que não existe');
  });
});

// ── T-15.3: Documento de arquitetura ────────────────────────────────────────

describe('T-15.3 — documento de arquitetura', () => {
  const DOC = 'docs/23-ARQUITETURA-DO-SISTEMA.md';
  const SECOES = [
    'visão em uma figura',
    'por que camadas',
    'por que sem orm',
    'por que ejs',
    'tabela de decisões',
    'referências',
  ];

  it('o documento existe', () => {
    assert.ok(existsSync(path.join(raiz, DOC)));
  });

  it('tem as seções obrigatórias', () => {
    const t = titulos(ler(DOC));
    for (const nome of SECOES) {
      assert.ok(t.includes(nome), `falta a seção "${nome}"`);
    }
  });

  it('toda referência de arquivo citada existe no disco', () => {
    const sumidos = [];
    for (const [, caminho] of ler(DOC).matchAll(CAMINHO)) {
      if (!existsSync(path.join(raiz, caminho))) sumidos.push(caminho);
    }
    assert.deepEqual([...new Set(sumidos)].sort(), [], 'arquivo citado que não existe');
  });

  it('todo requisito citado existe no documento de requisitos', () => {
    const nosRequisitos = achar(ler(REQUISITOS), CODIGO);
    const inventados = [...achar(ler(DOC), CODIGO)].filter((c) => !nosRequisitos.has(c)).sort();
    assert.deepEqual(inventados, [], 'requisito inventado na arquitetura');
  });
});

// ── T-15.4: Manual de instalação e execução ─────────────────────────────────

describe('T-15.4 — manual de instalação e execução', () => {
  const DOC = 'docs/24-MANUAL-DE-INSTALACAO-E-EXECUCAO.md';
  const SECOES = [
    'pré-requisitos',
    'instalar dependências',
    'configurar o ambiente',
    'subir o mysql',
    'criar o schema',
    'compilar o css',
    'subir o servidor',
    'testes',
    'comandos úteis',
  ];

  it('o documento existe', () => {
    assert.ok(existsSync(path.join(raiz, DOC)));
  });

  it('tem as seções obrigatórias', () => {
    const t = titulos(ler(DOC));
    for (const nome of SECOES) {
      assert.ok(t.includes(nome), `falta a seção "${nome}"`);
    }
  });

  it('todo npm run citado existe no package.json', () => {
    const pkg = JSON.parse(readFileSync(path.join(raiz, 'package.json'), 'utf8'));
    const scripts = Object.keys(pkg.scripts ?? {});
    const citados = [...ler(DOC).matchAll(/npm run ([\w:-]+)/g)].map((m) => m[1]);
    const inexistentes = [...new Set(citados)].filter((s) => !scripts.includes(s)).sort();
    assert.deepEqual(inexistentes, [], 'npm run citado que não existe no package.json');
  });

  it('toda referência de arquivo citada existe no disco', () => {
    const sumidos = [];
    for (const [, caminho] of ler(DOC).matchAll(CAMINHO)) {
      // Padrões tipo NNN_descricao são placeholders, não arquivos reais.
      if (/NNN|AAAA|MMDD/.test(caminho)) continue;
      if (!existsSync(path.join(raiz, caminho))) sumidos.push(caminho);
    }
    assert.deepEqual([...new Set(sumidos)].sort(), [], 'arquivo citado que não existe');
  });

  it('todo requisito citado existe no documento de requisitos', () => {
    const nosRequisitos = achar(ler(REQUISITOS), CODIGO);
    const inventados = [...achar(ler(DOC), CODIGO)].filter((c) => !nosRequisitos.has(c)).sort();
    assert.deepEqual(inventados, [], 'requisito inventado no manual');
  });
});
