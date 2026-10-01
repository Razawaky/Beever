import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, idDoUsuario, motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';
import { gerarToken, hashDoToken } from '../../src/services/passwordResetService.js';

/** Recuperação de senha por e-mail (RF-AUT-06, T-17.5), percorrida pelo HTTP. */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

// A Ana vem do seed. Os testes rodam em ordem e cada troca de senha parte da anterior.
const ANA = { email: 'ana@beever.dev', senha: 'beever123' };

describe('recuperação de senha', opcoes, () => {
  let banco;
  let app;
  let idDaAna;

  async function tokenCsrf(agente) {
    const resposta = await agente.get('/recuperar-senha').set('Accept', 'text/html');
    return /name="_csrf" value="([^"]+)"/.exec(resposta.text)[1];
  }

  async function postar(agente, caminho, corpo) {
    const csrf = await tokenCsrf(agente);
    return agente.post(caminho).set('Accept', 'application/json').send({ ...corpo, _csrf: csrf });
  }

  /** Grava um token direto no banco, como o e-mail teria entregado. Minutos negativos fazem um token vencido. */
  async function plantarToken(usuarioId, minutos = 60) {
    const token = gerarToken();
    await banco.conexao.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))`,
      [usuarioId, hashDoToken(token), minutos],
    );
    return token;
  }

  async function tokensDe(usuarioId) {
    const [linhas] = await banco.conexao.query(
      'SELECT token_hash, used_at, TIMESTAMPDIFF(MINUTE, UTC_TIMESTAMP(), expires_at) AS minutos FROM password_reset_tokens WHERE user_id = ? ORDER BY id',
      [usuarioId],
    );
    return linhas;
  }

  async function contarAuditoria(acao, usuarioId) {
    const [linhas] = await banco.conexao.query(
      'SELECT COUNT(*) AS total FROM audit_logs WHERE action = ? AND entity_id = ?',
      [acao, usuarioId],
    );
    return Number(linhas[0].total);
  }

  async function entrar(conta) {
    const agente = request.agent(app);
    const resposta = await postar(agente, '/sessao/login', conta);
    return { agente, resposta };
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    idDaAna = await idDoUsuario(banco.conexao, ANA.email);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a tela de login tem o link "Esqueceu a senha?"', async () => {
    const resposta = await request(app).get('/login').set('Accept', 'text/html').expect(200);
    assert.match(resposta.text, /href="\/recuperar-senha"/);
  });

  it('o pedido para e-mail cadastrado grava um token com hash e validade de uma hora', async () => {
    const resposta = await postar(request.agent(app), '/sessao/recuperar-senha', { email: ANA.email });
    assert.equal(resposta.status, 200);

    const tokens = await tokensDe(idDaAna);
    assert.equal(tokens.length, 1);
    assert.match(tokens[0].token_hash, /^[0-9a-f]{64}$/);
    assert.ok(tokens[0].minutos >= 58 && tokens[0].minutos <= 60, `validade de ${tokens[0].minutos} minutos`);
    assert.equal(await contarAuditoria('senha.recuperacao_solicitada', idDaAna), 1);
  });

  it('e-mail que não existe recebe exatamente a mesma resposta, e nada é gravado', async () => {
    const existe = await postar(request.agent(app), '/sessao/recuperar-senha', { email: ANA.email });
    const naoExiste = await postar(request.agent(app), '/sessao/recuperar-senha', { email: 'ninguem@beever.dev' });

    assert.equal(naoExiste.status, existe.status);
    assert.deepEqual(naoExiste.body, existe.body);

    const [linhas] = await banco.conexao.query('SELECT COUNT(*) AS total FROM password_reset_tokens');
    assert.equal(Number(linhas[0].total), (await tokensDe(idDaAna)).length);
  });

  it('um pedido novo aposenta os links anteriores', async () => {
    const tokens = await tokensDe(idDaAna);
    const abertos = tokens.filter((token) => token.used_at === null);
    assert.equal(abertos.length, 1, 'só o último pedido continua valendo');
  });

  it('a tela do link mostra o formulário para token válido e o aviso para token vencido', async () => {
    const valido = await plantarToken(idDaAna);
    const vencido = await plantarToken(idDaAna, -1);

    const comValido = await request(app).get(`/redefinir-senha?token=${valido}`).set('Accept', 'text/html');
    assert.match(comValido.text, /name="senha"/);

    const comVencido = await request(app).get(`/redefinir-senha?token=${vencido}`).set('Accept', 'text/html');
    assert.doesNotMatch(comVencido.text, /name="senha"/);
    assert.match(comVencido.text, /venceu ou já foi usado/);

    const semToken = await request(app).get('/redefinir-senha').set('Accept', 'text/html');
    assert.match(semToken.text, /venceu ou já foi usado/);
  });

  it('token vencido não troca a senha', async () => {
    const vencido = await plantarToken(idDaAna, -1);
    const resposta = await postar(request.agent(app), '/sessao/redefinir-senha', {
      token: vencido,
      senha: 'novaSenha1',
      confirmarSenha: 'novaSenha1',
    });

    assert.equal(resposta.status, 400);
    assert.equal(resposta.body.codigo, 'LINK_INVALIDO');
    assert.equal((await entrar(ANA)).resposta.status, 200, 'a senha antiga continua valendo');
  });

  it('senha e confirmação diferentes são recusadas', async () => {
    const token = await plantarToken(idDaAna);
    const resposta = await postar(request.agent(app), '/sessao/redefinir-senha', {
      token,
      senha: 'novaSenha1',
      confirmarSenha: 'outraSenha1',
    });
    assert.equal(resposta.status, 422);
  });

  it('token válido troca a senha: a nova entra, a antiga não, e o link não serve de novo', async () => {
    const token = await plantarToken(idDaAna);
    const corpo = { token, senha: 'novaSenha1', confirmarSenha: 'novaSenha1' };

    const primeira = await postar(request.agent(app), '/sessao/redefinir-senha', corpo);
    assert.equal(primeira.status, 200);

    assert.equal((await entrar({ email: ANA.email, senha: 'novaSenha1' })).resposta.status, 200);
    assert.equal((await entrar(ANA)).resposta.status, 401);

    const segunda = await postar(request.agent(app), '/sessao/redefinir-senha', { ...corpo, senha: 'outra1234', confirmarSenha: 'outra1234' });
    assert.equal(segunda.status, 400);
    assert.equal(await contarAuditoria('senha.redefinida', idDaAna), 1);
  });

  it('pelo formulário, a troca termina no login com o aviso de senha alterada', async () => {
    const token = await plantarToken(idDaAna);
    const agente = request.agent(app);
    const csrf = await tokenCsrf(agente);

    const resposta = await agente
      .post('/sessao/redefinir-senha')
      .set('Accept', 'text/html')
      .type('form')
      .send({ token, senha: 'terceira1', confirmarSenha: 'terceira1', _csrf: csrf })
      .expect(302);
    assert.equal(resposta.headers.location, '/login?senha=alterada');

    const login = await request(app).get('/login?senha=alterada').set('Accept', 'text/html');
    assert.match(login.text, /Senha alterada/);
  });

  it('sem marcar "sair de todos os aparelhos", quem já estava dentro continua dentro', async () => {
    const { agente } = await entrar({ email: ANA.email, senha: 'terceira1' });
    const token = await plantarToken(idDaAna);

    await postar(request.agent(app), '/sessao/redefinir-senha', {
      token,
      senha: 'quarta123',
      confirmarSenha: 'quarta123',
    });

    await agente.get('/sessao/check').set('Accept', 'application/json').expect(200);
  });

  it('marcando "sair de todos os aparelhos", toda sessão aberta da conta cai na hora', async () => {
    const { agente } = await entrar({ email: ANA.email, senha: 'quarta123' });
    const token = await plantarToken(idDaAna);

    await postar(request.agent(app), '/sessao/redefinir-senha', {
      token,
      senha: 'quinta123',
      confirmarSenha: 'quinta123',
      desconectarTodos: 'on',
    });

    await agente.get('/sessao/check').set('Accept', 'application/json').expect(401);
  });
});
