import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * O documento de trabalhos futuros não pode envelhecer sozinho (T-15.6).
 *
 * Ele só vale como escopo declarado se cada requisito, cada dívida e cada
 * arquivo que ele cita ainda existirem: código inventado vira promessa vaga, que
 * é o oposto do que a banca precisa ler.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FUTUROS = 'docs/26-TRABALHOS-FUTUROS.md';
const REQUISITOS = 'docs/01-REQUISITOS-E-REGRAS.md';
const ESTADO = 'docs/ESTADO-DO-PROJETO.md';
const ROADMAP = 'docs/02-ROADMAP-ETAPAS.md';

const CODIGO = /\b(RF-[A-Z]{3}-\d{2}|RNF-\d{2}|RN-\d{3})\b/g;
const DIVIDA = /\bDT-\d+\b/g;

// Mesma regra da matriz de rastreabilidade: só caminho que começa numa pasta do
// projeto é conferível. Menção curta no meio da frase não prova nada.
const PASTAS = '(?:src|test|scripts|migrations|docs|\\.github)';
const CAMINHO = new RegExp('`(' + PASTAS + '/[A-Za-z0-9_\\-./]+\\.(?:js|ejs|sql|md|css|json|yml))`', 'g');

function ler(arquivo) {
  return readFileSync(path.join(raiz, arquivo), 'utf8');
}

function achar(texto, expressao) {
  return new Set(texto.match(expressao) ?? []);
}

/** As frentes que a linha da T-15.6 no roadmap promete, separadas por vírgula. */
function frentesDoRoadmap() {
  const linha = ler(ROADMAP).split('\n').find((l) => l.includes('T-15.6'));
  assert.ok(linha, 'o roadmap não tem mais a linha da T-15.6');

  const promessa = linha.split('trabalhos futuros:')[1];
  assert.ok(promessa, 'a linha da T-15.6 não lista as frentes');

  return promessa.replace(/\|$/, '').split(',').map((frente) => frente.trim()).filter(Boolean);
}

function titulosDe(texto) {
  return texto.split('\n').filter((linha) => linha.startsWith('#')).join('\n').toLowerCase();
}

describe('documento de trabalhos futuros', () => {
  it('todo requisito citado existe no documento de requisitos', () => {
    const nosRequisitos = achar(ler(REQUISITOS), CODIGO);
    const inventados = [...achar(ler(FUTUROS), CODIGO)].filter((codigo) => !nosRequisitos.has(codigo)).sort();

    assert.deepEqual(inventados, [], 'código citado que não existe nos requisitos');
  });

  it('toda dívida técnica citada existe no estado do projeto', () => {
    const noEstado = achar(ler(ESTADO), DIVIDA);
    const inventadas = [...achar(ler(FUTUROS), DIVIDA)].filter((codigo) => !noEstado.has(codigo)).sort();

    assert.deepEqual(inventadas, [], 'dívida citada que não está na seção 5 do estado');
  });

  it('todo arquivo citado existe no disco', () => {
    const sumidos = [];

    for (const [, caminho] of ler(FUTUROS).matchAll(CAMINHO)) {
      if (!existsSync(path.join(raiz, caminho))) sumidos.push(caminho);
    }

    assert.deepEqual([...new Set(sumidos)].sort(), [], 'o documento cita arquivo que não existe mais');
  });

  it('toda frente prometida pela T-15.6 tem seção própria', () => {
    const titulos = titulosDe(ler(FUTUROS));
    const semSecao = frentesDoRoadmap().filter((frente) => !titulos.includes(frente.toLowerCase()));

    assert.deepEqual(semSecao, [], 'frente do roadmap sem seção no documento');
  });
});
