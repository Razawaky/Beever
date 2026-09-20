import { erroNaoEncontrado } from '../utils/erros.js';

/** Última rota da pilha: transforma qualquer caminho desconhecido em 404. */
export function notFound(req, res, next) {
  next(erroNaoEncontrado(`Página não encontrada: ${req.method} ${req.originalUrl}`));
}
