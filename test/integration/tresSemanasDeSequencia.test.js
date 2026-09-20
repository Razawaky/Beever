import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { meioDiaDoJogador } from '../helpers/calendarioSimulado.js';
import { criarApp } from '../../src/app.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';
import * as schedulesService from '../../src/services/schedulesService.js';
import * as streakService from '../../src/services/streakService.js';

/**
 * O aceite da E08: três semanas de uso com o relógio injetado (RN-019 a
 * RN-024).
 *
 * Os testes vizinhos provam cada regra numa janela de um ou dois dias. Este
 * prova a sequência longa: vinte e um dias encadeados em que o dia de folga
 * não quebra, o dia marcado em branco quebra, o escudo salva um deles, o marco
 * de sete paga uma vez e a semana atravessa a entrada do horário de verão.
 *
 * O jogador mora em Nova York de propósito: em 8 de março de 2026 o relógio de
 * lá adianta uma hora, então a corrida passa pela virada de fuso que a RN-024
 * manda respeitar.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('três semanas de sequência', opcoes, () => {
  let banco;
  let app;
  let agente;
  let idUsuario;
  let idCelula;
  let idEscudo;

  const FUSO = 'America/New_York';
  const PRIMEIRO_DIA_DA_CORRIDA = '2026-03-01';
  const DIA_QUE_FECHA_A_CORRIDA = '2026-03-22';

  // Segunda a sexta. Sábado e domingo ficam de fora para o dia neutro da
  // RN-020 aparecer no meio da corrida, e não só num teste isolado.
  const AGENDA = [1, 2, 3, 4, 5];

  /**
   * O roteiro dos vinte e um dias: se a criança jogou, o desfecho que aquele
   * dia acabou tendo e quantos dias seguidos ela tem no fim do dia. O desfecho
   * de um dia sem partida só é gravado na primeira visita do dia seguinte, que
   * é como a avaliação preguiçosa da RN-021 funciona.
   */
  const ROTEIRO = [
    { data: '2026-03-01', jogou: false, desfecho: 'neutro', diasAtuais: 0 },
    { data: '2026-03-02', jogou: true, desfecho: 'cumprido', diasAtuais: 1 },
    { data: '2026-03-03', jogou: true, desfecho: 'cumprido', diasAtuais: 2 },
    { data: '2026-03-04', jogou: true, desfecho: 'cumprido', diasAtuais: 3 },
    { data: '2026-03-05', jogou: true, desfecho: 'cumprido', diasAtuais: 4 },
    { data: '2026-03-06', jogou: true, desfecho: 'cumprido', diasAtuais: 5 },
    { data: '2026-03-07', jogou: false, desfecho: 'neutro', diasAtuais: 5 },
    { data: '2026-03-08', jogou: false, desfecho: 'neutro', diasAtuais: 5 },
    { data: '2026-03-09', jogou: true, desfecho: 'cumprido', diasAtuais: 6 },
    { data: '2026-03-10', jogou: true, desfecho: 'cumprido', diasAtuais: 7 },
    { data: '2026-03-11', jogou: false, desfecho: 'protegido', diasAtuais: 7 },
    { data: '2026-03-12', jogou: true, desfecho: 'cumprido', diasAtuais: 8 },
    { data: '2026-03-13', jogou: false, desfecho: 'perdido', diasAtuais: 8 },
    { data: '2026-03-14', jogou: false, desfecho: 'neutro', diasAtuais: 0 },
    { data: '2026-03-15', jogou: false, desfecho: 'neutro', diasAtuais: 0 },
    { data: '2026-03-16', jogou: true, desfecho: 'cumprido', diasAtuais: 1 },
    { data: '2026-03-17', jogou: true, desfecho: 'cumprido', diasAtuais: 2 },
    { data: '2026-03-18', jogou: true, desfecho: 'cumprido', diasAtuais: 3 },
    { data: '2026-03-19', jogou: true, desfecho: 'cumprido', diasAtuais: 4 },
    { data: '2026-03-20', jogou: true, desfecho: 'cumprido', diasAtuais: 5 },
    { data: '2026-03-21', jogou: false, desfecho: 'neutro', diasAtuais: 5 },
  ];

  const MELHOR_MARCA = 8;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function lerSequencia() {
    const [[linha]] = await banco.conexao.query(
      'SELECT current_days, best_days, shields_available FROM streaks WHERE user_id = ?',
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

  async function lerEscudosNoInventario() {
    const [linhas] = await banco.conexao.query(
      `SELECT s.slug AS status
         FROM inventory inv
         JOIN inventory_statuses s ON s.id = inv.status_id
        WHERE inv.user_id = ? AND inv.item_id = ?
        ORDER BY inv.id`,
      [idUsuario, idEscudo],
    );
    return linhas.map((linha) => linha.status);
  }

  async function lerConquistasDeSequencia() {
    const [linhas] = await banco.conexao.query(
      `SELECT a.slug
         FROM user_achievements ua
         JOIN achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = ? AND a.slug LIKE 'sequencia-%'
        ORDER BY a.slug`,
      [idUsuario],
    );
    return linhas.map((linha) => linha.slug);
  }

  /** Uma partida concluída no instante do dia, que é o que prova o dia cumprido. */
  async function celulaConcluidaEm(instante) {
    const quando = instante.toISOString().slice(0, 19).replace('T', ' ');
    await banco.conexao.query(
      `INSERT INTO game_sessions (user_id, cell_id, status_id, token, started_at, finished_at, stars)
       VALUES (?, ?, (SELECT id FROM game_session_statuses WHERE slug = 'concluida'), ?, ?, ?, 3)`,
      [idUsuario, idCelula, randomUUID(), quando, quando],
    );
  }

  /**
   * Põe o jogador no primeiro dia da corrida: sequência zerada, um escudo
   * guardado e a última avaliação nesse mesmo dia, para que a primeira visita
   * do roteiro não tenha nenhum dia velho para julgar.
   */
  async function prepararComecoDaCorrida() {
    await banco.conexao.query(
      `INSERT INTO streaks (user_id, current_days, best_days, shields_available, last_evaluated_at)
       VALUES (?, 0, 0, 1, ?)
       ON DUPLICATE KEY UPDATE current_days      = 0,
                               best_days         = 0,
                               shields_available = 1,
                               last_counted_date = NULL,
                               last_evaluated_at = VALUES(last_evaluated_at)`,
      [idUsuario, `${PRIMEIRO_DIA_DA_CORRIDA} 12:00:00`],
    );
    await banco.conexao.query(
      `INSERT INTO inventory (user_id, item_id, status_id, current_value)
       VALUES (?, ?, (SELECT id FROM inventory_statuses WHERE slug = 'ativo'), 400)`,
      [idUsuario, idEscudo],
    );
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
        apelido: 'maratonista',
        email: 'tressemanas@beever.dev',
        data_nasc: '2014-09-03',
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
        apelido: 'maratonista',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['1', '2', '3', '4', '5'],
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

    const [[item]] = await banco.conexao.query("SELECT id FROM items WHERE slug = 'escudo-de-sequencia'");
    idEscudo = Number(item.id);

    await banco.conexao.query('UPDATE profiles SET timezone = ? WHERE user_id = ?', [FUSO, idUsuario]);
    await emTransacao((conexao) => schedulesService.definirSemana(conexao, idUsuario, AGENDA));
    await prepararComecoDaCorrida();
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('vinte e um dias seguidos batem com a regra em todos os cenários', async () => {
    const marcosPagos = [];

    for (const dia of ROTEIRO) {
      const agora = meioDiaDoJogador(dia.data, FUSO);

      // Abrir o aplicativo é o que julga o dia de ontem: não há cron (RN-021).
      let sequencia = await streakService.avaliar(idUsuario, agora);

      if (dia.jogou) {
        await celulaConcluidaEm(agora);
        sequencia = await streakService.registrarDiaCumprido(idUsuario, agora);
      }

      marcosPagos.push(...sequencia.marcos);

      assert.equal(sequencia.hoje, dia.data, `o dia do jogador saiu errado em ${dia.data}`);
      assert.equal(sequencia.diasAtuais, dia.diasAtuais, `sequência errada no fim de ${dia.data}`);
    }

    // O último dia do roteiro só é julgado na visita seguinte, como qualquer outro.
    const fim = await streakService.avaliar(idUsuario, meioDiaDoJogador(DIA_QUE_FECHA_A_CORRIDA, FUSO));

    assert.deepEqual(
      await lerEventos(),
      ROTEIRO.map((dia) => ({ data: dia.data, tipo: dia.desfecho })),
      'os vinte e um dias precisam ter um desfecho cada, na ordem do roteiro',
    );
    assert.deepEqual(marcosPagos, [{ dias: 7, melCreditado: 100 }], 'o marco de sete paga uma vez só');
    assert.deepEqual(await lerConquistasDeSequencia(), ['sequencia-7']);

    const sequencia = await lerSequencia();
    assert.equal(fim.diasAtuais, 5, 'a corrida termina com a semana nova em pé');
    assert.equal(Number(sequencia.current_days), 5);
    assert.equal(Number(sequencia.best_days), MELHOR_MARCA, 'a melhor marca guarda o pico, não o dia de hoje');

    assert.deepEqual(await lerEscudosNoInventario(), ['consumido'], 'o escudo do dia 11 foi gasto e só ele');
    assert.equal(Number(sequencia.shields_available), 0);
    assert.equal(await streakService.escudosDisponiveis(idUsuario), 0);
  });
});
