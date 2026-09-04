import { consultarEm } from '../config/database.js';

/**
 * Quanto vale uma recompensa: `reward_configs` e `reward_modifiers`.
 *
 * As duas tabelas moram no mesmo arquivo porque são o mesmo assunto — nenhum
 * valor de recompensa pode estar no código (RN-006). A primeira diz quanto uma
 * célula paga por tipo de jogo, faixa e estrelas; a segunda diz por quanto esse
 * valor é multiplicado em situações como a repetição (RN-008).
 *
 * A busca é por slug do tipo de jogo e código da faixa, que é o vocabulário que
 * os services já usam. Combinação sem linha devolve `null`: o que fazer com
 * configuração faltando é decisão do service, não do repository.
 */

/** Slug do modificador da RN-008. Semeado em `07_reward_modifiers.sql`. */
export const REPETICAO_DE_CELULA = 'repeticao-de-celula';

/** Slug do modificador da RN-017: meta renovada rende metade. Mesmo arquivo de seed. */
export const META_RENOVADA = 'meta-renovada';

export async function buscarConfiguracao(
  { slugDoTipoDeJogo, codigoDaFaixa, estrelas },
  conexao = null,
) {
  const linhas = await consultarEm(
    conexao,
    `SELECT rc.id, rc.stars, rc.xp_amount, rc.points_amount, rc.coins_amount,
            jogo.slug AS game_type_slug, faixa.code AS age_band_code
       FROM reward_configs rc
       JOIN game_types jogo ON jogo.id = rc.game_type_id
       JOIN age_bands faixa ON faixa.id = rc.age_band_id
      WHERE jogo.slug = ? AND faixa.code = ? AND rc.stars = ?`,
    [slugDoTipoDeJogo, codigoDaFaixa, estrelas],
  );
  return linhas[0] ?? null;
}

/**
 * Busca um modificador pelo slug.
 *
 * Os fatores voltam como número, e não como o texto que o driver devolve para
 * DECIMAL, porque existem para ser multiplicados. Os valores em mel continuam
 * inteiros — quem arredonda é o service.
 */
export async function buscarModificador(slug, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    `SELECT slug, name, xp_factor, points_factor, coins_factor
       FROM reward_modifiers
      WHERE slug = ?`,
    [slug],
  );

  const linha = linhas[0];
  if (!linha) return null;

  return {
    slug: linha.slug,
    name: linha.name,
    xp_factor: Number(linha.xp_factor),
    points_factor: Number(linha.points_factor),
    coins_factor: Number(linha.coins_factor),
  };
}
