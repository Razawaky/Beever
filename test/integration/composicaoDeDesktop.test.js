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

/**
 * A composição de desktop das quatro telas mais vistas (T-16.1, RNF-20).
 *
 * O checklist da seção 8 do `docs/04` recusa desktop que seja a coluna de
 * celular centralizada. O teste cobra o que produz a composição — a grade a
 * partir do breakpoint — e o que a impediria de ser útil, que é a largura
 * presa no tamanho do celular.
 *
 * O que ele **não** prova: que a tela ficou boa. Isso só o print e o olho
 * humano dizem, e os prints são a evidência da T-15.5.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

// A trilha ganhou composição própria na T-10.4 e não pede largura maior: o
// painel do favo atual já ocupa o lado direito, e alargar deixa os favos
// perdidos no meio do vazio. Por isso ela é cobrada só pela grade.
const TELAS = [
  { nome: 'Colmeia', caminho: '/painel', larga: true },
  { nome: 'trilha', caminho: '/trilha', larga: false },
  { nome: 'loja', caminho: '/loja', larga: true },
  { nome: 'cofre', caminho: '/cofre', larga: true },
];

describe('composição de desktop das telas mais vistas', opcoes, () => {
  let banco;
  let agente;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    // O onboarding leva o token em atributo de dado, e não em campo de formulário.
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function pagina(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').expect(200);
    return resposta.text;
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    agente = request.agent(criarApp());

    let csrf = await lerToken('/login');
    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'desktop',
        email: 'desktop@beever.dev',
        data_nasc: '2014-05-01',
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
        apelido: 'desktop',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['0', '1', '2', '3', '4', '5', '6'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  for (const tela of TELAS) {
    it(`a ${tela.nome} tem grade a partir do breakpoint, e não coluna única`, async () => {
      const html = await pagina(tela.caminho);

      assert.match(html, /(md|lg|xl):grid-cols-/, 'nenhuma grade de desktop na marcação');
    });

    if (tela.larga) {
      it(`a ${tela.nome} deixa de ser largura de celular no desktop`, async () => {
        const html = await pagina(tela.caminho);

        assert.match(html, /lg:max-w-(6xl|7xl)/, 'a largura continua presa no tamanho do celular');
      });
    }
  }

  it('a Colmeia separa a trilha do que é do dia', async () => {
    const html = await pagina('/painel');

    assert.match(html, /lg:grid-cols-\[minmax\(0,1fr\)_24rem\]/);
  });

  it('o cofre para de empilhar as quatro seções', async () => {
    const html = await pagina('/cofre');

    assert.match(html, /lg:grid-cols-2/);
  });
});
