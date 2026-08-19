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
 * A tela de resultado, igual para todos os jogos (RF-CON-05).
 *
 * O que estes testes protegem: a mesma marcação serve a todos os jogos, o fim
 * de uma partida aponta para a próxima célula quando ela existe e está aberta,
 * e nunca aponta para um beco — célula travada, sem conteúdo jogável ou o fim
 * do favo.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const RESPOSTAS_DO_QUIZ = [0, 0];
const CAIXAS_CERTAS = ['entra', 'entra', 'sai', 'sai'];
const DIVISAO_DO_ORCAMENTO = [25, 15, 10];

describe('tela de resultado', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let favo;
  let celulas;
  let idUsuario;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function jogar(idCelula, respostas) {
    const { body: partida } = await agente
      .post('/partidas')
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ idCelula })
      .expect(201);

    const { body: resultado } = await agente
      .post(`/partidas/${partida.token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas })
      .expect(200);

    return { token: partida.token, resultado };
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
        apelido: 'resultado',
        email: 'tela-de-resultado@beever.dev',
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
        apelido: 'resultado',
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
    idUsuario = Number(perfil.user_id);
    favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, ['A']);
    csrf = await lerToken('/painel');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a mesma marcação de resultado é servida em qualquer jogo', async () => {
    const pagina = await agente
      .get(`/trilha/${favo.id}/celula/${celulas[0].id}`)
      .set('Accept', 'text/html')
      .expect(200);

    for (const id of ['jogo-resultado', 'jogo-mascote', 'jogo-estrelas', 'jogo-xp', 'jogo-polen', 'jogo-mel']) {
      assert.match(pagina.text, new RegExp(`id="${id}"`), `falta ${id} na tela`);
    }
    // A tela nasce escondida: quem a mostra é o `resultado.js`, no fim da partida.
    assert.match(pagina.text, /id="jogo-resultado" class="hidden/);
  });

  it('terminar aponta para a próxima célula quando ela abre', async () => {
    const { resultado } = await jogar(celulas[0].id, RESPOSTAS_DO_QUIZ);

    assert.ok(resultado.proximaCelula, 'a segunda célula abriu com a conclusão da primeira');
    assert.equal(Number(resultado.proximaCelula.id), Number(celulas[1].id));
    assert.equal(Number(resultado.proximaCelula.idFavo), Number(favo.id));
    assert.ok(resultado.proximaCelula.titulo);
  });

  it('reenviar o mesmo token devolve o resultado gravado, com o mesmo caminho', async () => {
    const { token, resultado } = await jogar(celulas[1].id, CAIXAS_CERTAS);

    const { body: reenvio } = await agente
      .post(`/partidas/${token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas: CAIXAS_CERTAS })
      .expect(200);

    assert.equal(reenvio.jaEstavaFechada, true);
    assert.deepEqual(reenvio.proximaCelula, resultado.proximaCelula);
  });

  /**
   * Célula concluída não é célula travada. Quem repete a primeira precisa
   * continuar tendo para onde ir — o contrário devolvia a criança à lista logo
   * na segunda vez que ela jogasse a mesma coisa.
   */
  it('repetir uma célula ainda aponta para a seguinte, mesmo já concluída', async () => {
    const { resultado } = await jogar(celulas[0].id, RESPOSTAS_DO_QUIZ);

    assert.equal(resultado.ehRepeticao, true, 'a primeira célula já tinha sido concluída');
    assert.equal(Number(resultado.proximaCelula.id), Number(celulas[1].id));
  });

  /**
   * Desde a T-07.7 todo tipo de jogo tem validador, então o beco que sobra é o
   * fim do favo: a última célula não tem para onde apontar.
   */
  it('a última célula do favo não aponta para lugar nenhum', async () => {
    for (const celula of celulas.slice(1, 3)) {
      await progressService.registrarTentativa(idUsuario, celula.id, { erros: 0, pontuacao: 100, concluiu: true });
    }

    const { resultado } = await jogar(celulas[3].id, DIVISAO_DO_ORCAMENTO);

    assert.equal(resultado.proximaCelula, null, 'depois da quarta célula acaba o favo');
  });
});
