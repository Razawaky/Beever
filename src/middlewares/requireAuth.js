import { erroNaoAutorizado } from '../utils/erros.js';

/** Exige sessão de login ativa. */
export function requireAuth(req, res, next) {
  if (req.session?.usuarioId) return next();
  next(erroNaoAutorizado());
}
