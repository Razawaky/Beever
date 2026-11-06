import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';

/**
 * A política de privacidade (RNF-33 a RNF-36).
 *
 * O que estes testes protegem: a página é pública — quem decide autorizar não
 * tem conta —, ela lista os dados que o sistema realmente pede, e o e-mail de
 * contato sai do ambiente em vez de ficar escrito no template. Política que
 * promete o que o código não faz é pior que política nenhuma.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('política de privacidade', opcoes, () => {
  let app;
  let html;

  before(async () => {
    app = criarApp();
    const resposta = await request(app).get('/privacidade').set('Accept', 'text/html').expect(200);
    html = resposta.text;
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
  });

  it('é pública: quem decide autorizar o cadastro ainda não tem conta', () => {
    assert.match(html, /<h1[^>]*>[\s\S]*?Política de privacidade[\s\S]*?<\/h1>/);
  });

  it('lista os dados que o cadastro e o perfil realmente pedem', () => {
    for (const dado of ['Apelido', 'Data de nascimento', 'E-mail e senha', 'E-mail do responsável']) {
      assert.ok(html.includes(dado), `a política declara: ${dado}`);
    }

    // O que não é coletado também precisa estar escrito, porque é o que o
    // responsável quer saber (RNF-33).
    assert.match(html, /Não coletamos/);
    assert.match(html, /localização/);
  });

  it('diz que não há dinheiro real nem publicidade (RNF-35 e RNF-36)', () => {
    assert.match(html, /moeda fictícia/i);
    assert.match(html, /publicidade/i);
  });

  it('publica um e-mail de contato para os direitos do Art. 18', () => {
    const contato = /href="mailto:([^"]+)"/.exec(html);

    assert.ok(contato, 'a política tem endereço para pedido de acesso e exclusão');
    assert.match(contato[1], /@/);
    assert.match(html, /Art\. 18/);
  });
});
