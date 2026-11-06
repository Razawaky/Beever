import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { mascote } from '../../src/config/mascote.js';
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
    // A pose do herói mudou e a arte é WebP, mas a regra é a mesma da sempre:
    // as dimensões vêm do catálogo (`src/config/mascote.js`) e precisam chegar
    // à marcação. Sem `width` e `height` o navegador não reserva o espaço e a
    // primeira dobra salta quando a imagem chega. Ler o valor esperado do
    // catálogo, em vez de escrevê-lo aqui, evita o teste virar uma segunda
    // fonte de verdade que envelhece junto com a arte.
    const arte = mascote('coolpose');
    const imagem = new RegExp(`<img[^>]*${arte.arquivo.replace('.', '\\.')}[^>]*>`).exec(html);

    assert.ok(imagem, 'a Beenie está no herói');
    assert.match(imagem[0], new RegExp(`width="${arte.largura}"`), 'a largura do catálogo não foi para a marcação');
    assert.match(imagem[0], new RegExp(`height="${arte.altura}"`), 'a altura do catálogo não foi para a marcação');
    // No herói ela é a maior imagem da primeira dobra, então carrega na frente.
    assert.match(imagem[0], /loading="eager"/);
    assert.match(imagem[0], /fetchpriority="high"/);
  });

  it('as três camadas de favos são decoração, e o leitor de tela as ignora', () => {
    // A regra original: as três camadas de favos do parallax são decoração pura,
    // então o leitor de tela tem de pulá-las. O que mudou foi a nomeação — as
    // três layers compartilham a classe `camada-de-favos` e se distinguem pela
    // `data-parallax`. Então o teste deixa de caçar três nomes e passa a
    // percorrer as camadas de verdade, o que também pega uma quarta.
    const camadas = html.match(/<div[^>]*camada-de-favos[^>]*>/g) ?? [];

    assert.equal(camadas.length, 3, 'a landing tem três camadas de favos');
    for (const camada of camadas) {
      assert.match(camada, /aria-hidden="true"/, `uma camada de favos anuncia texto: ${camada}`);
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
    // A regra é que cada camada se mova no seu próprio ritmo: sem velocidades
    // diferentes não há parallax, é só um fundo que desliza junto com a página.
    // Os números mudam conforme o design ajusta a arte — o herói já foi de 0.08
    // para 0.18 —, então o teste cobra a propriedade em vez de cravar valores
    // que envelhecem junto com o design.
    const camadas = html.match(/<div[^>]*camada-de-favos[^>]*data-parallax="(-?[\d.]+)"[^>]*>/g) ?? [];
    const velocidades = camadas.map((camada) => Number(/data-parallax="(-?[\d.]+)"/.exec(camada)[1]));

    assert.equal(velocidades.length, 3, 'as três camadas precisam declarar a própria velocidade');
    assert.ok(
      velocidades.every((velocidade) => velocidade !== 0),
      'uma camada parada não participa do parallax',
    );
    assert.equal(
      new Set(velocidades).size,
      3,
      `as camadas precisam de ritmos diferentes, e estes são: ${velocidades.join(', ')}`,
    );
  });
});
