import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';

/**
 * Varredura de segurança da T-14.1, pelo HTTP: CSRF, XSS armazenado, cabeçalhos,
 * cookie, sessão e acesso ao que é de outra pessoa.
 *
 * A parte estática — SQL, validação de entrada, escape em view e segredo em
 * código — está em `test/unit/varreduraDeCodigo.test.js`, que lê o código em vez
 * de exercitá-lo.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const ADMIN = { email: 'admin@beever.dev', senha: 'admin1234' };
const JOGADORA = { email: 'ana@beever.dev', senha: 'beever123' };

/** Onde cada arquivo de rota está montado, lido do próprio `routes/index.js`. */
function prefixosMontados() {
  const indice = readFileSync(path.join(raiz, 'src/routes/index.js'), 'utf8');
  const prefixos = { 'index.js': '' };

  for (const uso of indice.matchAll(/router\.use\(\s*'([^']+)'\s*,\s*(\w+)Router\s*\)/g)) {
    prefixos[`${uso[2]}.js`] = uso[1];
  }
  return prefixos;
}

/** Toda rota de escrita declarada, com o caminho já montado. */
function rotasDeEscrita() {
  const prefixos = prefixosMontados();
  const encontradas = [];

  for (const nome of readdirSync(path.join(raiz, 'src/routes'))) {
    const prefixo = prefixos[nome];
    if (prefixo === undefined) continue;

    const conteudo = readFileSync(path.join(raiz, 'src/routes', nome), 'utf8');
    for (const chamada of conteudo.matchAll(/router\.(post|put|patch|delete)\(\s*'([^']+)'/g)) {
      // `:id` vira 1: o CSRF é conferido antes de qualquer coisa olhar o número.
      const caminho = (prefixo + chamada[2]).replace(/:[A-Za-z]+/g, '1');
      encontradas.push({ metodo: chamada[1], caminho });
    }
  }
  return encontradas;
}

/**
 * As duas únicas rotas em que outro middleware responde antes do CSRF: o upload
 * do painel precisa do `multer` antes, para o token chegar no corpo, e o
 * `requireAdmin` protege esse par desde `app.js`. Aqui basta provar que elas
 * também não passam.
 */
const ANTES_DO_CSRF = ['/admin/itens', '/admin/celulas'];

describe('varredura de segurança', opcoes, () => {
  let banco;
  let app;
  let admin;
  let jogadora;

  async function tokenDe(agente, caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').redirects(2);
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function entrar(conta, caminhoDoLogin, endereco) {
    const agente = request.agent(app);
    const csrf = await tokenDe(agente, caminhoDoLogin);
    await agente
      .post(endereco)
      .set('Accept', 'application/json')
      .send({ ...conta, _csrf: csrf })
      .expect(200);
    return agente;
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    admin = await entrar(ADMIN, '/admin/login', '/admin/login');
    jogadora = await entrar(JOGADORA, '/login', '/sessao/login');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  describe('CSRF (RNF-08)', () => {
    it('a varredura enxerga todas as rotas de escrita que o Express montou', () => {
      const declaradas = rotasDeEscrita();
      const montadas = [];

      const andar = (camada) => {
        if (camada.route) {
          for (const metodo of Object.keys(camada.route.methods)) {
            if (!['get', 'head', 'options'].includes(metodo)) montadas.push(metodo);
          }
          return;
        }
        for (const filha of camada.handle?.stack ?? []) andar(filha);
      };
      for (const camada of (app.router ?? app._router).stack) andar(camada);

      assert.equal(
        declaradas.length,
        montadas.length,
        'a lista lida dos arquivos precisa bater com o que está montado de verdade',
      );
    });

    it('nenhuma rota de escrita aceita requisição sem token', async () => {
      const passaram = [];

      for (const rota of rotasDeEscrita()) {
        const resposta = await jogadora[rota.metodo](rota.caminho).set('Accept', 'application/json').send({});

        if (ANTES_DO_CSRF.some((prefixo) => rota.caminho.startsWith(prefixo))) {
          // Aqui quem responde primeiro é o `requireAdmin`; o que importa é que
          // a escrita não aconteça.
          if (resposta.status < 400) passaram.push(`${rota.metodo} ${rota.caminho} → ${resposta.status}`);
          continue;
        }

        if (resposta.status !== 403 || !/CSRF/i.test(JSON.stringify(resposta.body))) {
          passaram.push(`${rota.metodo} ${rota.caminho} → ${resposta.status}`);
        }
      }

      assert.deepEqual(passaram, [], 'toda rota de escrita precisa recusar sem token de CSRF');
    });

    it('token de outra sessão não vale nesta', async () => {
      const tokenDoAdmin = await tokenDe(admin, '/admin/favos');

      await jogadora
        .post('/tarefas/1/concluir')
        .set('Accept', 'application/json')
        .send({ _csrf: tokenDoAdmin })
        .expect(403);
    });
  });

  describe('XSS armazenado (RNF-07)', () => {
    it('conteúdo cadastrado com script chega à tela escapado', async () => {
      const csrf = await tokenDe(admin, '/admin/favos');
      const [[faixa]] = await banco.conexao.query('SELECT id FROM age_bands WHERE code = ?', ['A']);

      await admin
        .post('/admin/favos')
        .set('Accept', 'application/json')
        .send({
          titulo: '<script>alert(1)</script>',
          slug: 'favo-do-xss',
          descricao: '"><img src=x onerror=alert(2)>',
          idFaixa: Number(faixa.id),
          percentualDeDesbloqueio: 100,
          _csrf: csrf,
        })
        .expect(201);

      const html = (await admin.get('/admin/favos').set('Accept', 'text/html').expect(200)).text;

      assert.ok(!html.includes('<script>alert(1)</script>'), 'o script não pode chegar cru à página');
      assert.ok(!html.includes('onerror=alert(2)'), 'o atributo de evento não pode chegar cru à página');
      assert.match(html, /&lt;script&gt;/, 'o EJS escapou o que foi gravado');
    });
  });

  describe('cabeçalhos (RNF-11)', () => {
    it('a resposta traz CSP sem `unsafe-inline` e as travas do helmet', async () => {
      const resposta = await jogadora.get('/painel').set('Accept', 'text/html').expect(200);
      const csp = resposta.headers['content-security-policy'];

      assert.ok(csp, 'sem CSP não há proteção contra script injetado');
      assert.ok(!csp.includes('unsafe-inline'), 'script embutido não pode ser permitido');
      assert.ok(!csp.includes('unsafe-eval'));
      assert.match(csp, /script-src 'self'/);
      assert.match(csp, /frame-ancestors 'none'/);
      assert.match(csp, /object-src 'none'/);
      assert.equal(resposta.headers['x-content-type-options'], 'nosniff');
      assert.equal(resposta.headers['x-powered-by'], undefined, 'não anuncie o servidor');
    });
  });

  describe('cookie e sessão (RNF-12)', () => {
    it('o cookie de sessão é httpOnly e sameSite', async () => {
      const agente = request.agent(app);
      const csrf = await tokenDe(agente, '/login');
      const resposta = await agente
        .post('/sessao/login')
        .set('Accept', 'application/json')
        .send({ ...JOGADORA, _csrf: csrf })
        .expect(200);

      const cookie = [resposta.headers['set-cookie']].flat().find((linha) => linha.startsWith('beever.sid='));

      assert.ok(cookie, 'o login precisa entregar o cookie de sessão');
      assert.match(cookie, /HttpOnly/i, 'JavaScript da página não pode ler o cookie');
      assert.match(cookie, /SameSite=Lax/i);
      // `Secure` só entra com `NODE_ENV=production`; aqui não há TLS para exigir.
    });

    it('o identificador da sessão muda no login', async () => {
      const agente = request.agent(app);
      const idDe = (resposta) =>
        [resposta.headers['set-cookie']].flat().find((linha) => linha?.startsWith('beever.sid='));

      // Uma visita anônima que já grava sessão: é o id dela que não pode
      // continuar valendo depois da autenticação.
      const antes = idDe(await agente.get('/login').set('Accept', 'text/html'));
      const csrf = await tokenDe(agente, '/login');
      const depois = idDe(
        await agente
          .post('/sessao/login')
          .set('Accept', 'application/json')
          .send({ ...JOGADORA, _csrf: csrf })
          .expect(200),
      );

      assert.ok(depois, 'o login precisa reemitir o cookie');
      assert.notEqual(antes, depois, 'id plantado antes do login não pode sobreviver a ele');
    });
  });

  describe('acesso ao que é de outra pessoa', () => {
    it('a jogadora não abre nenhuma tela do painel administrativo', async () => {
      for (const caminho of ['/admin', '/admin/usuarios', '/admin/favos', '/admin/itens', '/admin/auditoria']) {
        const resposta = await jogadora.get(caminho).set('Accept', 'application/json');
        assert.ok(resposta.status >= 400, `${caminho} respondeu ${resposta.status} para quem não é administrador`);
      }
    });

    it('a jogadora não altera o perfil de outra conta', async () => {
      const [[outro]] = await banco.conexao.query(
        'SELECT p.id FROM profiles p JOIN users u ON u.id = p.user_id WHERE u.email = ?',
        [ADMIN.email],
      );
      const csrf = await tokenDe(jogadora, '/perfil');

      const resposta = await jogadora
        .put(`/perfil/${outro.id}`)
        .set('Accept', 'application/json')
        .send({ apelido: 'invadido', _csrf: csrf });

      assert.ok(resposta.status === 403 || resposta.status === 404, `respondeu ${resposta.status}`);
    });
  });
});
