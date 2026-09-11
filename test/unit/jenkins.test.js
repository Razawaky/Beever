import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * O que dá para provar do Jenkins local sem subir o Jenkins: que o pipeline
 * chama scripts que existem e que o contêiner não abre mais do que devia.
 */

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ler = (arquivo) => readFileSync(path.join(raiz, arquivo), 'utf8');

const jenkinsfile = ler('Jenkinsfile');
const workflow = ler('.github/workflows/ci.yml');
const compose = ler('docker-compose.yml');
const scripts = JSON.parse(ler('package.json')).scripts;

const chamadasDeNpm = (texto) => new Set([...texto.matchAll(/npm run ([a-z:]+)/g)].map((achado) => achado[1]));

describe('o Jenkinsfile espelha o portão do GitHub Actions', () => {
  it('só chama scripts que o package.json declara', () => {
    const inexistentes = [...chamadasDeNpm(jenkinsfile)].filter((nome) => !scripts[nome]);
    assert.deepEqual(inexistentes, []);
  });

  it('roda todo script do Actions, menos a medição de carga', () => {
    const doActions = [...chamadasDeNpm(workflow)].filter((nome) => nome !== 'test:carga');
    const faltando = doActions.filter((nome) => !chamadasDeNpm(jenkinsfile).has(nome));
    assert.deepEqual(faltando, [], 'etapa do Actions que o Jenkins deixou de rodar');
  });

  it('constrói a imagem Docker', () => {
    assert.match(jenkinsfile, /docker build --target runtime/);
  });
});

describe('o contêiner do Jenkins não abre mais do que devia', () => {
  it('só escuta na própria máquina', () => {
    assert.match(compose, /'127\.0\.0\.1:8080:8080'/, 'com o socket do Docker montado, Jenkins exposto é root exposto');
  });

  it('só sobe pelo perfil próprio', () => {
    const bloco = compose.slice(compose.indexOf('\n  jenkins:'));
    assert.match(bloco, /profiles: \['jenkins'\]/);
  });

  it('não tem senha de admin escrita em arquivo', () => {
    assert.match(ler('jenkins/casc.yaml'), /password: \$\{JENKINS_ADMIN_PASSWORD\}/);
    assert.match(ler('jenkins/entrada.sh'), /-z "\$JENKINS_ADMIN_PASSWORD"/, 'sem senha o contêiner precisa recusar subir');
  });
});
