import { logger } from '../config/logger.js';
import { ErroAplicacao } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';
import { querJsonOuHtmx } from '../utils/resposta.js';

/**
 * Handler global de erros do Express (assinatura de 4 argumentos).
 *
 * O erro completo — mensagem original, stack, caminho de arquivo — fica só no
 * log do servidor. A resposta nunca carrega stack, nem em desenvolvimento: a
 * tela de erro é para quem está jogando, não para quem está depurando. Para
 * depurar, o `requestId` no canto da página aponta a linha exata do log.
 *
 * HTMX, XHR e clientes que pedem JSON recebem o mesmo status e um JSON curto,
 * sem redirect: é o que permite ao `notificacoes.js` mostrar o problema num
 * toast ou num dialog sem trocar a página que a pessoa estava usando.
 */
const MENSAGEM_INTERNA = 'Erro interno do servidor';

function tituloPara(status) {
  if (status === 404) return 'Página não encontrada';
  if (status >= 500) return 'Ops, algo deu errado';
  return 'Não foi possível continuar';
}

function dicaPara(status) {
  if (status === 404) return 'O endereço que você tentou abrir não existe ou mudou de lugar.';
  if (status >= 500) {
    return 'Tente novamente em instantes. Se o problema continuar, conte o código abaixo para quem cuida do Beever.';
  }
  return 'Confira o que você preencheu e tente outra vez.';
}

export function errorHandler(erro, req, res, next) {
  // Se a resposta já começou a ser enviada (por exemplo, uma falha no store de
  // sessão que só aparece depois do render), não dá para trocar o status nem os
  // headers. Delega para o handler padrão do Express, que encerra a conexão.
  if (res.headersSent) return next(erro);

  const esperado = erro instanceof ErroAplicacao;
  const status = esperado ? erro.status : 500;

  // `err` é a chave que o pino serializa com mensagem, stack e tipo. Passar o
  // erro inteiro aqui é o único lugar onde os detalhes internos aparecem.
  const log = req.log ?? logger;
  if (status >= 500) {
    log.error(
      { err: erro, url: req.originalUrl, metodo: req.method, requestId: req.id },
      'Erro não tratado',
    );
  } else {
    log.warn({ codigo: erro.codigo, url: req.originalUrl, requestId: req.id }, erro.message);
  }

  // Mensagens de domínio foram escritas para a pessoa ler. Qualquer outra é
  // substituída por texto fixo: é aqui que um segredo vazaria para a tela.
  const mensagem = esperado ? erro.message : MENSAGEM_INTERNA;

  if (querJsonOuHtmx(req)) {
    return res.status(status).json({
      erro: mensagem,
      codigo: esperado ? erro.codigo : 'ERRO_INTERNO',
      requestId: req.id,
      ...(esperado && erro.detalhes ? { detalhes: erro.detalhes } : {}),
    });
  }

  const logado = Boolean(req.session?.usuarioId);

  res.status(status);
  return renderizarPagina(res, 'erro', {
    titulo: `Erro ${status} — ${tituloPara(status)}`,
    comCabecalho: true,
    comRodape: true,
    status,
    tituloAmigavel: tituloPara(status),
    mensagem,
    dica: dicaPara(status),
    logado,
    voltarPara: logado ? '/painel' : '/',
    requestId: req.id,
  });
}
