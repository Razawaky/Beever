import assert from 'node:assert/strict';
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
 * A porta da área administrativa (T-12.1), com os três atores que existem:
 * anônimo, jogador comum e administrador.
 *
 * O aceite da E12 é literal — "usuário comum recebe 403 em toda rota admin" —,
 * então o teste percorre a lista de rotas montadas sob `/admin` em vez de
 * conferir uma só: rota nova que esquecer o middleware cai aqui.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

// Vêm do seed: `admin@beever.dev` tem linha em `admins`, `ana@beever.dev` não.
const ADMIN = { email: 'admin@beever.dev', senha: 'admin1234' };
const JOGADORA = { email: 'ana@beever.dev', senha: 'beever123' };

const ROTAS_ADMIN = ['/admin', '/admin/usuarios'];

describe('acesso à área administrativa', opcoes, () => {
  let banco;
  let app;

  async function tokenDe(agente, caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').redirects(2);
    const achado = /name="_csrf" value="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  /** Entra pela porta administrativa e devolve o agente já com a sessão. */
  async function entrarPeloAdmin(conta) {
    const agente = request.agent(app);
    const csrf = await tokenDe(agente, '/admin/login');
    const resposta = await agente
      .post('/admin/login')
      .set('Accept', 'application/json')
      .send({ ...conta, _csrf: csrf });
    return { agente, resposta };
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('o administrador do seed tem linha em `admins`, e a jogadora não', async () => {
    const [linhas] = await banco.conexao.query(
      `SELECT u.email FROM admins a JOIN users u ON u.id = a.user_id ORDER BY u.email`,
    );
    assert.deepEqual(
      linhas.map((linha) => linha.email),
      [ADMIN.email],
    );
  });

  it('o anônimo é mandado ao login administrativo quando pede página', async () => {
    for (const rota of ROTAS_ADMIN) {
      const resposta = await request(app).get(rota).set('Accept', 'text/html').expect(302);
      assert.equal(resposta.headers.location, '/admin/login', `${rota} deveria levar ao login`);
    }
  });

  it('o anônimo recebe 401 quando pede JSON', async () => {
    for (const rota of ROTAS_ADMIN) {
      await request(app).get(rota).set('Accept', 'application/json').expect(401);
    }
  });

  it('a jogadora comum recebe 403 em toda rota admin', async () => {
    const agente = request.agent(app);
    const csrf = await tokenDe(agente, '/login');
    await agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ ...JOGADORA, _csrf: csrf })
      .expect(200);

    for (const rota of ROTAS_ADMIN) {
      const resposta = await agente.get(rota).set('Accept', 'application/json').expect(403);
      assert.equal(resposta.body.codigo, 'ACESSO_NEGADO', `${rota} deveria recusar com 403`);
    }
  });

  it('a porta administrativa recusa a jogadora mesmo com a senha certa', async () => {
    const { agente, resposta } = await entrarPeloAdmin(JOGADORA);

    assert.equal(resposta.status, 401);
    assert.equal(resposta.body.codigo, 'CREDENCIAIS_INVALIDAS');
    assert.doesNotMatch(JSON.stringify(resposta.body), /admin/i, 'a recusa não pode dizer que o problema é o papel');

    // Recusar o login não pode abrir sessão nenhuma pela porta administrativa.
    await agente.get('/admin').set('Accept', 'application/json').expect(401);
  });

  it('a tentativa recusada fica na auditoria', async () => {
    const [linhas] = await banco.conexao.query(
      `SELECT action FROM audit_logs WHERE action = 'admin.login.recusado'`,
    );
    assert.ok(linhas.length >= 1, 'a porta administrativa registra quem tentou entrar sem ser admin');
  });

  it('o administrador entra e vê o painel e as contas', async () => {
    const { agente, resposta } = await entrarPeloAdmin(ADMIN);
    assert.equal(resposta.status, 200);
    assert.equal(resposta.body.ehAdmin, true);

    const painel = await agente.get('/admin').set('Accept', 'application/json').expect(200);
    assert.ok(painel.body.contas >= 2);
    assert.deepEqual(
      painel.body.administradores.map((admin) => admin.email),
      [ADMIN.email],
    );

    const contas = await agente.get('/admin/usuarios').set('Accept', 'application/json').expect(200);
    assert.ok(
      contas.body.some((conta) => conta.email === JOGADORA.email),
      'a listagem de contas é a que morava em GET /users',
    );

    // A página existe e não vaza senha nenhuma.
    const pagina = await agente.get('/admin/usuarios').set('Accept', 'text/html').expect(200);
    assert.match(pagina.text, /Contas/);
    assert.doesNotMatch(pagina.text, /password_hash|\$2[aby]\$/);
  });

  it('a listagem de contas não responde mais no endereço antigo', async () => {
    const { agente } = await entrarPeloAdmin(ADMIN);
    await agente.get('/users').set('Accept', 'application/json').expect(404);
  });
});
