import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * A matriz de rastreabilidade não pode envelhecer sozinha (T-15.1).
 *
 * O arquivo nasceu na T-06.1 e, quando a T-15.1 começou, citava 132 dos 184
 * requisitos: cada tarefa nova entrava no código e não entrava na tabela. Aqui a
 * conferência é automática — requisito sem linha e caminho de arquivo que não
 * existe mais reprovam, que são as duas formas de a matriz virar ficção.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REQUISITOS = 'docs/01-REQUISITOS-E-REGRAS.md';
const MATRIZ = 'docs/RASTREABILIDADE.md';

const CODIGO = /\b(RF-[A-Z]{3}-\d{2}|RNF-\d{2}|RN-\d{3})\b/g;

// Caminho citado entre crases. Só vale o que começa numa pasta do projeto: a
// tabela também menciona arquivo pelo nome curto no meio da frase (`env.js`,
// `trilha.ejs`), e cobrar caminho inteiro dessas menções encheria a linha sem
// provar nada. Citação de arquivo de verdade tem que ser conferível.
const PASTAS = '(?:src|test|scripts|migrations|docs|\\.github)';
const CAMINHO = new RegExp('`(' + PASTAS + '/[A-Za-z0-9_\\-./]+\\.(?:js|ejs|sql|md|css|json|yml))`', 'g');

function ler(arquivo) {
  return readFileSync(path.join(raiz, arquivo), 'utf8');
}

function codigosDe(texto) {
  return new Set(texto.match(CODIGO) ?? []);
}

describe('matriz de rastreabilidade', () => {
  it('todo requisito do documento de requisitos tem linha na matriz', () => {
    const naMatriz = codigosDe(ler(MATRIZ));
    const semLinha = [...codigosDe(ler(REQUISITOS))].filter((codigo) => !naMatriz.has(codigo)).sort();

    assert.deepEqual(semLinha, [], 'requisito sem linha na matriz');
  });

  it('a matriz não inventa requisito que o documento não tem', () => {
    const nosRequisitos = codigosDe(ler(REQUISITOS));
    const inventados = [...codigosDe(ler(MATRIZ))].filter((codigo) => !nosRequisitos.has(codigo)).sort();

    assert.deepEqual(inventados, [], 'código citado na matriz que não existe nos requisitos');
  });

  it('todo arquivo citado na matriz existe no disco', () => {
    const sumidos = [];

    for (const linha of ler(MATRIZ).split('\n')) {
      for (const [, caminho] of linha.matchAll(CAMINHO)) {
        // A matriz cita a pasta de migrations pelo número da versão, e alguns
        // caminhos são de documento externo ao repositório de código.
        if (!existsSync(path.join(raiz, caminho))) sumidos.push(caminho);
      }
    }

    assert.deepEqual([...new Set(sumidos)].sort(), [], 'a matriz cita arquivo que não existe mais');
  });

  it('toda linha da tabela tem as quatro colunas preenchidas', () => {
    const incompletas = [];

    for (const linha of ler(MATRIZ).split('\n')) {
      if (!linha.startsWith('| **')) continue;
      const colunas = linha.split(' | ');
      if (colunas.length < 4) incompletas.push(linha.slice(0, 60));
      else if (colunas.at(-1).replace(/\|$/, '').trim() === '') incompletas.push(linha.slice(0, 60));
    }

    assert.deepEqual(incompletas, [], 'linha sem arquivo, sem teste ou sem situação');
  });
});
