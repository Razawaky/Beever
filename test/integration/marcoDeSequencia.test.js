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
import * as achievementsService from '../../src/services/achievementsService.js';
import * as schedulesService from '../../src/services/schedulesService.js';
import * as streakService from '../../src/services/streakService.js';

/**
 * Marcos de sequência (RN-023, RF-SEQ-04).
 * O que estes testes protegem: o marco paga o mel da conquista uma vez só, o
 * valor vem do banco, dia comum não paga nada e o lançamento aparece no livro.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('marco de sequência', opcoes, () => {
  let banco;
  let app;
  let agente;
  let idUsuario;

  const AGORA = new Date('2026-03-12T18:00:00Z');
  const HOJE = '2026-03-12';

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  /** Deixa o jogador a um dia do número pedido, com o dia de hoje ainda em aberto. */
  async function sequenciaEm(diasAtuais) {
    await banco.conexao.query('DELETE FROM streak_events WHERE user_id = ?', [idUsuario]);
    await banco.conexao.query('DELETE FROM game_sessions WHERE user_id = ?', [idUsuario]);
    await banco.conexao.query(
      `INSERT INTO streaks (user_id, current_days, best_days, last_evaluated_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE current_days      = VALUES(current_days),
                               best_days         = VALUES(best_days),
                               last_counted_date = NULL,
                               last_evaluated_at = VALUES(last_evaluated_at)`,
      [idUsuario, diasAtuais, diasAtuais, `${HOJE} 09:00:00`],
    );
  }

  async function lerMel() {
    const [[carteira]] = await banco.conexao.query('SELECT coins FROM wallets WHERE user_id = ?', [idUsuario]);
    return Number(carteira.coins);
  }

  async function lerConquistas() {
    const [linhas] = await banco.conexao.query(
      `SELECT a.slug
         FROM user_achievements ua
         JOIN achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = ?
        ORDER BY ua.id`,
      [idUsuario],
    );
    return linhas.map((linha) => linha.slug);
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);

    let csrf = await lerToken('/login');
    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'marqueiro',
        email: 'marco@beever.dev',
        data_nasc: '2014-09-01',
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
        apelido: 'marqueiro',
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

    await emTransacao((conexao) => schedulesService.definirSemana(conexao, idUsuario, [0, 1, 2, 3, 4, 5, 6]));
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('o sétimo dia paga o bônus do marco e grava a conquista', async () => {
    await sequenciaEm(6);
    const melAntes = await lerMel();

    const resumo = await streakService.registrarDiaCumprido(idUsuario, AGORA);

    assert.equal(resumo.diasAtuais, 7);
    assert.deepEqual(resumo.marcos, [{ dias: 7, melCreditado: 100 }]);
    assert.equal(await lerMel(), melAntes + 100, 'o mel do marco entrou na carteira');
    assert.deepEqual(await lerConquistas(), ['sequencia-7']);
  });

  /**
   * Desde a T-13.1 o marco não é comparação de igualdade: quem alcança trinta
   * dias sem ter passado pelos catorze recebe os dois. Antes, quem pulasse um
   * marco numa virada de fuso o perdia para sempre.
   */
  it('o valor pago é o que está no banco, e o degrau pulado também é pago', async () => {
    const [[conquista]] = await banco.conexao.query(
      "SELECT reward_coins FROM achievements WHERE slug = 'sequencia-30'",
    );
    await banco.conexao.query("UPDATE achievements SET reward_coins = 777 WHERE slug = 'sequencia-30'");
    await sequenciaEm(29);
    const melAntes = await lerMel();

    const resumo = await streakService.registrarDiaCumprido(idUsuario, AGORA);

    assert.deepEqual(resumo.marcos, [
      { dias: 14, melCreditado: 200 },
      { dias: 30, melCreditado: 777 },
    ]);
    assert.equal(await lerMel(), melAntes + 200 + 777);

    await banco.conexao.query("UPDATE achievements SET reward_coins = ? WHERE slug = ?", [
      conquista.reward_coins,
      'sequencia-30',
    ]);
  });

  it('chegar de novo ao mesmo marco não paga segunda vez', async () => {
    await sequenciaEm(6);
    await streakService.registrarDiaCumprido(idUsuario, AGORA);
    const melDepoisDoPrimeiro = await lerMel();

    await sequenciaEm(6);
    const resumo = await streakService.registrarDiaCumprido(idUsuario, AGORA);

    assert.deepEqual(resumo.marcos, [], 'a conquista já era do jogador');
    assert.equal(await lerMel(), melDepoisDoPrimeiro, 'nenhum mel a mais');
    assert.equal((await lerConquistas()).filter((slug) => slug === 'sequencia-7').length, 1);
  });

  it('dia que não é marco não paga nada', async () => {
    await sequenciaEm(4);
    const melAntes = await lerMel();

    const resumo = await streakService.registrarDiaCumprido(idUsuario, AGORA);

    assert.equal(resumo.diasAtuais, 5);
    assert.deepEqual(resumo.marcos, []);
    assert.equal(await lerMel(), melAntes);
  });

  it('o bônus deixa lançamento no livro, com o motivo do marco', async () => {
    // Sessenta é o primeiro degrau ainda não desbloqueado nesta suíte.
    await sequenciaEm(59);

    await streakService.registrarDiaCumprido(idUsuario, AGORA);

    const [[lancamento]] = await banco.conexao.query(
      `SELECT l.amount, r.slug AS motivo, l.reference_type
         FROM coin_ledger l
         JOIN reward_reasons r ON r.id = l.reason_id
        WHERE l.user_id = ?
        ORDER BY l.id DESC
        LIMIT 1`,
      [idUsuario],
    );

    assert.equal(Number(lancamento.amount), 800);
    assert.equal(lancamento.motivo, 'marco-de-sequencia');
    assert.equal(lancamento.reference_type, 'achievement');
  });

  it('desbloquear a mesma conquista direto pelo service também não paga duas vezes', async () => {
    const primeira = await achievementsService.desbloquear(idUsuario, 'sequencia-100');
    const melDepois = await lerMel();
    const segunda = await achievementsService.desbloquear(idUsuario, 'sequencia-100');

    assert.equal(primeira.desbloqueou, true);
    assert.equal(primeira.melCreditado, 1500);
    assert.equal(segunda.desbloqueou, false);
    assert.equal(await lerMel(), melDepois);
  });
});
