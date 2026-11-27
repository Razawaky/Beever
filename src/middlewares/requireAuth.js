import { erroNaoAutorizado } from '../utils/erros.js';

/**
 * Exige sessão de login ativa.
 *
 * A identidade autenticada é a conta (`contaUsuarioId`), não a persona da vez
 * (`usuarioId`). Antes do multiperfil os dois eram sempre o mesmo número e a
 * distinção não existia; hoje a persona muda a cada seleção e a conta, não.
 *
 * `usuarioId` continua aceito como fallback para as sessões antigas, criadas
 * antes de `contaUsuarioId` existir.
 */
export function idContaDaSessao(req) {
  return Number(req.session?.contaUsuarioId ?? req.session?.usuarioId);
}

export function requireAuth(req, res, next) {
  if (req.session?.contaUsuarioId || req.session?.usuarioId) return next();
  next(erroNaoAutorizado());
}
