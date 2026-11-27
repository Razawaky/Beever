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
 * O Arraste e Classifique pelo HTTP (RF-JOG-02).
 *
 * O que estes testes protegem: a página não diz qual é a caixa certa, a célula
 * de arrastar só abre depois que a anterior foi concluída (RN-026) e a contagem
 * de erros continua saindo do servidor (RN-007).
 *
 * O arrastar em si não é testado aqui — é comportamento de navegador, e fica
 * junto da DT-22, o jogo visto por olho humano.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const RESPOSTAS_DO_QUIZ = [0, 0];
const CAIXAS_CERTAS = ['entra', 'entra', 'sai', 'sai'];

describe('Arraste e Classifique', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let favo;
  let idDaCelulaDeArrastar;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  function abrirPartida(idCelula) {
    return agente
      .post('/partidas')
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ idCelula });
  }

  function concluirPartida(token, respostas) {
    return agente
      .post(`/partidas/${token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas });
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
        apelido: 'arrastador',
        email: 'arraste-e-classifique@beever.dev',
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
        apelido: 'arrastador',
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
    const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, Number(perfil.user_id), ['A']);
    idDaCelulaDeArrastar = celulas[1].id;
    csrf = await lerToken('/painel');

    // A segunda célula do favo é a de arrastar, e ela nasce travada pela
    // RN-026: sem concluir o quiz da primeira, nada aqui abre.
    const { body: partidaDoQuiz } = await abrirPartida(celulas[0].id).expect(201);
    await concluirPartida(partidaDoQuiz.token, RESPOSTAS_DO_QUIZ).expect(200);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a célula de arrastar vira link depois que a anterior é concluída', async () => {
    const pagina = await agente.get(`/trilha/${favo.id}`).set('Accept', 'text/html').expect(200);

    assert.match(pagina.text, new RegExp(`href="/trilha/${favo.id}/celula/${idDaCelulaDeArrastar}"`));
  });

  it('a página carrega o JavaScript do jogo certo e não entrega o gabarito', async () => {
    const pagina = await agente
      .get(`/trilha/${favo.id}/celula/${idDaCelulaDeArrastar}`)
      .set('Accept', 'text/html')
      .expect(200);

    assert.match(pagina.text, /js\/arraste\.js/, 'cada jogo carrega o seu script');
    assert.doesNotMatch(pagina.text, /js\/quiz\.js/, 'a casca é a mesma, o script não');
    assert.doesNotMatch(pagina.text, /Mesada do mês/, 'as cartas só chegam pela partida');
  });

  /**
   * Este teste existe porque o navegador reprovou o que o HTTP tinha aprovado:
   * até a T-07.3 a página mandava `data-celulaId` e nenhum token de CSRF, e o
   * `dataset` do navegador lê `data-celula-id`. Os testes antigos passavam
   * porque pegavam o token de outra tela.
   */
  it('a página traz o id da célula e o token que o JavaScript lê, e eles funcionam', async () => {
    const pagina = await agente
      .get(`/trilha/${favo.id}/celula/${idDaCelulaDeArrastar}`)
      .set('Accept', 'text/html')
      .expect(200);

    assert.match(pagina.text, new RegExp(`data-celula-id="${idDaCelulaDeArrastar}"`));

    const tokenDaPagina = /data-csrf-token="([^"]+)"/.exec(pagina.text);
    assert.ok(tokenDaPagina, 'a página precisa carregar o próprio token de CSRF');

    await agente
      .post('/partidas')
      .set('Accept', 'application/json')
      .set('x-csrf-token', tokenDaPagina[1])
      .send({ idCelula: idDaCelulaDeArrastar })
      .expect(201);
  });

  it('abrir a partida devolve as cartas e as caixas, sem dizer qual é a certa', async () => {
    const { body: partida } = await abrirPartida(idDaCelulaDeArrastar).expect(201);

    assert.equal(partida.conteudo.cartas.length, 4);
    assert.equal(partida.conteudo.categorias.length, 2);
    for (const carta of partida.conteudo.cartas) {
      assert.ok(carta.texto);
      assert.equal(carta.categoria, undefined);
    }
  });

  it('classificar tudo certo paga as três recompensas e devolve 3 estrelas', async () => {
    const { body: partida } = await abrirPartida(idDaCelulaDeArrastar).expect(201);

    const { body: resultado } = await concluirPartida(partida.token, CAIXAS_CERTAS).expect(200);

    assert.equal(resultado.erros, 0);
    assert.equal(resultado.estrelas, 3);
    assert.ok(resultado.xp > 0 && resultado.polen > 0 && resultado.mel > 0);
  });

  it('carta na caixa errada e carta sem caixa contam como erro', async () => {
    const { body: partida } = await abrirPartida(idDaCelulaDeArrastar).expect(201);

    const { body: resultado } = await concluirPartida(partida.token, ['sai', 'entra', null, 'sai']).expect(200);

    assert.equal(resultado.erros, 2, 'a primeira foi para a caixa errada e a terceira ficou em branco');
  });

  it('mandar pontuação pronta no corpo não muda nada (RN-007)', async () => {
    const { body: partida } = await abrirPartida(idDaCelulaDeArrastar).expect(201);

    const { body: resultado } = await agente
      .post(`/partidas/${partida.token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas: CAIXAS_CERTAS, erros: 0, estrelas: 3, xp: 9999 })
      .expect(200);

    assert.equal(resultado.erros, 0, 'quem conta é o gabarito do banco');
    assert.notEqual(resultado.xp, 9999);
  });
});
