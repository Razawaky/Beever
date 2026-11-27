/**
 * Negociação de conteúdo em um lugar só.
 *
 * A expressão `req.accepts(['html', 'json']) === 'json'` estava copiada nove
 * vezes em seis controllers (dívida DT-05). Copiada não é só feio: quando a
 * regra mudar — e ela muda, no dia em que um cliente mandar
 * `Accept: * / *` e esperar JSON —, muda em nove lugares ou em nenhum.
 *
 * A ordem importa: `['html', 'json']` faz o HTML ganhar o desempate, que é o
 * certo para um navegador. Cliente que quer JSON pede JSON.
 */
export function querJson(req) {
  return req.accepts(['html', 'json']) === 'json';
}

/**
 * Clientes que não podem receber uma página inteira quando dão erro.
 *
 * HTMX manda `HX-Request: true` e normalmente aceita HTML — justamente o caso
 * em que o `Accept` sozinho faria o handler devolver a página de erro e deixar
 * o trecho da tela morto. `fetch`/XHR clássico mandam `X-Requested-With`, e os
 * clientes JSON pedem `Accept: application/json`. Todos eles recebem o mesmo
 * contrato `{ erro, codigo, requestId }`, que o `notificacoes.js` sabe ler.
 */
export function querJsonOuHtmx(req) {
  const htmx = req.headers?.['hx-request'];
  if (typeof htmx === 'string' && htmx.toLowerCase() === 'true') return true;
  if (req.xhr === true) return true;

  const requisitadoPor = req.headers?.['x-requested-with'];
  if (typeof requisitadoPor === 'string' && requisitadoPor.toLowerCase() === 'xmlhttprequest') {
    return true;
  }

  return querJson(req);
}

/**
 * Responde JSON ou entrega o comando para o caminho HTML.
 *
 * Fica no controller a decisão do que renderizar ou para onde redirecionar —
 * este helper só evita repetir o `if`.
 */
export function responder(req, res, { json, html }) {
  if (querJson(req)) return res.json(json);
  return html();
}

/**
 * Para onde o jogador volta depois de uma ação de formulário.
 *
 * É lista branca, e não o `Referer` nem o valor cru do formulário: destino
 * vindo do cliente sem conferência é redirecionamento aberto, que é
 * vulnerabilidade e não conveniência.
 */
const PAGINAS_DE_VOLTA = [
  '/painel',
  '/metas',
  '/painel/metas',
  '/cofre',
  '/painel/cofre',
  '/loja',
  '/painel/loja',
];

export function paginaDeVolta(destino, padrao = '/metas') {
  return PAGINAS_DE_VOLTA.includes(destino) ? destino : padrao;
}
