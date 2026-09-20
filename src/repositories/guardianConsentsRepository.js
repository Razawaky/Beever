import { consultar, consultarEm } from '../config/database.js';

/**
 * `guardian_consents` — a prova de que um responsável autorizou a conta de uma
 * criança (RNF-34, LGPD Art. 14).
 *
 * A linha registra **quando** o consentimento foi dado, para qual e-mail e de
 * qual origem. Não é preferência que se liga e desliga: é um fato datado, e por
 * isso cada consentimento é uma linha nova em vez de um campo atualizado — se
 * um dia o responsável reautorizar sob termos diferentes, o histórico continua
 * contando o que valia antes.
 *
 * O e-mail fica aqui mesmo repetindo o da conta. Parece redundância, e é de
 * propósito: se a pessoa trocar o e-mail de login amanhã, a prova precisa
 * continuar dizendo para quem o consentimento foi dado naquele dia.
 */

export async function registrar(conexao, { idUsuario, emailResponsavel, ipHash = null }) {
  const resultado = await consultarEm(
    conexao,
    'INSERT INTO guardian_consents (user_id, guardian_email, ip_hash) VALUES (?, ?, ?)',
    [idUsuario, emailResponsavel, ipHash],
  );
  return resultado.insertId;
}

/** O consentimento mais recente da conta, ou nulo se nunca houve. */
export async function buscarPorUsuario(idUsuario) {
  const linhas = await consultar(
    `SELECT id, user_id, guardian_email, consented_at, ip_hash
       FROM guardian_consents
      WHERE user_id = ?
      ORDER BY consented_at DESC, id DESC
      LIMIT 1`,
    [idUsuario],
  );
  return linhas[0] ?? null;
}

export async function listarPorUsuario(idUsuario) {
  return consultar(
    `SELECT id, user_id, guardian_email, consented_at, ip_hash
       FROM guardian_consents
      WHERE user_id = ?
      ORDER BY consented_at, id`,
    [idUsuario],
  );
}
