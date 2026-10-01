import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto da requisição em curso, disponível em qualquer camada sem que
 * ninguém precise carregar o `req` para baixo.
 *
 * Por que não passar o `req` adiante: a arquitetura em camadas existe para que
 * service e repository não saibam que HTTP existe. Passar o objeto de
 * requisição — nem que fosse só para logar — abriria a porta para alguém ler
 * `req.session` dentro de um service, e a regra de dependência morreria pelo
 * caminho mais inocente possível.
 *
 * `AsyncLocalStorage` resolve isso: o valor fica preso à cadeia de chamadas
 * assíncronas daquela requisição, sobrevive a `await` e não vaza para outra.
 * Quem loga não pede o id a ninguém — o logger o encontra sozinho.
 */
const armazenamento = new AsyncLocalStorage();

/** Roda `callback` com o contexto ligado. Tudo que ele chamar enxerga o mesmo id. */
export function executarComContexto(contexto, callback) {
  return armazenamento.run(contexto, callback);
}

/**
 * Id da requisição em curso, ou `undefined` fora de uma.
 *
 * Fora de requisição é o caso normal do cron de expurgo e dos scripts de
 * banco: eles logam sem id, e está certo — não existe requisição para
 * correlacionar.
 */
export function idDaRequisicao() {
  return armazenamento.getStore()?.requestId;
}

/**
 * Hash do IP de origem, ou `undefined` fora de uma requisição.
 *
 * Guardamos o hash e nunca o endereço: a auditoria precisa saber se duas ações
 * vieram do mesmo lugar, não de onde elas vieram. Como o produto é usado por
 * crianças, a diferença não é detalhe — é a RNF de proteção de dado pessoal.
 */
export function hashDoIpDaRequisicao() {
  return armazenamento.getStore()?.ipHash;
}
