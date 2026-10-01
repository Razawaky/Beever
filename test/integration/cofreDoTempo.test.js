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
 * O Cofre do Tempo pelo HTTP (RF-JOG-04).
 *
 * O que estes testes protegem: a tela recebe a taxa, os ciclos e a meta — que
 * aqui são o enunciado, não gabarito —, o servidor recalcula o saldo do zero a
 * partir dos depósitos (RN-007), e guardar cedo rende mais do que guardar tarde,
 * que é a lição do jogo.
 *
 * A célula do cofre é a segunda do segundo favo, então as anteriores são
 * concluídas pelo `progressService` para liberá-la.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const GUARDANDO_TUDO = [20, 20, 20, 20];

describe('Cofre do Tempo', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let favo;
  let idDaCelulaDoCofre;

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
      .send({ idCelula: idDaCelulaDoCofre });
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
        apelido: 'poupador',
        email: 'cofre-do-tempo@beever.dev',
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
        apelido: 'poupador',
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

    // O primeiro favo inteiro abre o segundo (RN-025), e a primeira célula dele
    // abre a do cofre (RN-026).
    const primeiroFavo = await hivesRepository.buscarPorSlug('primeiros-passos');
    for (const celula of await cellsRepository.listarDoFavoComProgresso(primeiroFavo.id, idUsuario, ['A'])) {
      await progressService.registrarTentativa(idUsuario, celula.id, { erros: 0, pontuacao: 100, concluiu: true });
    }

    favo = await hivesRepository.buscarPorSlug('guardar-e-gastar');
    const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, ['A']);
    idDaCelulaDoCofre = celulas[1].id;
    await progressService.registrarTentativa(idUsuario, celulas[0].id, {
      erros: 0,
      pontuacao: 100,
      concluiu: true,
    });
    csrf = await lerToken('/painel');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a página carrega o JavaScript do cofre e o que o navegador lê', async () => {
    const pagina = await agente
      .get(`/trilha/${favo.id}/celula/${idDaCelulaDoCofre}`)
      .set('Accept', 'text/html')
      .expect(200);

    assert.match(pagina.text, /js\/cofre\.js/);
    assert.match(pagina.text, new RegExp(`data-celula-id="${idDaCelulaDoCofre}"`));
    assert.match(pagina.text, /data-csrf-token="[^"]+"/);
    // O gráfico não pode ser a única forma de ler o saldo (RNF-25).
    assert.match(pagina.text, /<table/, 'o histórico em tabela é o que o leitor de tela lê');
  });

  it('abrir a partida devolve a taxa, os ciclos e a meta', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    assert.equal(partida.conteudo.ciclos, 4);
    assert.equal(partida.conteudo.taxaPorCiclo, 10);
    assert.equal(partida.conteudo.meta, 60);
    assert.equal(partida.conteudo.entradaPorCiclo, 20);
  });

  it('guardar tudo bate a meta e paga as três recompensas', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await concluirPartida(partida.token, GUARDANDO_TUDO).expect(200);

    assert.equal(resultado.erros, 0);
    assert.equal(resultado.estrelas, 3);
    assert.ok(resultado.xp > 0 && resultado.polen > 0 && resultado.mel > 0);
  });

  it('guardar cedo rende mais do que guardar tarde, com o mesmo mel', async () => {
    const { body: primeira } = await abrirPartida().expect(201);
    const { body: cedo } = await concluirPartida(primeira.token, [20, 20, 5, 5]).expect(200);

    const { body: segunda } = await abrirPartida().expect(201);
    const { body: tarde } = await concluirPartida(segunda.token, [5, 5, 20, 20]).expect(200);

    assert.equal(cedo.erros, 0, 'os mesmos 50 de mel, guardados cedo, batem a meta');
    assert.equal(tarde.erros, 1, 'guardados tarde, não batem');
  });

  it('estourar a entrada de um ciclo conta erro dele, mas não bloqueia a meta', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await concluirPartida(partida.token, [50, 20, 20, 20]).expect(200);

    assert.equal(resultado.erros, 1, 'o ciclo perdido, e a meta veio assim mesmo');
    assert.equal(resultado.estrelas, 3, 'um erro ainda vale três estrelas (RN-030)');
  });

  it('mandar saldo pronto no corpo não muda nada (RN-007)', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await agente
      .post(`/partidas/${partida.token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas: [5, 5, 5, 5], saldo: 9999, erros: 0, estrelas: 3 })
      .expect(200);

    assert.equal(resultado.erros, 1, 'quem soma o cofre é o servidor: guardar o mínimo não bate a meta');
  });
});
