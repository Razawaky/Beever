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
import * as achievementsService from '../../src/services/achievementsService.js';
import * as gameSessionService from '../../src/services/gameSessionService.js';
import * as homeService from '../../src/services/homeService.js';

/**
 * O desbloqueio automático das conquistas (T-13.2).
 *
 * O que se prova é o caminho, não a consulta: a criança joga, e a conquista
 * aparece — na resposta da partida quando é de célula ou de favo, e na visita à
 * Colmeia quando é de patrimônio ou de cofre, que é a conta cara que a home já
 * faz uma vez.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const JOGADORA = { email: 'ana@beever.dev', senha: 'beever123' };

describe('desbloqueio automático de conquistas', opcoes, () => {
  let banco;
  let app;
  let agente;
  let idUsuario;

  async function tokenDe(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').redirects(2);
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function conquistasDo(criterio) {
    const catalogo = await achievementsService.catalogoDoUsuario(idUsuario);
    return catalogo
      .filter((linha) => linha.criterion_type === criterio && linha.unlocked_at !== null)
      .map((linha) => linha.slug);
  }

  /** Planta células concluídas direto no progresso, sem jogar uma a uma. */
  async function plantarCelulasConcluidas(quantidade) {
    await banco.conexao.query(
      `INSERT INTO cell_progress (user_id, cell_id, stars, attempts, errors, best_score,
                                  first_completed_at, last_completed_at)
       SELECT ?, c.id, 3, 1, 0, 100, UTC_TIMESTAMP(), UTC_TIMESTAMP()
         FROM cells c
        WHERE c.id NOT IN (SELECT cell_id FROM cell_progress WHERE user_id = ?)
        LIMIT ?
       ON DUPLICATE KEY UPDATE stars = 3`,
      [idUsuario, idUsuario, quantidade],
    );
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);

    const csrf = await tokenDe('/login');
    await agente
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ ...JOGADORA, _csrf: csrf })
      .expect(200);

    const [[conta]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', [JOGADORA.email]);
    idUsuario = Number(conta.id);

    // A conta demo do seed já tem cinco células concluídas e nenhuma conquista:
    // é o estado de quem jogou antes de a T-13.2 existir.
    await banco.conexao.query('DELETE FROM user_achievements WHERE user_id = ?', [idUsuario]);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('quem já tinha passado do degrau destrava na primeira partida', async () => {
    // O catálogo do seed tem 26 células, então o degrau de dez é o alcançável
    // plantando progresso real. Os de setenta e cinco e cento e cinquenta são
    // exercitados adiante, pelo service, com o número medido vindo de fora.
    await plantarCelulasConcluidas(10);

    const csrf = await tokenDe('/painel');
    const [[celula]] = await banco.conexao.query(
      `SELECT c.id FROM cells c
         JOIN cell_progress cp ON cp.cell_id = c.id AND cp.user_id = ?
        ORDER BY c.id LIMIT 1`,
      [idUsuario],
    );

    const partida = await agente
      .post('/partidas')
      .set('Accept', 'application/json')
      .send({ idCelula: celula.id, _csrf: csrf })
      .expect(201);

    const resultado = await agente
      .post(`/partidas/${partida.body.token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas: [] })
      .expect(200);

    assert.ok(
      resultado.body.conquistas.map((conquista) => conquista.slug).includes('celulas-10'),
      'a partida devolve o que destravou, na própria resposta',
    );
    assert.deepEqual(await conquistasDo('celulas-concluidas'), ['celulas-10']);
  });

  it('o mel da conquista vem em linha própria, fora do que a partida rendeu', async () => {
    const conquista = { slug: 'celulas-10', melCreditado: 100 };
    const catalogo = await achievementsService.catalogoDoUsuario(idUsuario);
    const dez = catalogo.find((linha) => linha.slug === conquista.slug);

    assert.equal(Number(dez.reward_coins), conquista.melCreditado);
    assert.ok(dez.unlocked_at !== null);
  });

  it('jogar de novo não destrava a mesma conquista duas vezes', async () => {
    const csrf = await tokenDe('/painel');
    const [[celula]] = await banco.conexao.query(
      `SELECT c.id FROM cells c
         JOIN cell_progress cp ON cp.cell_id = c.id AND cp.user_id = ?
        ORDER BY c.id LIMIT 1`,
      [idUsuario],
    );

    const partida = await agente
      .post('/partidas')
      .set('Accept', 'application/json')
      .send({ idCelula: celula.id, _csrf: csrf })
      .expect(201);

    const resultado = await agente
      .post(`/partidas/${partida.body.token}/resultado`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ respostas: [] })
      .expect(200);

    assert.deepEqual(resultado.body.conquistas, []);
  });

  it('fechar favos destrava os degraus da família de favo', async () => {
    const novas = await achievementsService.avaliarEventos(idUsuario, { 'favos-concluidos': 3 });

    // O primeiro degrau pode já ter caído na partida acima, quando o favo do
    // seed fechou; o que esta rodada precisa destravar é o de três.
    assert.ok(novas.map((conquista) => conquista.slug).includes('favo-3'));
    assert.deepEqual(await conquistasDo('favos-concluidos'), ['favo-1', 'favo-3']);
  });

  it('a visita à Colmeia destrava as de patrimônio e de cofre', async () => {
    await banco.conexao.query('UPDATE wallets SET coins = 3000 WHERE user_id = ?', [idUsuario]);
    await banco.conexao.query(
      `INSERT INTO vaults (user_id, balance, interest_rate) VALUES (?, 600, 2.000)
       ON DUPLICATE KEY UPDATE balance = 600`,
      [idUsuario],
    );

    const colmeia = await homeService.obterColmeia(idUsuario);

    assert.ok(colmeia.conquistas.length > 0, 'a visita devolve o que destravou');
    assert.deepEqual(await conquistasDo('cofre-guardado'), ['cofre-100', 'cofre-500']);
    assert.ok((await conquistasDo('patrimonio-total')).includes('patrimonio-2000'));
  });

  it('a visita seguinte não destrava nada de novo', async () => {
    const colmeia = await homeService.obterColmeia(idUsuario);
    assert.deepEqual(colmeia.conquistas, []);
  });

  it('falha ao avaliar conquista não derruba o que já foi pago', async () => {
    // Critério inventado é o jeito honesto de forçar a falha: o `avaliarCriterio`
    // recusa, e o `avaliarEventos` precisa engolir e seguir.
    const novas = await achievementsService.avaliarEventos(idUsuario, {
      'criterio-que-nao-existe': 10,
      'patrimonio-total': 10000,
    });

    assert.deepEqual(
      novas.map((conquista) => conquista.slug),
      ['patrimonio-5000', 'patrimonio-10000'],
      'o critério torto foi ignorado e o bom seguiu',
    );
  });

  it('o fechamento da partida continua dentro do teto de 1 s da RNF-01', async () => {
    const csrf = await tokenDe('/painel');
    const [[celula]] = await banco.conexao.query(
      `SELECT c.id FROM cells c
         JOIN cell_progress cp ON cp.cell_id = c.id AND cp.user_id = ?
        ORDER BY c.id LIMIT 1`,
      [idUsuario],
    );

    const partida = await agente
      .post('/partidas')
      .set('Accept', 'application/json')
      .send({ idCelula: celula.id, _csrf: csrf })
      .expect(201);

    const comecou = Date.now();
    await gameSessionService.fechar(idUsuario, partida.body.token, { respostas: [] });

    assert.ok(Date.now() - comecou < 1000, 'a conquista não pode custar o teto do jogo');
  });
});
