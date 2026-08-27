import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { fecharPool } from '../../src/config/database.js';
import * as leagueService from '../../src/services/leagueService.js';

/**
 * A liga semanal por pólen (T-13.3, RF-GAM-02).
 *
 * O cenário é fabricado com pólen plantado em datas conhecidas — parte na semana
 * corrente, parte na anterior —, porque a única forma de provar que a janela
 * funciona é ter lançamento dos dois lados dela.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('liga semanal', opcoes, () => {
  let banco;
  let jogadores;
  let semana;

  async function criarJogador(apelido) {
    const [criacao] = await banco.conexao.query(
      `INSERT INTO users (email, nickname, password_hash, birth_date)
       VALUES (?, ?, 'hash', '2014-05-05')`,
      [`${apelido}@liga.dev`, apelido],
    );
    const id = Number(criacao.insertId);

    await banco.conexao.query('INSERT INTO wallets (user_id, coins, points_total) VALUES (?, 0, 0)', [id]);
    await banco.conexao.query(
      'INSERT INTO user_levels (user_id, level, xp_total, xp_next_level) VALUES (?, 1, 0, 280)',
      [id],
    );
    return id;
  }

  /** Planta pólen no livro, no dia pedido da semana corrente ou da anterior. */
  async function plantarPolen(idUsuario, quantidade, dia) {
    await banco.conexao.query(
      `INSERT INTO point_ledger (user_id, amount, reason_id, balance_after, created_at)
       SELECT ?, ?, r.id, ?, ?
         FROM reward_reasons r WHERE r.slug = 'conclusao-celula'`,
      [idUsuario, quantidade, quantidade, `${dia} 12:00:00`],
    );
  }

  async function melDe(idUsuario) {
    const [[carteira]] = await banco.conexao.query('SELECT coins FROM wallets WHERE user_id = ?', [idUsuario]);
    return Number(carteira.coins);
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    semana = leagueService.semanaDe();

    jogadores = {
      primeira: await criarJogador('primeira'),
      segunda: await criarJogador('segunda'),
      terceira: await criarJogador('terceira'),
      quarta: await criarJogador('quarta'),
      ausente: await criarJogador('ausente'),
    };

    // Pólen da semana corrente, em ordem decrescente. A "ausente" não ganha nada.
    await plantarPolen(jogadores.primeira, 120, semana.domingo);
    await plantarPolen(jogadores.segunda, 80, semana.domingo);
    await plantarPolen(jogadores.terceira, 80, semana.domingo);
    await plantarPolen(jogadores.quarta, 10, semana.domingo);

    // Pólen de duas semanas atrás: não pode entrar na conta desta semana.
    await plantarPolen(jogadores.quarta, 999, '2020-01-05');
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('quem ainda não entrou em grupo nenhum não aparece na liga', async () => {
    assert.equal(await leagueService.ligaDoJogador(jogadores.primeira), null);
  });

  it('a visita põe o jogador num grupo da semana corrente', async () => {
    const grupo = await leagueService.garantirParticipacao(jogadores.primeira);

    assert.equal(grupo.name, 'Grupo 1');
    assert.equal(leagueService.paraDataISO(grupo.starts_on), semana.domingo);
    assert.equal(leagueService.paraDataISO(grupo.ends_on), semana.sabado);
  });

  it('entrar duas vezes não põe o jogador em dois grupos', async () => {
    await leagueService.garantirParticipacao(jogadores.primeira);

    const [linhas] = await banco.conexao.query('SELECT id FROM league_members WHERE user_id = ?', [
      jogadores.primeira,
    ]);
    assert.equal(linhas.length, 1);
  });

  it('o ranque sai do livro, e só conta o pólen da semana', async () => {
    for (const apelido of ['segunda', 'terceira', 'quarta', 'ausente']) {
      await leagueService.garantirParticipacao(jogadores[apelido]);
    }

    const liga = await leagueService.ligaDoJogador(jogadores.primeira);

    assert.equal(liga.posicao, 1);
    assert.equal(liga.polen, 120);
    assert.deepEqual(
      liga.membros.map((membro) => [membro.nickname, membro.polen, membro.posicao]),
      [
        ['primeira', 120, 1],
        ['segunda', 80, 2],
        ['terceira', 80, 2],
        ['quarta', 10, 4],
        ['ausente', 0, 5],
      ],
      'o empate divide a posição, e os 999 de 2020 ficam de fora',
    );
  });

  it('a coluna `points` é cache, e é regravada na leitura', async () => {
    const [[antes]] = await banco.conexao.query('SELECT points FROM league_members WHERE user_id = ?', [
      jogadores.primeira,
    ]);
    assert.equal(Number(antes.points), 120, 'a leitura anterior já gravou o cache');

    await plantarPolen(jogadores.primeira, 30, semana.domingo);
    await leagueService.ligaDoJogador(jogadores.primeira);

    const [[depois]] = await banco.conexao.query('SELECT points FROM league_members WHERE user_id = ?', [
      jogadores.primeira,
    ]);
    assert.equal(Number(depois.points), 150);
  });

  it('a semana que já passou fecha, grava a posição e paga o pódio', async () => {
    // A liga da semana corrente é envelhecida para a virada acontecer sem esperar.
    await banco.conexao.query(
      'UPDATE leagues SET starts_on = ?, ends_on = ? WHERE starts_on = ?',
      ['2026-01-04', '2026-01-10', semana.domingo],
    );
    await banco.conexao.query('UPDATE point_ledger SET created_at = ? WHERE created_at LIKE ?', [
      '2026-01-05 12:00:00',
      `${semana.domingo}%`,
    ]);

    const melAntes = {
      primeira: await melDe(jogadores.primeira),
      segunda: await melDe(jogadores.segunda),
      quarta: await melDe(jogadores.quarta),
    };

    const fechadas = await leagueService.fecharSemanasVencidas(new Date('2026-02-01T12:00:00Z'));

    assert.equal(fechadas.length, 1);
    assert.equal(fechadas[0].participantes, 5);

    const [posicoes] = await banco.conexao.query(
      `SELECT u.nickname, m.final_rank, m.points
         FROM league_members m JOIN users u ON u.id = m.user_id
        ORDER BY m.final_rank, u.nickname`,
    );
    assert.deepEqual(
      posicoes.map((linha) => [linha.nickname, Number(linha.final_rank)]),
      [
        ['primeira', 1],
        ['segunda', 2],
        ['terceira', 2],
        ['quarta', 4],
        ['ausente', 5],
      ],
    );

    assert.equal(await melDe(jogadores.primeira), melAntes.primeira + 300);
    assert.equal(await melDe(jogadores.segunda), melAntes.segunda + 200, 'quem empata no pódio recebe igual');
    assert.equal(await melDe(jogadores.quarta), melAntes.quarta, 'fora do pódio não recebe, e não perde nada');
  });

  it('fechar de novo a mesma semana não paga segunda vez', async () => {
    const melAntes = await melDe(jogadores.primeira);

    const fechadas = await leagueService.fecharSemanasVencidas(new Date('2026-02-01T12:00:00Z'));

    assert.deepEqual(fechadas, [], 'não há mais semana pendente');
    assert.equal(await melDe(jogadores.primeira), melAntes);
  });

  it('o prêmio deixa lançamento no livro, com o motivo da liga', async () => {
    const [[lancamento]] = await banco.conexao.query(
      `SELECT l.amount, r.slug AS motivo, l.reference_type
         FROM coin_ledger l JOIN reward_reasons r ON r.id = l.reason_id
        WHERE l.user_id = ? ORDER BY l.id DESC LIMIT 1`,
      [jogadores.primeira],
    );

    assert.equal(Number(lancamento.amount), 300);
    assert.equal(lancamento.motivo, 'premio-de-liga');
    assert.equal(lancamento.reference_type, 'league');
  });

  it('o pagamento do pódio deixa rastro na auditoria', async () => {
    const [linhas] = await banco.conexao.query(
      "SELECT after_state FROM audit_logs WHERE action = 'liga.premiada' ORDER BY id",
    );

    assert.equal(linhas.length, 3, 'três posições do pódio, três linhas');
    assert.equal(Number(linhas[0].after_state.posicao), 1);
  });

  it('a semana nova abre zerada, sem ninguém rebaixado', async () => {
    const grupo = await leagueService.garantirParticipacao(jogadores.primeira);
    const liga = await leagueService.ligaDoJogador(jogadores.primeira);

    assert.equal(leagueService.paraDataISO(grupo.starts_on), semana.domingo, 'a semana corrente, de novo');
    assert.equal(liga.polen, 0, 'o pólen da semana passada não vem junto');
    assert.equal(liga.membros.length, 1, 'quem não visitou ainda não entrou');
  });

  it('o grupo cheio faz o próximo jogador abrir outro', async () => {
    const semGrupo = [];
    for (let numero = 0; numero < 30; numero += 1) {
      semGrupo.push(await criarJogador(`lotacao${numero}`));
    }

    for (const id of semGrupo) await leagueService.garantirParticipacao(id);

    const [grupos] = await banco.conexao.query(
      `SELECT l.name, COUNT(m.id) AS membros
         FROM leagues l JOIN league_members m ON m.league_id = l.id
        WHERE l.starts_on = ? GROUP BY l.id, l.name ORDER BY l.id`,
      [semana.domingo],
    );

    assert.equal(grupos.length, 2, 'trinta e um jogadores não cabem num grupo de trinta');
    assert.equal(Number(grupos[0].membros), 30);
    assert.equal(Number(grupos[1].membros), 1);
  });
});
