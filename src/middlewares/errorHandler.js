import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ErroAplicacao } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';

/**
 * Handler global de erros do Express (assinatura de 4 argumentos).
 * Nunca vaza stack trace para o cliente em produção e responde JSON ou HTML
 * conforme o que o cliente pediu — é o que permite que os mesmos controllers
 * sirvam telas EJS hoje e uma SPA amanhã.
 *
 * A resposta leva o id da requisição junto. Ele não é dado sensível — é um
 * número aleatório sem significado fora do log — e é o que transforma "deu erro
 * na loja ontem" numa linha exata de arquivo. Em produção, onde o stack trace
 * some, ele é a única pista que a pessoa consegue passar adiante.
 */
export function errorHandler(erro, req, res, next) {
  // Se a resposta já começou a ser enviada (por exemplo, uma falha no store de
  // sessão que só aparece depois do render), não dá para trocar o status nem os
  // headers. Delega para o handler padrão do Express, que encerra a conexão.
  if (res.headersSent) return next(erro);

  const esperado = erro instanceof ErroAplicacao;
  const status = esperado ? erro.status : 500;

  const log = req.log ?? logger;
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
      requestId: req.id,
      ...(esperado && erro.detalhes ? { detalhes: erro.detalhes } : {}),
    });
  }

  res.status(status);
  return renderizarPagina(res, 'erro', {
    titulo: `Erro ${status}`,
    comCabecalho: true,
    comRodape: true,
    status,
    mensagem,
    requestId: req.id,
    // Stack só em desenvolvimento, para depuração local.
    stack: env.producao ? null : erro.stack,
  });
}
