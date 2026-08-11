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
});
