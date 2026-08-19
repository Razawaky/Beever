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
import * as cellsRepository from '../../src/repositories/cellsRepository.js';
import * as hivesRepository from '../../src/repositories/hivesRepository.js';

/**
 * O Quiz do Favo pelo HTTP, do jeito que o navegador faz.
 *
 * O que estes testes protegem: a página não entrega o gabarito, `GET` não cria
 * partida, quem manda pontuação pronta é ignorado (RN-007) e célula de jogo
 * ainda não implementado não oferece botão de jogar.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const RESPOSTAS_CERTAS = [0, 0];

describe('Quiz do Favo', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let favo;
  let celulas;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  function abrirPartida() {
    return agente
      .post('/partidas')
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ idCelula: celulas[0].id });
  }

  async function contarPartidas() {
    const [linhas] = await banco.conexao.query('SELECT COUNT(*) AS total FROM game_sessions');
    return Number(linhas[0].total);
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);
    csrf = await lerToken('/login');

    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'quizeiro',
        email: 'quiz-do-favo@beever.dev',
        data_nasc: '2018-04-02',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: csrf,
      })
      .expect(201);

    csrf = await lerToken('/onboarding');
    await agente
      .put(`/perfil/${cadastro.body.idPerfil}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: 'quizeiro',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['1', '3', '5'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    const [[perfil]] = await banco.conexao.query('SELECT user_id FROM profiles WHERE id = ?', [
      cadastro.body.idPerfil,
    ]);
    favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, Number(perfil.user_id), ['A']);
    csrf = await lerToken('/painel');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('o favo oferece "Jogar" só na célula que tem jogo', async () => {
    const pagina = await agente.get(`/trilha/${favo.id}`).set('Accept', 'text/html').expect(200);

    assert.match(pagina.text, new RegExp(`href="/trilha/${favo.id}/celula/${celulas[0].id}"`), 'o quiz é jogável');
    // A segunda célula está travada pela RN-026; a quarta é de um jogo que a
    // E07 ainda não escreveu. Nenhuma das duas pode oferecer link.
    assert.doesNotMatch(pagina.text, new RegExp(`celula/${celulas[3].id}"`), 'jogo sem validador não vira link');
  });

  it('a página do jogo não entrega o gabarito nem cria partida', async () => {
    const antes = await contarPartidas();
    const pagina = await agente
      .get(`/trilha/${favo.id}/celula/${celulas[0].id}`)
      .set('Accept', 'text/html')
      .expect(200);

    assert.match(pagina.text, /js\/quiz\.js/, 'a tela é montada pelo JS da página');
    assert.match(pagina.text, new RegExp(`data-celula-id="${celulas[0].id}"`), 'é assim que o dataset lê');
    assert.match(pagina.text, /data-csrf-token="[^"]+"/, 'a partida é POST e a página não tem formulário');
    assert.doesNotMatch(pagina.text, /correta/, 'a resposta certa não pode viajar no HTML');
    assert.equal(await contarPartidas(), antes, 'GET não cria partida');
  });

  it('a célula travada não abre a página do jogo', async () => {
    await agente
      .get(`/trilha/${favo.id}/celula/${celulas[1].id}`)
      .set('Accept', 'application/json')
      .expect(403);
  });

  it('abrir a partida devolve token e perguntas sem a resposta certa', async () => {
    const resposta = await abrirPartida().expect(201);

    assert.match(resposta.body.token, /^[0-9a-f-]{36}$/);
    assert.ok(resposta.body.conteudo.perguntas.length > 0);
    assert.equal(JSON.stringify(resposta.body).includes('correta'), false);
  });

  it('responder tudo certo paga as três recompensas e devolve 3 estrelas', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await agente
      .post(`/partidas/${partida.token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas: RESPOSTAS_CERTAS })
      .expect(200);

    assert.equal(resultado.estrelas, 3);
    assert.ok(resultado.xp > 0 && resultado.polen > 0 && resultado.mel > 0);
  });

  it('mandar pontuação pronta no corpo não muda nada (RN-007)', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await agente
      .post(`/partidas/${partida.token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas: [1, 1], estrelas: 3, xp: 9999, pontuacao: 100 })
      .expect(200);

    assert.equal(resultado.erros, 2, 'quem conta é o gabarito do banco');
    assert.notEqual(resultado.xp, 9999);
  });

  it('sem o token de CSRF a partida não abre', async () => {
    await agente
      .post('/partidas')
      .set('Accept', 'application/json')
      .send({ idCelula: celulas[0].id })
      .expect(403);
  });

  it('token que não é UUID é recusado antes de chegar ao service', async () => {
    await agente
      .post('/partidas/nao-sou-uuid/resultado')
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas: RESPOSTAS_CERTAS })
      .expect(422);
  });
});
