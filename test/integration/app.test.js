import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

import { criarApp } from '../../src/app.js';
import { fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';

/**
 * Testes de integração: exigem o MySQL no ar com as migrations aplicadas.
 *   docker compose up -d mysql && npm run migrate
 */
describe('aplicação', () => {
  let app;

  before(() => {
    app = criarApp();
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
  });

  it('renderiza a página inicial em HTML', async () => {
    const resposta = await request(app).get('/').expect(200);
    assert.match(resposta.headers['content-type'], /html/);
    assert.match(resposta.text, /Beever/);
  });

  it('aplica os headers de segurança do helmet', async () => {
    const resposta = await request(app).get('/');
    assert.equal(resposta.headers['x-content-type-options'], 'nosniff');
    assert.equal(resposta.headers['x-frame-options'], 'SAMEORIGIN');
    assert.ok(resposta.headers['content-security-policy']);
    assert.equal(resposta.headers['x-powered-by'], undefined);
  });

  it('responde /health atravessando repository, service e controller', async () => {
    const resposta = await request(app).get('/health').expect(200);
    assert.equal(resposta.body.status, 'ok');
    assert.equal(resposta.body.banco.conectado, true);
    assert.ok(resposta.body.banco.migrationsAplicadas >= 1);
  });

  it('devolve 404 em JSON quando o cliente pede JSON', async () => {
    const resposta = await request(app).get('/rota-que-nao-existe').set('Accept', 'application/json').expect(404);
    assert.equal(resposta.body.codigo, 'NAO_ENCONTRADO');
  });

  it('devolve 404 em HTML quando o cliente pede HTML', async () => {
    const resposta = await request(app).get('/rota-que-nao-existe').set('Accept', 'text/html').expect(404);
    assert.match(resposta.headers['content-type'], /html/);
    assert.match(resposta.text, /404/);
  });

  it('rejeita POST sem token CSRF', async () => {
    const resposta = await request(app).post('/').set('Accept', 'application/json').send({ qualquer: 'coisa' });
    assert.equal(resposta.status, 403);
    assert.equal(resposta.body.codigo, 'ACESSO_NEGADO');
  });

  it('serve os arquivos estáticos de src/public', async () => {
    await request(app).get('/img/beever-icon.png').expect(200);
  });

  describe('layout base', () => {
    /**
     * O esqueleto agora existe num lugar só. Estes testes cobrem o que a
     * duplicação escondia: bastava uma página esquecer o `<head>` para ela
     * chegar sem estilo e sem título, e ninguém notava até abrir aquela tela.
     */
    for (const [caminho, titulo] of [
      ['/', 'Beever'],
      ['/login', 'Entrar'],
      ['/cadastro', 'Criar conta'],
      ['/manutencao', 'Em manutenção'],
    ]) {
      it(`monta ${caminho} dentro do layout`, async () => {
        const resposta = await request(app).get(caminho).set('Accept', 'text/html').expect(200);

        assert.match(resposta.text, /^<!doctype html>/i);
        assert.match(resposta.text, /<html lang="pt-BR">/);
        assert.match(resposta.text, /<link rel="stylesheet" href="\/css\/app\.css" \/>/);
        assert.ok(resposta.text.includes(titulo), `a página deveria se intitular "${titulo}"`);
        assert.match(resposta.text, /<\/body>\s*<\/html>/);
      });
    }

    // A landing deixou de usar o cabeçalho e o rodapé do app na T-11.3: a
    // superfície dela é escura, e a casca clara do app brigava com o herói. Na
    // T-11.6 ela ganhou rodapé próprio, com os créditos e o aviso do mel.
    it('a landing tem casca própria, e a tela de entrar não tem casca nenhuma', async () => {
      const home = await request(app).get('/').set('Accept', 'text/html').expect(200);
      assert.match(home.text, /beever_logo_white\.png/, 'o cabeçalho da landing usa o logo claro');
      assert.match(home.text, /projeto de conclusão de curso/, 'o rodapé da landing traz os créditos');
      assert.ok(!home.text.includes('bg-cera">\n    <div class="mx-auto flex max-w-5xl'), 'sem o cabeçalho do app');

      const login = await request(app).get('/login').set('Accept', 'text/html').expect(200);
      assert.ok(!login.text.includes('projeto de conclusão de curso'), 'tela de entrada é limpa, sem rodapé');
    });

    it('carrega o script só na página que precisa dele', async () => {
      const cadastro = await request(app).get('/cadastro').set('Accept', 'text/html').expect(200);
      // `type="module"` no lugar de `defer` desde a T-07.3: as telas de jogo
      // importam a parte comum, e módulo já é adiado por natureza.
      assert.match(cadastro.text, /<script src="\/js\/cadastro\.js" type="module"><\/script>/);

      const login = await request(app).get('/login').set('Accept', 'text/html').expect(200);
      assert.ok(!login.text.includes('<script'), 'página sem interatividade não carrega script nenhum');
    });
  });

  describe('identificação da requisição', () => {
    it('devolve um id em toda resposta', async () => {
      const resposta = await request(app).get('/').expect(200);
      assert.match(
        resposta.headers['x-request-id'],
        /^[0-9a-f-]{36}$/,
        'sem id no header, quem vê o erro não tem o que informar',
      );
    });

    it('cada requisição recebe o seu', async () => {
      const primeira = await request(app).get('/');
      const segunda = await request(app).get('/');
      assert.notEqual(primeira.headers['x-request-id'], segunda.headers['x-request-id']);
    });

    it('reaproveita o id que o proxy já atribuiu', async () => {
      const resposta = await request(app).get('/').set('x-request-id', 'nginx-abc.123_XYZ');
      assert.equal(resposta.headers['x-request-id'], 'nginx-abc.123_XYZ');
    });

    it('recusa id malformado e gera um limpo no lugar', async () => {
      // O id termina escrito em arquivo de log. Aceitar texto livre de um header
      // seria deixar quem chama decidir o que aparece lá.
      const sujo = 'requestId=x; nivel: falso "forjado"';
      const comprido = 'a'.repeat(200);

      for (const enviado of [sujo, comprido]) {
        const resposta = await request(app).get('/').set('x-request-id', enviado);
        assert.notEqual(resposta.headers['x-request-id'], enviado);
        assert.match(resposta.headers['x-request-id'], /^[0-9a-f-]{36}$/);
      }
    });

    it('o erro em JSON carrega o mesmo id do header', async () => {
      const resposta = await request(app)
        .get('/rota-que-nao-existe')
        .set('Accept', 'application/json')
        .expect(404);

      assert.equal(resposta.body.requestId, resposta.headers['x-request-id']);
    });

    it('a página de erro mostra o id para a pessoa poder citá-lo', async () => {
      const resposta = await request(app).get('/rota-que-nao-existe').set('Accept', 'text/html').expect(404);
      assert.ok(
        resposta.text.includes(resposta.headers['x-request-id']),
        'o id precisa aparecer na tela, não só no header',
      );
    });
  });
});
