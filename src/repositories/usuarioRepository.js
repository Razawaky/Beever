import { consultar } from '../config/database.js';

/**
 * Acesso a dados de `usuario` e `admin`. Hash de senha é responsabilidade do
 * service; papel de admin vem de join com a tabela `admin`, não de coluna.
 */

const CAMPOS_PUBLICOS = 'id, nome, email, data_nasc, status, data_criacao, ultimo_login';

export async function listar() {
  return consultar(`SELECT ${CAMPOS_PUBLICOS} FROM usuario ORDER BY nome`);
}

export async function buscarPorId(id) {
  const linhas = await consultar(`SELECT ${CAMPOS_PUBLICOS} FROM usuario WHERE id = ?`, [id]);
  return linhas[0] ?? null;
}

/** Inclui a senha: usado só pelo login, que precisa comparar o hash. */
export async function buscarPorEmailComSenha(email) {
  const linhas = await consultar(
    `SELECT u.id, u.nome, u.email, u.senha, u.status,
            (a.id_admin IS NOT NULL) AS eh_admin
       FROM usuario u
       LEFT JOIN admin a ON a.user_id_user = u.id
      WHERE u.email = ?`,
    [email]
  );
  return linhas[0] ?? null;
}

export async function emailJaUsado(email) {
  const linhas = await consultar('SELECT 1 FROM usuario WHERE email = ? LIMIT 1', [email]);
  return linhas.length > 0;
}

export async function criar({ nome, email, dataNasc, senhaHash }) {
  const resultado = await consultar(
    'INSERT INTO usuario (nome, email, data_nasc, senha) VALUES (?, ?, ?, ?)',
    [nome, email, dataNasc, senhaHash]
  );
  return resultado.insertId;
}

/** COALESCE mantém o valor atual quando o campo não é enviado. */
export async function atualizar(id, { nome = null, email = null, dataNasc = null, senhaHash = null }) {
  const resultado = await consultar(
    `UPDATE usuario
        SET nome      = COALESCE(?, nome),
            email     = COALESCE(?, email),
            data_nasc = COALESCE(?, data_nasc),
            senha     = COALESCE(?, senha)
      WHERE id = ?`,
    [nome, email, dataNasc, senhaHash, id]
  );
  return resultado.affectedRows;
}

export async function atualizarUltimoLogin(id) {
  await consultar('UPDATE usuario SET ultimo_login = NOW() WHERE id = ?', [id]);
}

/** Exclusão é lógica: o usuário vira Inativo e só some no expurgo do cron. */
export async function inativar(id) {
  const resultado = await consultar("UPDATE usuario SET status = 'Inativo' WHERE id = ?", [id]);
  return resultado.affectedRows;
}

/**
 * Inativos há mais de N dias, alvo do expurgo diário. Os parênteses no WHERE
 * são de propósito: sem eles, `ultimo_login IS NULL` valeria pra qualquer
 * usuário (inclusive ativo recém-cadastrado, que nasce com login nulo).
 */
export async function listarInativosParaExpurgo(dias) {
  return consultar(
    `SELECT id, nome, email
       FROM usuario
      WHERE status = 'Inativo'
        AND (ultimo_login IS NULL OR ultimo_login <= DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [dias]
  );
}

export async function removerPorIds(ids) {
  if (ids.length === 0) return 0;
  const marcadores = ids.map(() => '?').join(', ');
  const resultado = await consultar(`DELETE FROM usuario WHERE id IN (${marcadores})`, ids);
  return resultado.affectedRows;
}
