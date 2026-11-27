// O limite de login se desliga em NODE_ENV=test, e é exatamente ele que expôs
// este defeito: com middleware assíncrono na rota, a sessão regenerada não era
// gravada no store e o cookie novo chegava ao navegador sem sessão nenhuma.
// Por isso este arquivo rota de propósito fora do ambiente de teste.
process.env.NODE_ENV = 'development';
process.env.LOG_LEVEL = 'silent';

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

import './../helpers/ambiente.js';

const { criarBancoDeTeste, motivoParaPular } = await import('../helpers/banco.js');
const { criarCrianca } = await import('../helpers/fixturesDeCadastro.js');
const { criarApp } = await import('../../src/app.js');
const { fecharPool } = await import('../../src/config/database.js');
const { fecharSessionStore } = await import('../../src/config/session.js');

/**
 * Login precisa valer até a próxima requisição (RNF-01).
 *
 * O fluxo que o navegador realmente faz é: POST /sessao/login, redirect,
 * GET /painel. Se a sessão regenerada não for salva antes da resposta, o
 * redirecionamento acontece, a página de destino cai em /login e a pessoa fica
 * sem entender por que "entrou" mas não entrou. Testar só o status do POST —
 * como a suíte fazia — deixa o buraco passar.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const CONTA = {
  apelido: 'sessao-persistida',
  email: 'sessao-persistida@beever.dev',
  data_nasc: '2013-09-09',
  senha: 'beever123',
  consentimento_responsavel: 'on',
};

describe('sessão persistida no login', opcoes, () => {
  let banco;
  let app;
  let agente;

  async function tokenDe(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function entrar() {
    const csrf = await tokenDe('/login');
    return agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ email: CONTA.email, senha: CONTA.senha, _csrf: csrf });
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);

    const resposta = await criarCrianca(agente, CONTA);
    assert.equal(resposta.status, 201);

    const perfilId = resposta.body.idPerfil;
    await agente
      .put(`/perfil/${perfilId}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: CONTA.apelido,
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['1', '2', '3', '4', '5'],
        tempo: 10,
        _csrf: await tokenDe('/onboarding'),
      })
      .expect(200);

    await agente
      .post('/sessao/logout')
      .set('Accept', 'application/json')
      .send({ _csrf: await tokenDe('/perfis') })
      .expect(200);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a sessão do login sobrevive ao redirecionamento', async () => {
    const entrada = await entrar();
    assert.equal(entrada.status, 200);
    assert.equal(entrada.body.email, CONTA.email);

    const sessao = await agente.get('/sessao/check').set('Accept', 'application/json').expect(200);
    assert.equal(sessao.body.autenticado, true);
    assert.ok(sessao.body.usuarioId > 0);

    await agente.get('/painel').set('Accept', 'text/html').redirects(2).expect(200);
  });

  it('sai e entra de novo sem perder a sessão na segunda vez', async () => {
    await agente
      .post('/sessao/logout')
      .set('Accept', 'application/json')
      .send({ _csrf: await tokenDe('/perfis') })
      .expect(200);
    await agente.get('/painel').set('Accept', 'text/html').expect(302);

    const entrada = await entrar();
    assert.equal(entrada.status, 200);
    await agente.get('/sessao/check').set('Accept', 'application/json').expect(200);
    await agente.get('/painel').set('Accept', 'text/html').redirects(2).expect(200);
  });

  it('também guarda a sessão quando o navegador segue o redirect HTML', async () => {
    await agente
      .post('/sessao/logout')
      .set('Accept', 'application/json')
      .send({ _csrf: await tokenDe('/perfis') })
      .expect(200);

    const csrf = await tokenDe('/login');
    const entrada = await agente
      .post('/sessao/login')
      .set('Accept', 'text/html')
      .send({ email: CONTA.email, senha: CONTA.senha, _csrf: csrf })
      .expect(302);
    assert.equal(entrada.headers.location, '/perfis');

    await agente.get('/perfis').set('Accept', 'text/html').expect(200);
    await agente.get('/painel').set('Accept', 'text/html').redirects(2).expect(200);
  });
});
