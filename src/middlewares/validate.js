import { validationResult } from 'express-validator';

import { erroValidacao } from '../utils/erros.js';

/**
 * Fecha uma cadeia de validações do express-validator.
 *
 * Uso na rota:
 *   router.post('/cadastro', regrasCadastro, validate, controller.criar)
 *
 * Toda rota que recebe entrada do usuário passa por aqui — é a primeira linha
 * de defesa contra SQL injection e XSS, antes mesmo dos prepared statements e
 * do escape do EJS.
 */
export function validate(req, res, next) {
  const resultado = validationResult(req);
  if (resultado.isEmpty()) return next();

  const detalhes = resultado.array().map((falha) => ({
    campo: falha.path,
    mensagem: falha.msg,
  }));

  next(erroValidacao('Verifique os campos preenchidos', detalhes));
}
