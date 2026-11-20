import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { criarBancoDeTeste, idDoUsuario, idPorSlug, motivoParaPular } from '../helpers/banco.js';

/**
 * O banco recusa dado inválido sozinho?
 *
 * A régua do documento de banco é que um dado errado nunca deve conseguir
 * entrar, mesmo que o service tenha bug. Cada teste aqui tenta gravar algo que
 * viola uma regra de negócio e exige que o **MySQL** recuse — não a aplicação.
 *
 * Estas asserções existiam como comandos digitados à mão durante a E01. Agora
 * rodam sozinhas, que é a diferença entre ter verificado e ter garantia.
 */

const pular = await motivoParaPular();
// O runner do Node considera a presença da chave `skip`, não o valor dela:
// passar `skip: null` pula do mesmo jeito. Por isso o objeto é montado só
// quando há motivo.
const opcoes = pular ? { skip: pular } : {};

describe('integridade do schema', opcoes, () => {
  let banco;
  let conexao;
  let demo;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;
    demo = await idDoUsuario(conexao, 'ana@beever.dev');
  });

  after(async () => {
    if (banco) await banco.encerrar();
  });

  describe('saldos (RN-004)', () => {
    it('recusa mel negativo na carteira', async () => {
      await assert.rejects(
        conexao.query('UPDATE wallets SET coins = -1 WHERE user_id = ?', [demo]),
        /ck_wallets_coins/,
      );
    });

    it('recusa saldo de cofre negativo', async () => {
      await assert.rejects(
        conexao.query('UPDATE vaults SET balance = -1 WHERE user_id = ?', [demo]),
        /ck_vaults_balance/,
      );
    });
  });

  describe('idempotência (RN-009, RN-036)', () => {
    it('recusa repetir o token de uma sessão de jogo', async () => {
      const [linhas] = await conexao.query('SELECT token, cell_id, status_id FROM game_sessions LIMIT 1');
      const sessao = linhas[0];

      await assert.rejects(
        conexao.query(
          'INSERT INTO game_sessions (user_id, cell_id, status_id, token) VALUES (?, ?, ?, ?)',
          [demo, sessao.cell_id, sessao.status_id, sessao.token],
        ),
        /uq_game_sessions_token/,
      );
    });

    it('recusa processar o mesmo ciclo econômico duas vezes', async () => {
      await assert.rejects(
        conexao.query('INSERT INTO economic_cycles (user_id, cycle_number) VALUES (?, 1)', [demo]),
        /uq_economic_cycles_user_cycle/,
      );
    });

    it('recusa avaliar o mesmo dia de sequência duas vezes', async () => {
      const [linhas] = await conexao.query(
        'SELECT event_date, event_type_id FROM streak_events WHERE user_id = ? LIMIT 1',
        [demo],
      );

      await assert.rejects(
        conexao.query('INSERT INTO streak_events (user_id, event_date, event_type_id) VALUES (?, ?, ?)', [
          demo,
          linhas[0].event_date,
          linhas[0].event_type_id,
        ]),
        /uq_streak_events_user_date/,
      );
    });
  });

  describe('recompensas (RN-002, RN-030)', () => {
    it('recusa lançamento de XP negativo — XP nunca se perde', async () => {
      const motivo = await idPorSlug(conexao, 'reward_reasons', 'ajuste-administrativo');

      await assert.rejects(
        conexao.query(
          'INSERT INTO xp_ledger (user_id, amount, reason_id, balance_after) VALUES (?, -10, ?, 0)',
          [demo, motivo],
        ),
        /ck_xp_ledger_amount/,
      );
    });

    it('recusa estrelas fora de 0 a 3', async () => {
      const [linhas] = await conexao.query('SELECT id FROM cells LIMIT 1');

      await assert.rejects(
        conexao.query('UPDATE cell_progress SET stars = 7 WHERE user_id = ? AND cell_id = ?', [
          demo,
          linhas[0].id,
        ]),
        /ck_cell_progress_stars/,
      );
    });

    it('recusa progresso duplicado da mesma célula', async () => {
      const [linhas] = await conexao.query(
        'SELECT cell_id FROM cell_progress WHERE user_id = ? LIMIT 1',
        [demo],
      );

      await assert.rejects(
        conexao.query('INSERT INTO cell_progress (user_id, cell_id, stars) VALUES (?, ?, 3)', [
          demo,
          linhas[0].cell_id,
        ]),
        /uq_cell_progress_user_cell/,
      );
    });
  });

  describe('loja e trilha (RN-032, RN-026)', () => {
    it('recusa compra cujo total não bate com preço vezes quantidade', async () => {
      const item = await idPorSlug(conexao, 'items', 'patinete');

      await assert.rejects(
        conexao.query(
          'INSERT INTO purchases (user_id, item_id, quantity, price_at_purchase, total_price) VALUES (?, ?, 2, 200, 999)',
          [demo, item],
        ),
        /ck_purchases_total/,
      );
    });

    it('aceita compra com o total correto', async () => {
      const item = await idPorSlug(conexao, 'items', 'patinete');

      const [resultado] = await conexao.query(
        'INSERT INTO purchases (user_id, item_id, quantity, price_at_purchase, total_price) VALUES (?, ?, 2, 200, 400)',
        [demo, item],
      );

      assert.ok(resultado.insertId > 0);
    });

    it('recusa duas células na mesma posição do favo', async () => {
      const [linhas] = await conexao.query(
        'SELECT hive_id, game_type_id, age_band_id, order_index FROM cells LIMIT 1',
      );
      const celula = linhas[0];

      await assert.rejects(
        conexao.query(
          'INSERT INTO cells (hive_id, game_type_id, age_band_id, order_index, title) VALUES (?, ?, ?, ?, ?)',
          [celula.hive_id, celula.game_type_id, celula.age_band_id, celula.order_index, 'Duplicada'],
        ),
        /uq_cells_hive_order/,
      );
    });
  });

  describe('perfil e disponibilidade (RN-011)', () => {
    it('recusa marcar o mesmo dia da semana duas vezes', async () => {
      await assert.rejects(
        conexao.query('INSERT INTO schedules (user_id, weekday, is_available) VALUES (?, 1, 1)', [demo]),
        /uq_schedules_user_weekday/,
      );
    });

    // A lista cresceu na T-04.3 (migration 012): 30 e 45 minutos passaram a
    // valer, por decisão de produto. 7 nunca esteve nela.
    it('recusa tempo de sessão fora de 5, 10, 20, 30 ou 45 minutos', async () => {
      await assert.rejects(
        conexao.query('UPDATE profiles SET session_minutes = 7 WHERE user_id = ?', [demo]),
        /ck_profiles_session_minutes/,
      );

      await conexao.query('UPDATE profiles SET session_minutes = 45 WHERE user_id = ?', [demo]);
      await conexao.query('UPDATE profiles SET session_minutes = 10 WHERE user_id = ?', [demo]);
    });
  });

  describe('integridade referencial', () => {
    it('recusa lançamento para usuário que não existe', async () => {
      const motivo = await idPorSlug(conexao, 'reward_reasons', 'ajuste-administrativo');

      await assert.rejects(
        conexao.query(
          'INSERT INTO coin_ledger (user_id, amount, reason_id, balance_after) VALUES (999999, 10, ?, 10)',
          [motivo],
        ),
        /foreign key constraint fails/i,
      );
    });
  });

  describe('auditoria append-only (RNF-17)', () => {
    before(async () => {
      const tipo = await idPorSlug(conexao, 'audit_actor_types', 'sistema');
      await conexao.query(
        'INSERT INTO audit_logs (actor_type_id, actor_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)',
        [tipo, demo, 'teste-append-only', 'user', demo],
      );
    });

    it('aceita inserir', async () => {
      const [linhas] = await conexao.query('SELECT COUNT(*) AS total FROM audit_logs WHERE action = ?', [
        'teste-append-only',
      ]);
      assert.equal(linhas[0].total, 1);
    });

    it('recusa alterar registro de auditoria', async () => {
      await assert.rejects(
        conexao.query('UPDATE audit_logs SET action = ? WHERE action = ?', ['reescrito', 'teste-append-only']),
        /append-only/,
      );
    });

    it('recusa apagar registro de auditoria', async () => {
      await assert.rejects(
        conexao.query('DELETE FROM audit_logs WHERE action = ?', ['teste-append-only']),
        /append-only/,
      );
    });
  });

  describe('exclusão de conta (RN-053)', () => {
    it('apaga o dado pessoal e preserva a auditoria', async () => {
      const [criado] = await conexao.query(
        'INSERT INTO users (email, nickname, password_hash, birth_date) VALUES (?, ?, ?, ?)',
        ['descartavel@beever.dev', 'Temp', 'hash', '2015-01-01'],
      );
      const usuario = criado.insertId;
      const tipo = await idPorSlug(conexao, 'audit_actor_types', 'sistema');

      await conexao.query('INSERT INTO wallets (user_id, coins) VALUES (?, 10)', [usuario]);
      await conexao.query(
        'INSERT INTO audit_logs (actor_type_id, actor_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)',
        [tipo, usuario, 'exclusao-teste', 'user', usuario],
      );

      await conexao.query('DELETE FROM users WHERE id = ?', [usuario]);

      const [carteiras] = await conexao.query('SELECT COUNT(*) AS total FROM wallets WHERE user_id = ?', [
        usuario,
      ]);
      const [auditoria] = await conexao.query('SELECT COUNT(*) AS total FROM audit_logs WHERE action = ?', [
        'exclusao-teste',
      ]);

      assert.equal(carteiras[0].total, 0, 'a carteira devia ter ido junto com a conta');
      assert.equal(auditoria[0].total, 1, 'a linha de auditoria devia sobreviver à exclusão');
    });
  });

  describe('convenções do modelo', () => {
    it('não tem nenhuma coluna em ponto flutuante — dinheiro é inteiro (RN-005)', async () => {
      const [linhas] = await conexao.query(
        `SELECT table_name, column_name FROM information_schema.columns
          WHERE table_schema = DATABASE() AND data_type IN ('float', 'double', 'real')`,
      );

      assert.deepEqual(linhas, []);
    });

    it('usa a mesma collation em todas as tabelas', async () => {
      const [linhas] = await conexao.query(
        `SELECT table_name FROM information_schema.tables
          WHERE table_schema = DATABASE() AND table_collation <> 'utf8mb4_0900_ai_ci'`,
      );

      assert.deepEqual(linhas, []);
    });

    it('indexa as consultas da Colmeia, da loja e do extrato', async () => {
      const [linhas] = await conexao.query(
        `SELECT DISTINCT table_name AS tabela FROM information_schema.statistics
          WHERE table_schema = DATABASE()
            AND table_name IN ('goals', 'cell_progress', 'inventory', 'coin_ledger', 'cells', 'streak_events')`,
      );

      assert.equal(linhas.length, 6, 'as seis consultas da seção 5.7 precisam de índice');
    });
  });
});
