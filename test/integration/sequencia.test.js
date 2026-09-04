import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';
import * as schedulesService from '../../src/services/schedulesService.js';
import * as streakService from '../../src/services/streakService.js';

/**
 * A sequência do jogador (RN-019 a RN-021, RN-024, RF-SEQ-01).
 *
 * O que estes testes protegem: dia marcado sem célula quebra, dia não marcado
 * não quebra nem avança, o mesmo dia não conta duas vezes por mais que o
 * jogador jogue, e o dia que vira é o do fuso do perfil — não o do servidor,
 * que era a dívida DT-23.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('sequência', opcoes, () => {
  let banco;
  let app;
  let agente;
  let idUsuario;
  let idCelula;

  // Terça-feira, meio da tarde no Brasil. Ontem, 09/03, foi segunda.
  const AGORA = new Date('2026-03-10T18:00:00Z');
  const HOJE = '2026-03-10';
  const ONTEM = '2026-03-09';

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  /** Põe a sequência num estado conhecido e apaga o histórico de dias. */
  async function prepararSequencia({ diasAtuais = 0, avaliadaEm = null, ultimoDiaContado = null } = {}) {
    await banco.conexao.query('DELETE FROM streak_events WHERE user_id = ?', [idUsuario]);
    await banco.conexao.query('DELETE FROM game_sessions WHERE user_id = ?', [idUsuario]);
    await banco.conexao.query(
      `INSERT INTO streaks (user_id, current_days, best_days, last_counted_date, last_evaluated_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE current_days      = VALUES(current_days),
                               best_days         = VALUES(best_days),
                               last_counted_date = VALUES(last_counted_date),
                               last_evaluated_at = VALUES(last_evaluated_at)`,
      [idUsuario, diasAtuais, diasAtuais, ultimoDiaContado, avaliadaEm],
    );
  }

  async function lerSequencia() {
    const [[linha]] = await banco.conexao.query(
      `SELECT current_days, best_days, DATE_FORMAT(last_counted_date, '%Y-%m-%d') AS ultimo_dia
         FROM streaks WHERE user_id = ?`,
      [idUsuario],
    );
    return linha;
  }

  async function lerEventos() {
    const [linhas] = await banco.conexao.query(
      `SELECT DATE_FORMAT(e.event_date, '%Y-%m-%d') AS data, t.slug AS tipo
         FROM streak_events e
         JOIN streak_event_types t ON t.id = e.event_type_id
        WHERE e.user_id = ?
        ORDER BY e.event_date`,
      [idUsuario],
    );
    return linhas;
  }

  /** Uma partida concluída num instante escolhido — é o que prova o dia cumprido. */
  async function celulaConcluidaEm(instanteUtc) {
    await banco.conexao.query(
      `INSERT INTO game_sessions (user_id, cell_id, status_id, token, started_at, finished_at, stars)
       VALUES (?, ?, (SELECT id FROM game_session_statuses WHERE slug = 'concluida'), ?, ?, ?, 3)`,
      [idUsuario, idCelula, randomUUID(), instanteUtc, instanteUtc],
    );
  }

  async function definirAgenda(dias) {
    await emTransacao((conexao) => schedulesService.definirSemana(conexao, idUsuario, dias));
  }

  async function definirFuso(fuso) {
    await banco.conexao.query('UPDATE profiles SET timezone = ? WHERE user_id = ?', [fuso, idUsuario]);
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
        apelido: 'sequencial',
        email: 'sequencia@beever.dev',
        data_nasc: '2016-05-20',
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
        apelido: 'sequencial',
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

    const [[celula]] = await banco.conexao.query('SELECT id FROM cells ORDER BY id LIMIT 1');
    idCelula = Number(celula.id);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('dia marcado que passou sem nenhuma célula quebra a sequência', async () => {
    await definirAgenda([0, 1, 2, 3, 4, 5, 6]);
    await prepararSequencia({ diasAtuais: 5, avaliadaEm: `${ONTEM} 09:00:00`, ultimoDiaContado: '2026-03-08' });

    const resumo = await streakService.avaliar(idUsuario, AGORA);

    assert.equal(resumo.diasAtuais, 0, 'segunda era dia marcado e passou em branco');
    assert.equal(resumo.melhorDias, 5, 'a melhor marca não se perde na quebra');
    assert.deepEqual(await lerEventos(), [{ data: ONTEM, tipo: 'perdido' }]);
  });

  it('dia que o jogador não marcou não avança nem quebra (RN-020)', async () => {
    // Só terça na agenda: a segunda de ontem passa a ser dia de folga.
    await definirAgenda([2]);
    await prepararSequencia({ diasAtuais: 5, avaliadaEm: `${ONTEM} 09:00:00`, ultimoDiaContado: '2026-03-08' });

    const resumo = await streakService.avaliar(idUsuario, AGORA);

    assert.equal(resumo.diasAtuais, 5, 'folga não quebra');
    assert.deepEqual(await lerEventos(), [{ data: ONTEM, tipo: 'neutro' }]);
  });

  it('dia marcado com célula concluída avança a sequência', async () => {
    await definirAgenda([0, 1, 2, 3, 4, 5, 6]);
    await prepararSequencia({ diasAtuais: 5, avaliadaEm: `${ONTEM} 09:00:00`, ultimoDiaContado: '2026-03-08' });
    // 20h de ontem no Brasil, que em UTC já é 23h do mesmo dia.
    await celulaConcluidaEm(`${ONTEM} 23:00:00`);

    const resumo = await streakService.avaliar(idUsuario, AGORA);

    assert.equal(resumo.diasAtuais, 6);
    assert.equal(resumo.melhorDias, 6);
    assert.deepEqual(await lerEventos(), [{ data: ONTEM, tipo: 'cumprido' }]);
    assert.equal((await lerSequencia()).ultimo_dia, ONTEM);
  });

  it('avaliar duas vezes no mesmo dia não conta o dia duas vezes', async () => {
    await definirAgenda([0, 1, 2, 3, 4, 5, 6]);
    await prepararSequencia({ diasAtuais: 5, avaliadaEm: `${ONTEM} 09:00:00`, ultimoDiaContado: '2026-03-08' });
    await celulaConcluidaEm(`${ONTEM} 23:00:00`);

    await streakService.avaliar(idUsuario, AGORA);
    const segunda = await streakService.avaliar(idUsuario, AGORA);

    assert.equal(segunda.diasAtuais, 6, 'a segunda avaliação encontra o dia já julgado');
    assert.equal((await lerEventos()).length, 1);
  });

  it('concluir várias células hoje conta um dia só (RN-019)', async () => {
    await definirAgenda([0, 1, 2, 3, 4, 5, 6]);
    await prepararSequencia({ diasAtuais: 2, avaliadaEm: `${HOJE} 09:00:00`, ultimoDiaContado: ONTEM });

    const primeira = await streakService.registrarDiaCumprido(idUsuario, AGORA);
    const segunda = await streakService.registrarDiaCumprido(idUsuario, AGORA);

    assert.equal(primeira.diasAtuais, 3);
    assert.equal(segunda.diasAtuais, 3, 'a sequência anda um dia por dia');
    assert.deepEqual(await lerEventos(), [{ data: HOJE, tipo: 'cumprido' }]);
  });

  it('o dia contado é o do fuso do perfil, não o do servidor (RN-024)', async () => {
    await definirAgenda([0, 1, 2, 3, 4, 5, 6]);
    // A avaliação anterior já foi hoje na ilha: nada de dia fechado para julgar.
    await prepararSequencia({ diasAtuais: 0, avaliadaEm: `${HOJE} 18:00:00` });
    // 18h UTC do dia 10 já é o dia 11 em Kiritimati (UTC+14).
    await definirFuso('Pacific/Kiritimati');

    const resumo = await streakService.registrarDiaCumprido(idUsuario, AGORA);

    assert.equal(resumo.hoje, '2026-03-11');
    assert.deepEqual(await lerEventos(), [{ data: '2026-03-11', tipo: 'cumprido' }]);

    await definirFuso('America/Sao_Paulo');
  });

  it('abrir o painel avalia a sequência sem cron nenhum (RN-021)', async () => {
    await definirAgenda([0, 1, 2, 3, 4, 5, 6]);
    // Dois dias sem jogar, no relógio de verdade: o painel tem de encontrar isso.
    await banco.conexao.query('DELETE FROM streak_events WHERE user_id = ?', [idUsuario]);
    await banco.conexao.query(
      `UPDATE streaks
          SET current_days = 4, best_days = 7, last_evaluated_at = NOW() - INTERVAL 2 DAY
        WHERE user_id = ?`,
      [idUsuario],
    );

    await agente.get('/painel').set('Accept', 'text/html').expect(200);

    const sequencia = await lerSequencia();
    assert.equal(Number(sequencia.current_days), 0, 'os dias marcados em branco quebraram');
    assert.equal(Number(sequencia.best_days), 7, 'a melhor marca continua de pé');
    assert.ok((await lerEventos()).some((evento) => evento.tipo === 'perdido'));
  });
});
