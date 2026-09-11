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
import * as goalsRepository from '../../src/repositories/goalsRepository.js';
import * as goalsService from '../../src/services/goalsService.js';

/**
 * Renovar a meta vencida (RN-017, RF-MET-05, dívida DT-33).
 *
 * O que estes testes protegem: vencer não é punição — o progresso já feito
 * sobrevive à renovação —, a recompensa da renovada é metade e vem do banco
 * (RN-006), a mesma meta não é renovada duas vezes, e meta que não está ativa
 * não paga recompensa nenhuma.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('renovação de meta', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let idUsuario;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  /** Uma meta ativa que já venceu, com metade do alvo cumprida. */
  async function metaVencida({ alvo = 100, progresso = 40 } = {}) {
    const [[tipo]] = await banco.conexao.query(
      "SELECT id FROM goal_types WHERE progress_source = 'coin_balance' LIMIT 1",
    );
    const [[dificuldade]] = await banco.conexao.query('SELECT id FROM goal_difficulties LIMIT 1');

    const [resultado] = await banco.conexao.query(
      `INSERT INTO goals (user_id, goal_type_id, status_id, difficulty_id, title, target_value,
                          current_value, reward_coins, reward_points, starts_at, due_at)
       VALUES (?, ?, (SELECT id FROM goal_statuses WHERE slug = 'ativa'), ?, 'Junte mel', ?, ?, 40, 20,
               NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 1 DAY)`,
      [idUsuario, tipo.id, dificuldade.id, alvo, progresso],
    );
    return Number(resultado.insertId);
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);
    csrf = await lerToken('/login');

    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'renovador',
        email: 'renovacao-de-meta@beever.dev',
        data_nasc: '2018-04-02',
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
        apelido: 'renovador',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['1', '3', '5'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    const [[perfil]] = await banco.conexao.query('SELECT user_id FROM profiles WHERE id = ?', [
      cadastro.body.idPerfil,
    ]);
    idUsuario = Number(perfil.user_id);
    csrf = await lerToken('/painel');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a meta vencida aparece na tela com a oferta de retomada', async () => {
    await metaVencida();

    const pagina = await agente.get('/metas').set('Accept', 'text/html').expect(200);

    assert.match(pagina.text, /Retomar esta meta/);
    assert.match(pagina.text, /seu progresso está guardado/);
  });

  it('renovar preserva o progresso, estende o prazo e corta a recompensa pela metade', async () => {
    const idVencida = await metaVencida({ alvo: 100, progresso: 40 });
    await goalsService.expirarVencidas(idUsuario);

    const { body: nova } = await agente
      .post(`/metas/${idVencida}/renovar`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ _csrf: csrf })
      .expect(201);

    assert.equal(Number(nova.current_value), 40, 'o trabalho já feito sobrevive à renovação');
    assert.equal(Number(nova.target_value), 100, 'mesmo alvo');
    assert.equal(Number(nova.renewed_from_goal_id), idVencida);
    assert.equal(nova.status, 'ativa');
    assert.equal(Number(nova.reward_coins), 20, 'metade dos 40 originais');
    assert.equal(Number(nova.reward_points), 10, 'metade dos 20 originais');
    assert.ok(new Date(nova.due_at) > new Date(), 'o prazo novo está no futuro');

    const antiga = await goalsRepository.buscarPorId(idVencida);
    assert.equal(antiga.status, 'renovada');
  });

  it('a mesma meta não é renovada duas vezes', async () => {
    const idVencida = await metaVencida();
    await goalsService.expirarVencidas(idUsuario);

    await agente
      .post(`/metas/${idVencida}/renovar`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .expect(201);

    await agente
      .post(`/metas/${idVencida}/renovar`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .expect(422);
  });

  it('meta ativa não é renovável: só quem venceu tem o que retomar', async () => {
    const [[ativa]] = await banco.conexao.query(
      "SELECT id FROM goals WHERE user_id = ? AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'ativa') LIMIT 1",
      [idUsuario],
    );

    await agente
      .post(`/metas/${ativa.id}/renovar`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .expect(422);
  });

  /**
   * O vazamento que a renovação teria aberto: a vencida com o alvo batido ainda
   * podia ser cobrada, e a renovada herda o progresso — a mesma meta pagaria
   * duas vezes.
   */
  it('meta que não está ativa não paga recompensa', async () => {
    const idVencida = await metaVencida({ alvo: 10, progresso: 10 });
    await goalsService.expirarVencidas(idUsuario);

    await agente
      .post(`/metas/${idVencida}/concluir`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .expect(422);
  });

  it('a renovação é registrada na auditoria, com o antes e o depois', async () => {
    const idVencida = await metaVencida();
    await goalsService.expirarVencidas(idUsuario);

    await agente
      .post(`/metas/${idVencida}/renovar`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .expect(201);

    const [linhas] = await banco.conexao.query(
      "SELECT * FROM audit_logs WHERE action = 'meta.renovada' AND entity_id = ?",
      [idVencida],
    );
    assert.equal(linhas.length, 1, 'uma linha por renovação');
  });
});
