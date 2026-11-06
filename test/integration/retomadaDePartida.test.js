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
 * Retomar uma partida interrompida (RF-JOG-07).
 *
 * O que estes testes protegem: fechar a aba no meio do jogo não custa o
 * progresso, voltar não abre uma segunda partida, e nada do que foi salvo entra
 * na conta da recompensa — rascunho é rascunho, a nota continua saindo do
 * gabarito do banco (RN-007).
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('retomada de partida', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let favo;
  let idDaCelula;

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
      .send({ idCelula: idDaCelula });
  }

  function salvarEstado(token, respostas) {
    return agente
      .put(`/partidas/${token}/estado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas });
  }

  async function contarPartidas() {
    const [linhas] = await banco.conexao.query('SELECT COUNT(*) AS total FROM game_sessions WHERE cell_id = ?', [
      idDaCelula,
    ]);
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
        apelido: 'retomador',
        email: 'retomada-de-partida@beever.dev',
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
        apelido: 'retomador',
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
    idDaCelula = celulas[0].id;
    csrf = await lerToken('/painel');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('partida nova nasce sem estado salvo', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    assert.equal(partida.estado, null);
    assert.equal(partida.retomada, false);
  });

  it('voltar à célula devolve a mesma partida, com o que já tinha sido respondido', async () => {
    const { body: primeira } = await abrirPartida().expect(201);
    await salvarEstado(primeira.token, [0]).expect(200);

    const antes = await contarPartidas();
    const { body: retomada } = await abrirPartida().expect(201);

    assert.equal(retomada.token, primeira.token, 'é a mesma partida, e não uma nova');
    assert.equal(retomada.retomada, true);
    assert.deepEqual(retomada.estado.respostas, [0]);
    assert.equal(await contarPartidas(), antes, 'retomar não abre partida nova');
  });

  it('o estado salvo não entra na conta: a nota sai do gabarito', async () => {
    const { body: partida } = await abrirPartida().expect(201);
    // Salva duas respostas certas e manda duas erradas no fim.
    await salvarEstado(partida.token, [0, 0]).expect(200);

    const { body: resultado } = await agente
      .post(`/partidas/${partida.token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas: [1, 1] })
      .expect(200);

    assert.equal(resultado.erros, 2, 'valem as respostas do fim, não o rascunho');
  });

  it('partida encerrada não guarda mais progresso', async () => {
    const { body: partida } = await abrirPartida().expect(201);
    await agente
      .post(`/partidas/${partida.token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas: [0, 0] })
      .expect(200);

    await salvarEstado(partida.token, [0]).expect(422);
  });

  it('não dá para salvar progresso na partida de outro jogador', async () => {
    const { body: partida } = await abrirPartida().expect(201);
    const estranho = request.agent(app);

    const tokenDoEstranho = await (async () => {
      const pagina = await estranho.get('/login').set('Accept', 'text/html');
      return /name="_csrf" value="([^"]+)"/.exec(pagina.text)[1];
    })();

    await estranho
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'intruso',
        email: 'intruso-retomada@beever.dev',
        data_nasc: '2018-04-02',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: tokenDoEstranho,
      })
      .expect(201);

    await estranho
      .put(`/partidas/${partida.token}/estado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', tokenDoEstranho)
      .send({ respostas: [1, 1] })
      .expect(403);
  });

  it('progresso sem fim é cortado, e não vira depósito de dados', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    // O validador da rota já recusa mais de 100 itens; o service ainda corta,
    // porque a regra de tamanho é do contrato de jogo e não da rota.
    await salvarEstado(partida.token, Array.from({ length: 200 }, () => 0)).expect(422);
  });
});
