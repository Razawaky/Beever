import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * O laudo de evidências não pode envelhecer sozinho (T-15.5).
 *
 * A tarefa toda existe para que a banca leia número com execução por trás. Se o
 * documento citar print que sumiu, esquecer print que existe, ou trazer piso de
 * cobertura diferente do que o portão aplica, ele volta a ser afirmação sem
 * prova — que é exatamente o que ele veio corrigir.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LAUDO = 'docs/25-EVIDENCIAS-DE-TESTE.md';
const PASTA_DE_PRINTS = 'docs/evidencias/telas';
const SAIDA_DA_SUITE = 'docs/evidencias/suite.txt';
const SAIDA_DA_COBERTURA = 'docs/evidencias/cobertura.txt';
const PORTAO_DE_COBERTURA = 'scripts/cobertura.js';

function ler(arquivo) {
  return readFileSync(path.join(raiz, arquivo), 'utf8');
}

/** Os nomes de print citados entre crases no laudo. */
function printsCitados(texto) {
  return new Set([...texto.matchAll(/`([0-9]{2}-[a-z]+-(?:celular|desktop)\.webp)`/g)].map(([, nome]) => nome));
}

function printsNoDisco() {
  return readdirSync(path.join(raiz, PASTA_DE_PRINTS)).filter((nome) => nome.endsWith('.webp'));
}

/** Um número do resumo TAP, como `# pass 1085`. */
function doResumoTap(saida, campo) {
  const encontrado = saida.match(new RegExp(`^# ${campo} (\\d+)$`, 'm'));
  assert.ok(encontrado, `a saída guardada não tem a linha "# ${campo}"`);
  return Number(encontrado[1]);
}

/** Um piso declarado no portão, como `const PISO_DE_RAMO = 92;`. */
function pisoDoPortao(portao, nome) {
  const encontrado = portao.match(new RegExp(`const ${nome} = (\\d+);`));
  assert.ok(encontrado, `o portão de cobertura não declara ${nome}`);
  return Number(encontrado[1]);
}

describe('laudo de evidências de teste', () => {
  it('todo print citado no laudo existe no disco', () => {
    const noDisco = new Set(printsNoDisco());
    const sumidos = [...printsCitados(ler(LAUDO))].filter((nome) => !noDisco.has(nome)).sort();

    assert.deepEqual(sumidos, [], 'print citado no laudo que não existe mais');
  });

  it('todo print do disco está citado no laudo', () => {
    const citados = printsCitados(ler(LAUDO));
    const semCitacao = printsNoDisco().filter((nome) => !citados.has(nome)).sort();

    assert.deepEqual(semCitacao, [], 'print gerado que o laudo não menciona');
  });

  it('nenhum print está vazio', () => {
    // O WebP devolve arquivo de zero byte quando a página passa da altura que o
    // codec aceita, e sem erro nenhum. Foi assim que dois prints entraram vazios.
    const vazios = printsNoDisco().filter(
      (nome) => statSync(path.join(raiz, PASTA_DE_PRINTS, nome)).size === 0,
    );

    assert.deepEqual(vazios, [], 'print de zero byte');
  });

  it('as duas saídas de execução estão guardadas', () => {
    for (const saida of [SAIDA_DA_SUITE, SAIDA_DA_COBERTURA]) {
      assert.ok(existsSync(path.join(raiz, saida)), `falta a saída guardada ${saida}`);
    }
  });

  it('a contagem de testes do laudo é a da execução guardada', () => {
    const saida = ler(SAIDA_DA_SUITE);
    const passaram = doResumoTap(saida, 'pass');

    assert.equal(doResumoTap(saida, 'fail'), 0, 'a execução guardada tem teste falhando');
    assert.match(ler(LAUDO), new RegExp(`\\| ${passaram} \\| ${passaram} \\| 0 \\|`));
  });

  it('os pisos de cobertura do laudo são os que o portão aplica', () => {
    const portao = ler(PORTAO_DE_COBERTURA);
    const laudo = ler(LAUDO);

    const pisos = [
      ['Linha', pisoDoPortao(portao, 'PISO_DE_LINHA')],
      ['Ramo', pisoDoPortao(portao, 'PISO_DE_RAMO')],
      ['Função', pisoDoPortao(portao, 'PISO_DE_FUNCAO')],
    ];

    for (const [medida, piso] of pisos) {
      assert.match(laudo, new RegExp(`\\| ${medida} \\| ${piso}% \\|`), `o piso de ${medida} não bate com o portão`);
    }
  });

  it('os percentuais medidos no laudo são os da execução guardada', () => {
    const medido = ler(SAIDA_DA_COBERTURA).match(
      /^# all files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|/m,
    );
    assert.ok(medido, 'a saída de cobertura guardada não tem a linha de total');

    const [, linha, ramo, funcao] = medido;
    const laudo = ler(LAUDO);

    // O laudo escreve com vírgula, como o resto dos documentos do projeto.
    for (const numero of [linha, ramo, funcao]) {
      const comVirgula = numero.replace('.', ',');
      assert.ok(laudo.includes(`${comVirgula}%`), `o laudo não traz o ${comVirgula}% que foi medido`);
    }
  });
});
