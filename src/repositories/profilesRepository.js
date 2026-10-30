import { consultar, consultarEm } from '../config/database.js';

/**
 * Acesso a dados de `profiles`. Perfil de jogo continua 1:1 com uma linha de
 * `users`, mas uma conta pode ter várias personas: a principal tem
 * `users.owner_user_id = NULL` e cada perfil adicional aponta para ela. Não há
 * login próprio por perfil; a seleção troca a persona ativa da sessão.
 *
 * O apelido não mora aqui: fica em `users.nickname`, porque é a persona que
 * aparece na liga. Aqui ficam as preferências do jogador — faixa etária, avatar,
 * fuso, tempo de sessão e acessibilidade.
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

/**
 * O perfil com o vínculo de conta, para a seleção conferir posse sem fazer
 * duas consultas e para a remoção saber se apaga uma persona ou a conta.
 */
export async function buscarComContaPorId(id) {
  const linhas = await consultar(
    `SELECT p.id, p.user_id, u.owner_user_id, u.nickname AS apelido, u.email,
            u.onboarding_completed_at
       FROM profiles p
       JOIN users u ON u.id = p.user_id
      WHERE p.id = ?`,
    [id],
  );
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

/**
 * Leitura completa para telas: junta os rótulos das tabelas de domínio.
 *
 * Continua sendo a leitura de uma persona, usada pelas telas de perfil e pelo
 * onboarding depois que a sessão já escolheu quem está jogando.
 */
export async function listarDetalhadoPorUsuario(idUsuario) {
  return consultar(
    `SELECT p.id, p.user_id, p.onboarding_step, p.timezone, p.session_minutes, p.is_sound_enabled, p.has_reduced_motion,
            f.code AS faixa_etaria, f.name AS faixa_etaria_nome,
            a.slug AS avatar, a.image_path AS avatar_imagem,
            o.slug AS objetivo_inicial, o.label AS objetivo_inicial_rotulo
       FROM profiles p
       LEFT JOIN age_bands f     ON f.id = p.age_band_id
       LEFT JOIN avatars a       ON a.id = p.avatar_id
       LEFT JOIN initial_goals o ON o.id = p.initial_goal_id
      WHERE p.user_id = ?
      ORDER BY p.created_at, p.id`,
    [idUsuario],
  );
}

/**
 * Todos os perfis de uma conta, com o que a tela de seleção precisa: apelido,
 * nível, avatar e se a configuração já terminou.
 *
 * A conta principal vem primeiro (`owner_user_id IS NULL`), porque ela é o
 * perfil original e a ordem não pode dançar a cada criação. Os filhos vêm por
 * ordem de criação. O nível é lido direto de `user_levels` para a tela não
 * fazer N consultas — a seleção mostra todos de uma vez.
 */
export async function listarDetalhadoDaConta(idConta) {
  return consultar(
    `SELECT p.id, p.user_id, p.onboarding_step, p.timezone, p.session_minutes, p.is_sound_enabled, p.has_reduced_motion,
            u.nickname AS apelido, u.email, u.owner_user_id, u.onboarding_completed_at,
            ul.level AS nivel,
            f.code AS faixa_etaria, f.name AS faixa_etaria_nome,
            a.slug AS avatar, a.image_path AS avatar_imagem,
            o.slug AS objetivo_inicial, o.label AS objetivo_inicial_rotulo
       FROM profiles p
       JOIN users u             ON u.id = p.user_id
       LEFT JOIN user_levels ul ON ul.user_id = p.user_id
       LEFT JOIN age_bands f     ON f.id = p.age_band_id
       LEFT JOIN avatars a       ON a.id = p.avatar_id
       LEFT JOIN initial_goals o ON o.id = p.initial_goal_id
      WHERE u.id = ? OR u.owner_user_id = ?
      ORDER BY (u.owner_user_id IS NULL) DESC, p.created_at, p.id`,
    [idConta, idConta],
  );
}

/** O primeiro perfil da conta: usado pelos fluxos que ainda são 1:1. */
export async function buscarDetalhadoPorUsuario(idUsuario) {
  const [perfil] = await listarDetalhadoPorUsuario(idUsuario);
  return perfil ?? null;
}

/**
 * Faixas etárias do catálogo (RN-029). A faixa não é decidida em código: as
 * idades moram em `age_bands`, e quem classifica um jogador lê daqui. Duplicar
 * os intervalos numa constante seria repetir a dívida que a curva de níveis já
 * custou uma vez.
 */
export async function listarFaixasEtarias() {
  return consultar(
    `SELECT id, code, name, min_age, max_age, is_economy_enabled, is_upkeep_enabled,
            is_depreciation_enabled
       FROM age_bands ORDER BY min_age`,
  );
}

/**
 * A faixa do jogador com os interruptores da RN-038.
 *
 * Existe separada da leitura detalhada porque o ciclo econômico e a loja
 * precisam dos interruptores, não dos rótulos de tela.
 */
export async function buscarFaixaDoUsuario(idUsuario) {
  const linhas = await consultar(
    `SELECT f.id, f.code, f.name, f.is_economy_enabled, f.is_upkeep_enabled,
            f.is_depreciation_enabled
       FROM profiles p
       JOIN age_bands f ON f.id = p.age_band_id
      WHERE p.user_id = ?`,
    [idUsuario],
  );
  return linhas[0] ?? null;
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
