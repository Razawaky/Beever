import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * O que dá para provar sobre o ambiente sem subir Docker (T-14.4).
 *
 * Estes arquivos quebram em silêncio: variável nova que ninguém documenta só
 * aparece quando alguém sobe o projeto do zero, e permissão errada dentro da
 * imagem só aparece no primeiro upload em produção. O teste é estático de
 * propósito — roda em milissegundos e não exige daemon nenhum no CI.
 */

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function ler(arquivo) {
  return readFileSync(path.join(raiz, arquivo), 'utf8');
}

const dockerfile = ler('Dockerfile');
const compose = ler('docker-compose.yml');
const exemplo = ler('.env.example');
const dockerignore = ler('.dockerignore');

/** As chaves declaradas no `.env.example`, ignorando comentário e linha vazia. */
function chavesDocumentadas(conteudo) {
  return new Set(
    conteudo
      .split('\n')
      .filter((linha) => /^[A-Z][A-Z0-9_]*=/.test(linha))
      .map((linha) => linha.split('=')[0]),
  );
}

/** Toda variável que o código de fato lê, varrendo `src` e `scripts`. */
function chavesLidasPeloCodigo() {
  const lidas = new Set();

  for (const pasta of ['src', 'scripts']) {
    for (const arquivo of arquivosJs(path.join(raiz, pasta))) {
      const conteudo = readFileSync(arquivo, 'utf8');
      for (const achado of conteudo.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) lidas.add(achado[1]);
    }
  }

  return lidas;
}

function arquivosJs(diretorio) {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(diretorio, entrada.name);
    if (entrada.isDirectory()) return arquivosJs(caminho);
    return entrada.name.endsWith('.js') ? [caminho] : [];
  });
}

const documentadas = chavesDocumentadas(exemplo);

describe('o .env.example documenta tudo que o código lê', () => {
  it('nenhuma variável usada pelo código fica sem linha no exemplo', () => {
    const semDocumentacao = [...chavesLidasPeloCodigo()].filter((chave) => !documentadas.has(chave)).sort();

    assert.deepEqual(
      semDocumentacao,
      [],
      'variável lida pelo código e ausente do .env.example: quem sobe o projeto do zero não tem como adivinhar',
    );
  });

  it('nenhuma variável do docker-compose fica sem linha no exemplo', () => {
    // O compose também define `MYSQL_*` para o contêiner do banco, mas essas
    // são valor de saída e não de entrada: saem das `DB_*` que estão logo ali.
    const usadas = [...compose.matchAll(/\$\{([A-Z][A-Z0-9_]*)/g)].map((achado) => achado[1]);
    const semDocumentacao = [...new Set(usadas)].filter((chave) => !documentadas.has(chave)).sort();

    assert.deepEqual(semDocumentacao, [], 'variável usada pelo compose e ausente do .env.example');
  });

  it('a senha do root do MySQL está documentada (DT-15)', () => {
    assert.ok(documentadas.has('DB_ROOT_PASSWORD'));
  });
});

describe('a imagem não é feita para rodar como root nem carregar o que não serve', () => {
  it('troca de usuário antes de servir', () => {
    assert.match(dockerfile, /^USER node$/m, 'contêiner que roda como root entrega root a quem escapar do processo');
  });

  it('tem healthcheck próprio', () => {
    assert.match(dockerfile, /HEALTHCHECK/, 'sem healthcheck o orquestrador não sabe distinguir "de pé" de "funcionando"');
  });

  it('a pasta de uploads é do usuário que roda a aplicação', () => {
    // `/app` é do root. Sem esta linha o envio de ilustração do painel falha
    // dentro do contêiner, e só ali.
    assert.match(dockerfile, /chown -R node:node \/app\/uploads/);
  });

  it('o runtime não carrega as dependências de desenvolvimento', () => {
    const runtime = dockerfile.slice(dockerfile.indexOf('AS runtime'));
    assert.doesNotMatch(runtime, /npm ci(?! --omit=dev)/, 'o estágio final não instala nada por conta própria');
    assert.match(dockerfile, /npm prune --omit=dev/);
  });

  it('o logger confere o transporte bonito antes de pedir por ele', () => {
    // `pino-pretty` é devDependency e some no `npm prune`. Sem a conferência a
    // imagem só sobe em `production`, e quebra no boot com erro de transporte.
    const logger = ler('src/config/logger.js');
    assert.match(logger, /resolve\('pino-pretty'\)/);
  });

  it('o multi-stage separa build de runtime (RNF-37)', () => {
    const estagios = [...dockerfile.matchAll(/^FROM .+ AS (\S+)$/gm)].map((achado) => achado[1]);
    assert.ok(estagios.includes('build'));
    assert.ok(estagios.includes('runtime'));
  });
});

describe('o contexto de build não carrega segredo nem dado real', () => {
  for (const caminho of ['.env', 'backups/', 'node_modules/', 'uploads/']) {
    it(`ignora ${caminho}`, () => {
      const linhas = dockerignore.split('\n').map((linha) => linha.trim());
      assert.ok(linhas.includes(caminho), `${caminho} entraria no contexto enviado ao daemon`);
    });
  }
});

describe('o compose sobe a aplicação inteira, e na ordem certa', () => {
  it('tem os três serviços', () => {
    for (const servico of ['mysql:', 'migrate:', 'app:']) assert.match(compose, new RegExp(`^ {2}${servico}`, 'm'));
  });

  it('a aplicação só sobe com o banco saudável e as migrations aplicadas', () => {
    const bloco = compose.slice(compose.indexOf('\n  app:'));
    assert.match(bloco, /condition: service_healthy/);
    assert.match(bloco, /condition: service_completed_successfully/);
  });

  it('o healthcheck do banco usa a senha que o próprio compose define', () => {
    // Já apontou para uma variável inexistente e caía sempre no padrão: trocar
    // a senha de root deixava o banco eternamente unhealthy.
    const definidas = [...compose.matchAll(/^\s+MYSQL_ROOT_PASSWORD: \$\{([A-Z_]+)/gm)].map((achado) => achado[1]);
    const noHealthcheck = /-p\$\{([A-Z_]+)/.exec(compose)?.[1];

    assert.ok(definidas.includes(noHealthcheck), `healthcheck lê ${noHealthcheck}, que o compose não define`);
  });

  it('as ilustrações enviadas ficam em volume, e não dentro da imagem', () => {
    assert.match(compose, /beever-uploads:\/app\/uploads/);
  });

  it('sobe em desenvolvimento por padrão, que é o que este compose é', () => {
    // Com `production` fixo, as duas guardas do `env.js` recusam os próprios
    // valores padrão do compose e a stack nunca chega a subir.
    assert.doesNotMatch(compose, /NODE_ENV: production/);
  });

  it('o segredo de sessão não tem valor padrão', () => {
    // Padrão aqui seria segredo de sessão público num repositório aberto.
    assert.match(compose, /SESSION_SECRET: \$\{SESSION_SECRET:\?/);
  });
});
