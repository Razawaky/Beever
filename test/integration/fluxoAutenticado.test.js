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
 * O caminho que o jogador percorre, do cadastro à compra, contra o banco real.
 *
 * Até aqui a suíte cobria repositories isolados e páginas públicas; **rota
 * autenticada não tinha teste nenhum** — a metade da DT-16 que ficou aberta
 * quando a T-02.1 fechou a outra. Este arquivo é o que prova que as três
 * camadas conversam: controller lê a sessão, service aplica a regra, repository
 * grava, e o dinheiro bate no fim.
 *
 * Tudo numa sessão só, na ordem em que a pessoa faria, porque é justamente a
 * ordem que revela problema: onboarding que não marca, mel que não chega,
 * compra que debita duas vezes.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const AMANHA = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

describe('fluxo autenticado', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let perfilId;

  /**
   * O token de CSRF é preso à sessão, e a sessão é regenerada no cadastro e no
   * login — de propósito: um id plantado antes da autenticação não pode
   * sobreviver a ela. Por isso o token é relido de uma página depois de cada
   * regeneração, que é o que o navegador faz naturalmente.
   */
  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function concluirUmaTarefa() {
    const criada = await agente
      .post('/tarefas')
      .set('Accept', 'application/json')
      .send({ tipo: 'concluir-3-celulas', data_prazo: AMANHA, _csrf: csrf })
      .expect(201);

    await agente
      .post(`/tarefas/${criada.body.id}/concluir`)
      .set('Accept', 'application/json')
      .send({ _csrf: csrf })
      .expect(200);

    return criada.body.id;
  }

  async function melAtual() {
    const perfil = await agente.get('/perfil/meu').set('Accept', 'application/json').expect(200);
    return Number(perfil.body.mel);
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);
    csrf = await lerToken('/login');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('cadastra a conta e já entra logado', async () => {
    const resposta = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'jogadora',
        email: 'fluxo@beever.dev',
        data_nasc: '2014-05-20',
        senha: 'beever123',
        _csrf: csrf,
      })
      .expect(201);

    perfilId = resposta.body.idPerfil;
    assert.ok(perfilId, 'o cadastro devolve o perfil criado junto da conta');
    // A faixa etária sai da data de nascimento, contra a tabela `age_bands`.
    assert.equal(resposta.body.faixaEtaria, 'C');
  });

  it('o onboarding grava nível inicial, agenda e marca a conta', async () => {
    csrf = await lerToken('/onboarding');

    const resposta = await agente
      .put(`/perfil/${perfilId}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: 'jogadora',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'intermediate',
        dias: ['1', '3', '5'],
        _csrf: csrf,
      })
      .expect(200);

    assert.equal(resposta.body.nivel, 5, 'quem já sabe do assunto começa adiantado');
    assert.equal(resposta.body.diasDisponiveis, 3);

    const perfil = await agente.get('/perfil/meu').set('Accept', 'application/json').expect(200);
    assert.equal(perfil.body.avatar, 'beenie-classico');
    assert.equal(perfil.body.objetivo_inicial, 'comprar-algo');
    assert.equal(perfil.body.onboardingConcluido, true);
    assert.equal(perfil.body.nivel.nivel, 5);
  });

  it('o painel e a loja renderizam com os dados da sessão', async () => {
    const painel = await agente.get('/painel').set('Accept', 'text/html').expect(200);
    assert.match(painel.text, /jogadora/);
    assert.match(painel.text, /de mel/);

    const loja = await agente.get('/loja').set('Accept', 'text/html').expect(200);
    assert.match(loja.text, /Comprar|Sem mel/);
  });

  it('a mesma URL serve página para o navegador e JSON para a API', async () => {
    const pagina = await agente.get('/metas').set('Accept', 'text/html').expect(200);
    assert.match(pagina.text, /Minhas metas/);

    const api = await agente.get('/metas').set('Accept', 'application/json').expect(200);
    assert.ok(Array.isArray(api.body), 'pedindo JSON, a rota de página passa a vez para a API');
  });

  it('concluir tarefa paga mel e pólen, e só na primeira vez', async () => {
    const antes = await melAtual();
    const idTarefa = await concluirUmaTarefa();
    const depois = await melAtual();

    assert.ok(depois > antes, 'a tarefa concluída precisa creditar mel');

    const repetida = await agente
      .post(`/tarefas/${idTarefa}/concluir`)
      .set('Accept', 'application/json')
      .send({ _csrf: csrf })
      .expect(422);
    assert.ok(repetida.body.erro, 'concluir de novo é recusado, sem pagar de novo');
    assert.equal(await melAtual(), depois, 'e o saldo não se mexe');
  });

  it('comprar debita o mel, guarda o preço e entrega a unidade', async () => {
    const catalogo = await agente.get('/loja/itens').set('Accept', 'application/json').expect(200);
    const barato = [...catalogo.body].sort((a, b) => Number(a.price) - Number(b.price))[0];

    // Tarefa é a única fonte de mel enquanto o motor de recompensas (E06) não
    // existe, então junta-se o necessário repetindo-a.
    while ((await melAtual()) < Number(barato.price)) {
      await concluirUmaTarefa();
    }

    const antes = await melAtual();
    await agente
      .post('/loja/compras')
      .set('Accept', 'application/json')
      .send({ idItem: barato.id, _csrf: csrf })
      .expect(201);

    assert.equal(await melAtual(), antes - Number(barato.price), 'debita exatamente o preço do item');

    const inventario = await agente.get('/loja/inventario').set('Accept', 'application/json').expect(200);
    assert.ok(
      inventario.body.some((grupo) => Number(grupo.itemId) === Number(barato.id)),
      'o item comprado aparece no inventário',
    );

    const extrato = await agente.get('/loja/compras').set('Accept', 'application/json').expect(200);
    assert.equal(Number(extrato.body[0].total_price), Number(barato.price), 'o extrato congela o preço pago');
  });

  it('compra sem mel suficiente é barrada com 422 e não deixa rastro', async () => {
    const catalogo = await agente.get('/loja/itens').set('Accept', 'application/json').expect(200);
    const caro = [...catalogo.body].sort((a, b) => Number(b.price) - Number(a.price))[0];

    const antes = await melAtual();
    const resposta = await agente
      .post('/loja/compras')
      .set('Accept', 'application/json')
      .send({ idItem: caro.id, _csrf: csrf })
      .expect(422);

    assert.ok(['MEL_INSUFICIENTE', 'REQUISITO_NAO_CUMPRIDO'].includes(resposta.body.codigo));
    assert.equal(await melAtual(), antes, 'compra recusada não pode mexer no saldo');
  });

  it('cria meta com alvo e prazo, e ela volta na listagem', async () => {
    await agente
      .post('/metas')
      .set('Accept', 'application/json')
      .send({ titulo: 'Juntar mel para o patinete', alvo: 200, data_final: AMANHA, _csrf: csrf })
      .expect(201);

    const metas = await agente.get('/metas').set('Accept', 'application/json').expect(200);
    assert.equal(metas.body.length, 1);
    assert.equal(Number(metas.body[0].target_value), 200);
    assert.equal(metas.body[0].status, 'ativa');
  });

  it('o livro explica o saldo: carteira e ledgers batem no fim do fluxo', async () => {
    const conexao = banco.conexao;
    const [[usuario]] = await conexao.query('SELECT id FROM users WHERE email = ?', ['fluxo@beever.dev']);

    const [[carteira]] = await conexao.query('SELECT coins, points_total FROM wallets WHERE user_id = ?', [
      usuario.id,
    ]);
    const [[mel]] = await conexao.query('SELECT COALESCE(SUM(amount), 0) AS total FROM coin_ledger WHERE user_id = ?', [
      usuario.id,
    ]);
    const [[polen]] = await conexao.query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM point_ledger WHERE user_id = ?',
      [usuario.id],
    );
    const [[xp]] = await conexao.query('SELECT COALESCE(SUM(amount), 0) AS total FROM xp_ledger WHERE user_id = ?', [
      usuario.id,
    ]);
    const [[nivel]] = await conexao.query('SELECT xp_total FROM user_levels WHERE user_id = ?', [usuario.id]);

    assert.equal(Number(carteira.coins), Number(mel.total), 'mel: cache e livro têm que fechar');
    assert.equal(Number(carteira.points_total), Number(polen.total), 'pólen: idem');
    // O XP inicial do onboarding também passa pelo livro. Ele não passava, e foi
    // o `db:reconcile` que pegou — esta asserção existe para não voltar.
    assert.equal(Number(nivel.xp_total), Number(xp.total), 'XP: idem, inclusive o ponto de partida');
  });

  it('o logout encerra a sessão e a rota privada volta a exigir login', async () => {
    await agente.post('/sessao/logout').set('Accept', 'application/json').send({ _csrf: csrf }).expect(200);

    await agente.get('/perfil/meu').set('Accept', 'application/json').expect(401);
  });

  /**
   * Conta recém-criada que tenta pular a configuração do perfil.
   *
   * Vale a pena o segundo agente: a regra do onboarding só se testa com uma
   * conta que ainda não passou por ele, e a do bloco de cima já passou no
   * segundo teste. Antes da T-02.4 esta bateria não existia — a checagem morava
   * dentro de dois controllers de página, e as rotas JSON de loja, metas e
   * tarefas simplesmente não checavam nada.
   */
  describe('quem ainda não concluiu o onboarding', () => {
    let novato;
    let tokenNovato;
    let perfilNovato;

    before(async () => {
      novato = request.agent(app);

      const paginaLogin = await novato.get('/login').set('Accept', 'text/html');
      tokenNovato = /name="_csrf" value="([^"]+)"/.exec(paginaLogin.text)[1];

      const cadastro = await novato
        .post('/users')
        .set('Accept', 'application/json')
        .send({
          apelido: 'novato',
          email: 'novato@beever.dev',
          data_nasc: '2015-01-10',
          senha: 'beever123',
          _csrf: tokenNovato,
        })
        .expect(201);

      perfilNovato = cadastro.body.idPerfil;

      const paginaOnboarding = await novato.get('/onboarding').set('Accept', 'text/html');
      tokenNovato = /data-csrf-token="([^"]+)"/.exec(paginaOnboarding.text)[1];
    });

    it('é mandado de volta ao onboarding ao abrir painel, loja ou metas', async () => {
      for (const caminho of ['/painel', '/loja', '/metas']) {
        const resposta = await novato.get(caminho).set('Accept', 'text/html').expect(302);
        assert.equal(resposta.headers.location, '/onboarding', `${caminho} deveria redirecionar`);
      }
    });

    it('recebe 403 com código nas rotas JSON de jogo, em vez de HTML', async () => {
      for (const caminho of ['/loja/itens', '/metas', '/tarefas']) {
        const resposta = await novato.get(caminho).set('Accept', 'application/json').expect(403);
        assert.equal(resposta.body.codigo, 'ONBOARDING_PENDENTE', `${caminho} deveria barrar`);
      }
    });

    it('não consegue comprar antes de configurar o perfil', async () => {
      const resposta = await novato
        .post('/loja/compras')
        .set('Accept', 'application/json')
        .send({ idItem: 1, _csrf: tokenNovato })
        .expect(403);

      assert.equal(resposta.body.codigo, 'ONBOARDING_PENDENTE');
    });

    it('depois de concluir, passa a entrar normalmente', async () => {
      await novato
        .put(`/perfil/${perfilNovato}/onboarding`)
        .set('Accept', 'application/json')
        .send({
          apelido: 'novato',
          avatar: 'babybee',
          objetivo: 'aprender-a-guardar',
          nivel: 'beginner',
          dias: ['2', '4'],
          _csrf: tokenNovato,
        })
        .expect(200);

      await novato.get('/painel').set('Accept', 'text/html').expect(200);
      await novato.get('/loja/itens').set('Accept', 'application/json').expect(200);
    });

    it('e não consegue refazer o onboarding para reescrever o ponto de partida', async () => {
      const resposta = await novato
        .put(`/perfil/${perfilNovato}/onboarding`)
        .set('Accept', 'application/json')
        .send({
          apelido: 'novato',
          avatar: 'babybee',
          objetivo: 'entender-juros',
          nivel: 'advanced',
          dias: ['1'],
          _csrf: tokenNovato,
        })
        .expect(409);

      assert.equal(resposta.body.codigo, 'ONBOARDING_JA_CONCLUIDO');

      const perfil = await novato.get('/perfil/meu').set('Accept', 'application/json').expect(200);
      assert.equal(perfil.body.nivel.nivel, 1, 'o nível inicial escolhido da primeira vez continua valendo');

      const paginaOnboarding = await novato.get('/onboarding').set('Accept', 'text/html').expect(302);
      assert.equal(paginaOnboarding.headers.location, '/painel', 'a própria tela também deixa de ser acessível');
    });
  });
});
