import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
 * Acessibilidade da landing e da política, para além do piso da WCAG.
 *
 * O público é criança e adolescente, e a régua do projeto inclui daltonismo,
 * TDAH e autismo. O que dá para provar sem navegador é o que costuma quebrar
 * calado: elemento clicável sem foco visível, alvo pequeno demais, informação
 * que só a cor carrega, e animação em laço que ninguém consegue desligar.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

function clicaveis(html) {
  return html.match(/<(?:a|button|summary)\b[^>]*>/g) ?? [];
}

describe('acessibilidade da landing', opcoes, () => {
  let app;
  let landing;
  let privacidade;

  before(async () => {
    app = criarApp();
    landing = (await request(app).get('/').set('Accept', 'text/html').expect(200)).text;
    privacidade = (await request(app).get('/privacidade').set('Accept', 'text/html').expect(200)).text;
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
  });

  it('todo elemento clicável mostra onde o teclado está', () => {
    for (const [pagina, html] of [
      ['landing', landing],
      ['privacidade', privacidade],
    ]) {
      for (const elemento of clicaveis(html)) {
        // Âncora sem `href` é alvo de rolagem, não elemento focável.
        if (elemento.startsWith('<a') && !elemento.includes('href=')) continue;
        assert.match(
          elemento,
          /focus-visible:outline/,
          `elemento sem foco visível em ${pagina}: ${elemento.slice(0, 110)}`,
        );
      }
    }
  });

  it('os botões e o acordeão respeitam o alvo de toque de 44 px (RNF-22)', () => {
    const botoes = landing.match(/<(?:a|button|summary)\b[^>]*class="[^"]*(?:bg-mel|border-white\/30|min-h-)[^"]*"[^>]*>/g) ?? [];

    assert.ok(botoes.length >= 6, `esperava vários alvos grandes, achei ${botoes.length}`);
    for (const botao of botoes) {
      assert.match(botao, /min-h-1[12]/, `alvo abaixo do piso: ${botao.slice(0, 110)}`);
    }
  });

  it('nenhuma informação depende só de cor (RNF-25, e daltonismo)', () => {
    // A semana da seção de sequência é o caso mais arriscado da página: três
    // estados que, sem ícone e palavra, seriam só três tons de hexágono.
    const semana = landing.slice(landing.indexOf('id="sequencia"'), landing.indexOf('id="pais-e-escolas"'));

    for (const palavra of ['cumprido', 'salvo pelo escudo', 'dia de folga']) {
      assert.ok(semana.includes(palavra), `o estado "${palavra}" aparece escrito, e não só pintado`);
    }

    // O acordeão também: o sinal muda de forma ao abrir, não só de cor.
    assert.match(landing, /group-open:rotate-45/);
  });

  it('todo movimento em laço pode ser desligado', () => {
    const estilos = readFileSync(path.join(raiz, 'src/styles/landing.css'), 'utf8');
    const tema = readFileSync(path.join(raiz, 'src/styles/trilha.css'), 'utf8');
    const juntos = estilos + tema;

    const emLaco = juntos.match(/animation:[^;]*infinite/g) ?? [];
    const blocosSemMovimento = juntos.match(/@media \(prefers-reduced-motion: reduce\)/g) ?? [];

    assert.ok(blocosSemMovimento.length >= 2, 'cada folha da landing trata quem pede menos movimento');
    // A flutuação da Beenie é o único laço da landing, e ela é desligada por nome.
    assert.ok(emLaco.length <= 1, `laços demais para uma página de leitura: ${emLaco.length}`);
    assert.match(tema, /prefers-reduced-motion[\s\S]*animate-float[\s\S]*animation: none/);
  });

  it('o script da landing não liga nada quando o sistema pede menos movimento', () => {
    const script = readFileSync(path.join(raiz, 'src/public/js/landing.js'), 'utf8');

    assert.match(script, /prefers-reduced-motion: reduce/);
    // O mini quiz é conteúdo e continua ligado; o resto do movimento não.
    assert.match(script, /if \(!querMenosMovimento\) \{/);
  });

  it('a página oferece desligar o movimento sem depender do sistema', () => {
    // Criança costuma usar o aparelho de outra pessoa, e a preferência do
    // sistema pode não estar ligada. O controle nasce escondido porque, sem
    // script, não existe movimento para desligar.
    const controle = /<div[^>]*id="controle-de-movimento"[^>]*>/.exec(landing);
    assert.ok(controle, 'o controle está na página');
    assert.match(controle[0], /hidden/);

    const botao = /<button[^>]*id="botao-reduzir-movimento"[^>]*>/.exec(landing);
    assert.ok(botao, 'o botão está na página');
    assert.match(botao[0], /aria-pressed="false"/);
    assert.match(botao[0], /min-h-11/);

    const script = readFileSync(path.join(raiz, 'src/public/js/landing.js'), 'utf8');
    // Desligar o movimento pausa também a rolagem suave, que é movimento.
    assert.match(script, /rolagemSuave\?\.stop\(\)/);
    assert.match(script, /localStorage/);
  });

  it('a página tem uma ordem de títulos que dá para navegar por voz', () => {
    const titulos = landing.match(/<h([1-3])\b/g) ?? [];
    const niveis = titulos.map((t) => Number(t.slice(2)));

    assert.equal(niveis.filter((n) => n === 1).length, 1, 'um h1 só');
    // Nenhum salto de nível: h1 para h3 sem h2 no meio confunde leitor de tela.
    for (let i = 1; i < niveis.length; i += 1) {
      assert.ok(niveis[i] - niveis[i - 1] <= 1, `salto de h${niveis[i - 1]} para h${niveis[i]}`);
    }
  });
});
