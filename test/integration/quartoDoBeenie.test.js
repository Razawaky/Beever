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
 * O Quarto do Beenie como primeira atividade da trilha.
 *
 * Cobre o ponto que a demo isolada não podia provar: a página abre partida,
 * o cliente não recebe o gabarito e o servidor paga proporcionalmente ao que
 * foi arrumado antes de a pessoa sair pela porta. Cada teste usa uma conta
 * nova: repetir a célula paga menos, e isso não é o que estamos medindo aqui.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const TAREFAS = ['bau', 'armario', 'cama', 'quadro', 'mesa', 'janela'];

describe('Quarto do Beenie na trilha', opcoes, () => {
  let banco;
  let app;
  let agente;
  let favo;
  let quarto;

  async function lerToken(quem, caminho) {
    const resposta = await quem.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function novaJogadora(email, apelido) {
    const quem = request.agent(app);
    let token = await lerToken(quem, '/login');

    const cadastro = await quem
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido,
        email,
        data_nasc: '2018-04-02',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: token,
      })
      .expect(201);

    token = await lerToken(quem, '/onboarding');
    await quem
      .put(`/perfil/${cadastro.body.idPerfil}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido,
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['1', '3', '5'],
        tempo: 10,
        _csrf: token,
      })
      .expect(200);

    const [[perfil]] = await banco.conexao.query('SELECT user_id FROM profiles WHERE id = ?', [
      cadastro.body.idPerfil,
    ]);
    const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, Number(perfil.user_id), ['A']);
    const celulaDoQuarto = celulas.find((item) => item.game_type_slug === 'quarto-do-beenie');
    assert.ok(celulaDoQuarto, 'o quarto precisa ser a primeira atividade do favo');

    return { quem, token: await lerToken(quem, '/painel'), quarto: celulaDoQuarto };
  }

  function abrirPartida(quem, token, celula) {
    return quem
      .post('/partidas')
      .set('Accept', 'application/json')
      .set('x-csrf-token', token)
      .send({ idCelula: celula.id });
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    favo = await hivesRepository.buscarPorSlug('primeiros-passos');

    const primeira = await novaJogadora('quarto-beenie@beever.dev', 'arrumadeira');
    agente = primeira.quem;
    quarto = primeira.quarto;
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('é a primeira atividade e abre a página da demo sem o rodapé, sem entregar o gabarito', async () => {
    const lista = await agente.get(`/trilha/${favo.id}`).set('Accept', 'text/html').expect(200);
    assert.match(lista.text, /De onde vem o dinheiro\?/);
    assert.match(lista.text, new RegExp(`href="/trilha/${favo.id}/celula/${quarto.id}"`));

    const antes = await contarPartidas();
    const pagina = await agente
      .get(`/trilha/${favo.id}/celula/${quarto.id}`)
      .set('Accept', 'text/html')
      .expect(200);

    assert.match(pagina.text, /<main class="demo">/, 'a atividade usa o modelo da demo');
    assert.match(pagina.text, /id="video-intro"/);
    assert.match(pagina.text, /id="jogo"/);
    assert.match(pagina.text, /\/demo\/quarto-beenie\/demo\.css\?v=\d+/);
    assert.match(pagina.text, /\/js\/quartoBeenie\.js/);
    assert.match(pagina.text, /\/js\/demo\/quarto-beenie\/main\.js/);
    assert.match(pagina.text, /data-quarto-beenie-integrado="1"/);
    assert.match(pagina.text, new RegExp(`data-celula-id="${quarto.id}"`));
    assert.match(pagina.text, /data-csrf-token="[^"]+"/);
    assert.ok(!pagina.text.includes('demo__rodape'), 'o rodapé da demo foi retirado');
    assert.ok(!pagina.text.includes('Demo local: nenhuma partida'), 'o texto do rodapé não aparece');
    assert.ok(!pagina.text.includes('quarto-beenie-frame'), 'não há mais iframe');
    assert.ok(!pagina.text.includes('id="jogo-barra-caixa"'), 'a barra branca da casca não aparece');
    assert.ok(!pagina.text.includes('id="jogo-passo"'), 'o texto de passo da casca não aparece');
    assert.ok(!pagina.text.includes('"tarefas"'), 'a lista de tarefas não viaja no HTML');
    assert.equal(await contarPartidas(), antes, 'GET não cria partida');
  });

  it('abre a partida sem gabarito e aceita rascunho parcial', async () => {
    const { quem, token, quarto: celula } = await novaJogadora('quarto-rascunho@beever.dev', 'rascunho');
    const { body: partida } = await abrirPartida(quem, token, celula).expect(201);

    assert.equal(partida.conteudo.total, 6);
    assert.equal(partida.conteudo.tarefas, undefined);
    assert.ok(partida.conteudo.enunciado);

    await quem
      .put(`/partidas/${partida.token}/estado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', token)
      .send({ respostas: ['bau', 'cama', 'bau'] })
      .expect(200);

    const { body: retomada } = await abrirPartida(quem, token, celula).expect(201);
    assert.deepEqual(retomada.estado.respostas, ['bau', 'cama'], 'o rascunho deduplica repetidos');

    await fechar(quem, token, partida.token, TAREFAS);
  });

  it('paga três estrelas quando todas as tarefas foram arrumadas', async () => {
    const { quem, token, quarto: celula } = await novaJogadora('quarto-completo@beever.dev', 'completa');
    const { body: partida } = await abrirPartida(quem, token, celula).expect(201);
    const { body: resultado } = await fechar(quem, token, partida.token, TAREFAS);

    assert.equal(resultado.erros, 0);
    assert.equal(resultado.estrelas, 3);
    assert.ok(resultado.xp > 0 && resultado.polen > 0 && resultado.mel > 0);
  });

  it('sai pela porta com poucas tarefas e recebe nota proporcional', async () => {
    const { quem, token, quarto: celula } = await novaJogadora('quarto-parcial@beever.dev', 'parcial');
    const { body: partida } = await abrirPartida(quem, token, celula).expect(201);
    const { body: resultado } = await fechar(quem, token, partida.token, ['bau', 'cama']);

    assert.equal(resultado.erros, 4);
    assert.equal(resultado.estrelas, 1, 'quem sai cedo não é reprovado');
    assert.ok(resultado.mel > 0, 'mesmo a saída antecipada rende o mínimo');
  });

  async function contarPartidas() {
    const [linhas] = await banco.conexao.query('SELECT COUNT(*) AS total FROM game_sessions');
    return Number(linhas[0].total);
  }

  async function fechar(quem, token, partidaToken, respostas) {
    return quem
      .post(`/partidas/${partidaToken}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', token)
      .send({ respostas })
      .expect(200);
  }
});
