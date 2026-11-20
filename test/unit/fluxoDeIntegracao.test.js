import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * O que dá para provar sobre o portão sem abrir um pull request (T-14.5).
 *
 * O workflow quebra em silêncio: script renomeado no `package.json` só aparece
 * como job vermelho horas depois, e variável esquecida derruba o boot com erro
 * que não fala em CI. Aqui a conferência é estática e roda em milissegundos.
 */

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function ler(arquivo) {
  return readFileSync(path.join(raiz, arquivo), 'utf8');
}

const workflow = ler('.github/workflows/ci.yml');
const gitignore = ler('.gitignore');
const pacote = JSON.parse(ler('package.json'));

/** Os scripts que o workflow chama, na forma `npm run <nome>`. */
function scriptsChamadosPeloWorkflow() {
  const chamados = new Set();
  for (const achado of workflow.matchAll(/npm run ([a-z:]+)/g)) chamados.add(achado[1]);
  return chamados;
}

/** As variáveis que o workflow declara em qualquer bloco `env:`. */
function variaveisDeclaradasNoWorkflow() {
  const declaradas = new Set();
  for (const achado of workflow.matchAll(/^\s+([A-Z][A-Z0-9_]*):/gm)) declaradas.add(achado[1]);
  return declaradas;
}

describe('o workflow de CI é versionado', () => {
  it('o .gitignore abre exceção para .github/workflows/', () => {
    assert.match(
      gitignore,
      /^!\.github\/workflows\/$/m,
      'sem a exceção o arquivo fica fora do repositório e o GitHub Actions nunca executa o portão',
    );
  });

  it('o .gitignore continua barrando as pastas de agente dentro do .github', () => {
    assert.match(gitignore, /^\.github\/\*$/m, 'skills, agents e hooks são locais e não sobem pro repo');
  });
});

describe('o workflow chama só script que existe', () => {
  it('todo npm run do workflow tem entrada no package.json', () => {
    const inexistentes = [...scriptsChamadosPeloWorkflow()].filter((nome) => !pacote.scripts[nome]).sort();

    assert.deepEqual(inexistentes, [], 'o workflow chama script que o package.json não declara');
  });

  it('os scripts que o portão depende continuam declarados', () => {
    for (const nome of ['lint', 'audit', 'test:db', 'test:cobertura', 'test:carga']) {
      assert.ok(pacote.scripts[nome], `o script ${nome} sumiu do package.json e o portão perde uma etapa`);
    }
  });
});

describe('o portão cumpre o que a RNF-40 e a RNF-14 pedem', () => {
  it('roda em pull request e em push para main', () => {
    assert.match(workflow, /^on:$/m);
    assert.match(workflow, /^\s+pull_request:$/m, 'sem gatilho de pull request não existe portão de merge');
    assert.match(workflow, /branches: \[main\]/, 'o merge para main também precisa ser verificado');
  });

  it('a auditoria de dependências reprova de verdade', () => {
    assert.match(pacote.scripts.audit, /--audit-level=high/, 'a RNF-14 fala em vulnerabilidade alta');
    assert.doesNotMatch(workflow, /npm run audit.*\|\| true/, 'auditoria que engole a falha não é portão');
  });

  it('a imagem é construída a cada verificação', () => {
    assert.match(workflow, /docker build/, 'a T-14.4 provou que só construir acha certos defeitos');
  });
});

describe('os jobs têm ambiente para subir a aplicação', () => {
  it('as variáveis obrigatórias do env.js estão declaradas', () => {
    const declaradas = variaveisDeclaradasNoWorkflow();
    const obrigatorias = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'SESSION_SECRET'];
    const faltando = obrigatorias.filter((chave) => !declaradas.has(chave));

    assert.deepEqual(faltando, [], 'sem elas o src/config/env.js derruba o job antes do primeiro teste');
  });

  it('a suíte roda com TESTES_DE_BANCO ligado', () => {
    assert.match(
      pacote.scripts['test:db'],
      /TESTES_DE_BANCO=1/,
      'sem isso a falta de MySQL vira teste pulado em silêncio e o portão passa sem provar nada',
    );
  });

  it('a medição de carga sai do caminho do pull request', () => {
    assert.match(
      workflow,
      /PULAR_MEDICAO_DE_CARGA: '1'/,
      'runner compartilhado é irregular demais para cronômetro reprovar merge',
    );
  });
});
