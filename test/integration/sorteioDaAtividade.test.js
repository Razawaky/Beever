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
 * O acervo da célula e o sorteio da partida (T-12.5).
 *
 * Duas coisas são provadas aqui, e a segunda é o conserto de um defeito antigo:
 * que a partida sorteia entre as atividades ativas da célula, e que a correção
 * usa **a atividade que a criança jogou** — antes da migration 018 a partida
 * guardava só a célula, e publicar uma versão nova no meio do jogo trocava o
 * gabarito debaixo das respostas dela.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const ADMIN = { email: 'admin@beever.dev', senha: 'admin1234' };
const JOGADORA = { email: 'ana@beever.dev', senha: 'beever123' };

/** Três quizes que se distinguem pelo enunciado, para dar para saber qual saiu. */
const QUIZ = (marca, correta) => ({
  tipo: 'quiz-do-favo',
  perguntas: [
    { enunciado: `Pergunta ${marca}`, alternativas: ['Primeira', 'Segunda'], correta },
  ],
});

describe('acervo da célula e sorteio da partida', opcoes, () => {
  let banco;
  let app;
  let admin;
  let jogadora;
  let csrfDoAdmin;
  let csrfDaJogadora;
  let idDoFavoDemo;
  let idDoTipoQuiz;
  let idDaFaixaA;

  async function tokenDe(agente, caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').redirects(2);
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function entrar(conta, caminhoDoLogin, endereco) {
    const agente = request.agent(app);
    const csrf = await tokenDe(agente, caminhoDoLogin);
    await agente
      .post(endereco)
      .set('Accept', 'application/json')
      .send({ ...conta, _csrf: csrf })
      .expect(200);
    return agente;
  }

  async function criarCelula(titulo) {
    const resposta = await admin
      .post(`/admin/favos/${idDoFavoDemo}/celulas`)
      .set('Accept', 'application/json')
      .send({
        titulo,
        idTipoDeJogo: idDoTipoQuiz,
        idFaixa: idDaFaixaA,
        segundosEstimados: 120,
        _csrf: csrfDoAdmin,
      })
      .expect(201);

    return resposta.body.id;
  }

  function publicar(idCelula, corpo, publicacao = 'substituir') {
    return admin
      .post(`/admin/celulas/${idCelula}/conteudo`)
      .set('Accept', 'application/json')
      .send({ modo: 'avancado', corpo: JSON.stringify(corpo), publicacao, _csrf: csrfDoAdmin });
  }

  function abrirPartida(idCelula) {
    return jogadora
      .post('/partidas')
      .set('Accept', 'application/json')
      .send({ idCelula, _csrf: csrfDaJogadora });
  }

  /**
   * Joga e conclui a célula. As células nascem em sequência no mesmo favo, e a
   * RN-026 só destrava a seguinte com uma estrela — sem isto, o teste seguinte
   * abriria a partida de uma célula travada.
   */
  async function jogarEFechar(idCelula) {
    const partida = await abrirPartida(idCelula).expect(201);
    await fecharPartida(partida.body.token, [0]).expect(200);
  }

  function fecharPartida(token, respostas) {
    return jogadora
      .post(`/partidas/${token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrfDaJogadora)
      .send({ respostas });
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();

    admin = await entrar(ADMIN, '/admin/login', '/admin/login');
    csrfDoAdmin = await tokenDe(admin, '/admin/favos');
    jogadora = await entrar(JOGADORA, '/login', '/sessao/login');
    csrfDaJogadora = await tokenDe(jogadora, '/painel');

    const [[favo]] = await banco.conexao.query('SELECT id FROM hives WHERE slug = ?', ['primeiros-passos']);
    idDoFavoDemo = Number(favo.id);

    const [[tipo]] = await banco.conexao.query('SELECT id FROM game_types WHERE slug = ?', ['quiz-do-favo']);
    idDoTipoQuiz = Number(tipo.id);

    const [[faixa]] = await banco.conexao.query('SELECT id FROM age_bands WHERE code = ?', ['A']);
    idDaFaixaA = Number(faixa.id);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('publicar substituindo deixa uma atividade só no acervo', async () => {
    const idCelula = await criarCelula('Célula que substitui');
    await publicar(idCelula, QUIZ('A', 0)).expect(201);
    await publicar(idCelula, QUIZ('B', 0)).expect(201);

    const detalhe = await admin
      .get(`/admin/celulas/${idCelula}/conteudo`)
      .set('Accept', 'application/json')
      .expect(200);

    assert.equal(detalhe.body.acervo.length, 1);
    assert.equal(detalhe.body.acervo[0].body.perguntas[0].enunciado, 'Pergunta B');

    await jogarEFechar(idCelula);
  });

  it('publicar acrescentando monta o acervo, e a partida sorteia entre as atividades', async () => {
    const idCelula = await criarCelula('Célula com acervo');
    await publicar(idCelula, QUIZ('A', 0)).expect(201);
    await publicar(idCelula, QUIZ('B', 0), 'acrescentar').expect(201);
    await publicar(idCelula, QUIZ('C', 0), 'acrescentar').expect(201);

    const detalhe = await admin
      .get(`/admin/celulas/${idCelula}/conteudo`)
      .set('Accept', 'application/json')
      .expect(200);
    assert.equal(detalhe.body.acervo.length, 3, 'as três continuam ativas');

    // Abre e fecha várias vezes: com três no acervo e sem repetir a anterior,
    // as três precisam aparecer. Vinte rodadas é folga suficiente para isso não
    // depender de sorte.
    const vistas = new Set();
    for (let rodada = 0; rodada < 20; rodada += 1) {
      const partida = await abrirPartida(idCelula).expect(201);
      vistas.add(partida.body.conteudo.perguntas[0].enunciado);
      await fecharPartida(partida.body.token, [0]).expect(200);
    }

    assert.deepEqual([...vistas].sort(), ['Pergunta A', 'Pergunta B', 'Pergunta C']);
  });

  it('a partida seguinte nunca repete a atividade da anterior', async () => {
    const idCelula = await criarCelula('Célula que não repete');
    await publicar(idCelula, QUIZ('X', 0)).expect(201);
    await publicar(idCelula, QUIZ('Y', 0), 'acrescentar').expect(201);

    let anterior = null;
    for (let rodada = 0; rodada < 6; rodada += 1) {
      const partida = await abrirPartida(idCelula).expect(201);
      const enunciado = partida.body.conteudo.perguntas[0].enunciado;

      assert.notEqual(enunciado, anterior, 'duas partidas seguidas com a mesma atividade');
      anterior = enunciado;
      await fecharPartida(partida.body.token, [0]).expect(200);
    }
  });

  it('retomar a partida devolve a mesma atividade que estava sendo jogada', async () => {
    const idCelula = await criarCelula('Célula retomada');
    await publicar(idCelula, QUIZ('D', 0)).expect(201);
    await publicar(idCelula, QUIZ('E', 0), 'acrescentar').expect(201);

    const primeira = await abrirPartida(idCelula).expect(201);
    const retomada = await abrirPartida(idCelula).expect(201);

    assert.equal(retomada.body.token, primeira.body.token);
    assert.equal(retomada.body.retomada, true);
    assert.deepEqual(retomada.body.conteudo, primeira.body.conteudo, 'sortear de novo trocaria as perguntas');

    await fecharPartida(primeira.body.token, [0]).expect(200);
  });

  it('publicar no meio da partida não troca o gabarito de quem já estava jogando', async () => {
    const idCelula = await criarCelula('Célula publicada no meio');
    // A resposta certa é a primeira alternativa.
    await publicar(idCelula, QUIZ('Antes', 0)).expect(201);

    const partida = await abrirPartida(idCelula).expect(201);
    assert.equal(partida.body.conteudo.perguntas[0].enunciado, 'Pergunta Antes');

    // O administrador publica outra, com a resposta certa na outra alternativa.
    await publicar(idCelula, QUIZ('Depois', 1)).expect(201);

    const resultado = await fecharPartida(partida.body.token, [0]).expect(200);
    assert.equal(resultado.body.erros, 0, 'corrigido pela atividade que ela jogou, não pela nova');
    assert.equal(resultado.body.estrelas, 3);
  });

  it('tirar do acervo funciona, e a última atividade não pode ser tirada', async () => {
    const idCelula = await criarCelula('Célula que perde uma atividade');
    await publicar(idCelula, QUIZ('F', 0)).expect(201);
    await publicar(idCelula, QUIZ('G', 0), 'acrescentar').expect(201);

    await admin
      .post(`/admin/celulas/${idCelula}/acervo/remover`)
      .set('Accept', 'application/json')
      .send({ versao: 1, _csrf: csrfDoAdmin })
      .expect(200);

    const detalhe = await admin
      .get(`/admin/celulas/${idCelula}/conteudo`)
      .set('Accept', 'application/json')
      .expect(200);
    assert.equal(detalhe.body.acervo.length, 1);

    const recusa = await admin
      .post(`/admin/celulas/${idCelula}/acervo/remover`)
      .set('Accept', 'application/json')
      .send({ versao: 2, _csrf: csrfDoAdmin })
      .expect(422);
    assert.match(recusa.body.erro, /única atividade/);

    await jogarEFechar(idCelula);
  });

  it('a atividade jogada fica gravada na partida', async () => {
    const idCelula = await criarCelula('Célula com rastro');
    await publicar(idCelula, QUIZ('H', 0)).expect(201);

    const partida = await abrirPartida(idCelula).expect(201);
    await fecharPartida(partida.body.token, [0]).expect(200);

    const [[linha]] = await banco.conexao.query(
      `SELECT gs.content_id, ct.version
         FROM game_sessions gs
         JOIN contents ct ON ct.id = gs.content_id
        WHERE gs.token = ?`,
      [partida.body.token],
    );
    assert.ok(linha.content_id, 'toda partida nova grava qual atividade sorteou');
  });

  it('a jogadora comum não mexe no acervo', async () => {
    await jogadora
      .post('/admin/celulas/1/acervo/remover')
      .set('Accept', 'application/json')
      .send({ versao: 1 })
      .expect(403);
  });
});
