import { erroNaoEncontrado } from '../utils/erros.js';

/** Última rota da pilha: transforma qualquer caminho desconhecido em 404. */
export function notFound(req, res, next) {
  // Sem methods nem URL crus na mensagem: o endereço digitado não precisa ser
  // devolvido (e escapado) na tela, e o handler já sabe o status pelo erro.
  next(erroNaoEncontrado('Página não encontrada'));
}
