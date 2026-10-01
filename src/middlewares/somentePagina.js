import { querJson } from '../utils/resposta.js';

/**
 * Deixa a rota de página passar a vez quando o cliente pediu JSON.
 *
 * Página e API convivem no mesmo caminho — `GET /metas` devolve HTML para o
 * navegador e a lista de metas para quem pede `Accept: application/json`. Quem
 * declara primeiro ganha o path, e sem isto a página engoliria a API em
 * silêncio (foi o que aconteceu com `/loja` no sentido inverso, e o sintoma foi
 * um 404 que ninguém explicava).
 *
 * `next('route')` abandona esta rota e deixa o Express procurar a próxima que
 * casa — no caso, o router de domínio montado logo abaixo.
 */
export function somentePagina(req, res, next) {
  if (querJson(req)) return next('route');
  next();
}
