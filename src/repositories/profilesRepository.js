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
  'id, user_id, age_band_id, avatar_id, initial_goal_id, onboarding_step, timezone, session_minutes, is_sound_enabled, has_reduced_motion, created_at';

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

/** Preferência booleana: `null` quer dizer "não informada", não "desligada". */
function bit(valor) {
  if (valor === null || valor === undefined) return null;
  return valor ? 1 : 0;
}

/**
 * Atualiza só o que foi enviado. Faixa etária, avatar e objetivo chegam como
 * slug e são resolvidos aqui pelo próprio SQL — o service não precisa saber os
 * ids das tabelas de domínio.
 *
 * Quem garante que o slug existe é o service, contra o catálogo lido de
 * `listarAvatares` e `listarObjetivosIniciais` (DT-27). Aqui o `CASE` só
 * distingue "campo não informado" de "campo informado": até a T-04.3 esta
 * resolução usava `COALESCE`, que confundia as duas coisas — slug inexistente
 * caía no valor anterior e a gravação passava por bem-sucedida. Numa conta nova
 * não havia valor anterior, então o onboarding terminava "com sucesso" e o
 * perfil ficava sem avatar e sem objetivo. O comentário antigo ainda afirmava
 * que o banco recusava slug inválido; ele nunca recusou, apenas ignorava.
 */
export async function atualizar(
  id,
  {
    faixaEtaria = null,
    avatar = null,
    objetivoInicial = null,
    fuso = null,
    minutosPorSessao = null,
    somAtivo = null,
    animacaoReduzida = null,
  },
  conexao = null,
) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE profiles
        SET age_band_id        = CASE WHEN ? IS NULL THEN age_band_id     ELSE (SELECT id FROM age_bands     WHERE code = ?) END,
            avatar_id          = CASE WHEN ? IS NULL THEN avatar_id       ELSE (SELECT id FROM avatars       WHERE slug = ?) END,
            initial_goal_id    = CASE WHEN ? IS NULL THEN initial_goal_id ELSE (SELECT id FROM initial_goals WHERE slug = ?) END,
            timezone           = COALESCE(?, timezone),
            session_minutes    = COALESCE(?, session_minutes),
            is_sound_enabled   = COALESCE(?, is_sound_enabled),
            has_reduced_motion = COALESCE(?, has_reduced_motion)
      WHERE id = ?`,
    [
      faixaEtaria,
      faixaEtaria,
      avatar,
      avatar,
      objetivoInicial,
      objetivoInicial,
      fuso,
      minutosPorSessao,
      bit(somAtivo),
      bit(animacaoReduzida),
      id,
    ],
  );
  return resultado.affectedRows;
}

/**
 * Move o marcador de passo do onboarding para frente, nunca para trás.
 *
 * O `GREATEST` existe por causa do botão "Voltar": revisar uma resposta já dada
 * regrava o campo, mas não pode devolver o jogador ao começo da próxima vez que
 * ele abrir o wizard.
 */
export async function avancarPasso(id, passo, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    'UPDATE profiles SET onboarding_step = GREATEST(onboarding_step, ?) WHERE id = ?',
    [passo, id],
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
    `SELECT p.id, p.user_id, p.onboarding_step, p.timezone, p.session_minutes, p.is_sound_enabled, p.has_reduced_motion,
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

/**
 * Avatares oferecidos no onboarding (RF-ONB-06).
 *
 * A lista sai daqui para dois destinos que antes discordavam: o wizard, que
 * trazia os slugs escritos no próprio JavaScript, e a validação, que não
 * conferia coisa alguma. Com uma fonte só, acrescentar um mascote é seed —
 * não é mexer no front.
 */
export async function listarAvatares() {
  return consultar('SELECT slug, name, image_path FROM avatars ORDER BY id');
}

/** Objetivos iniciais oferecidos no onboarding (RF-ONB-05, RN-011). */
export async function listarObjetivosIniciais() {
  return consultar('SELECT slug, label FROM initial_goals ORDER BY id');
}
