// Roda fora do ambiente de teste de propósito: o rate limit se desliga sozinho
// quando `NODE_ENV=test`, para não estorvar o resto da suíte — e é justamente
// ele que este arquivo existe para exercitar.
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

/**
 * Força bruta no login (RNF-09, T-03.6).
 *
 * O limite existe desde a E02, e nunca havia sido exercitado — um rate limiter
 * mal configurado parece idêntico a um bem configurado até alguém tentar.
 *
 * Duas propriedades importam aqui, e a segunda é a que se esquece: o atacante
 * precisa ser barrado, e **quem acerta a senha não pode ser barrado junto**. O
 * `skipSuccessfulRequests` é o que separa os dois casos; sem ele, uma criança
 * que errou a senha três vezes ficaria de fora do próprio jogo por quinze
 * minutos.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const CONTA = {
  apelido: 'alvo',
  email: 'bruteforce@beever.dev',
  data_nasc: '2013-09-09',
  senha: 'beever123',
  consentimento_responsavel: 'on',
};

describe('força bruta no login', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;

  async function tokenDe(caminho = '/login') {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').redirects(2);
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function tentarLogin(senha) {
    return agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ email: CONTA.email, senha, _csrf: csrf });
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);
    csrf = await tokenDe();

    await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({ ...CONTA, _csrf: csrf })
      .expect(201);

    await agente.post('/sessao/logout').set('Accept', 'application/json').send({ _csrf: await tokenDe('/painel') });
    csrf = await tokenDe();
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('barra a enxurrada de tentativas erradas com 429', async () => {
    const status = [];
    for (let tentativa = 0; tentativa < 15; tentativa += 1) {
      status.push((await tentarLogin(`errada${tentativa}`)).status);
    }

    const barradas = status.filter((codigo) => codigo === 429);
    assert.ok(barradas.length > 0, 'o limite precisa entrar em ação antes da décima quinta tentativa');
    assert.ok(status.slice(0, 5).every((codigo) => codigo === 401), 'as primeiras ainda respondem normalmente');
    assert.equal(status.at(-1), 429, 'e depois de barrado, continua barrado');
  });

  it('a senha certa não passa enquanto o bloqueio dura', async () => {
    // Consequência aceita e importante de registrar: o limite é por origem, não
    // por conta. Quem está atrás do mesmo IP de um atacante espera junto.
    const resposta = await tentarLogin(CONTA.senha);
    assert.equal(resposta.status, 429);
  });

  it('o bloqueio não vaza informação sobre a conta', async () => {
    const existente = await tentarLogin('outraerrada');
    const inexistente = await agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ email: 'naoexiste@beever.dev', senha: 'outraerrada', _csrf: csrf });

    assert.equal(existente.status, inexistente.status);
    assert.deepEqual(existente.body, inexistente.body);
  });
});
