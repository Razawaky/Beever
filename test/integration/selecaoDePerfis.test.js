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

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const CONTA = {
  apelido: 'perfis',
  email: 'perfis@beever.dev',
  data_nasc: '2014-05-01',
  senha: 'beever123',
  consentimento_responsavel: 'on',
};

describe('seleção de perfis', opcoes, () => {
  let banco;
  let agente;
  let contaId;
  let perfilId;
  let perfilIrma;

  async function lerToken(caminho) {
    return lerTokenPara(agente, caminho);
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    agente = request.agent(criarApp());

    let csrf = await lerToken('/login');
    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({ ...CONTA, _csrf: csrf })
      .expect(201);
    contaId = cadastro.body.id;
    perfilId = cadastro.body.idPerfil;

    csrf = await lerToken('/onboarding');
    await agente
      .put(`/perfil/${perfilId}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: CONTA.apelido,
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['0', '1', '2', '3', '4', '5', '6'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('lista o perfil da conta e oferece a criação de outro', async () => {
    const resposta = await agente.get('/perfis').set('Accept', 'text/html').expect(200);
    const html = resposta.text;

    assert.match(html, /Quem está jogando\?/, 'a tela precisa se apresentar como seleção de perfil');
    assert.match(html, new RegExp(`action="/perfis/${perfilId}/selecionar"`), 'o perfil precisa ser selecionável');
    assert.match(html, /name="_csrf"/, 'a seleção precisa carregar o token CSRF');
    assert.match(html, /id="btn-criar-perfil"/, 'o botão de criar perfil sumiu');
    assert.match(html, /id="dialogo-criar-perfil"/, 'o diálogo de criação precisa existir');
    assert.match(html, /\/js\/perfis\.js/, 'a tela precisa carregar o script do diálogo');
    assert.match(html, /perfis@beever\.dev/, 'a tela precisa identificar a conta');
    assert.doesNotMatch(html, /data-menu-perfil/, 'a conta principal não pode ser excluída por aqui');

    // O perfil atual ganha um marcador textual, não só cor.
    assert.match(html, /Perfil atual/);
  });

  it('a seleção troca o perfil ativo e volta para a Colmeia', async () => {
    const csrf = await lerToken('/perfis');

    const resposta = await agente
      .post(`/perfis/${perfilId}/selecionar`)
      .set('Accept', 'text/html')
      .send({ _csrf: csrf })
      .expect(302);

    assert.equal(resposta.headers.location, '/painel');
    await agente.get('/painel').set('Accept', 'text/html').expect(200);
  });

  it('a página também responde JSON para quem pede dados', async () => {
    const resposta = await agente.get('/perfis').set('Accept', 'application/json').expect(200);

    assert.equal(resposta.body.perfis.length, 1);
    assert.equal(resposta.body.perfis[0].id, perfilId);
    assert.equal(resposta.body.perfilAtualId, perfilId);
  });

  it('o login de uma conta configurada passa pela seleção antes do painel', async () => {
    const outroNavegador = request.agent(criarApp());
    const csrf = await lerTokenPara(outroNavegador, '/login');

    const resposta = await outroNavegador
      .post('/sessao/login')
      .set('Accept', 'text/html')
      .send({ email: CONTA.email, senha: CONTA.senha, _csrf: csrf })
      .expect(302);

    assert.equal(resposta.headers.location, '/perfis');
  });

  it('perfil de outra conta não pode ser selecionado', async () => {
    const intruso = request.agent(criarApp());
    let csrf = await lerTokenPara(intruso, '/login');
    const cadastro = await intruso
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'intruso',
        email: 'intruso@beever.dev',
        data_nasc: '2014-05-01',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: csrf,
      })
      .expect(201);

    csrf = await lerTokenPara(intruso, '/onboarding');
    await intruso
      .put(`/perfil/${cadastro.body.idPerfil}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: 'intruso',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['0'],
        _csrf: csrf,
      })
      .expect(200);

    csrf = await lerTokenPara(intruso, '/perfis');
    await intruso
      .post(`/perfis/${perfilId}/selecionar`)
      .set('Accept', 'application/json')
      .send({ _csrf: csrf })
      .expect(403);
  });

  it('cria um perfil novo, entra nele e abre a configuração pendente', async () => {
    const csrf = await lerToken('/perfis');
    const criado = await agente
      .post('/perfis')
      .set('Accept', 'application/json')
      .send({ apelido: 'irma', data_nasc: '2017-02-03', _csrf: csrf })
      .expect(201);

    perfilIrma = criado.body;
    assert.ok(perfilIrma.idPerfil, 'a criação precisa devolver o perfil');
    assert.ok(perfilIrma.id, 'a criação precisa devolver a persona (users.id)');
    assert.equal(perfilIrma.apelido, 'irma');

    // O perfil novo é selecionado automaticamente; como ainda não configurou
    // nada, a próxima tela é o onboarding.
    await agente.get('/onboarding').set('Accept', 'text/html').expect(200);

    // A seleção precisa continuar acessível com onboarding pendente: é por ela
    // que dá para desistir da configuração e voltar para outro perfil.
    const pagina = await agente.get('/perfis').set('Accept', 'text/html').expect(200);
    assert.match(pagina.text, new RegExp(`action="/perfis/${perfilIrma.idPerfil}/selecionar"`));
    assert.match(pagina.text, /Configuração pendente/);
    assert.match(pagina.text, /Perfil atual/);
    assert.match(pagina.text, /data-menu-perfil/, 'perfil adicional precisa ter o menu de opções');
    assert.match(pagina.text, /Troque para outro perfil antes de excluir este\./);
    assert.match(pagina.text, /id="dialogo-excluir-perfil"/);
    assert.match(pagina.text, /Tem certeza\?/);
    assert.match(pagina.text, /Concluindo esta ação, todo o progresso será perdido\./);

    const lista = await agente.get('/perfis').set('Accept', 'application/json').expect(200);
    assert.equal(lista.body.perfis.length, 2, 'a conta agora tem a persona principal e a nova');
    assert.equal(lista.body.perfilAtualId, perfilIrma.idPerfil);
    assert.equal(lista.body.perfis[0].id, perfilId, 'a conta principal continua sendo o primeiro perfil');
  });

  it('o perfil novo tem perfil, carteira e nível próprios, sem credenciais de login', async () => {
    const [[pessoa]] = await banco.conexao.query(
      'SELECT owner_user_id, email, password_hash, onboarding_completed_at FROM users WHERE id = ?',
      [perfilIrma.id],
    );
    assert.equal(Number(pessoa.owner_user_id), Number(contaId), 'o perfil precisa apontar para a conta dona');
    assert.equal(pessoa.email, null, 'perfil não é conta e não recebe e-mail');
    assert.equal(pessoa.password_hash, null, 'perfil não tem senha');
    assert.equal(pessoa.onboarding_completed_at, null);

    const [[perfil]] = await banco.conexao.query(
      `SELECT p.id, p.age_band_id, ul.level, w.coins
         FROM profiles p
         LEFT JOIN user_levels ul ON ul.user_id = p.user_id
         LEFT JOIN wallets w ON w.user_id = p.user_id
        WHERE p.user_id = ?`,
      [perfilIrma.id],
    );
    assert.equal(Number(perfil.id), Number(perfilIrma.idPerfil));
    assert.ok(perfil.age_band_id, 'a idade do perfil precisa definir a faixa etária');
    assert.equal(Number(perfil.level), 1);
    assert.equal(Number(perfil.coins), 0);
  });

  it('voltar para o perfil principal restaura a sessão da conta', async () => {
    const csrf = await lerToken('/perfis');
    const resposta = await agente
      .post(`/perfis/${perfilId}/selecionar`)
      .set('Accept', 'text/html')
      .send({ _csrf: csrf })
      .expect(302);

    assert.equal(resposta.headers.location, '/painel');
    await agente.get('/painel').set('Accept', 'text/html').expect(200);

    const pagina = await agente.get('/perfis').set('Accept', 'text/html').expect(200);
    assert.match(
      pagina.text,
      new RegExp(`data-excluir-perfil="${perfilIrma.idPerfil}"`),
      'o perfil adicional fora de uso precisa oferecer a exclusão',
    );
  });

  it('remove o perfil adicional sem levar a conta junto', async () => {
    const csrf = await lerToken('/perfis');
    await agente
      .delete(`/perfil/${perfilIrma.idPerfil}`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .expect(200);

    const [[pessoa]] = await banco.conexao.query('SELECT id FROM users WHERE id = ?', [perfilIrma.id]);
    assert.equal(pessoa, undefined, 'a cascata precisa apagar a persona filha');
    const [[conta]] = await banco.conexao.query('SELECT id FROM users WHERE id = ?', [contaId]);
    assert.ok(conta, 'a conta principal não pode cair junto');
  });
});

async function lerTokenPara(agente, caminho) {
  const resposta = await agente.get(caminho).set('Accept', 'text/html');
  const achado =
    /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
  assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
  return achado[1];
}
