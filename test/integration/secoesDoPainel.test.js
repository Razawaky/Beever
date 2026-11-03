import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { semComentariosDeHtml, niveisDeTitulo } from '../helpers/acessibilidade.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';

/**
 * As seções que moram dentro da Colmeia.
 *
 * Os atalhos da lateral não abrem páginas soltas: eles trocam só o miolo da
 * `<main>` e mantêm as duas barras do desktop. O teste protege exatamente isso
 * — se alguém voltar a renderizar a página inteira dentro do painel, as
 * laterais somem ou o `main` se aninha.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const SECOES = [
  { nome: 'perfil', caminho: '/painel/perfil', conteudo: /Meus dias de jogo/ },
  { nome: 'trilha', caminho: '/painel/trilha', conteudo: /Continuar de onde parei/ },
  { nome: 'metas', caminho: '/painel/metas', conteudo: /Minhas metas/ },
  { nome: 'liga', caminho: '/painel/liga', conteudo: /Sua liga começa assim que você ganhar/ },
  { nome: 'loja', caminho: '/painel/loja', conteudo: /Ir para a loja/ },
  { nome: 'tela de inventário', caminho: '/painel/inventario', conteudo: /Bens/ },
  { nome: 'cofre', caminho: '/painel/cofre', conteudo: /Guardado no cofre/ },
  { nome: 'conquistas', caminho: '/painel/conquistas', conteudo: /conquistas/ },
];

describe('seções dentro do painel', opcoes, () => {
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

  before(async () => {
    banco = await criarBancoDeTeste();
    agente = request.agent(criarApp());

    let csrf = await lerToken('/login');
    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'secoes',
        email: 'secoes@beever.dev',
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
        apelido: 'secoes',
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

  for (const secao of SECOES) {
    it(`a ${secao.nome} troca só o miolo da main e mantém as duas laterais`, async () => {
      const resposta = await agente.get(secao.caminho).set('Accept', 'text/html').expect(200);
      // Sem o filtro, uma barra dentro de `<!-- -->` contaria como lateral.
      const html = semComentariosDeHtml(resposta.text);

      const barras = html.match(/<aside class="[^"]*\bw-72\b[^"]*"/g) ?? [];
      assert.equal(barras.length, 2, `a ${secao.nome} no painel precisa das duas barras do desktop`);
      assert.match(html, /<main id="conteudo-main"/, `a ${secao.nome} precisa entrar na main existente`);
      assert.match(html, /aria-current="page"/, `o atalho da ${secao.nome} precisa se marcar como atual`);
      assert.match(html, secao.conteudo, `o conteúdo da ${secao.nome} sumiu`);
      assert.doesNotMatch(html, /Ver trilha inteira/, `a Colmeia não pode dividir a main com a ${secao.nome}`);
      assert.match(html, /href="\/painel"[^>]*aria-label="Voltar para o painel"/, 'a marca precisa levar de volta à Colmeia');
      assert.doesNotMatch(html, /beenie-clicavel/, `a Beenie não pode aparecer na ${secao.nome}`);

      // O apelido da lateral é o `h1` da Colmeia; o título da seção entra como
      // `h2` para não haver dois `h1` nem salto de nível.
      const niveis = niveisDeTitulo(html);
      assert.equal(niveis.filter((nivel) => nivel === 1).length, 1, `a ${secao.nome} precisa de um h1 só`);
      for (let i = 1; i < niveis.length; i += 1) {
        assert.ok(niveis[i] - niveis[i - 1] <= 1, `salto de título na ${secao.nome}: ${niveis[i - 1]} → ${niveis[i]}`);
      }
    });
  }

  it('a loja não oferece atalho para o inventário, que agora mora na lateral', async () => {
    const painelLoja = await agente.get('/painel/loja').set('Accept', 'text/html').expect(200);
    const html = semComentariosDeHtml(painelLoja.text);

    assert.doesNotMatch(html, /href="\/inventario"/, 'o atalho solto saiu da loja');
    assert.match(
      html,
      /href="\/painel\/inventario"[^>]*>[\s\S]{0,120}Meus itens/,
      'o inventário precisa aparecer como opção da lateral',
    );

    const loja = await agente.get('/loja').set('Accept', 'text/html').expect(200);
    assert.doesNotMatch(semComentariosDeHtml(loja.text), /href="\/inventario"/, 'a página antiga também perdeu o atalho');
  });

  it('a Beenie clicável continua na Colmeia principal', async () => {
    const resposta = await agente.get('/painel').set('Accept', 'text/html').expect(200);

    assert.match(resposta.text, /id="beenie-clicavel"/);
  });

  it('o perfil da lateral abre dentro da Colmeia', async () => {
    const painel = await agente.get('/painel').set('Accept', 'text/html').expect(200);
    assert.match(
      painel.text,
      /href="\/painel\/perfil"[\s\S]{0,160}aria-label="Abrir meu perfil"/,
      'o bloco do perfil na lateral precisa ser um link',
    );

    const resposta = await agente.get('/painel/perfil').set('Accept', 'text/html').expect(200);
    const html = semComentariosDeHtml(resposta.text);

    assert.match(html, /href="\/painel\/perfil"[\s\S]{0,200}aria-current="page"/, 'o perfil precisa se marcar como atual');
    assert.match(html, /<main id="conteudo-main"[\s\S]*Meus dias de jogo/, 'o perfil precisa abrir dentro da main');
    assert.match(html, /data-csrf-token=/, 'o formulário dos dias precisa do token no corpo da página');
    assert.match(html, /\/js\/perfil\.js/, 'o painel precisa carregar o script que salva os dias');
  });

  it('a saída da conta pede confirmação antes de encerrar a sessão', async () => {
    const resposta = await agente.get('/painel').set('Accept', 'text/html').expect(200);
    const html = semComentariosDeHtml(resposta.text);

    assert.match(html, /id="abrir-dialogo-sair"/, 'o botão da lateral precisa abrir a confirmação');
    assert.match(html, /<dialog[^>]*id="dialogo-sair"/, 'o painel precisa do diálogo de saída');
    assert.match(html, /id="titulo-dialogo-sair"/, 'o diálogo precisa de um título acessível');
    assert.match(html, /data-fechar-dialogo-sair/, 'o diálogo precisa de uma saída sem encerrar a conta');
    assert.doesNotMatch(html, /<dialog[^>]*\bopen\b/, 'o diálogo não pode começar aberto');

    // Um formulário fica na lateral (sem JavaScript) e outro no diálogo. Os
    // dois levam o mesmo token, então a confirmação não perde a proteção CSRF.
    const formularios = html.match(/action="\/sessao\/logout"/g) ?? [];
    assert.equal(formularios.length, 2, 'o logout precisa continuar funcionando sem JavaScript');
  });

  it('a projeção do cofre no painel continua na casca do painel', async () => {
    const resposta = await agente
      .get('/painel/cofre')
      .query({ porSemana: 10 })
      .set('Accept', 'text/html')
      .expect(200);

    assert.match(resposta.text, /action="\/painel\/cofre"/, 'o formulário devolve o jogador para a página errada');
  });

  it('a loja do painel leva a confirmação para dentro da main', async () => {
    const loja = await agente.get('/painel/loja').set('Accept', 'text/html').expect(200);
    const link = /href="\/painel\/loja\/itens\/(\d+)\/confirmar"/.exec(loja.text);
    assert.ok(link, 'o item da loja precisa abrir a confirmação dentro da Colmeia');

    const confirmacao = await agente
      .get(`/painel/loja/itens/${link[1]}/confirmar`)
      .set('Accept', 'text/html')
      .expect(200);
    const html = semComentariosDeHtml(confirmacao.text);

    assert.match(html, /<main id="conteudo-main"/, 'a confirmação precisa entrar na main existente');
    assert.equal((html.match(/<aside class="[^"]*\bw-72\b[^"]*"/g) ?? []).length, 2);
    assert.match(html, /name="voltarPara" value="\/painel\/loja"/, 'comprar precisa devolver para a loja do painel');
    assert.match(html, /href="\/painel\/loja"[^>]*>\s*Agora não/, 'desistir também volta para a loja do painel');
  });

  it('o favo aberto na trilha do painel continua dentro da main', async () => {
    const trilha = await agente.get('/painel/trilha').set('Accept', 'text/html').expect(200);
    const link = /href="\/painel\/trilha\/(\d+)"/.exec(trilha.text);
    assert.ok(link, 'a trilha do painel precisa apontar para os favos dentro do painel');

    const favo = await agente.get(`/painel/trilha/${link[1]}`).set('Accept', 'text/html').expect(200);
    const html = semComentariosDeHtml(favo.text);

    assert.match(html, /<main id="conteudo-main"/, 'o favo precisa entrar na main existente');
    assert.equal((html.match(/<aside class="[^"]*\bw-72\b[^"]*"/g) ?? []).length, 2);
    assert.match(html, /href="\/painel\/trilha"[\s\S]{0,320}aria-current="page"[\s\S]{0,320}Minha trilha/, 'a lateral precisa marcar a trilha como atual');
    assert.match(html, /href="\/painel\/trilha"/, 'o favo precisa voltar para a trilha do painel');
  });

  it('as ações do cofre voltam para a seção em que o jogador estava', async () => {
    const csrf = await lerToken('/painel/cofre');

    await agente
      .post('/cofre/meta')
      .type('form')
      .send({ _csrf: csrf, valor: '1', voltarPara: '/painel/cofre' })
      .expect(302)
      .expect('Location', '/painel/cofre');
  });
});
