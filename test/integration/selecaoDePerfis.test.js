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
import { criarCrianca, criarResponsavel } from '../helpers/fixturesDeCadastro.js';

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const CONTA = {
  apelido: 'perfis',
  email: 'perfis@beever.dev',
  data_nasc: '1991-05-01',
  senha: 'beever123',
};

describe('seleção de perfis', opcoes, () => {
  let banco;
  let agente;
  let contaId;
  let perfilId;
  let usuarioDaCrianca;
  let perfilIrma;

  async function lerToken(caminho) {
    return lerTokenPara(agente, caminho);
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    agente = request.agent(criarApp());

    const cadastro = await criarCrianca(agente, {
      apelido: CONTA.apelido,
      email: CONTA.email,
      data_nasc: '2014-05-01',
      senha: CONTA.senha,
    });
    contaId = cadastro.body.contaId;
    perfilId = cadastro.body.idPerfil;
    usuarioDaCrianca = cadastro.body.id;
    const csrf = await lerToken('/onboarding');

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
    assert.match(
      html,
      /<\/section>\s*<form method="POST" action="\/sessao\/logout"[\s\S]*?Sair da conta\s*<\/button>/,
      'a saída da conta precisa ficar abaixo do quadro de perfis',
    );
    assert.match(html, /id="dialogo-criar-perfil"/, 'o diálogo de criação precisa existir');
    assert.match(html, /\/js\/perfis\.js/, 'a tela precisa carregar o script do diálogo');
    assert.match(html, /perfis@beever\.dev/, 'a tela precisa identificar a conta');
    assert.doesNotMatch(
      html,
      new RegExp(`data-excluir-perfil="${perfilId}"`),
      'o perfil atual não pode ser excluído direto',
    );

    // O perfil atual ganha um marcador textual, não só cor.
    assert.match(html, /Perfil atual/);
  });

  it('registra o consentimento da conta ao criar o perfil infantil', async () => {
    const [[consentimento]] = await banco.conexao.query(
      `SELECT g.guardian_email, g.ip_hash
         FROM guardian_consents g
        WHERE g.user_id = ?`,
      [usuarioDaCrianca],
    );

    assert.equal(
      consentimento.guardian_email,
      CONTA.email,
      'a prova precisa copiar o e-mail de quem autorizou',
    );
    assert.match(consentimento.ip_hash, /^[0-9a-f]{64}$/, 'a origem fica registrada como hash');
  });

  it('conta nova do responsável não nasce com perfil jogável', async () => {
    const resposta = await agente.get('/perfis').set('Accept', 'application/json').expect(200);
    assert.equal(resposta.body.perfis.some((perfil) => perfil.email === CONTA.email), false);

    const [[linha]] = await banco.conexao.query(
      `SELECT COUNT(*) AS total
         FROM profiles p
         JOIN users u ON u.id = p.user_id
        WHERE u.id = ?`,
      [contaId],
    );
    assert.equal(Number(linha.total), 0, 'a conta adulta não nasce com persona própria');
  });

  it('recusa criar uma criança sem consentimento', async () => {
    const csrf = await lerToken('/perfis');
    const resposta = await agente
      .post('/perfis')
      .set('Accept', 'application/json')
      .send({ apelido: 'sem-autorizacao', data_nasc: '2016-03-01', consentimento_responsavel: false, _csrf: csrf })
      .expect(422);

    assert.equal(resposta.body.codigo, 'CONSENTIMENTO_NECESSARIO');

    const [[pessoa]] = await banco.conexao.query(
      'SELECT id FROM users WHERE nickname = ?',
      ['sem-autorizacao'],
    );
    assert.equal(pessoa, undefined, 'perfil sem autorização não pode ser gravado');
  });

  it('a seleção troca o perfil ativo e volta para a Colmeia', async () => {
    const csrf = await lerToken('/perfis');

    const resposta = await agente
      .post(`/perfis/${perfilId}/selecionar`)
      .set('Accept', 'text/html')
      .send({ _csrf: csrf })
      .expect(302);

    assert.equal(resposta.headers.location, '/painel');
    // `/painel` entrega a Colmeia por redirect; seguir até o fim prova que a
    // sessão escolhida realmente chega ao jogo.
    await agente.get('/painel').set('Accept', 'text/html').redirects(2).expect(200);
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
    const cadastro = await criarCrianca(intruso, {
      apelido: 'intruso',
      email: 'intruso@beever.dev',
      data_nasc: '2014-05-01',
      senha: 'beever123',
    });

    let csrf = await lerTokenPara(intruso, '/onboarding');
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
      .send({
        apelido: 'irma',
        data_nasc: '2017-02-03',
        consentimento_responsavel: true,
        _csrf: csrf,
      })
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
    // `/painel` entrega a Colmeia por redirect; seguir até o fim prova que a
    // sessão escolhida realmente chega ao jogo.
    await agente.get('/painel').set('Accept', 'text/html').redirects(2).expect(200);

    const pagina = await agente.get('/perfis').set('Accept', 'text/html').expect(200);
    assert.match(
      pagina.text,
      new RegExp(`data-excluir-perfil="${perfilIrma.idPerfil}"`),
      'o perfil adicional fora de uso precisa oferecer a exclusão',
    );
  });

  it('mantém e permite excluir o perfil principal das contas antigas', async () => {
    const legado = request.agent(criarApp());
    const conta = await criarResponsavel(legado, {
      apelido: 'legado',
      email: 'legado@beever.dev',
      data_nasc: '1992-08-12',
    });

    // Antes da separação, a conta já nascia com a persona principal: é esse
    // registro que não pode desaparecer da seleção quando o fluxo muda.
    const [inserido] = await banco.conexao.query('INSERT INTO profiles (user_id) VALUES (?)', [conta.body.id]);
    const perfilLegado = Number(inserido.insertId);

    const lista = await legado.get('/perfis').set('Accept', 'application/json').expect(200);
    assert.equal(lista.body.perfis.length, 1);
    assert.equal(lista.body.perfis[0].id, perfilLegado);

    const csrf = await lerTokenPara(legado, '/perfis');
    const selecao = await legado
      .post(`/perfis/${perfilLegado}/selecionar`)
      .set('Accept', 'text/html')
      .send({ _csrf: csrf })
      .expect(302);

    // A conta antiga já concluiu o onboarding quando era a persona principal.
    assert.equal(selecao.headers.location, '/painel');
    const depois = await legado.get('/perfis').set('Accept', 'application/json').expect(200);
    assert.equal(depois.body.perfilAtualId, perfilLegado);

    // Agora ele se comporta como qualquer outro perfil: troca-se para um
    // irmão e a exclusão apaga só a persona, nunca a conta que a sustenta.
    const csrfParaCriar = await lerTokenPara(legado, '/perfis');
    const irma = await legado
      .post('/perfis')
      .set('Accept', 'application/json')
      .send({ apelido: 'irma-legado', data_nasc: '2017-02-03', consentimento_responsavel: true, _csrf: csrfParaCriar })
      .expect(201);

    const csrfParaExcluir = await lerTokenPara(legado, '/perfis');
    await legado
      .delete(`/perfil/${perfilLegado}`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrfParaExcluir)
      .expect(200);

    const [[contaDepois]] = await banco.conexao.query(
      'SELECT email, password_hash FROM users WHERE id = ?',
      [conta.body.id],
    );
    assert.equal(contaDepois.email, 'legado@beever.dev', 'a conta sobrevive à exclusão do perfil principal');
    assert.ok(contaDepois.password_hash, 'a senha da conta continua valendo para login');

    const [[perfilApagado]] = await banco.conexao.query('SELECT id FROM profiles WHERE id = ?', [perfilLegado]);
    assert.equal(perfilApagado, undefined, 'a persona principal saiu da tabela de perfis');
    const [[irmaDepois]] = await banco.conexao.query('SELECT owner_user_id FROM users WHERE id = ?', [irma.body.id]);
    assert.equal(Number(irmaDepois.owner_user_id), Number(conta.body.id), 'o irmão continua na mesma conta');

    const listaFinal = await legado.get('/perfis').set('Accept', 'application/json').expect(200);
    assert.deepEqual(
      listaFinal.body.perfis.map((perfil) => perfil.id),
      [irma.body.idPerfil],
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
