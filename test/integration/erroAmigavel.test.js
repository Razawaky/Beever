// Ambiente ajustado antes dos imports: `env.js` lê `process.env` ao carregar.
// Diferente de `erroEmProducao.test.js`, este arquivo roda como desenvolvimento
// para provar que o stack também fica de fora quando não é produção.
process.env.NODE_ENV ??= 'test';
process.env.DB_HOST ??= '127.0.0.1';
process.env.DB_USER ??= 'root';
process.env.DB_PASSWORD ??= 'root';
process.env.DB_NAME ??= 'beever_teste_erro_amigavel';
process.env.SESSION_SECRET ??= 'segredo-de-teste-erro-amigavel';

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import express from 'express';
import request from 'supertest';

const { errorHandler } = await import('../../src/middlewares/errorHandler.js');
const { notFound } = await import('../../src/middlewares/notFound.js');
const { ErroAplicacao } = await import('../../src/utils/erros.js');

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');

function appDeErros() {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(raiz, 'views'));

  app.get('/quebra', () => {
    throw new Error('segredo do banco em /srv/app/config.js:42:9');
  });
  app.get('/recusa', () => {
    throw new ErroAplicacao('Mel insuficiente', { status: 422, codigo: 'MEL_INSUFICIENTE' });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe('erro amigável', () => {
  const app = appDeErros();

  it('a tela fora de produção esconde stack, segredo e caminho de arquivo', async () => {
    const resposta = await request(app).get('/quebra').set('Accept', 'text/html').expect(500);

    assert.ok(!resposta.text.includes('segredo do banco'));
    assert.ok(!resposta.text.includes('config.js'));
    assert.ok(!/\.js:\d+:\d+/.test(resposta.text));
    assert.match(resposta.text, /Ops, algo deu errado/);
    assert.match(resposta.text, /Erro interno do servidor/);
    assert.equal((resposta.text.match(/<h1\b/g) ?? []).length, 1);
    assert.match(resposta.text, /href="\/(?:|painel)"/);
  });

  it('HTMX recebe JSON com o status, sem página de erro nem redirect', async () => {
    const resposta = await request(app)
      .get('/quebra')
      .set('HX-Request', 'true')
      .set('Accept', 'text/html')
      .expect(500);

    assert.match(resposta.headers['content-type'], /application\/json/);
    assert.equal(resposta.body.erro, 'Erro interno do servidor');
    assert.equal(resposta.body.codigo, 'ERRO_INTERNO');
    assert.equal(resposta.body.stack, undefined);
    assert.ok(!JSON.stringify(resposta.body).includes('segredo do banco'));
  });

  it('XHR clássico também recebe JSON', async () => {
    const resposta = await request(app)
      .get('/recusa')
      .set('X-Requested-With', 'XMLHttpRequest')
      .expect(422);

    assert.equal(resposta.body.erro, 'Mel insuficiente');
    assert.equal(resposta.body.codigo, 'MEL_INSUFICIENTE');
  });

  it('rota inexistente é 404 amigável no HTML e curto no HTMX', async () => {
    const html = await request(app).get('/nao-existe').set('Accept', 'text/html').expect(404);
    assert.match(html.text, /Página não encontrada/);
    assert.ok(!html.text.includes('nao-existe'));

    const htmx = await request(app)
      .get('/nao-existe')
      .set('HX-Request', 'true')
      .expect(404);
    assert.equal(htmx.body.codigo, 'NAO_ENCONTRADO');
    assert.equal(htmx.body.erro, 'Página não encontrada');
  });
});
