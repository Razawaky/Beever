import { createRequire } from 'node:module';

import pino from 'pino';

import { idDaRequisicao } from './contextoRequisicao.js';
import { env } from './env.js';

/**
 * O `pino-pretty` é dependência de desenvolvimento e não existe na imagem de
 * produção, que roda `npm prune --omit=dev`. Pedir por ele sem conferir derruba
 * a aplicação no boot com um erro que nem fala em log.
 */
function transporteLegivel() {
  if (env.producao) return undefined;

  try {
    createRequire(import.meta.url).resolve('pino-pretty');
  } catch {
    return undefined;
  }

  return { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } };
}

/**
 * Logger estruturado da aplicação. O documento proíbe `console.log` em código de
 * produção — todo log passa por aqui, com nível e campos consistentes.
 *
 * O `mixin` carimba o id da requisição em curso em **toda** linha, venha ela de
 * onde vier. É o que faz o rastro funcionar de verdade: um service não conhece
 * o `req` e nem deve conhecer, mas o log dele sai correlacionado do mesmo
 * jeito. Fora de uma requisição — cron de expurgo, scripts de banco — o campo
 * simplesmente não aparece, em vez de aparecer vazio.
 */
export const logger = pino({
  level: env.teste ? 'silent' : env.log.nivel,
  base: { servico: 'beever' },
  mixin() {
    const requestId = idDaRequisicao();
    return requestId ? { requestId } : {};
  },
  redact: {
    // Nunca registrar credenciais nem cookies de sessão.
    paths: ['req.headers.cookie', 'req.body.senha', 'req.body.confirmarSenha', '*.senha'],
    remove: true,
  },
  transport: transporteLegivel(),
});
