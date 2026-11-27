import { consultar, consultarEm } from '../config/database.js';

/**
 * Acesso a dados de `users` e `admins`. Hash de senha é responsabilidade do
 * service; papel de admin vem de join com `admins`, não de coluna (RN-051).
 *
 * A conta não guarda nome completo: a RN-049 proíbe coletar dado pessoal de
 * criança além de apelido e avatar. Por isso `nickname` e nada de `name`.
 *
 * `users` guarda duas coisas desde a migration 026: a conta principal
 * (`owner_user_id IS NULL`) e cada perfil adicional daquela conta
 * (`owner_user_id` aponta para a principal). As leituras administrativas,
 * de login e de expurgo filtram a conta principal; as leituras por id e por
 * perfil continuam aceitando qualquer persona, porque o jogo é indexado por
 * `user_id`.
 */

const CAMPOS_PUBLICOS =
  'id, owner_user_id, email, nickname, birth_date, is_active, onboarding_completed_at, created_at, last_login_at';

export async function listar() {
  return consultar(
    `SELECT ${CAMPOS_PUBLICOS.split(', ').map((campo) => `u.${campo}`).join(', ')},
            (a.id IS NOT NULL) AS eh_admin
       FROM users u
       LEFT JOIN admins a ON a.user_id = u.id
      WHERE u.owner_user_id IS NULL
      ORDER BY u.nickname`,
  );
}

/** Só o total: o painel administrativo conta contas, não perfis de jogo. */
export async function contar() {
  const linhas = await consultar('SELECT COUNT(*) AS total FROM users WHERE owner_user_id IS NULL');
  return Number(linhas[0]?.total ?? 0);
}

export async function buscarPorId(id) {
  const linhas = await consultar(`SELECT ${CAMPOS_PUBLICOS} FROM users WHERE id = ?`, [id]);
  return linhas[0] ?? null;
}

/** Inclui o hash da senha: usado para confirmar a senha da conta em ações sensíveis. */
export async function buscarPorIdComSenha(id) {
  const linhas = await consultar(
    `SELECT u.id, u.email, u.password_hash, u.is_active,
            (a.id IS NOT NULL) AS eh_admin
       FROM users u
       LEFT JOIN admins a ON a.user_id = u.id
      WHERE u.id = ?
        AND u.owner_user_id IS NULL`,
    [id],
  );
  return linhas[0] ?? null;
}

/** Inclui o hash da senha: usado pelo login, que precisa comparar, e pelo vínculo com o Google. */
export async function buscarPorEmailComSenha(email) {
  const linhas = await consultar(
    `SELECT u.id, u.email, u.nickname, u.password_hash, u.is_active, u.onboarding_completed_at,
            (a.id IS NOT NULL) AS eh_admin
       FROM users u
       LEFT JOIN admins a ON a.user_id = u.id
      WHERE u.email = ?
        AND u.owner_user_id IS NULL`,
    [email],
  );
  return linhas[0] ?? null;
}

/** Mesmos campos do login por senha, para o login pelo Google montar a sessão igual. */
export async function buscarPorGoogleSub(googleSub) {
  const linhas = await consultar(
    `SELECT u.id, u.email, u.nickname, u.is_active, u.onboarding_completed_at,
            (a.id IS NOT NULL) AS eh_admin
       FROM users u
       LEFT JOIN admins a ON a.user_id = u.id
      WHERE u.google_sub = ?
        AND u.owner_user_id IS NULL`,
    [googleSub],
  );
  return linhas[0] ?? null;
}

export async function vincularGoogle(id, googleSub) {
  await consultar('UPDATE users SET google_sub = ? WHERE id = ?', [googleSub, id]);
}

/** Sem o hash da senha: usado pela recuperação de senha, que só precisa saber para quem enviar. */
export async function buscarPorEmail(email) {
  const linhas = await consultar(
    'SELECT id, email, nickname, is_active FROM users WHERE email = ? AND owner_user_id IS NULL',
    [email],
  );
  return linhas[0] ?? null;
}

export async function emailJaUsado(email) {
  // A UNIQUE de `email` vale para a tabela inteira, então a checagem também:
  // perfil-filho nasce sem e-mail, mas se algum dia ganhar um, o cadastro não
  // pode passar aqui para estourar depois como 500.
  const linhas = await consultar('SELECT 1 FROM users WHERE email = ? LIMIT 1', [email]);
  return linhas.length > 0;
}

/**
 * Cria a conta (responsável) ou uma persona filha.
 *
 * Nenhuma migration foi necessária: `nickname` e `birth_date` já são NOT NULL,
 * as linhas filhas já nasciam sem e-mail/senha e `onboarding_completed_at`
 * já existia — só passa a ser escrito aqui, porque o responsável não faz o wizard.
 */
export async function criar(
  { email, apelido, dataNasc, senhaHash, googleSub = null, onboardingConcluido = false },
  conexao = null,
) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO users (email, nickname, birth_date, password_hash, google_sub, onboarding_completed_at)
     VALUES (?, ?, ?, ?, ?, CASE WHEN ? THEN NOW() ELSE NULL END)`,
    [email, apelido, dataNasc, senhaHash, googleSub, onboardingConcluido ? 1 : 0],
  );
  return resultado.insertId;
}

/**
 * Cria uma persona de jogo subordinada à conta. Não tem e-mail, não tem senha
 * e não tem vínculo com o Google: é perfil, não conta de login.
 */
export async function criarPerfilDaConta({ idConta, apelido, dataNasc }, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO users (owner_user_id, email, nickname, birth_date, password_hash, google_sub)
     VALUES (?, NULL, ?, ?, NULL, NULL)`,
    [idConta, apelido, dataNasc],
  );
  return resultado.insertId;
}

/** COALESCE mantém o valor atual quando o campo não é enviado. */
export async function atualizar(
  id,
  { apelido = null, email = null, dataNasc = null, senhaHash = null },
  conexao = null,
) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE users
        SET nickname      = COALESCE(?, nickname),
            email         = COALESCE(?, email),
            birth_date    = COALESCE(?, birth_date),
            password_hash = COALESCE(?, password_hash)
      WHERE id = ?`,
    [apelido, email, dataNasc, senhaHash, id],
  );
  return resultado.affectedRows;
}

export async function atualizarUltimoLogin(id) {
  await consultar('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [id]);
}

/**
 * Marca o onboarding como concluído gravando *quando* (RN-012). Guardar a data
 * em vez de um booleano custa o mesmo e responde uma pergunta a mais.
 */
export async function marcarOnboardingConcluido(id, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    'UPDATE users SET onboarding_completed_at = UTC_TIMESTAMP() WHERE id = ? AND onboarding_completed_at IS NULL',
    [id],
  );
  return resultado.affectedRows;
}

/**
 * Tranca a linha do usuário até o fim da transação. Duas requisições que
 * planejam metas ao mesmo tempo passam uma de cada vez.
 */
export async function travarPorId(conexao, id) {
  const linhas = await consultarEm(conexao, 'SELECT id FROM users WHERE id = ? FOR UPDATE', [id]);
  return linhas[0] ?? null;
}

/** Exclusão é lógica: a conta é desativada e só some no expurgo do cron. */
export async function inativar(id) {
  const resultado = await consultar('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
  return resultado.affectedRows;
}

/**
 * Inativos há mais de N dias, alvo do expurgo diário. Os parênteses no WHERE
 * são de propósito: sem eles, `last_login_at IS NULL` valeria pra qualquer
 * usuário (inclusive ativo recém-cadastrado, que nasce sem login).
 */
export async function listarInativosParaExpurgo(dias) {
  return consultar(
    `SELECT u.id, p.id AS profile_id
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.is_active = 0
        AND u.owner_user_id IS NULL
        AND (u.last_login_at IS NULL OR u.last_login_at <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY))`,
    [dias],
  );
}

export async function removerPorIds(ids) {
  if (ids.length === 0) return 0;
  const marcadores = ids.map(() => '?').join(', ');
  const resultado = await consultar(`DELETE FROM users WHERE id IN (${marcadores})`, ids);
  return resultado.affectedRows;
}

/**
 * Apaga só os dados de jogador de uma linha `users`, mantendo a conta viva.
 *
 * É o caso da conta antiga que também era o primeiro perfil: remover a linha
 * levaria junto e-mail, senha e todas as personas filhas. Aqui a conta fica —
 * limpa, sem perfil, pronta para receber outras crianças — e a cascata manual
 * abaixo substitui a do banco que só acontece no `DELETE FROM users`.
 *
 * `profiles` vai por último; o restante são tabelas que referenciam `user_id`,
 * sem dependência entre si além de `inventory → purchases` (SET NULL) e dos
 * próprios `goals` (SET NULL), então a ordem é segura.
 */
const TABELAS_DO_JOGADOR = [
  'guardian_consents',
  'schedules',
  'cell_progress',
  'hive_progress',
  'user_levels',
  'wallets',
  'game_sessions',
  'idempotency_keys',
  'xp_ledger',
  'point_ledger',
  'coin_ledger',
  'goals',
  'tasks',
  'streaks',
  'streak_events',
  'purchases',
  'inventory',
  'vaults',
  'vault_transactions',
  'economic_cycles',
  'patrimony_snapshots',
  'user_achievements',
  'league_members',
  'password_reset_tokens',
  'profiles',
];

export async function limparDadosDeJogador(id, conexao = null) {
  for (const tabela of TABELAS_DO_JOGADOR) {
    await consultarEm(conexao, `DELETE FROM ${tabela} WHERE user_id = ?`, [id]);
  }
}

/** Apagamento definitivo de uma conta (RN-053); a cascata leva o resto. */
export async function removerPorId(id) {
  const resultado = await consultar('DELETE FROM users WHERE id = ?', [id]);
  return resultado.affectedRows;
}
