import { erroAcessoNegado, erroNaoAutorizado } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';

/**
 * Exige que o usuário logado seja administrador.
 *
 * A checagem de fato é o join com a tabela `admins`, feito uma única vez pelo
 * service de autenticação no login, que grava o resultado na sessão. Assim o
 * middleware não toca no banco e o fluxo Controller → Service → Repository
 * continua sendo o único caminho até o MySQL.
 *
 * Quem não está logado e pediu página vai para o login administrativo, porque
 * uma tela de erro não tem o que a pessoa precisa: o formulário. Quem está
 * logado e não é admin recebe 403, e não 404 — é o que o aceite da E12 exige.
 */
export function requireAdmin(req, res, next) {
  if (!req.session?.usuarioId) {
    if (querJson(req)) return next(erroNaoAutorizado());
    return res.redirect('/admin/login');
  }
  if (!req.session.ehAdmin) return next(erroAcessoNegado('Área restrita a administradores'));
  next();
}
