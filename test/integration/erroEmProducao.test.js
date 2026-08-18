// Este arquivo roda como se fosse produção, e por isso ajusta o ambiente antes
// de qualquer import do projeto — `env.js` lê `process.env` no carregamento.
process.env.NODE_ENV = 'production';
process.env.SESSION_SECRET ??= 'segredo-de-teste-que-nao-e-o-de-exemplo';

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import express from 'express';
import request from 'supertest';

const { errorHandler } = await import('../../src/middlewares/errorHandler.js');
const { ErroAplicacao } = await import('../../src/utils/erros.js');

/**
 * Em produção, o erro não conta nada demais.
 *
 * Este era o único item do aceite da E02 que nunca havia sido exercitado: o
 * `errorHandler` esconde o stack fora de desenvolvimento, mas isso era leitura
 * de código, não verificação — e a diferença entre as duas é justamente o que
 * uma auditoria existe para cobrar.
 *
 * O app aqui é mínimo de propósito: só o que faz o handler funcionar, mais duas
 * rotas que estouram. Subir a aplicação inteira em modo produção exigiria HTTPS
 * (o cookie de sessão é `secure`), e não é o handler que se quer testar através
 * de um proxy TLS.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');

function appDeProducao() {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(raiz, 'views'));

  app.get('/explode', () => {
    throw new Error('Falha proposital com segredo: senha do banco é 12345');
  });
  app.get('/recusa', () => {
    throw new ErroAplicacao('Mel insuficiente', { status: 422, codigo: 'MEL_INSUFICIENTE' });
  });

  app.use(errorHandler);
  return app;
}

describe('erro em produção', () => {
  const app = appDeProducao();

  it('a página de erro não mostra stack trace nem a mensagem interna', async () => {
    const resposta = await request(app).get('/explode').set('Accept', 'text/html').expect(500);

    assert.ok(!resposta.text.includes('senha do banco'), 'mensagem interna não pode chegar ao cliente');
    assert.ok(!resposta.text.includes('at Object'), 'nenhum quadro de stack na página');
    assert.ok(!/\.js:\d+:\d+/.test(resposta.text), 'nenhum caminho de arquivo com linha e coluna');
    assert.match(resposta.text, /Erro interno do servidor/);
  });

  it('o JSON de erro devolve código e nada além', async () => {
    const resposta = await request(app).get('/explode').set('Accept', 'application/json').expect(500);

    assert.equal(resposta.body.erro, 'Erro interno do servidor');
    assert.equal(resposta.body.codigo, 'ERRO_INTERNO');
    assert.equal(resposta.body.stack, undefined);
    assert.ok(!JSON.stringify(resposta.body).includes('senha do banco'));
  });

  it('erro esperado mantém a mensagem, porque ela é para o jogador ler', async () => {
    const resposta = await request(app).get('/recusa').set('Accept', 'application/json').expect(422);

    assert.equal(resposta.body.erro, 'Mel insuficiente');
    assert.equal(resposta.body.codigo, 'MEL_INSUFICIENTE');
    assert.equal(resposta.body.stack, undefined);
  });
});
