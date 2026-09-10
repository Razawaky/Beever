// O login com Google só existe com as duas chaves configuradas, e o `env.js` lê
// o ambiente no carregamento: por isso elas vêm antes de qualquer import do projeto.
process.env.GOOGLE_CLIENT_ID = 'cliente-de-teste.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'segredo-de-teste';

import assert from 'node:assert/strict';
import { after, before, describe, it, mock } from 'node:test';

import { OAuth2Client } from 'google-auth-library';
import request from 'supertest';

await import('../helpers/ambiente.js');
const { criarBancoDeTeste, motivoParaPular } = await import('../helpers/banco.js');
const { criarApp } = await import('../../src/app.js');
const { fecharPool } = await import('../../src/config/database.js');
const { fecharSessionStore } = await import('../../src/config/session.js');

/**
 * Login com Google pelo HTTP. Os dois métodos do cliente que falam com o Google
 * são trocados por respostas prontas; todo o resto é o caminho real.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('login com Google', opcoes, () => {
  let banco;
  let app;
  let proximoPerfil;

  /** Faz a ida e a volta do Google com o perfil pedido, na mesma sessão do agente. */
  async function voltarDoGoogle(agente, perfil) {
    proximoPerfil = perfil;
    const ida = await agente.get('/sessao/google').expect(302);
    const state = new URL(ida.headers.location).searchParams.get('state');
    return agente.get(`/sessao/google/retorno?code=codigo-de-teste&state=${state}`).set('Accept', 'text/html');
  }

  async function usuarioPorEmail(email) {
    const [linhas] = await banco.conexao.query(
      'SELECT id, google_sub, password_hash FROM users WHERE email = ?',
      [email],
    );
    return linhas[0] ?? null;
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    mock.method(OAuth2Client.prototype, 'getToken', async () => ({ tokens: { id_token: 'token-de-teste' } }));
    mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({ getPayload: () => proximoPerfil }));
  });

  after(async () => {
    mock.restoreAll();
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('login e cadastro mostram o botão do Google', async () => {
    for (const caminho of ['/login', '/cadastro']) {
      const resposta = await request(app).get(caminho).set('Accept', 'text/html').expect(200);
      assert.match(resposta.text, /href="\/sessao\/google"/, `${caminho} sem o botão`);
    }
  });

  it('a ida leva ao Google com state, PKCE e só o escopo de e-mail', async () => {
    const resposta = await request(app).get('/sessao/google').expect(302);
    const destino = new URL(resposta.headers.location);

    assert.equal(destino.host, 'accounts.google.com');
    assert.ok(destino.searchParams.get('state'));
    assert.equal(destino.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(destino.searchParams.get('scope'), 'openid email');
  });

  it('volta com state trocado é recusada', async () => {
    const agente = request.agent(app);
    await agente.get('/sessao/google').expect(302);
    const resposta = await agente
      .get('/sessao/google/retorno?code=codigo-de-teste&state=plantado')
      .set('Accept', 'application/json');

    assert.equal(resposta.status, 400);
    assert.equal(resposta.body.codigo, 'GOOGLE_FALHOU');
  });

  it('quem cancela na tela do Google volta para o login', async () => {
    const resposta = await request(app).get('/sessao/google/retorno?error=access_denied').expect(302);
    assert.equal(resposta.headers.location, '/login');
  });

  it('a tela de completar cadastro exige ter vindo do Google', async () => {
    const resposta = await request(app).get('/cadastro/google').expect(302);
    assert.equal(resposta.headers.location, '/login');
  });

  it('primeira vez pelo Google: completa o cadastro sem senha e cai no onboarding', async () => {
    const agente = request.agent(app);
    const volta = await voltarDoGoogle(agente, { sub: 'google-leo', email: 'Leo@Gmail.com', email_verified: true });
    assert.equal(volta.headers.location, '/cadastro/google');

    const tela = await agente.get('/cadastro/google').set('Accept', 'text/html').expect(200);
    assert.match(tela.text, /leo@gmail\.com/);
    assert.doesNotMatch(tela.text, /name="apelido"[^>]*value=/, 'o apelido nasce vazio, sem nome do Google (RN-049)');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(tela.text)[1];

    const cadastro = await agente
      .post('/sessao/google/cadastro')
      .type('form')
      .send({ apelido: 'Leozinho', data_nasc: '2014-05-10', consentimento_responsavel: 'on', _csrf: csrf })
      .expect(302);
    assert.equal(cadastro.headers.location, '/onboarding');

    const conta = await usuarioPorEmail('leo@gmail.com');
    assert.equal(conta.google_sub, 'google-leo');
    assert.equal(conta.password_hash, null);
    await agente.get('/sessao/check').set('Accept', 'application/json').expect(200);
  });

  it('segunda vez pelo Google: entra direto, sem novo cadastro', async () => {
    const volta = await voltarDoGoogle(request.agent(app), { sub: 'google-leo', email: 'leo@gmail.com', email_verified: true });
    assert.equal(volta.headers.location, '/onboarding');
  });

  it('conta criada pelo Google não entra por senha', async () => {
    const agente = request.agent(app);
    const pagina = await agente.get('/login').set('Accept', 'text/html');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(pagina.text)[1];
    const resposta = await agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ email: 'leo@gmail.com', senha: 'qualquer123', _csrf: csrf });
    assert.equal(resposta.status, 401);
  });

  it('e-mail do Google não verificado não vincula conta existente', async () => {
    const volta = await voltarDoGoogle(request.agent(app), { sub: 'google-falso', email: 'ana@beever.dev', email_verified: false });
    assert.equal(volta.status, 400);
    assert.equal((await usuarioPorEmail('ana@beever.dev')).google_sub, null);
  });

  it('e-mail verificado de conta existente vincula o Google e entra na mesma conta', async () => {
    const volta = await voltarDoGoogle(request.agent(app), { sub: 'google-ana', email: 'ana@beever.dev', email_verified: true });
    assert.equal(volta.headers.location, '/painel');

    const conta = await usuarioPorEmail('ana@beever.dev');
    assert.equal(conta.google_sub, 'google-ana');
    assert.ok(conta.password_hash, 'a senha antiga continua valendo');

    const [auditoria] = await banco.conexao.query(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE action = 'conta.google_vinculado' AND entity_id = ?",
      [conta.id],
    );
    assert.equal(Number(auditoria[0].total), 1);
  });
});
