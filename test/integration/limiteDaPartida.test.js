// Roda fora do ambiente de teste de propósito, como o `bruteForce.test.js`: o
// rate limit se desliga sozinho quando `NODE_ENV=test`, para não estorvar o
// resto da suíte — e é justamente ele que este arquivo existe para exercitar.
process.env.NODE_ENV = 'development';
process.env.LOG_LEVEL = 'silent';

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

import './../helpers/ambiente.js';

const { criarBancoDeTeste, motivoParaPular } = await import('../helpers/banco.js');
const { criarApp } = await import('../../src/app.js');
const { fecharPool } = await import('../../src/config/database.js');
const { fecharSessionStore } = await import('../../src/config/session.js');
const cellsRepository = await import('../../src/repositories/cellsRepository.js');
const hivesRepository = await import('../../src/repositories/hivesRepository.js');

/**
 * O limitador da rota de partida (lacuna L-2 do laudo da E07).
 *
 * A partida é a maior fonte de XP, pólen e mel do jogo, e era a única rota que
 * creditava sem o `limiteRecompensa` — tarefa, meta, perfil e loja já tinham o
 * deles. Isto é a rede de baixo: se algum dia uma checagem de regra escapar, o
 * estrago fica limitado ao que cabe em um minuto.
 *
 * Salvar progresso ficou de fora do limitador, e é decisão registrada: ele é
 * chamado a cada decisão do jogador — a cada toque no + do orçamento — e um
 * limite de recompensa ali castigaria quem está só jogando.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const LIMITE_POR_MINUTO = 30;

describe('limite da rota de partida', opcoes, () => {
  let banco;
  let agente;
  let csrf;
  let idDaCelula;

  before(async () => {
    banco = await criarBancoDeTeste();
    agente = request.agent(criarApp());

    const pagina = await agente.get('/login').set('Accept', 'text/html');
    csrf = /name="_csrf" value="([^"]+)"/.exec(pagina.text)[1];

    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'apressado',
        email: 'limite-da-partida@beever.dev',
        data_nasc: '2018-04-02',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: csrf,
      })
      .expect(201);

    const onboarding = await agente.get('/onboarding').set('Accept', 'text/html');
    csrf = /data-csrf-token="([^"]+)"/.exec(onboarding.text)[1];
    await agente
      .put(`/perfil/${cadastro.body.idPerfil}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: 'apressado',
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
    const favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, Number(perfil.user_id), ['A']);
    idDaCelula = celulas[0].id;

    const painel = await agente.get('/painel').set('Accept', 'text/html');
    csrf = /name="_csrf" value="([^"]+)"/.exec(painel.text)[1];
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('abrir partida sem parar acaba recusado, e não segue para sempre', async () => {
    const codigos = [];

    // Uma a mais que o limite: a última precisa ser barrada. Reabrir a mesma
    // célula devolve a mesma partida (RF-JOG-07), então isto não enche a tabela.
    for (let tentativa = 0; tentativa <= LIMITE_POR_MINUTO; tentativa += 1) {
      const resposta = await agente
        .post('/partidas')
        .set('Accept', 'application/json')
        .set('x-csrf-token', csrf)
        .send({ idCelula: idDaCelula });
      codigos.push(resposta.status);
    }

    assert.equal(codigos[0], 201, 'a primeira abre normalmente');
    assert.ok(codigos.includes(429), 'em algum momento a rota precisa recusar');
    assert.equal(codigos.at(-1), 429, 'passado o limite, não passa mais');
  });
});
