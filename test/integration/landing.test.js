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
 * O herói da landing (RF-LAN-01, RF-LAN-02 e RF-LAN-05).
 *
 * O que estes testes protegem: a primeira dobra leva ao registro, o movimento é
 * decoração que some para quem pede menos movimento, e a página inteira existe
 * sem uma linha de JavaScript — a landing é a única tela que uma pessoa vê
 * antes de decidir se entra.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('landing — herói', opcoes, () => {
  let app;
  let html;

  before(async () => {
    app = criarApp();
    const resposta = await request(app).get('/').set('Accept', 'text/html').expect(200);
    html = resposta.text;
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
  });

  it('tem um título só, e ele diz o que o produto faz', () => {
    const titulos = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/g) ?? [];

    assert.equal(titulos.length, 1, 'a página tem exatamente um h1');
    assert.match(titulos[0], /dinheiro/i);
  });

  it('leva ao registro, e oferece a porta de quem já tem conta', () => {
    assert.match(html, /href="\/cadastro"/);
    assert.match(html, /href="\/login"/);
  });

  it('o mascote reserva o próprio espaço, para a página não saltar', () => {
    const imagem = /<img[^>]*src="\/img\/beenie_howdy\.png"[^>]*>/.exec(html);

    assert.ok(imagem, 'a Beenie está no herói');
    assert.match(imagem[0], /width="612"/);
    assert.match(imagem[0], /height="812"/);
    // No herói ela é a maior imagem da primeira dobra, então carrega na frente.
    assert.match(imagem[0], /loading="eager"/);
  });

  it('as três camadas de favos são decoração, e o leitor de tela as ignora', () => {
    for (const camada of ['camada-fundo', 'camada-meio', 'camada-frente']) {
      const achada = new RegExp(`<div[^>]*${camada}[^>]*>`).exec(html);
      assert.ok(achada, `a camada ${camada} está na página`);
      assert.match(achada[0], /aria-hidden="true"/);
    }
  });

  it('a página avisa que o mel é dinheiro de brincadeira (RNF-35)', () => {
    assert.match(html, /dinheiro de brincadeira/i);
  });

  it('não depende de JavaScript nem escreve estilo na marcação', () => {
    assert.doesNotMatch(html, /<script/);
    assert.doesNotMatch(html, /style="/);
  });
});
