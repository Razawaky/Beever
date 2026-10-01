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
 * As recusas que a autenticação precisa saber dar (T-03.6).
 *
 * Um sistema de login se julga menos pelo que aceita do que pelo que recusa, e
 * nenhuma destas recusas tinha teste: senha fraca, e-mail repetido, credencial
 * errada e sessão que não vale mais. Todas passavam por verificação manual, que
 * é o mesmo que dizer que passavam por nada.
 *
 * O brute force fica em arquivo próprio: ele precisa do rate limit ligado, e o
 * rate limit se desliga sozinho em ambiente de teste para não estorvar o resto
 * da suíte.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const CONTA = {
  apelido: 'guardiao',
  email: 'seguranca@beever.dev',
  data_nasc: '2014-02-02',
  senha: 'beever123',
  consentimento_responsavel: 'on',
};

describe('recusas da autenticação', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;

  /**
   * Lê o token de CSRF de uma página, com um segundo GET antes.
   *
   * O primeiro GET cria a sessão; o `express-mysql-session` só termina de
   * gravá-la no MySQL depois que a resposta já saiu. Um POST imediatamente
   * depois pode chegar antes disso, encontrar sessão nenhuma e receber um token
   * novo — 403 sem que nada esteja errado no código. O segundo GET só acontece
   * quando a linha já está no banco, e é o que torna o teste determinístico.
   */
  async function tokenDe(agente, caminho = '/login') {
    // Segue redirecionamento porque a página certa depende do estado da conta:
    // `/painel` manda para `/onboarding` enquanto o perfil não foi configurado,
    // e é lá que o token está. As duas formas são aceitas porque o wizard o
    // entrega pelo dataset do body, e o resto por campo escondido.
    const resposta = await agente.get(caminho).set('Accept', 'text/html').redirects(2);
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);
    csrf = await tokenDe(agente);

    const criacao = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({ ...CONTA, _csrf: csrf });
    if (criacao.status !== 201) {
      throw new Error(`cadastro do before falhou: ${criacao.status} ${JSON.stringify(criacao.body)}`);
    }

    // O cadastro loga e regenera a sessão: o token de antes morreu com ela.
    await agente.post('/sessao/logout').set('Accept', 'application/json').send({ _csrf: csrf });
    csrf = await tokenDe(agente);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('recusa senha fraca e diz o que falta, sem criar conta', async () => {
    for (const [senha, esperado] of [
      ['curta1', /8 caracteres/],
      ['somenteletras', /números/],
      ['12345678', /letras/],
    ]) {
      const resposta = await agente
        .post('/users')
        .set('Accept', 'application/json')
        .send({ ...CONTA, email: `fraca-${senha}@beever.dev`, senha, _csrf: csrf })
        .expect(422);

      assert.match(JSON.stringify(resposta.body.detalhes ?? resposta.body), esperado);
    }

    const [linhas] = await banco.conexao.query("SELECT id FROM users WHERE email LIKE 'fraca-%'");
    assert.equal(linhas.length, 0, 'nenhuma conta pode nascer de senha recusada');
  });

  it('recusa e-mail já cadastrado com 409, sem revelar mais nada', async () => {
    const resposta = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({ ...CONTA, apelido: 'outro', _csrf: csrf })
      .expect(409);

    assert.equal(resposta.body.codigo, 'EMAIL_EM_USO');

    const [linhas] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', [CONTA.email]);
    assert.equal(linhas.length, 1, 'a conta original continua única');
  });

  it('a senha nunca aparece na resposta, nem quando dá erro', async () => {
    const recusa = await agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ email: CONTA.email, senha: 'senhaerrada1', _csrf: csrf })
      .expect(401);

    assert.ok(!JSON.stringify(recusa.body).includes('senhaerrada1'));
    assert.ok(!JSON.stringify(recusa.body).includes('$2b$'), 'nem o hash pode escapar');
  });

  it('credencial errada e e-mail inexistente respondem exatamente igual', async () => {
    const senhaErrada = await agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ email: CONTA.email, senha: 'outrasenha123', _csrf: csrf })
      .expect(401);

    const contaInexistente = await agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ email: 'ninguem@beever.dev', senha: 'outrasenha123', _csrf: csrf })
      .expect(401);

    // Respostas diferentes entregariam a lista de e-mails cadastrados a quem
    // testasse um por um. A mensagem única é a defesa, e é fácil de perder numa
    // refatoração distraída.
    // O `requestId` é a única coisa que muda entre as duas respostas, e muda de
    // propósito: ele identifica a requisição, não a conta.
    const semRequestId = ({ requestId: _requestId, ...resto }) => resto;
    assert.deepEqual(semRequestId(senhaErrada.body), semRequestId(contaInexistente.body));
    assert.equal(senhaErrada.body.codigo, 'CREDENCIAIS_INVALIDAS');
    assert.equal(senhaErrada.status, contaInexistente.status);
  });

  it('conta inativa não entra, mesmo com a senha certa', async () => {
    await banco.conexao.query('UPDATE users SET is_active = 0 WHERE email = ?', [CONTA.email]);
    const resposta = await agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ email: CONTA.email, senha: CONTA.senha, _csrf: csrf })
      .expect(403);

    assert.equal(resposta.body.codigo, 'CONTA_INATIVA');
    await banco.conexao.query('UPDATE users SET is_active = 1 WHERE email = ?', [CONTA.email]);
  });

  it('sessão expirada perde o acesso, mesmo com o cookie na mão', async () => {
    await agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ email: CONTA.email, senha: CONTA.senha, _csrf: csrf })
      .expect(200);

    csrf = await tokenDe(agente, '/painel');
    await agente.get('/perfil/meu').set('Accept', 'application/json').expect(200);

    // A sessão vive no MySQL, não no cookie: apagar a linha é o que acontece
    // quando ela expira. O cookie do agente continua o mesmo, e é justamente o
    // ponto — quem guardou o cookie não pode voltar com ele.
    await banco.conexao.query('DELETE FROM sessions');

    await agente.get('/perfil/meu').set('Accept', 'application/json').expect(401);
    const pagina = await agente.get('/painel').set('Accept', 'text/html').expect(302);
    assert.equal(pagina.headers.location, '/login');

    csrf = await tokenDe(agente);
  });

  it('logout invalida a sessão no servidor, não só no navegador', async () => {
    await agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ email: CONTA.email, senha: CONTA.senha, _csrf: csrf })
      .expect(200);

    csrf = await tokenDe(agente, '/painel');
    const [antes] = await banco.conexao.query('SELECT session_id FROM sessions');
    await agente
      .post('/sessao/logout')
      .set('Accept', 'application/json')
      .send({ _csrf: csrf })
      .expect(200);
    const [depois] = await banco.conexao.query('SELECT session_id FROM sessions');

    assert.ok(depois.length < antes.length, 'a linha da sessão precisa sumir do banco');
    await agente.get('/perfil/meu').set('Accept', 'application/json').expect(401);

    csrf = await tokenDe(agente);
  });

  it('uma conta não altera nem desativa a conta de outra pessoa', async () => {
    // O buraco que a auditoria da E03 encontrou: as rotas de conta exigiam
    // sessão e paravam aí. O id vinha da URL e entrava direto no `UPDATE`, então
    // qualquer criança cadastrada trocava o e-mail e a senha de qualquer outra e
    // assumia o lugar dela. A auditoria registrava o atacante com precisão —
    // gravar o fato nunca foi o mesmo que impedi-lo.
    const invasor = request.agent(app);
    let tokenInvasor = await tokenDe(invasor);

    const criacao = await invasor
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'invasor',
        email: 'invasor@beever.dev',
        data_nasc: '2013-05-05',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: tokenInvasor,
      })
      .expect(201);

    // A conta do invasor existe e está logada; o alvo é a conta do `before`.
    const [[alvo]] = await banco.conexao.query('SELECT id, email, password_hash FROM users WHERE email = ?', [
      CONTA.email,
    ]);
    assert.notEqual(Number(alvo.id), Number(criacao.body.id), 'o teste precisa de duas contas diferentes');

    tokenInvasor = await tokenDe(invasor, '/painel');

    const alteracao = await invasor
      .put(`/users/${alvo.id}`)
      .set('Accept', 'application/json')
      .send({ email: 'roubada@beever.dev', senha: 'invadida123', _csrf: tokenInvasor })
      .expect(403);
    assert.equal(alteracao.body.codigo, 'ACESSO_NEGADO');

    const desativacao = await invasor
      .delete(`/users/${alvo.id}`)
      .set('Accept', 'application/json')
      .send({ _csrf: tokenInvasor })
      .expect(403);
    assert.equal(desativacao.body.codigo, 'ACESSO_NEGADO');

    // A recusa vale pelo que o banco continua mostrando, não pelo status.
    const [[depois]] = await banco.conexao.query('SELECT email, password_hash, is_active FROM users WHERE id = ?', [
      alvo.id,
    ]);
    assert.equal(depois.email, CONTA.email, 'o e-mail do alvo continua o dele');
    assert.equal(depois.password_hash, alvo.password_hash, 'a senha do alvo não foi trocada');
    assert.equal(Boolean(depois.is_active), true, 'a conta do alvo continua ativa');
  });

  it('o dono continua alterando a própria conta', async () => {
    // A defesa não pode ter passado do ponto: quem é dono precisa continuar
    // trocando o próprio apelido.
    await agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ email: CONTA.email, senha: CONTA.senha, _csrf: csrf })
      .expect(200);

    const token = await tokenDe(agente, '/painel');
    const [[dono]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', [CONTA.email]);

    const resposta = await agente
      .put(`/users/${dono.id}`)
      .set('Accept', 'application/json')
      .send({ apelido: 'guardiao-renomeado', _csrf: token })
      .expect(200);
    assert.equal(resposta.body.nickname, 'guardiao-renomeado');

    await agente.post('/sessao/logout').set('Accept', 'application/json').send({ _csrf: token });
    csrf = await tokenDe(agente);
  });
});
