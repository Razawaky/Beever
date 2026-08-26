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
 * O botão da biblioteca (seção 3 do design system), conferido nas telas
 * públicas, que são as que não pedem sessão.
 *
 * O que estes testes protegem: as três variantes saem com a mesma cara, o alvo
 * de toque não encolhe abaixo do piso da RNF-22 e o foco continua visível. Antes
 * da T-11.2 as mesmas classes estavam copiadas em 24 lugares, e a cópia de card
 * tinha 28 px de altura — metade do que a regra exige.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('componentes da interface', opcoes, () => {
  let app;

  async function pagina(caminho) {
    const resposta = await request(app).get(caminho).set('Accept', 'text/html').expect(200);
    return resposta.text;
  }

  before(() => {
    app = criarApp();
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
  });

  it('o botão primário sai com mel, canto de favo e altura mínima de 48 px', async () => {
    const html = await pagina('/');

    assert.match(html, /<a[^>]*href="\/cadastro"[^>]*class="[^"]*bg-mel[^"]*"/);
    assert.match(html, /href="\/cadastro"[^>]*class="[^"]*rounded-favo[^"]*"/);
    assert.match(html, /href="\/cadastro"[^>]*class="[^"]*min-h-12[^"]*"/);
  });

  it('a segunda ação da landing é contorno claro, e não um segundo botão em mel', async () => {
    const html = await pagina('/');
    const segundaAcao = /<a[^>]*href="\/login"[^>]*class="([^"]+)"/.exec(html);

    assert.ok(segundaAcao, 'a landing oferece o caminho de quem já tem conta');
    assert.match(segundaAcao[1], /border-white\/30/);
    assert.doesNotMatch(segundaAcao[1], /bg-mel/);
  });

  it('todo botão tem foco visível, com anel âmbar e anel de tinta por dentro', async () => {
    const html = await pagina('/login');
    const botao = /<button[^>]*type="submit"[^>]*class="([^"]+)"/.exec(html);

    assert.ok(botao, 'o botão de entrar saiu na página');
    assert.match(botao[1], /focus-visible:outline-ambar/);
    assert.match(botao[1], /focus-visible:ring-tinta/);
  });

  it('nenhuma tela pública escreve o botão à mão', async () => {
    for (const caminho of ['/', '/login', '/cadastro']) {
      const html = await pagina(caminho);
      // O componente sempre marca a altura mínima; cópia à mão nunca marcava.
      const botoes = html.match(/class="[^"]*bg-mel[^"]*font-semibold[^"]*"/g) ?? [];
      for (const classe of botoes) {
        assert.match(classe, /min-h-1[12]/, `botão sem altura mínima em ${caminho}`);
      }
    }
  });
});
