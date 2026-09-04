import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { fecharPool } from '../../src/config/database.js';
import { CRITERIOS } from '../../src/services/criteriosDeConquista.js';
import * as achievementsService from '../../src/services/achievementsService.js';

/**
 * O catálogo de conquistas e o desbloqueio por critério (T-13.1).
 *
 * O que se prova aqui é que a regra saiu do código e foi para o banco: nenhuma
 * conquista ativa fica sem critério, e desbloquear passa a ser "alcancei este
 * número", não "montei o slug certo".
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('catálogo de conquistas', opcoes, () => {
  let banco;
  let idUsuario;

  async function lerMel(idDoJogador) {
    const [[carteira]] = await banco.conexao.query('SELECT coins FROM wallets WHERE user_id = ?', [
      idDoJogador,
    ]);
    return Number(carteira.coins);
  }

  before(async () => {
    banco = await criarBancoDeTeste();

    // Um jogador limpo, sem conquista nenhuma, para os degraus serem previsíveis.
    const [criacao] = await banco.conexao.query(
      `INSERT INTO users (email, nickname, password_hash, birth_date)
       VALUES ('conquistas@beever.dev', 'Coleciona', 'hash', '2014-05-05')`,
    );
    idUsuario = Number(criacao.insertId);
    await banco.conexao.query('INSERT INTO wallets (user_id, coins, points_total) VALUES (?, 0, 0)', [
      idUsuario,
    ]);
    await banco.conexao.query(
      'INSERT INTO user_levels (user_id, level, xp_total, xp_next_level) VALUES (?, 1, 0, 280)',
      [idUsuario],
    );
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('o seed traz as cinco famílias, com quatro degraus ou mais', async () => {
    const [linhas] = await banco.conexao.query(
      `SELECT criterion_type, COUNT(*) AS degraus
         FROM achievements WHERE is_active = 1
        GROUP BY criterion_type ORDER BY criterion_type`,
    );

    const porCriterio = Object.fromEntries(linhas.map((linha) => [linha.criterion_type, Number(linha.degraus)]));

    assert.deepEqual(Object.keys(porCriterio).sort(), Object.keys(CRITERIOS).sort());
    for (const [criterio, degraus] of Object.entries(porCriterio)) {
      assert.ok(degraus >= 4, `${criterio} tem só ${degraus} degrau(s), e a escada precisa de quatro`);
    }
  });

  it('nenhuma conquista ativa fica sem critério ou sem alvo', async () => {
    const [linhas] = await banco.conexao.query(
      `SELECT slug FROM achievements
        WHERE is_active = 1 AND (criterion_type = 'manual' OR criterion_target = 0)`,
    );

    assert.deepEqual(linhas, [], 'conquista sem critério nunca destrava sozinha');
  });

  it('o alvo é o que destrava, e o slug é só um nome', async () => {
    const [linhas] = await banco.conexao.query(
      "SELECT slug, criterion_target FROM achievements WHERE criterion_type = 'favos-concluidos' ORDER BY criterion_target",
    );

    assert.equal(Number(linhas[0].criterion_target), 1);
    assert.ok(linhas.every((linha) => Number(linha.criterion_target) > 0));
  });

  it('alcançar um número destrava todos os degraus abaixo dele, e paga cada um', async () => {
    const melAntes = await lerMel(idUsuario);
    const novas = await achievementsService.avaliarCriterio(idUsuario, 'favos-concluidos', 6);

    assert.deepEqual(
      novas.map((nova) => nova.conquista.slug),
      ['favo-1', 'favo-3', 'favo-6'],
    );

    const pago = novas.reduce((soma, nova) => soma + nova.melCreditado, 0);
    assert.equal(pago, 100 + 250 + 500);
    assert.equal(await lerMel(idUsuario), melAntes + pago);
  });

  it('avaliar de novo o mesmo número não paga segunda vez', async () => {
    const melAntes = await lerMel(idUsuario);
    const novas = await achievementsService.avaliarCriterio(idUsuario, 'favos-concluidos', 6);

    assert.deepEqual(novas, []);
    assert.equal(await lerMel(idUsuario), melAntes);
  });

  it('subir de degrau paga só o degrau novo', async () => {
    const melAntes = await lerMel(idUsuario);
    const novas = await achievementsService.avaliarCriterio(idUsuario, 'favos-concluidos', 12);

    assert.deepEqual(
      novas.map((nova) => nova.conquista.slug),
      ['favo-12'],
    );
    assert.equal(await lerMel(idUsuario), melAntes + 1000);
  });

  it('número abaixo do primeiro degrau não destrava nada', async () => {
    const novas = await achievementsService.avaliarCriterio(idUsuario, 'cofre-guardado', 50);
    assert.deepEqual(novas, []);
  });

  it('critério inventado é recusado antes de tocar no banco', async () => {
    await assert.rejects(
      () => achievementsService.avaliarCriterio(idUsuario, 'mel-gasto-em-doces', 10),
      /desconhecido/,
    );
  });

  it('o desbloqueio deixa rastro na auditoria, com o saldo antes e depois', async () => {
    const [linhas] = await banco.conexao.query(
      `SELECT after_state FROM audit_logs
        WHERE action = 'conquista.desbloqueada' AND actor_id = ?
        ORDER BY id DESC LIMIT 1`,
      [idUsuario],
    );

    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].after_state.conquista, 'favo-12');
  });

  it('o catálogo do jogador mostra o que ele tem e o que falta', async () => {
    const catalogo = await achievementsService.catalogoDoUsuario(idUsuario);
    const favos = catalogo.filter((linha) => linha.criterion_type === 'favos-concluidos');

    assert.equal(favos.length, 4);
    assert.ok(favos.every((linha) => linha.unlocked_at !== null), 'os quatro favos foram desbloqueados');

    const cofres = catalogo.filter((linha) => linha.criterion_type === 'cofre-guardado');
    assert.ok(cofres.every((linha) => linha.unlocked_at === null), 'nenhuma do cofre foi desbloqueada');
  });
});
