import { randomBytes, timingSafeEqual } from 'node:crypto';

import { erroAcessoNegado } from '../utils/erros.js';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Proteção CSRF: token gerado e guardado na sessão do servidor; toda
 * requisição que muda dado (POST/PUT/DELETE) tem que devolver esse mesmo
 * token, provando que veio do nosso formulário e não de outro site.
 *
 * Nos formulários EJS, inclua sempre:
 *   <input type="hidden" name="_csrf" value="<%= csrfToken %>">
 */
export function csrf(req, res, next) {
  if (!req.session) return next();

  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString('hex');
  }

  // Disponível para todos os templates, sem o controller precisar repassar.
  res.locals.csrfToken = req.session.csrfToken;

  if (METODOS_SEGUROS.has(req.method)) return next();

  const enviado = req.body?._csrf ?? req.get('x-csrf-token') ?? '';
  if (!tokensIguais(enviado, req.session.csrfToken)) {
    return next(erroAcessoNegado('Token CSRF inválido ou ausente'));
  }

  next();
}

function tokensIguais(a, b) {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
