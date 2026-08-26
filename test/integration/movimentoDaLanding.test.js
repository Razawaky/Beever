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
 * O sistema de movimento da landing (docs/04 §6.1, §6.3 e §6.4).
 *
 * O movimento em si só se prova em navegador. O que dá para provar aqui é o que
 * costuma quebrar sem ninguém ver: conteúdo que depende do script para existir,
 * progresso que só é dito por desenho, e o orçamento de JavaScript da página.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('movimento da landing', opcoes, () => {
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

  it('a coluna de mel é desenho, e o progresso também é dito em texto', () => {
    assert.match(html, /class="coluna-de-mel[^"]*"/);
    // O desenho é decoração: quem lê por voz recebe o mesmo dado pela barra.
    const coluna = /<div[^>]*class="coluna-de-mel[^"]*"[^>]*>/.exec(html);
    assert.ok(coluna, 'a coluna está na página');
    assert.match(coluna[0], /aria-hidden="true"/);

    const barra = /<div[^>]*id="progresso-da-landing"[^>]*>/.exec(html);
    assert.ok(barra, 'a barra escondida está na página');
    assert.match(barra[0], /role="progressbar"/);
    assert.match(barra[0], /aria-valuenow="0"/);
    assert.match(barra[0], /aria-label="[^"]+"/);
  });

  it('nada do conteúdo espera o script para aparecer', () => {
    // O estado escondido da revelação e a coluna vivem sob esta classe, que só o
    // script acrescenta. Sem ele, a página é a mesma, parada.
    assert.doesNotMatch(html, /landing-com-movimento/);
    assert.doesNotMatch(html, /style="/);
  });

  it('os favos da trilha nascem prontos, e só acendem se houver movimento', () => {
    const favos = html.match(/class="favo-acende/g) ?? [];

    assert.equal(favos.length, 6, 'os seis favos da trilha');
    // `aceso` é acrescentado pelo script; na marcação servida ninguém está apagado.
    assert.doesNotMatch(html, /favo-acende[^"]*aceso/);
  });

  it('o JavaScript da landing cabe no orçamento da seção 6.4', () => {
    const arquivos = [
      'src/public/js/landing.js',
      'src/public/js/acessibilidade.js',
      'src/public/js/vendor/lenis.min.js',
    ];
    const total = arquivos.reduce((soma, caminho) => soma + readFileSync(path.join(raiz, caminho), 'utf8').length, 0);

    // O teto era 30 KB e subiu para 34 KB quando o painel de acessibilidade
    // passou a carregar em toda tela — ele é pedido do usuário e é interface, não
    // enfeite de landing. O Lenis sozinho são 18,7 KB desse total. A régua
    // continua servindo para o mesmo: se estourar, alguém está fazendo em
    // JavaScript o que o CSS faz.
    assert.ok(total <= 34 * 1024, `o JavaScript da landing tem ${total} bytes, acima do teto de 34816`);
  });
});
