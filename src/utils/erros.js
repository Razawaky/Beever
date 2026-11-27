/**
 * Erros de domínio conhecidos. Services lançam estes; o handler global traduz
 * para resposta HTTP. Qualquer erro que não seja um `ErroAplicacao` é tratado
 * como falha inesperada e vira 500 sem detalhes para o cliente.
 */
export class ErroAplicacao extends Error {
  constructor(mensagem, { status = 400, codigo = 'ERRO_APLICACAO', detalhes = null } = {}) {
    super(mensagem);
    this.name = 'ErroAplicacao';
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
    this.esperado = true;
  }
}

export const erroNaoEncontrado = (mensagem = 'Recurso não encontrado') =>
  new ErroAplicacao(mensagem, { status: 404, codigo: 'NAO_ENCONTRADO' });

export const erroNaoAutorizado = (mensagem = 'É preciso estar logado') =>
  new ErroAplicacao(mensagem, { status: 401, codigo: 'NAO_AUTORIZADO' });

export const erroAcessoNegado = (mensagem = 'Acesso negado') =>
  new ErroAplicacao(mensagem, { status: 403, codigo: 'ACESSO_NEGADO' });

export const erroValidacao = (mensagem = 'Dados inválidos', detalhes = null) =>
  new ErroAplicacao(mensagem, { status: 422, codigo: 'VALIDACAO', detalhes });

/**
 * Envolve um handler assíncrono para que qualquer rejeição chegue ao handler
 * global de erros. Evita ter que repetir try/catch em todo controller.
 */
export const assincrono = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
