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
 * O Monte o Orçamento pelo HTTP (RF-JOG-03).
 *
 * O que estes testes protegem: a página traz as regras — que aqui são o
 * enunciado, e não gabarito —, o servidor conta um erro por categoria fora da
 * faixa mais um pelo total (RN-030), e nada disso vem do cliente (RN-007).
 *
 * A célula do orçamento é a quarta do favo, e a terceira é de um jogo que ainda
 * não existe: as anteriores são concluídas pelo `progressService` para liberá-la,
 * como a tela da trilha já faz nos seus testes.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const DIVISAO_CERTA = [25, 15, 10];

describe('Monte o Orçamento', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let favo;
  let idDaCelulaDeOrcamento;

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
      .send({ idCelula: idDaCelulaDeOrcamento });
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
        apelido: 'orcamentista',
        email: 'monte-o-orcamento@beever.dev',
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
        apelido: 'orcamentista',
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
    idDaCelulaDeOrcamento = celulas[3].id;

    for (const celula of celulas.slice(0, 3)) {
      await progressService.registrarTentativa(idUsuario, celula.id, { erros: 0, pontuacao: 100, concluiu: true });
    }
    csrf = await lerToken('/painel');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a página carrega o JavaScript do orçamento e o que o navegador lê', async () => {
    const pagina = await agente
      .get(`/trilha/${favo.id}/celula/${idDaCelulaDeOrcamento}`)
      .set('Accept', 'text/html')
      .expect(200);

    assert.match(pagina.text, /js\/orcamento\.js/);
    assert.match(pagina.text, new RegExp(`data-celula-id="${idDaCelulaDeOrcamento}"`));
    assert.match(pagina.text, /data-csrf-token="[^"]+"/);
  });

  it('abrir a partida devolve o total, o passo e as regras de cada categoria', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    assert.equal(partida.conteudo.total, 50);
    assert.equal(partida.conteudo.passo, 5);
    assert.equal(partida.conteudo.categorias.length, 3);
    // Aqui a regra não é gabarito: sem ela na tela, o jogo não tem enunciado.
    assert.equal(partida.conteudo.categorias[0].minimo, 20);
    assert.equal(partida.conteudo.categorias[0].maximo, 50);
  });

  it('dividir respeitando todas as regras paga as três recompensas e dá 3 estrelas', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await concluirPartida(partida.token, DIVISAO_CERTA).expect(200);

    assert.equal(resultado.erros, 0);
    assert.equal(resultado.estrelas, 3);
    assert.ok(resultado.xp > 0 && resultado.polen > 0 && resultado.mel > 0);
  });

  it('deixar mel sobrando conta um erro, mesmo com as categorias na faixa', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await concluirPartida(partida.token, [20, 10, 0]).expect(200);

    assert.equal(resultado.erros, 1, 'sobraram 20 de mel');
  });

  it('fechar o total com duas categorias fora da faixa conta dois erros', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await concluirPartida(partida.token, [10, 20, 20]).expect(200);

    assert.equal(resultado.erros, 2, 'guardar abaixo do mínimo e brinquedo acima do máximo, mas a soma fecha');
    assert.equal(resultado.estrelas, 2, 'dois erros ainda valem duas estrelas (RN-030)');
  });

  it('mandar pontuação pronta no corpo não muda nada (RN-007)', async () => {
    const { body: partida } = await abrirPartida().expect(201);

    const { body: resultado } = await agente
      .post(`/partidas/${partida.token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas: DIVISAO_CERTA, erros: 0, estrelas: 3, xp: 9999 })
      .expect(200);

    assert.equal(resultado.erros, 0, 'quem conta é a regra do banco');
    assert.notEqual(resultado.xp, 9999);
  });
});
