import { googleConfigurado } from '../config/google.js';
import { logger } from '../config/logger.js';
import { ErroAplicacao } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';
import { querJsonOuHtmx } from '../utils/resposta.js';

/**
 * Mantém a pessoa no formulário quando o login falha.
 *
 * Erros de credencial, de validação e de conta inativa voltam para a mesma
 * página, com a caixa de aviso e as bordas vermelhas nos campos — nada de tela
 * de erro separada. Clientes JSON/HTMX continuam recebendo o contrato do
 * `errorHandler` global, idêntico ao de antes.
 */
const CODIGOS_DO_FORMULARIO = new Set([
  'CREDENCIAIS_INVALIDAS',
  'VALIDACAO',
  'CONTA_INATIVA',
]);

export function erroDeLogin({ pagina = 'login', titulo = 'Entrar — Beever' } = {}) {
  return function tratarErroDeLogin(erro, req, res, next) {
    if (res.headersSent) return next(erro);

    if (
      !(erro instanceof ErroAplicacao) ||
      !CODIGOS_DO_FORMULARIO.has(erro.codigo) ||
      querJsonOuHtmx(req)
    ) {
      return next(erro);
    }

    const log = req.log ?? logger;
    log.warn({ codigo: erro.codigo, url: req.originalUrl, requestId: req.id }, erro.message);

    const detalhes = Array.isArray(erro.detalhes) ? erro.detalhes : [];
    const mensagemDoCampo = (campo) => detalhes.find((item) => item?.campo === campo)?.mensagem ?? '';
    const credenciaisInvalidas = erro.codigo === 'CREDENCIAIS_INVALIDAS';

    // Não dizemos qual dos dois está errado: isso entregaria a lista de e-mails
    // cadastrados. Os dois campos ficam marcados e a mensagem é única.
    const erroDeEmail = credenciaisInvalidas || Boolean(mensagemDoCampo('email'));
    const erroDeSenha = credenciaisInvalidas || Boolean(mensagemDoCampo('senha'));

    res.status(erro.status);
    return renderizarPagina(res, pagina, {
      titulo,
      senhaAlterada: false,
      contaExcluida: false,
      googleConfigurado,
      erro: erro.message,
      dicaErro: credenciaisInvalidas
        ? 'Confira o e-mail e a senha e tente novamente. Se esqueceu a senha, use o link abaixo do campo.'
        : '',
      mensagensErro: detalhes.map((item) => item?.mensagem).filter(Boolean),
      erroDeEmail,
      erroDeSenha,
      mensagemEmail: mensagemDoCampo('email'),
      mensagemSenha: mensagemDoCampo('senha'),
      email: typeof req.body?.email === 'string' ? req.body.email.slice(0, 254) : '',
    });
  };
}
