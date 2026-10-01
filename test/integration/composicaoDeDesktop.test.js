import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

import { semComentariosDeHtml } from '../helpers/acessibilidade.js';

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
// perdidos no meio do vazio. Por isso ela é cobrada só pela grade. A Colmeia
// não entra nesta lista porque o desktop dela deixou de ser uma grade: virou
// uma fileira de três colunas, e ela é tratada nos testes próprios abaixo.
const TELAS = [
  { nome: 'trilha', caminho: '/trilha' },
  { nome: 'loja', caminho: '/loja' },
  { nome: 'cofre', caminho: '/cofre' },
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
    // Sem o filtro, uma barra dentro de `<!-- -->` contaria como coluna.
    return semComentariosDeHtml(resposta.text);
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
  }

  // A Colmeia saiu do padrão das outras três: o desktop dela não é mais um
  // cartão largo com `lg:max-w-*`, e sim três colunas — a barra do jogador à
  // esquerda, o conteúdo no meio e as tarefas do dia à direita. A regra do
  // checklist (RNF-20) continua a mesma, "recusar desktop que seja a coluna de
  // celular centralizada", mas o que a prova são as duas barras de largura
  // fixa: 18 rem de cada lado já não cabem numa coluna de celular.
  it('a Colmeia tem grade a partir do breakpoint, e não coluna única', async () => {
    const html = await pagina('/painel');

    assert.match(html, /lg:flex/, 'a Colmeia não abre uma fileira de colunas no desktop');
  });

  it('a Colmeia deixa de ser largura de celular no desktop', async () => {
    const html = await pagina('/painel');

    const barras = html.match(/<aside class="[^"]*\bw-72\b[^"]*"/g) ?? [];
    assert.equal(barras.length, 2, 'a Colmeia precisa das duas barras de largura fixa do desktop');
    assert.match(html, /<main class="flex-1/, 'o conteúdo precisa ocupar a largura que sobra entre as barras');
  });

  it('a loja deixa de ser largura de celular no desktop', async () => {
    const html = await pagina('/loja');

    assert.match(html, /lg:max-w-(6xl|7xl)/, 'a largura continua presa no tamanho do celular');
  });

  it('o cofre deixa de ser largura de celular no desktop', async () => {
    const html = await pagina('/cofre');

    assert.match(html, /lg:max-w-(6xl|7xl)/, 'a largura continua presa no tamanho do celular');
  });

  // Mesma regra do teste antigo, que cobrava a grade `lg:grid-cols-2` entre a
  // trilha e o dia: o que é do dia não divide espaço com a trilha.
  it('a Colmeia separa a trilha do que é do dia', async () => {
    const html = await pagina('/painel');

    // As duas barras fixas são as colunas; o conteúdo flexível é o meio.
    const barras = html.match(/<aside class="[^"]*\bw-72\b[^"]*"/g) ?? [];
    assert.equal(barras.length, 2, 'sem as duas barras, a trilha e o dia voltam a dividir espaço');
    assert.match(html, /<main class="flex-1/, 'o conteúdo do dia precisa ser uma coluna própria');

    // E a ordem do HTML continua a do celular: quem empilha recebe a trilha
    // antes das tarefas do dia.
    const trilha = html.indexOf('Minha trilha');
    const dia = html.indexOf('Suas tarefas de hoje');
    assert.ok(trilha !== -1, 'a trilha da Colmeia sumiu da tela');
    assert.ok(dia !== -1, 'as tarefas do dia sumiram da tela');
    assert.ok(trilha < dia, 'no celular, a trilha tem de vir antes do dia');
  });

  it('o cofre para de empilhar as quatro seções', async () => {
    const html = await pagina('/cofre');

    assert.match(html, /lg:grid-cols-2/);
  });
});
