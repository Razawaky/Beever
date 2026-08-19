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
 * O Mercado Esperto pelo HTTP (RF-JOG-05).
 *
 * O que estes testes protegem: preço e quantidade chegam à tela porque a conta
 * é o jogo, e o gabarito não vem do conteúdo — é o menor preço por unidade,
 * calculado no servidor (RN-007). A etiqueta mais barata nem sempre é a melhor
 * compra, e é justamente esse o caso que precisa contar erro.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const MELHORES_COMPRAS = [1, 1];

describe('Mercado Esperto', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let favo;
  let idDaCelulaDoMercado;

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
      .send({ idCelula: idDaCelulaDoMercado });
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
        apelido: 'comprador',
        email: 'mercado-esperto@beever.dev',
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
        apelido: 'comprador',
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

    // A célula do mercado é a terceira do segundo favo: o primeiro favo inteiro
    // abre o segundo, e as duas primeiras células dele abrem esta.
    const primeiroFavo = await hivesRepository.buscarPorSlug('primeiros-passos');
    for (const celula of await cellsRepository.listarDoFavoComProgresso(primeiroFavo.id, idUsuario, ['A'])) {
      await progressService.registrarTentativa(idUsuario, celula.id, { erros: 0, pontuacao: 100, concluiu: true });
    }

    favo = await hivesRepository.buscarPorSlug('guardar-e-gastar');
    const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, ['A']);
    idDaCelulaDoMercado = celulas[2].id;
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

  it('a página carrega o JavaScript do mercado e o que o navegador lê', async () => {
    const pagina = await agente
      .get(`/trilha/${favo.id}/celula/${idDaCelulaDoMercado}`)
      .set('Accept', 'text/html')
      .expect(200);

    assert.match(pagina.text, /js\/mercado\.js/);
    assert.match(pagina.text, new RegExp(`data-celula-id="${idDaCelulaDoMercado}"`));
    assert.match(pagina.text, /data-csrf-token="[^"]+"/);
  });

  it('abrir a partida devolve preço e quantidade de cada opção', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    assert.equal(partida.conteudo.rodadas.length, 2);
    for (const rodada of partida.conteudo.rodadas) {
      assert.ok(rodada.opcoes.length >= 2);
      for (const opcao of rodada.opcoes) {
        assert.ok(opcao.preco > 0 && opcao.quantidade > 0, 'a conta precisa dos dois números');
      }
    }
  });

  it('escolher a melhor compra em todas as rodadas paga as três recompensas', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await concluirPartida(partida.token, MELHORES_COMPRAS).expect(200);

    assert.equal(resultado.erros, 0);
    assert.equal(resultado.estrelas, 3);
    assert.ok(resultado.xp > 0 && resultado.polen > 0 && resultado.mel > 0);
  });

  it('a etiqueta mais barata não é a melhor compra, e escolhê-la conta erro', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    // Na primeira rodada o saquinho de 5 é o mais barato na etiqueta e o mais
    // caro por bala; na segunda, o copinho de 4 é o pior por litro.
    const { body: resultado } = await concluirPartida(partida.token, [0, 2]).expect(200);

    assert.equal(resultado.erros, 2);
  });

  it('mandar a resposta certa no corpo não muda nada (RN-007)', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await agente
      .post(`/partidas/${partida.token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas: [0, 0], melhorCompra: 0, erros: 0, estrelas: 3 })
      .expect(200);

    assert.equal(resultado.erros, 2, 'quem calcula o preço por unidade é o servidor');
  });
});
