// Roda fora do ambiente de teste de propósito: o rate limit se desliga sozinho
// quando `NODE_ENV=test`, e é justamente ele que este arquivo exercita.
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
 * O limite global conta a criança, e não a escola (RNF-02, DT-112).
 *
 * A medição de carga com os limitadores ligados devolvia 120 respostas 429 em
 * 600 requisições: trinta crianças atrás do IP da escola consumiam um balde só.
 * Este arquivo prova que cada sessão tem o balde dela, e guarda a ordem em que o
 * limitador é montado — depois da sessão, senão a chave cairia para o endereço
 * sem ninguém perceber.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

function contaDe(numero) {
  return {
    apelido: `turma${numero}`,
    email: `turma${numero}@beever.dev`,
    data_nasc: '2013-04-04',
    senha: 'beever123',
    consentimento_responsavel: 'on',
  };
}

/** Quantas requisições ainda cabem no balde desta resposta. */
function restam(resposta) {
  const cabecalho = resposta.headers.ratelimit ?? '';
  const achado = /remaining=(\d+)/.exec(cabecalho);
  assert.ok(achado, `a resposta precisa trazer o cabeçalho RateLimit: "${cabecalho}"`);
  return Number(achado[1]);
}

describe('limite global por sessão', opcoes, () => {
  let banco;
  let app;

  async function entrar(numero) {
    const agente = request.agent(app);
    const pagina = await agente.get('/login').set('Accept', 'text/html');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(pagina.text)[1];

    await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({ ...contaDe(numero), _csrf: csrf })
      .expect(201);

    return agente;
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a leitura de uma criança não gasta o balde da outra, no mesmo endereço', async () => {
    const primeira = await entrar(1);
    let ultima;
    for (let visita = 0; visita < 4; visita += 1) {
      ultima = await primeira.get('/painel').set('Accept', 'text/html');
    }
    const gastoDaPrimeira = restam(ultima);

    const segunda = await entrar(2);
    const gastoDaSegunda = restam(await segunda.get('/painel').set('Accept', 'text/html'));

    assert.ok(gastoDaSegunda > gastoDaPrimeira, 'a segunda criança começa com o balde dela');
  });

  it('quem não está logado continua contado por endereço', async () => {
    const anonimo = request.agent(app);

    const primeira = restam(await anonimo.get('/login').set('Accept', 'text/html'));
    const segunda = restam(await anonimo.get('/login').set('Accept', 'text/html'));

    assert.equal(segunda, primeira - 1, 'sem sessão, as duas visitas caem no mesmo balde');
  });
});
