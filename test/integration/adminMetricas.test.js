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
 * As métricas agregadas do painel (T-12.7, RF-ADM-04).
 *
 * O cenário é plantado com datas conhecidas — parte dentro da janela de sete
 * dias, parte fora — porque a única forma de provar que o recorte funciona é ter
 * dado dos dois lados da fronteira.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const ADMIN = { email: 'admin@beever.dev', senha: 'admin1234' };
const JOGADORA = { email: 'ana@beever.dev', senha: 'beever123' };

describe('métricas do painel administrativo', opcoes, () => {
  let banco;
  let app;
  let admin;
  let jogadora;

  async function tokenDe(agente, caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').redirects(2);
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function entrar(conta, caminhoDoLogin, endereco) {
    const agente = request.agent(app);
    const csrf = await tokenDe(agente, caminhoDoLogin);
    await agente
      .post(endereco)
      .set('Accept', 'application/json')
      .send({ ...conta, _csrf: csrf })
      .expect(200);
    return agente;
  }

  /** `dias` nulo é "não mandou período"; qualquer outro valor vai como veio. */
  function metricas(dias = null) {
    const pedido = admin.get('/admin').set('Accept', 'application/json');
    return dias === null ? pedido : pedido.query({ dias });
  }

  /** Uma partida concluída, com a data de fim escolhida pelo teste. */
  async function plantarConclusao(idUsuario, idCelula, diasAtras) {
    await banco.conexao.query(
      `INSERT INTO game_sessions (user_id, cell_id, status_id, token, started_at, finished_at,
                                  duration_seconds, errors, stars)
       SELECT ?, ?, st.id, UUID(),
              DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY),
              DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY),
              120, 0, 3
         FROM game_session_statuses st WHERE st.slug = 'concluida'`,
      [idUsuario, idCelula, diasAtras, diasAtras],
    );
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();

    admin = await entrar(ADMIN, '/admin/login', '/admin/login');
    jogadora = await entrar(JOGADORA, '/login', '/sessao/login');

    // O seed já traz partidas e compras da conta demo; para os números serem
    // previsíveis, o cenário começa do zero.
    await banco.conexao.query('DELETE FROM game_sessions');
    await banco.conexao.query('DELETE FROM purchases');
    await banco.conexao.query('DELETE FROM streak_events');

    const [contas] = await banco.conexao.query('SELECT id, email FROM users');
    const idDaJogadora = Number(contas.find((conta) => conta.email === JOGADORA.email).id);
    const idDoAdmin = Number(contas.find((conta) => conta.email === ADMIN.email).id);

    const [celulas] = await banco.conexao.query('SELECT id FROM cells ORDER BY id LIMIT 3');

    // Dentro da janela de sete dias: dois jogadores, três conclusões, duas células.
    await plantarConclusao(idDaJogadora, celulas[0].id, 1);
    await plantarConclusao(idDaJogadora, celulas[0].id, 2);
    await plantarConclusao(idDoAdmin, celulas[1].id, 3);
    // Fora dela, mas dentro de trinta dias.
    await plantarConclusao(idDaJogadora, celulas[2].id, 20);

    const [itens] = await banco.conexao.query('SELECT id, price FROM items ORDER BY id LIMIT 2');
    await banco.conexao.query(
      `INSERT INTO purchases (user_id, item_id, quantity, price_at_purchase, total_price, purchased_at)
       VALUES (?, ?, 2, ?, ?, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
              (?, ?, 1, ?, ?, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
              (?, ?, 5, ?, ?, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 40 DAY))`,
      [
        idDaJogadora, itens[0].id, itens[0].price, itens[0].price * 2,
        idDaJogadora, itens[1].id, itens[1].price, itens[1].price,
        idDaJogadora, itens[1].id, itens[1].price, itens[1].price * 5,
      ],
    );

    // Três dias marcados avaliados dentro da janela: dois cumpridos, um perdido,
    // mais um neutro que não pode entrar na conta da retenção.
    await banco.conexao.query(
      `INSERT INTO streak_events (user_id, event_date, event_type_id)
       SELECT ?, DATE_SUB(CURDATE(), INTERVAL dados.dias DAY), tipo.id
         FROM (
           SELECT 1 AS dias, 'cumprido' AS tipo
           UNION ALL SELECT 2, 'cumprido'
           UNION ALL SELECT 3, 'perdido'
           UNION ALL SELECT 4, 'neutro'
         ) AS dados
         JOIN streak_event_types tipo ON tipo.slug = dados.tipo`,
      [idDaJogadora],
    );
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a jogadora comum não vê o painel', async () => {
    await jogadora.get('/admin').set('Accept', 'application/json').expect(403);
  });

  it('sem período escolhido, o painel usa trinta dias', async () => {
    const resposta = await metricas().expect(200);

    assert.equal(resposta.body.metricas.dias, 30);
    assert.deepEqual(resposta.body.metricas.periodos, [7, 14, 30, 90, 180]);
  });

  it('conta jogadores ativos e conclusões dentro da janela', async () => {
    const semana = await metricas(7).expect(200);

    assert.equal(semana.body.metricas.jogadoresAtivos, 2, 'dois jogadores concluíram algo na semana');
    assert.equal(semana.body.metricas.conclusoes, 3);
    assert.equal(semana.body.metricas.celulasTocadas, 2, 'três conclusões em duas células diferentes');
  });

  it('o período muda o resultado, e é isso que ele existe para fazer', async () => {
    const semana = await metricas(7).expect(200);
    const mes = await metricas(30).expect(200);

    assert.equal(semana.body.metricas.conclusoes, 3);
    assert.equal(mes.body.metricas.conclusoes, 4, 'a conclusão de vinte dias atrás só aparece no mês');
  });

  it('lista os itens mais comprados do período, agregados por item', async () => {
    const semana = await metricas(7).expect(200);
    const itens = semana.body.metricas.itensMaisComprados;

    assert.equal(itens.length, 2, 'a compra de quarenta dias atrás fica fora da semana');
    assert.equal(Number(itens[0].unidades), 2, 'o mais comprado da semana vem primeiro');

    // Nenhuma linha do painel pode carregar quem comprou.
    assert.doesNotMatch(JSON.stringify(itens), /user_id|email/);
  });

  it('a retenção conta só dia marcado, e o neutro fica de fora', async () => {
    const { retencao } = (await metricas(7).expect(200)).body.metricas;

    assert.equal(retencao.avaliados, 3, 'o dia neutro não entra na conta');
    assert.equal(retencao.cumpridos, 2);
    assert.equal(retencao.percentual, 67);
  });

  it('o gráfico traz um ponto por dia com conclusão', async () => {
    const { grafico } = (await metricas(7).expect(200)).body.metricas;

    assert.equal(grafico.length, 3, 'três dias diferentes com conclusão');
    assert.ok(grafico.every((barra) => barra.altura > 0 && barra.topo >= 0));
    assert.deepEqual(
      [...grafico].sort((um, outro) => String(um.dia).localeCompare(String(outro.dia))).map((b) => b.dia),
      grafico.map((barra) => barra.dia),
      'as barras vêm na ordem do calendário',
    );
  });

  it('período fora da lista cai no padrão, e período inválido é recusado', async () => {
    const forcado = await metricas(45).expect(200);
    assert.equal(forcado.body.metricas.dias, 30);

    await metricas('abc').expect(422);
    await metricas('0').expect(422);
  });

  it('a página desenha as métricas e responde dentro do teto da RNF-01', async () => {
    const inicio = Date.now();
    const pagina = await admin.get('/admin').set('Accept', 'text/html').expect(200);
    const duracao = Date.now() - inicio;

    assert.match(pagina.text, /Jogadores ativos/);
    assert.match(pagina.text, /Dias marcados cumpridos/);
    assert.match(pagina.text, /<svg/, 'o gráfico é desenhado no servidor');
    assert.ok(duracao < 2000, `o painel levou ${duracao} ms, e o teto da RNF-01 é 2 s`);
  });
});
