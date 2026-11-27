import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';
import * as inventoryRepository from '../../src/repositories/inventoryRepository.js';
import * as itemsRepository from '../../src/repositories/itemsRepository.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as coinsService from '../../src/services/coinsService.js';

/**
 * O aviso do ciclo na Colmeia (RF-HOM-09).
 *
 * O que estes testes protegem: quem volta depois de semanas fora lê na Colmeia o
 * que aconteceu com o mel dele, em frases; quem está em dia não vê aviso
 * nenhum, porque aviso vazio ensina a ignorar avisos.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('aviso do ciclo na Colmeia', opcoes, () => {
  let banco;
  let app;
  let agente;
  let idUsuario;
  let barraquinha;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function painel() {
    const resposta = await agente.get('/painel').set('Accept', 'text/html').expect(200);
    return resposta.text;
  }

  /** Envelhece a conta: é o que faz o ciclo ter o que processar na próxima visita. */
  async function contaCriadaHaSemanas(semanas) {
    await banco.conexao.query('UPDATE users SET created_at = created_at - INTERVAL ? WEEK WHERE id = ?', [
      semanas,
      idUsuario,
    ]);
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);
    barraquinha = await itemsRepository.buscarPorSlug('barraquinha-de-limonada');

    let csrf = await lerToken('/login');
    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'viajante',
        email: 'viajante@beever.dev',
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
        apelido: 'viajante',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['0', '1', '2', '3', '4', '5', '6'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    const [[perfil]] = await banco.conexao.query('SELECT user_id FROM profiles WHERE id = ?', [
      cadastro.body.idPerfil,
    ]);
    idUsuario = Number(perfil.user_id);

    await profilesRepository.atualizar(cadastro.body.idPerfil, { faixaEtaria: 'C' });
    await emTransacao(async (conexao) => {
      await coinsService.creditar(conexao, idUsuario, 2000, { motivo: 'ajuste-administrativo' });
      await inventoryRepository.adicionar(conexao, {
        idUsuario,
        idItem: barraquinha.id,
        valorInicial: Number(barraquinha.price),
      });
    });
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('quem está em dia não vê aviso nenhum na Colmeia', async () => {
    const html = await painel();

    assert.ok(!html.includes('semanas fora'), 'nada aconteceu, nada a avisar');
    assert.ok(!html.includes('O que já aconteceu na sua economia'));
  });

  it('quem volta depois de três semanas lê o que aconteceu, em frases', async () => {
    await contaCriadaHaSemanas(3);

    const html = await painel();

    assert.match(html, /Você ficou 3 semanas fora/);
    assert.match(
      html,
      new RegExp(`Seus negócios renderam ${Number(barraquinha.income_per_cycle) * 3} de mel`),
    );
  });

  it('recarregar a Colmeia não apaga a notícia, e o histórico continua embaixo', async () => {
    // Até a T-10.5 o destaque era da requisição em que os ciclos rodaram, e
    // quem recarregava perdia o aviso (dívida DT-63). Agora ele vale para o dia
    // do jogador: notícia do dia, e não da visita.
    const html = await painel();

    assert.match(html, /Você ficou 3 semanas fora/);
    assert.match(html, /O que já aconteceu na sua economia/);
    assert.match(html, /Seus negócios renderam/);
  });

  it('entrar por /metas também fecha as semanas que passaram', async () => {
    // A chegada do jogador tem uma dona só desde a auditoria da E10: quem entra
    // direto na tela de metas não pode ver o saldo de antes das contas.
    const [[antes]] = await banco.conexao.query(
      'SELECT COUNT(*) AS total FROM economic_cycles WHERE user_id = ?',
      [idUsuario],
    );
    await contaCriadaHaSemanas(5);

    await agente.get('/metas').set('Accept', 'text/html').expect(200);

    const [[depois]] = await banco.conexao.query(
      'SELECT COUNT(*) AS total FROM economic_cycles WHERE user_id = ?',
      [idUsuario],
    );
    assert.ok(Number(depois.total) > Number(antes.total), 'os ciclos pendentes rodaram na tela de metas');
  });

  it('no dia seguinte o destaque sai e sobra o histórico', async () => {
    await banco.conexao.query('UPDATE economic_cycles SET processed_at = processed_at - INTERVAL 2 DAY WHERE user_id = ?', [
      idUsuario,
    ]);

    const html = await painel();

    assert.ok(!html.includes('semanas fora'), 'notícia de ontem não é notícia');
    assert.match(html, /O que já aconteceu na sua economia/);
  });
});
