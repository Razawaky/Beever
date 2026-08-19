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
 * O Escudo de Sequência (RN-022, RF-SEQ-03).
 *
 * O que estes testes protegem: o escudo é gasto sozinho, sem o jogador clicar
 * em nada; salva um dia por unidade; não é queimado quando não há sequência
 * para salvar; some do inventário como consumido, não como vendido; e o teto de
 * dois guardados é recusado na loja antes de o mel sair da carteira.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('escudo de sequência', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let idUsuario;
  let idEscudo;

  // Quarta-feira à tarde. Ontem, 11/03, foi terça; anteontem, 10/03, segunda.
  const AGORA = new Date('2026-03-12T18:00:00Z');
  const ONTEM = '2026-03-11';
  const ANTEONTEM = '2026-03-10';

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function prepararSequencia({ diasAtuais = 5, avaliadaEm, escudos = 0 } = {}) {
    await banco.conexao.query('DELETE FROM streak_events WHERE user_id = ?', [idUsuario]);
    await banco.conexao.query('DELETE FROM game_sessions WHERE user_id = ?', [idUsuario]);
    await banco.conexao.query('DELETE FROM inventory WHERE user_id = ? AND item_id = ?', [idUsuario, idEscudo]);
    await banco.conexao.query(
      `INSERT INTO streaks (user_id, current_days, best_days, shields_available, last_evaluated_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE current_days      = VALUES(current_days),
                               best_days         = VALUES(best_days),
                               shields_available = VALUES(shields_available),
                               last_counted_date = NULL,
                               last_evaluated_at = VALUES(last_evaluated_at)`,
      [idUsuario, diasAtuais, diasAtuais, escudos, avaliadaEm],
    );

    for (let unidade = 0; unidade < escudos; unidade += 1) {
      await banco.conexao.query(
        `INSERT INTO inventory (user_id, item_id, status_id, current_value)
         VALUES (?, ?, (SELECT id FROM inventory_statuses WHERE slug = 'ativo'), 400)`,
        [idUsuario, idEscudo],
      );
    }
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

  async function darMel(quantidade) {
    await banco.conexao.query('UPDATE wallets SET coins = ? WHERE user_id = ?', [quantidade, idUsuario]);
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
        apelido: 'escudeiro',
        email: 'escudo@beever.dev',
        data_nasc: '2015-07-11',
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
        apelido: 'escudeiro',
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

    const [[item]] = await banco.conexao.query("SELECT id FROM items WHERE slug = 'escudo-de-sequencia'");
    idEscudo = Number(item.id);

    await emTransacao((conexao) => schedulesService.definirSemana(conexao, idUsuario, [0, 1, 2, 3, 4, 5, 6]));
    csrf = await lerToken('/painel');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('o escudo salva o dia perdido sem o jogador pedir', async () => {
    await prepararSequencia({ diasAtuais: 5, avaliadaEm: `${ONTEM} 09:00:00`, escudos: 1 });

    const resumo = await streakService.avaliar(idUsuario, AGORA);

    assert.equal(resumo.diasAtuais, 5, 'a sequência sobreviveu ao dia em branco');
    assert.deepEqual(resumo.protegidos, [ONTEM]);
    assert.deepEqual(await lerEventos(), [{ data: ONTEM, tipo: 'protegido' }]);
  });

  it('o escudo gasto sai do inventário como consumido, não como vendido', async () => {
    await prepararSequencia({ diasAtuais: 5, avaliadaEm: `${ONTEM} 09:00:00`, escudos: 1 });

    await streakService.avaliar(idUsuario, AGORA);

    assert.deepEqual(await lerEscudosNoInventario(), ['consumido']);
    assert.equal(Number((await lerSequencia()).shields_available), 0, 'o espelho acompanhou o gasto');
    assert.equal(await streakService.escudosDisponiveis(idUsuario), 0);
  });

  it('um escudo salva um dia só: o segundo dia em branco quebra', async () => {
    await prepararSequencia({ diasAtuais: 5, avaliadaEm: `${ANTEONTEM} 09:00:00`, escudos: 1 });

    const resumo = await streakService.avaliar(idUsuario, AGORA);

    assert.equal(resumo.diasAtuais, 0, 'o segundo dia sem escudo quebrou a sequência');
    assert.deepEqual(await lerEventos(), [
      { data: ANTEONTEM, tipo: 'protegido' },
      { data: ONTEM, tipo: 'perdido' },
    ]);
    assert.deepEqual(await lerEscudosNoInventario(), ['consumido']);
  });

  it('não gasta escudo quando não há sequência para salvar', async () => {
    await prepararSequencia({ diasAtuais: 0, avaliadaEm: `${ONTEM} 09:00:00`, escudos: 2 });

    const resumo = await streakService.avaliar(idUsuario, AGORA);

    assert.equal(resumo.diasAtuais, 0);
    assert.deepEqual(await lerEventos(), [{ data: ONTEM, tipo: 'perdido' }]);
    assert.deepEqual(await lerEscudosNoInventario(), ['ativo', 'ativo'], 'os dois continuam guardados');
  });

  it('comprar o escudo atualiza a contagem guardada', async () => {
    await prepararSequencia({ diasAtuais: 3, avaliadaEm: `${AGORA.toISOString().slice(0, 10)} 09:00:00` });
    await darMel(5000);

    await agente
      .post('/loja/compras')
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ idItem: idEscudo, chaveDeIdempotencia: randomUUID(), _csrf: csrf })
      .expect(201);

    assert.equal(await streakService.escudosDisponiveis(idUsuario), 1);
    assert.equal(Number((await lerSequencia()).shields_available), 1);
  });

  it('o terceiro escudo é recusado antes de tirar mel da carteira (RN-022)', async () => {
    await prepararSequencia({ diasAtuais: 3, avaliadaEm: `${AGORA.toISOString().slice(0, 10)} 09:00:00`, escudos: 2 });
    await darMel(5000);

    const recusa = await agente
      .post('/loja/compras')
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ idItem: idEscudo, chaveDeIdempotencia: randomUUID(), _csrf: csrf })
      .expect(422);

    assert.equal(recusa.body.codigo, 'LIMITE_DE_ESCUDOS');

    const [[carteira]] = await banco.conexao.query('SELECT coins FROM wallets WHERE user_id = ?', [idUsuario]);
    assert.equal(Number(carteira.coins), 5000, 'a carteira ficou intacta');
  });
});
