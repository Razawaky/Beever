import { consultarEm } from '../config/database.js';

/**
 * `streaks` e `streak_events` — a sequência do jogador.
 *
 * A sequência é uma linha por usuário; o calendário é um evento por dia
 * avaliado. A UNIQUE (user_id, event_date) é o que deixa a avaliação preguiçosa
 * rodar quantas vezes o jogador abrir a página sem contar o mesmo dia duas
 * vezes (RN-021).
 *
 * As datas saem como texto `AAAA-MM-DD`: o dia já foi resolvido no fuso do
 * jogador e virar `Date` aqui só reabriria a porta do fuso do servidor.
 */

const CAMPOS = `id, user_id, current_days, best_days, shields_available,
                DATE_FORMAT(last_counted_date, '%Y-%m-%d') AS last_counted_date,
                last_evaluated_at, created_at`;

export async function buscarPorUsuario(idUsuario, conexao = null) {
  const linhas = await consultarEm(conexao, `SELECT ${CAMPOS} FROM streaks WHERE user_id = ?`, [idUsuario]);
  return linhas[0] ?? null;
}

/** Cria a linha zerada de quem ainda não tem. Quem já tem fica como está. */
export async function criarSeNaoExistir(idUsuario, conexao = null) {
  await consultarEm(conexao, 'INSERT IGNORE INTO streaks (user_id) VALUES (?)', [idUsuario]);
  return buscarPorUsuario(idUsuario, conexao);
}

export async function atualizar(idUsuario, { diasAtuais, melhorDias, ultimoDiaContado, avaliadoEm }, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE streaks
        SET current_days      = ?,
            best_days         = ?,
            last_counted_date = ?,
            last_evaluated_at = ?
      WHERE user_id = ?`,
    [diasAtuais, melhorDias, ultimoDiaContado, avaliadoEm, idUsuario],
  );
  return resultado.affectedRows ?? 0;
}

/**
 * Grava o desfecho de um dia. `INSERT IGNORE` porque o dia já avaliado é para
 * ficar como está — reavaliar não pode mudar o passado.
 */
export async function registrarEvento({ idUsuario, data, tipo }, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    `INSERT IGNORE INTO streak_events (user_id, event_date, event_type_id)
     VALUES (?, ?, (SELECT id FROM streak_event_types WHERE slug = ?))`,
    [idUsuario, data, tipo],
  );
  return (resultado.affectedRows ?? 0) === 1;
}

export async function listarEventos(idUsuario, dataInicial, dataFinal, conexao = null) {
  return consultarEm(
    conexao,
    `SELECT DATE_FORMAT(e.event_date, '%Y-%m-%d') AS data, t.slug AS tipo
       FROM streak_events e
       JOIN streak_event_types t ON t.id = e.event_type_id
      WHERE e.user_id = ? AND e.event_date >= ? AND e.event_date <= ?
      ORDER BY e.event_date`,
    [idUsuario, dataInicial, dataFinal],
  );
}

/**
 * Espelha quantos escudos o jogador tem guardados.
 *
 * A verdade é o inventário — uma linha por unidade, como todo item comprado. Esta
 * coluna é cópia, e existe porque o `CHECK (shields_available <= 2)` do banco é a
 * última trava do teto da RN-022.
 */
export async function definirEscudos(conexao, idUsuario, quantidade) {
  const resultado = await consultarEm(conexao, 'UPDATE streaks SET shields_available = ? WHERE user_id = ?', [
    quantidade,
    idUsuario,
  ]);
  return resultado.affectedRows ?? 0;
}
