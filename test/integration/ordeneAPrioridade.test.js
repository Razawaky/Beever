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
import * as progressService from '../../src/services/progressService.js';

/**
 * O Ordene a Prioridade pelo HTTP (RF-JOG-06).
 *
 * O que estes testes protegem: a ordem certa não viaja para a tela — os itens
 * chegam embaralhados e sem `ordem` —, e o erro é contado por par invertido,
 * então trocar dois vizinhos não vira nota zero (RN-030).
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const ORDEM_CERTA = ['comida', 'escola', 'brinquedo'];

describe('Ordene a Prioridade', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let favo;
  let idDaCelulaDeOrdenar;

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
      .send({ idCelula: idDaCelulaDeOrdenar });
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
        apelido: 'ordenador',
        email: 'ordene-a-prioridade@beever.dev',
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
        apelido: 'ordenador',
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
    const idUsuario = Number(perfil.user_id);

    favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, ['A']);
    idDaCelulaDeOrdenar = celulas[2].id;
    for (const celula of celulas.slice(0, 2)) {
      await progressService.registrarTentativa(idUsuario, celula.id, { erros: 0, pontuacao: 100, concluiu: true });
    }
    csrf = await lerToken('/painel');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a página carrega o JavaScript de ordenar e o que o navegador lê', async () => {
    const pagina = await agente
      .get(`/trilha/${favo.id}/celula/${idDaCelulaDeOrdenar}`)
      .set('Accept', 'text/html')
      .expect(200);

    assert.match(pagina.text, /js\/ordene\.js/);
    assert.match(pagina.text, new RegExp(`data-celula-id="${idDaCelulaDeOrdenar}"`));
    assert.doesNotMatch(pagina.text, /Material da escola/, 'os itens só chegam pela partida');
  });

  it('abrir a partida devolve os itens sem a ordem certa', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    assert.equal(partida.conteudo.itens.length, 3);
    for (const item of partida.conteudo.itens) {
      assert.ok(item.id && item.texto);
      assert.equal(item.ordem, undefined, 'a ordem certa não pode viajar');
    }
    assert.equal(JSON.stringify(partida.conteudo).includes('"ordem"'), false);
  });

  it('a ordem certa paga as três recompensas e devolve 3 estrelas', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await concluirPartida(partida.token, ORDEM_CERTA).expect(200);

    assert.equal(resultado.erros, 0);
    assert.equal(resultado.estrelas, 3);
    assert.ok(resultado.xp > 0 && resultado.polen > 0 && resultado.mel > 0);
  });

  it('trocar dois vizinhos custa um erro, e ainda vale três estrelas', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await concluirPartida(partida.token, ['escola', 'comida', 'brinquedo']).expect(200);

    assert.equal(resultado.erros, 1, 'só o par comida/escola saiu trocado');
    assert.equal(resultado.estrelas, 3, 'um erro ainda vale três estrelas (RN-030)');
  });

  it('a ordem invertida erra todos os pares', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await concluirPartida(partida.token, [...ORDEM_CERTA].reverse()).expect(200);

    assert.equal(resultado.erros, 3, 'três itens formam três pares');
    assert.equal(resultado.estrelas, 2, 'de dois a três erros valem duas estrelas');
  });
});
