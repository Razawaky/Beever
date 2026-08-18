import { randomUUID } from 'node:crypto';

import { executarComContexto } from '../config/contextoRequisicao.js';

/**
 * Dá um identificador a cada requisição e o mantém disponível até o fim dela.
 *
 * Serve para responder a pergunta que sempre aparece quando algo quebra em
 * produção: *quais destas linhas de log são da mesma requisição?* Sem um id, a
 * resposta é "as que estão perto no arquivo", o que deixa de valer no instante
 * em que dois jogadores usam o sistema ao mesmo tempo.
 *
 * O id também volta no header `x-request-id`, para a pessoa que viu o erro
 * poder citá-lo — é a diferença entre "deu erro na loja ontem" e uma linha
 * exata no log.
 */

// Sequência conservadora de propósito: o id entra em arquivo de log, e aceitar
// texto livre de um header seria deixar quem chama escrever o que quiser lá,
// inclusive quebras de linha que forjam uma linha inteira de log.
const FORMATO_ACEITO = /^[A-Za-z0-9._-]{1,128}$/;

export const CABECALHO = 'x-request-id';

export function requestId(req, res, next) {
  // Atrás de um proxy que já identifica a requisição, reaproveita-se o id dele:
  // assim o rastro atravessa nginx e aplicação sem trocar de nome no meio.
  const recebido = req.headers[CABECALHO];
  const id = typeof recebido === 'string' && FORMATO_ACEITO.test(recebido) ? recebido : randomUUID();

  req.id = id;
  res.setHeader(CABECALHO, id);

  executarComContexto({ requestId: id }, next);
}
