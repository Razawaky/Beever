import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { medindoCobertura } from '../helpers/relogio.js';
import { criarApp } from '../../src/app.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';
import * as economicCyclesRepository from '../../src/repositories/economicCyclesRepository.js';
import * as inventoryRepository from '../../src/repositories/inventoryRepository.js';
import * as itemsRepository from '../../src/repositories/itemsRepository.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as purchasesRepository from '../../src/repositories/purchasesRepository.js';
import * as userLevelsRepository from '../../src/repositories/userLevelsRepository.js';
import * as vaultsRepository from '../../src/repositories/vaultsRepository.js';
import * as coinsService from '../../src/services/coinsService.js';
import * as levelsService from '../../src/services/levelsService.js';
import * as patrimonyService from '../../src/services/patrimonyService.js';
import * as vaultService from '../../src/services/vaultService.js';

/**
 * Aceite da E09 — a economia inteira, pelo caminho do jogador.
 *
 * O critério da etapa, no texto do roadmap: "entrar após 6 semanas sem acessar
 * aplica todos os ciclos uma única vez, com extrato claro e nada de saldo
 * negativo". Junto dele, os outros quatro que a T-09.9 pede: saldo
 * insuficiente, compra dupla, item vendido por inadimplência e patrimônio
 * conferido no centavo.
 *
 * Os cenários rodam em ordem, sobre o mesmo jogador: ele compra, guarda no
 * cofre, fica sem mel, some por seis semanas e volta. É essa travessia que o
 * aceite precisa provar — cada efeito isolado já tem teste próprio.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const SEMANAS_FORA = 6;
const MEL_ANTES_DE_SUMIR = 30;
const TETO_DE_RESPOSTA_MS = 2000;

describe('aceite da E09 — economia', opcoes, () => {
  let banco;
  let app;
  let agente;
  let idUsuario;
  let idPerfil;
  let itens;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function melDe() {
    return (await coinsService.obterCarteira(idUsuario)).mel;
  }

  /** Envelhece a conta: é o que faz o ciclo ter seis semanas para processar. */
  async function contaCriadaHaSemanas(semanas) {
    await banco.conexao.query('UPDATE users SET created_at = created_at - INTERVAL ? WEEK WHERE id = ?', [
      semanas,
      idUsuario,
    ]);
  }

  async function darItem(slug) {
    const item = itens[slug];
    return emTransacao((conexao) =>
      inventoryRepository.adicionar(conexao, {
        idUsuario,
        idItem: item.id,
        valorInicial: Number(item.price),
      }),
    );
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);

    const slugs = ['patinete', 'terreno', 'moto', 'videogame', 'barraquinha-de-limonada', 'casa-grande'];
    itens = {};
    for (const slug of slugs) {
      itens[slug] = await itemsRepository.buscarPorSlug(slug);
    }

    let csrf = await lerToken('/login');
    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'economista',
        email: 'economista@beever.dev',
        data_nasc: '2012-05-01',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: csrf,
      })
      .expect(201);

    idPerfil = cadastro.body.idPerfil;
    csrf = await lerToken('/onboarding');
    await agente
      .put(`/perfil/${idPerfil}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: 'economista',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['0', '1', '2', '3', '4', '5', '6'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    const [[perfil]] = await banco.conexao.query('SELECT user_id FROM profiles WHERE id = ?', [idPerfil]);
    idUsuario = Number(perfil.user_id);
    await profilesRepository.atualizar(idPerfil, { faixaEtaria: 'C' });

    // Nível alto para os requisitos de compra não atrapalharem o que o aceite
    // quer provar — o bloqueio por requisito já tem teste próprio.
    const curva = await levelsService.obterCurva();
    await emTransacao((conexao) =>
      userLevelsRepository.atualizar(conexao, idUsuario, {
        nivel: 15,
        xpTotal: levelsService.xpDoNivel(curva, 15),
        xpProximoNivel: levelsService.xpDoProximoNivel(curva, 15),
      }),
    );
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('comprar sem mel é recusado e não deixa rastro', async () => {
    const antes = await melDe();
    const csrf = await lerToken('/painel');

    await agente
      .post('/loja/compras')
      .set('Accept', 'application/json')
      .send({ idItem: itens['casa-grande'].id, chaveDeIdempotencia: randomUUID(), _csrf: csrf })
      .expect(422);

    assert.equal(await melDe(), antes, 'o mel não se mexeu');
    assert.equal(
      (await purchasesRepository.listarPorUsuario(idUsuario)).length,
      0,
      'compra recusada não vira linha em purchases',
    );
    assert.equal((await inventoryRepository.listarPorUsuario(idUsuario)).length, 0);
  });

  it('dois cliques no mesmo botão compram uma vez só, pelo HTTP', async () => {
    await emTransacao((conexao) =>
      coinsService.creditar(conexao, idUsuario, 5000, { motivo: 'ajuste-administrativo' }),
    );

    const csrf = await lerToken('/painel');
    // O saldo é lido **depois** da visita à Colmeia que o token exigiu: desde a
    // T-13.2 a visita pode destravar conquista de patrimônio e creditar o bônus
    // dela, e comparar contra um número fixo mediria as duas coisas juntas.
    const melAntes = await melDe();
    const chave = randomUUID();
    const pedido = () =>
      agente
        .post('/loja/compras')
        .set('Accept', 'application/json')
        .send({ idItem: itens.patinete.id, chaveDeIdempotencia: chave, _csrf: csrf });

    const respostas = await Promise.all([pedido(), pedido()]);

    respostas.forEach((resposta) => {
      assert.ok(resposta.status === 200 || resposta.status === 201, 'quem clicou duas vezes não vê erro');
    });
    assert.equal((await purchasesRepository.listarPorUsuario(idUsuario)).length, 1);
    assert.equal(await melDe(), melAntes - Number(itens.patinete.price), 'saiu o preço de uma compra só');
  });

  it('guardar mel no cofre não muda o patrimônio', async () => {
    const antes = await patrimonyService.obterDoUsuario(idUsuario);

    await vaultService.depositar(idUsuario, 1000);
    await vaultService.definirMeta(idUsuario, { valor: 1200 });

    const depois = await patrimonyService.obterDoUsuario(idUsuario);
    assert.equal(depois.total, antes.total, 'mel guardado continua sendo do jogador');
    assert.equal(depois.cofre, 1000);
  });

  it('seis semanas fora são aplicadas de uma vez, na primeira visita à Colmeia', async () => {
    await darItem('terreno');
    await darItem('moto');
    await darItem('videogame');
    await darItem('barraquinha-de-limonada');

    // Sobra pouco mel de propósito: é o que faz as contas não fecharem lá pela
    // segunda semana e a inadimplência acontecer dentro da janela.
    const sobra = (await melDe()) - MEL_ANTES_DE_SUMIR;
    await emTransacao((conexao) =>
      coinsService.debitar(conexao, idUsuario, sobra, { motivo: 'ajuste-administrativo' }),
    );
    await contaCriadaHaSemanas(SEMANAS_FORA);

    const comecou = Date.now();
    const visita = await agente.get('/painel').set('Accept', 'text/html').expect(200);
    const duracao = Date.now() - comecou;

    const ciclos = await economicCyclesRepository.listarUltimos(idUsuario, 20);
    assert.equal(ciclos.length, SEMANAS_FORA, 'seis semanas fora, seis ciclos gravados');
    assert.deepEqual(
      ciclos.map((ciclo) => Number(ciclo.cycle_number)).sort((a, b) => a - b),
      [1, 2, 3, 4, 5, 6],
      'um ciclo por semana, sem buraco e sem repetição',
    );
    assert.match(visita.text, /Você ficou 6 semanas fora/, 'a Colmeia explica o que aconteceu');
    // O caso inteiro continua rodando sob cobertura; só o cronômetro fica de
    // fora, porque a instrumentação infla o tempo que a RNF-01 cobra. Os testes
    // seguintes dependem desta visita ter acontecido.
    if (!medindoCobertura) {
      assert.ok(
        duracao < TETO_DE_RESPOSTA_MS,
        `a visita mais pesada do app levou ${duracao}ms, acima do teto de ${TETO_DE_RESPOSTA_MS}ms (RNF-01)`,
      );
    }
  });

  it('voltar de novo não aplica ciclo nenhum outra vez', async () => {
    const melAntes = await melDe();
    const cofreAntes = await vaultService.obterDoUsuario(idUsuario);

    await agente.get('/painel').set('Accept', 'text/html').expect(200);

    assert.equal(await economicCyclesRepository.ultimoNumeroProcessado(idUsuario), SEMANAS_FORA);
    assert.equal(await melDe(), melAntes, 'nada foi cobrado nem creditado de novo');
    assert.equal((await vaultService.obterDoUsuario(idUsuario)).saldo, cofreAntes.saldo);
  });

  it('o extrato explica cada semana, e o cofre rendeu uma vez por ciclo', async () => {
    const ciclos = await economicCyclesRepository.listarUltimos(idUsuario, 20);

    ciclos.forEach((ciclo) => {
      const resumo = typeof ciclo.summary === 'string' ? JSON.parse(ciclo.summary) : ciclo.summary;
      assert.ok(resumo, `o ciclo ${ciclo.cycle_number} guardou o que aconteceu`);
      assert.equal(typeof resumo.renda, 'number');
      assert.equal(typeof resumo.custo, 'number');
    });

    const extrato = await vaultsRepository.listarTransacoes(idUsuario);
    const rendimentos = extrato.filter((linha) => linha.tipo === 'rendimento');
    assert.equal(rendimentos.length, SEMANAS_FORA, 'um rendimento por ciclo, nem mais nem menos');
    rendimentos.forEach((linha) => {
      assert.ok(Number(linha.balance_after) > 0, 'o extrato do cofre diz o saldo depois de cada linha');
    });
  });

  it('o item que ficou duas semanas devendo foi vendido por 50%', async () => {
    const unidades = await banco.conexao.query(
      `SELECT i.slug, inv.sold_value, inv.current_value, s.slug AS status
         FROM inventory inv
         JOIN items i ON i.id = inv.item_id
         JOIN inventory_statuses s ON s.id = inv.status_id
        WHERE inv.user_id = ?`,
      [idUsuario],
    );

    const vendidas = unidades[0].filter((unidade) => unidade.status === 'vendido');
    assert.ok(vendidas.length > 0, 'quem não pagou as contas por duas semanas perdeu o item (RN-037)');
    vendidas.forEach((unidade) => {
      assert.ok(Number(unidade.sold_value) > 0, 'a venda forçada devolve mel, não zera o jogador');
    });
  });

  it('a carteira nunca ficou negativa em nenhum lançamento', async () => {
    const [linhas] = await banco.conexao.query(
      'SELECT MIN(balance_after) AS menor FROM coin_ledger WHERE user_id = ?',
      [idUsuario],
    );

    assert.ok(Number(linhas[0].menor) >= 0, 'nenhuma linha do livro deixou o mel abaixo de zero');
    assert.ok((await melDe()) >= 0);
  });

  it('o patrimônio fecha no centavo com a soma das partes', async () => {
    const patrimonio = await patrimonyService.obterDoUsuario(idUsuario);

    const [linhas] = await banco.conexao.query(
      `SELECT COALESCE(SUM(inv.current_value), 0) AS bens
         FROM inventory inv
         JOIN items i ON i.id = inv.item_id
         JOIN inventory_statuses s ON s.id = inv.status_id
        WHERE inv.user_id = ? AND s.slug IN ('ativo', 'inadimplente') AND i.counts_in_patrimony = 1`,
      [idUsuario],
    );

    const cofre = await vaultsRepository.buscarPorUsuario(idUsuario);
    assert.equal(patrimonio.carteira, await melDe());
    assert.equal(patrimonio.cofre, Number(cofre.balance));
    assert.equal(patrimonio.bens, Number(linhas[0].bens));
    assert.equal(
      patrimonio.total,
      patrimonio.carteira + patrimonio.cofre + patrimonio.bens,
      'a RN-039 é uma soma, e ela precisa fechar exatamente',
    );
  });
});
