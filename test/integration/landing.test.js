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
    // A arte virou WebP na T-11.7: 119 KB de PNG viraram 33 KB, e o catálogo é
    // o único lugar que sabe disso.
    const imagem = /<img[^>]*src="\/img\/beenie_howdy\.webp"[^>]*>/.exec(html);

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

  it('serve o Lenis e o script da landing, os dois do próprio projeto', () => {
    // A CSP é `script-src 'self'`: script de CDN seria bloqueado pelo navegador.
    assert.match(html, /<script src="\/js\/vendor\/lenis\.min\.js"/);
    assert.match(html, /<script src="\/js\/landing\.js"/);
    assert.doesNotMatch(html, /<script[^>]*src="https?:/);
  });

  it('o conteúdo não depende do script, e nada de estilo na marcação', () => {
    // O estado escondido da revelação vive sob `.landing-com-movimento`, classe
    // que só o script acrescenta: sem ele, nada fica invisível esperando.
    assert.doesNotMatch(html, /class="[^"]*landing-com-movimento/);
    assert.doesNotMatch(html, /style="/);
  });

  it('traz as seções de conteúdo na ordem da RF-LAN-03', () => {
    const ORDEM = [
      'por-que',
      'como-funciona',
      'trilha',
      'jogos',
      'economia',
      'sequencia',
      'pais-e-escolas',
      'perguntas',
      'comecar',
    ];
    const posicoes = ORDEM.map((ancora) => html.indexOf(`id="${ancora}"`));

    posicoes.forEach((posicao, indice) => {
      assert.ok(posicao > -1, `a seção ${ORDEM[indice]} está na página`);
      if (indice > 0) {
        assert.ok(posicao > posicoes[indice - 1], `a seção ${ORDEM[indice]} vem depois da anterior`);
      }
    });
  });

  it('todo número da seção do problema vem com fonte escrita', () => {
    const secao = html.slice(html.indexOf('id="por-que"'), html.indexOf('id="como-funciona"'));
    const numeros = secao.match(/data-contador="/g) ?? [];

    assert.equal(numeros.length, 3, 'os três números da seção');
    // Número sem fonte numa página de TCC é o pior tipo de erro possível.
    assert.equal((secao.match(/Fonte:/g) ?? []).length, 3);
  });

  it('o caminho para o registro se repete ao longo da página (RF-LAN-02)', () => {
    const chamadas = html.match(/href="\/cadastro"/g) ?? [];

    assert.ok(chamadas.length >= 3, `esperava pelo menos 3 chamadas para o registro, achei ${chamadas.length}`);
  });

  it('o mini quiz responde na própria página, sem servidor e sem conta', () => {
    const secao = html.slice(html.indexOf('id="jogos"'), html.indexOf('id="economia"'));

    assert.equal((secao.match(/class="mini-quiz-opcao/g) ?? []).length, 3);
    assert.equal((secao.match(/data-certa="true"/g) ?? []).length, 1, 'uma alternativa certa só');
    // Nada de formulário: a pergunta é demonstração, não partida.
    assert.doesNotMatch(secao, /<form/);
  });

  it('as perguntas abrem sem JavaScript', () => {
    const secao = html.slice(html.indexOf('id="perguntas"'), html.indexOf('id="comecar"'));

    // `details` nativo: teclado e leitor de tela vêm do navegador, e o acordeão
    // não gasta nada do orçamento de 30 KB.
    assert.equal((secao.match(/<details/g) ?? []).length, 4);
    assert.equal((secao.match(/<summary/g) ?? []).length, 4);
  });

  it('a seção de responsáveis leva à política de privacidade, e o rodapé também', () => {
    assert.match(html, /id="pais-e-escolas"/);
    assert.ok((html.match(/href="\/privacidade"/g) ?? []).length >= 2);
  });

  it('o rodapé traz os créditos e repete o aviso do mel fictício', () => {
    const rodape = html.slice(html.lastIndexOf('<footer'));

    assert.match(rodape, /projeto de conclusão de curso/i);
    assert.match(rodape, /moeda fictícia/i);
    assert.match(rodape, /href="#perguntas"/);
  });

  it('as camadas dizem a própria velocidade de parallax', () => {
    for (const velocidade of ['0.08', '0.18', '0.32']) {
      assert.match(html, new RegExp(`data-parallax="${velocidade}"`));
    }
  });
});
