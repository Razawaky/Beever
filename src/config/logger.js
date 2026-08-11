import pino from 'pino';

import { env } from './env.js';

/**
 * Logger estruturado da aplicação. O documento proíbe `console.log` em código de
 * produção — todo log passa por aqui, com nível e campos consistentes.
 */
export const logger = pino({
  level: env.teste ? 'silent' : env.log.nivel,
  base: { servico: 'beever' },
  redact: {
    // Nunca registrar credenciais nem cookies de sessão.
    paths: ['req.headers.cookie', 'req.body.senha', 'req.body.confirmarSenha', '*.senha'],
    remove: true,
  },
  transport: env.producao
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
});
