import { env } from '../config/env.js';
import { ErroAplicacao } from '../utils/erros.js';

/**
 * Handler global de erros do Express (assinatura de 4 argumentos).
 * Nunca vaza stack trace para o cliente em produção e responde JSON ou HTML
 * conforme o que o cliente pediu — é o que permite que os mesmos controllers
 * sirvam telas EJS hoje e uma SPA amanhã.
 */
export function errorHandler(erro, req, res, next) {
  // Se a resposta já começou a ser enviada (por exemplo, uma falha no store de
  // sessão que só aparece depois do render), não dá para trocar o status nem os
  // headers. Delega para o handler padrão do Express, que encerra a conexão.
  if (res.headersSent) return next(erro);

  const esperado = erro instanceof ErroAplicacao;
  const status = esperado ? erro.status : 500;

  const log = req.log ?? console;
  if (status >= 500) {
    log.error({ erro, url: req.originalUrl, metodo: req.method }, 'Erro não tratado');
  } else {
    log.warn({ codigo: erro.codigo, url: req.originalUrl }, erro.message);
  }

  const mensagem = esperado ? erro.message : 'Erro interno do servidor';

  if (req.accepts(['html', 'json']) === 'json') {
    return res.status(status).json({
      erro: mensagem,
      codigo: esperado ? erro.codigo : 'ERRO_INTERNO',
      ...(esperado && erro.detalhes ? { detalhes: erro.detalhes } : {}),
    });
  }

  return res.status(status).render('pages/erro', {
    titulo: `Erro ${status}`,
    status,
    mensagem,
    // Stack só em desenvolvimento, para depuração local.
    stack: env.producao ? null : erro.stack,
  });
}
