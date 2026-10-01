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
 * Três propriedades importam aqui. O atacante precisa ser barrado. Uma vez
 * estourado o teto da conta atacada, **nem quem acerta a senha passa** —
 * `skipSuccessfulRequests` evita *contar* a tentativa certa, e não isenta
 * ninguém depois que o bloqueio começou. E, desde a T-14.1, o balde é do e-mail
 * tentado e não da origem: a criança da carteira ao lado, no mesmo IP da escola,
 * continua entrando. Era a DT-24.
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

  it('a senha certa da conta atacada não passa enquanto o bloqueio dura', async () => {
    const resposta = await tentarLogin(CONTA.senha);
    assert.equal(resposta.status, 429);
  });

  it('o colega de sala, mesmo IP e outra conta, continua entrando (DT-24)', async () => {
    const colega = {
      apelido: 'colega',
      email: 'colega@beever.dev',
      data_nasc: '2013-09-09',
      senha: 'beever123',
      consentimento_responsavel: 'on',
    };

    // Conta nova pela mesma origem que acabou de ser barrada quinze vezes.
    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({ ...colega, _csrf: csrf });

    assert.equal(cadastro.status, 201, 'o cadastro do colega não pode ser barrado pelo ataque à outra conta');

    await agente.post('/sessao/logout').set('Accept', 'application/json').send({ _csrf: await tokenDe('/painel') });
    csrf = await tokenDe();

    const entrada = await agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ email: colega.email, senha: colega.senha, _csrf: csrf });

    assert.equal(entrada.status, 200, 'quem sabe a própria senha entra, mesmo com o vizinho sob ataque');
  });

  it('o bloqueio não distingue conta que existe de conta que não existe', async () => {
    // As duas recebem o mesmo tratamento: seis erros seguidos, e a resposta
    // precisa ser idêntica. Comparar uma conta atacada com uma intocada provaria
    // só que o limite funciona.
    await agente.post('/sessao/logout').set('Accept', 'application/json').send({ _csrf: await tokenDe('/painel') });
    csrf = await tokenDe();

    const martelar = async (email) => {
      let ultima;
      for (let tentativa = 0; tentativa < 6; tentativa += 1) {
        ultima = await agente
          .post('/sessao/login')
          .set('Accept', 'application/json')
          .send({ email, senha: `errada${tentativa}`, _csrf: csrf });
      }
      return ultima;
    };

    const existente = await martelar(CONTA.email);
    const inexistente = await martelar('naoexiste@beever.dev');

    assert.equal(existente.status, inexistente.status);
    // O `requestId` muda a cada requisição de propósito: é rastro de log, não
    // resposta, e comparar ele seria comparar o relógio.
    assert.deepEqual(
      { ...existente.body, requestId: undefined },
      { ...inexistente.body, requestId: undefined },
    );
  });
});
