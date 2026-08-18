import { consultar, consultarEm } from '../config/database.js';

/**
 * Acesso a dados de `profiles`. Perfil é 1:1 com usuário (RN-050) — sem
 * listagem, sem login próprio, sem seleção estilo Netflix.
 *
 * O apelido não mora aqui: subiu para `users.nickname` no schema novo. Aqui
 * ficam as preferências do jogador — faixa etária, avatar, fuso, tempo de
 * sessão e acessibilidade.
 */

const CAMPOS =
  'id, user_id, age_band_id, avatar_id, initial_goal_id, timezone, session_minutes, is_sound_enabled, has_reduced_motion, created_at';

export async function buscarPorUsuario(idUsuario) {
  const linhas = await consultar(`SELECT ${CAMPOS} FROM profiles WHERE user_id = ?`, [idUsuario]);
  return linhas[0] ?? null;
}

export async function buscarPorId(id) {
  const linhas = await consultar(`SELECT ${CAMPOS} FROM profiles WHERE id = ?`, [id]);
  return linhas[0] ?? null;
}

export async function criar({ idUsuario }, conexao = null) {
  const resultado = await consultarEm(conexao, 'INSERT INTO profiles (user_id) VALUES (?)', [idUsuario]);
  return resultado.insertId;
}

/**
 * Atualiza só o que foi enviado. Faixa etária, avatar e objetivo chegam como
 * slug e são resolvidos aqui pelo próprio SQL — o service não precisa saber os
 * ids das tabelas de domínio, e o banco recusa slug que não existe.
 */
export async function atualizar(
  id,
  { faixaEtaria = null, avatar = null, objetivoInicial = null, fuso = null, minutosPorSessao = null },
  conexao = null,
) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE profiles
        SET age_band_id     = COALESCE((SELECT id FROM age_bands     WHERE code = ?), age_band_id),
            avatar_id       = COALESCE((SELECT id FROM avatars       WHERE slug = ?), avatar_id),
            initial_goal_id = COALESCE((SELECT id FROM initial_goals WHERE slug = ?), initial_goal_id),
            timezone        = COALESCE(?, timezone),
            session_minutes = COALESCE(?, session_minutes)
      WHERE id = ?`,
    [faixaEtaria, avatar, objetivoInicial, fuso, minutosPorSessao, id],
  );
  return resultado.affectedRows;
}

export async function remover(id) {
  const resultado = await consultar('DELETE FROM profiles WHERE id = ?', [id]);
  return resultado.affectedRows;
}

/** Leitura completa para telas: junta os rótulos das tabelas de domínio. */
export async function buscarDetalhadoPorUsuario(idUsuario) {
  const linhas = await consultar(
    `SELECT p.id, p.user_id, p.timezone, p.session_minutes, p.is_sound_enabled, p.has_reduced_motion,
            f.code AS faixa_etaria, f.name AS faixa_etaria_nome,
            a.slug AS avatar, a.image_path AS avatar_imagem,
            o.slug AS objetivo_inicial, o.label AS objetivo_inicial_rotulo
       FROM profiles p
       LEFT JOIN age_bands f     ON f.id = p.age_band_id
       LEFT JOIN avatars a       ON a.id = p.avatar_id
       LEFT JOIN initial_goals o ON o.id = p.initial_goal_id
      WHERE p.user_id = ?`,
    [idUsuario],
  );
  return linhas[0] ?? null;
}

/**
 * Faixas etárias do catálogo (RN-029). A faixa não é decidida em código: as
 * idades moram em `age_bands`, e quem classifica um jogador lê daqui. Duplicar
 * os intervalos numa constante seria repetir a dívida que a curva de níveis já
 * custou uma vez.
 */
export async function listarFaixasEtarias() {
  return consultar(
    'SELECT id, code, name, min_age, max_age, is_economy_enabled, is_upkeep_enabled FROM age_bands ORDER BY min_age',
  );
}
