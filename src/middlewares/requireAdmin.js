import { erroAcessoNegado, erroNaoAutorizado } from '../utils/erros.js';

/**
 * Exige que o usuário logado seja administrador.
 *
 * A checagem de fato é o join com a tabela `admin`, feito uma única vez pelo
 * service de autenticação no login, que grava o resultado na sessão. Assim o
 * middleware não toca no banco e o fluxo Controller → Service → Repository
 * continua sendo o único caminho até o MySQL.
 */
export function requireAdmin(req, res, next) {
  if (!req.session?.usuarioId) return next(erroNaoAutorizado());
  if (!req.session.ehAdmin) return next(erroAcessoNegado('Área restrita a administradores'));
  next();
}
