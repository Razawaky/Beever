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
import { dataDoDia, diaDaSemana, FUSO_PADRAO } from '../../src/utils/diaDoJogador.js';

/**
 * Som e animação reduzida eram guardados no `localStorage` com as mesmas chaves
 * do painel de acessibilidade. A classe ia para o `<html>` e valia para todas as
 * contas do navegador. Aqui a prova é o contrário: o perfil logado manda, a
 * classe nasce no `<body>` e nenhuma outra persona herda o ajuste.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const HOJE = diaDaSemana(dataDoDia(new Date(), FUSO_PADRAO));
const DIAS = [HOJE, (HOJE + 2) % 7, (HOJE + 4) % 7].map(String);

describe('preferências de acessibilidade da conta', opcoes, () => {
  let banco;
  let app;

  function tokenDe(html) {
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(html) ?? /data-csrf-token="([^"]+)"/.exec(html);
    assert.ok(achado, 'token CSRF não encontrado na página');
    return achado[1];
  }

  async function configurar(email, apelido, preferencias) {
    const agente = request.agent(app);
    let csrf = tokenDe((await agente.get('/login').set('Accept', 'text/html')).text);

    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido,
        email,
        data_nasc: '1990-05-20',
        senha: 'beever123',
        _csrf: csrf,
      })
      .expect(201);

    csrf = tokenDe((await agente.get('/onboarding').set('Accept', 'text/html')).text);
    await agente
      .put(`/perfil/${cadastro.body.idPerfil}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido,
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'intermediate',
        dias: DIAS,
        preferencias,
        _csrf: csrf,
      })
      .expect(200);

    return { agente, perfilId: cadastro.body.idPerfil };
  }

  async function preferenciasNoBanco(idPerfil) {
    const [[perfil]] = await banco.conexao.query(
      'SELECT is_sound_enabled, has_reduced_motion FROM profiles WHERE id = ?',
      [idPerfil],
    );
    return perfil;
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

  it('a preferência do perfil chega ao body e ao botão da configuração', async () => {
    const { agente, perfilId } = await configurar(
      'animacao-reduzida@beever.dev',
      'animada',
      ['movimento-reduzido'],
    );

    const pagina = await agente.get('/painel/configuracoes').set('Accept', 'text/html').expect(200);

    assert.match(pagina.text, /<body class="[^"]*a11y-movimento-reduzido/);
    assert.match(pagina.text, /data-preferencias-perfil="animacao-reduzida sem-som"/);
    assert.match(pagina.text, /data-ajuste="movimento"\s+aria-pressed="true"/);
    assert.equal(Number((await preferenciasNoBanco(perfilId)).has_reduced_motion), 1);
  });

  it('o interruptor grava no perfil e a próxima página já nasce sem a classe', async () => {
    const { agente, perfilId } = await configurar(
      'animacao-normal@beever.dev',
      'normalzinha',
      ['movimento-reduzido', 'som'],
    );
    const config = await agente.get('/painel/configuracoes').set('Accept', 'text/html').expect(200);

    const resposta = await agente
      .post('/painel/configuracoes/preferencias')
      .set('Accept', 'application/json')
      .send({ animacao_reduzida: false, _csrf: tokenDe(config.text) })
      .expect(200);

    assert.equal(resposta.body.animacaoReduzida, false);
    assert.equal(Number((await preferenciasNoBanco(perfilId)).has_reduced_motion), 0);
    // O som não foi mandado: não pode ser apagado como efeito colateral.
    assert.equal(Number((await preferenciasNoBanco(perfilId)).is_sound_enabled), 1);

    const depois = await agente.get('/painel/configuracoes').set('Accept', 'text/html').expect(200);
    assert.doesNotMatch(depois.text, /a11y-movimento-reduzido/);
    assert.match(depois.text, /data-ajuste="movimento"\s+aria-pressed="false"/);
  });

  it('outra conta no mesmo navegador não herda a preferência', async () => {
    const primeiro = await configurar('conta-um@beever.dev', 'primeira', ['movimento-reduzido']);
    const paginaUm = await primeiro.agente
      .get('/painel/configuracoes')
      .set('Accept', 'text/html')
      .expect(200);
    assert.match(paginaUm.text, /a11y-movimento-reduzido/);

    const segundo = await configurar('conta-dois@beever.dev', 'segunda', []);
    const paginaDois = await segundo.agente
      .get('/painel/configuracoes')
      .set('Accept', 'text/html')
      .expect(200);

    assert.doesNotMatch(paginaDois.text, /a11y-movimento-reduzido/);
    assert.equal(Number((await preferenciasNoBanco(segundo.perfilId)).has_reduced_motion), 0);
  });

  it('quem não entrou não recebe classe nem chave de preferência', async () => {
    const publica = await request(app).get('/').set('Accept', 'text/html').expect(200);

    assert.doesNotMatch(publica.text, /a11y-movimento-reduzido/);
    assert.doesNotMatch(publica.text, /data-preferencias-perfil/);
  });
});
