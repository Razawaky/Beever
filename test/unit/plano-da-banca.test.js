import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * O plano para a banca não pode envelhecer sozinho (E17).
 *
 * Ele é a lista do que ainda falta, então cita muito requisito e muita dívida.
 * Código inventado ou arquivo que sumiu transformam a lista em conversa, que é
 * o oposto do que ela serve para ser.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PLANO = 'docs/28-PLANO-PARA-A-BANCA.md';
const REQUISITOS = 'docs/01-REQUISITOS-E-REGRAS.md';
const ESTADO = 'docs/ESTADO-DO-PROJETO.md';

const CODIGO = /\b(RF-[A-Z]{3}-\d{2}|RNF-\d{2}|RN-\d{3})\b/g;
const DIVIDA = /\bDT-\d+\b/g;

const PASTAS = '(?:src|test|scripts|migrations|docs|\\.github)';
const CAMINHO = new RegExp('`(' + PASTAS + '/[A-Za-z0-9_\\-./]+\\.(?:js|ejs|sql|md|css|json|yml))`', 'g');

function ler(arquivo) {
  return readFileSync(path.join(raiz, arquivo), 'utf8');
}

function achar(texto, expressao) {
  return new Set(texto.match(expressao) ?? []);
}

describe('plano para a banca', () => {
  it('todo requisito citado existe no documento de requisitos', () => {
    const nosRequisitos = achar(ler(REQUISITOS), CODIGO);
    const inventados = [...achar(ler(PLANO), CODIGO)].filter((codigo) => !nosRequisitos.has(codigo)).sort();

    assert.deepEqual(inventados, [], 'código citado que não existe nos requisitos');
  });

  it('toda dívida citada existe no estado do projeto', () => {
    const noEstado = achar(ler(ESTADO), DIVIDA);
    const inventadas = [...achar(ler(PLANO), DIVIDA)].filter((codigo) => !noEstado.has(codigo)).sort();

    assert.deepEqual(inventadas, [], 'dívida citada que não está na seção 5 do estado');
  });

  it('todo arquivo citado existe no disco', () => {
    const sumidos = [];

    for (const [, caminho] of ler(PLANO).matchAll(CAMINHO)) {
      // O próprio teste é citado antes de existir só enquanto se escreve o plano.
      if (caminho.endsWith('plano-da-banca.test.js')) continue;
      if (!existsSync(path.join(raiz, caminho))) sumidos.push(caminho);
    }

    assert.deepEqual([...new Set(sumidos)].sort(), [], 'o plano cita arquivo que não existe mais');
  });

  it('as quatro faixas de prioridade continuam no documento', () => {
    const titulos = ler(PLANO)
      .split('\n')
      .filter((linha) => linha.startsWith('#'))
      .join('\n');

    for (const faixa of ['## P0', '## P1', '## P2', '## P3']) {
      assert.ok(titulos.includes(faixa), `falta a faixa ${faixa}`);
    }
  });
});
