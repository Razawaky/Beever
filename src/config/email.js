import nodemailer from 'nodemailer';

import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Transporte de e-mail — singleton do processo, como o pool do banco.
 * Em teste, ou sem SMTP configurado fora de produção, o e-mail vira JSON em
 * memória e nada sai da máquina.
 */
function criarTransporte() {
  if (env.teste || !env.email.host) {
    if (!env.teste) logger.warn('SMTP_HOST vazio: e-mails não serão entregues. Suba o Mailpit do docker-compose.');
    return nodemailer.createTransport({ jsonTransport: true });
  }

  const comLogin = Boolean(env.email.usuario);
  return nodemailer.createTransport({
    host: env.email.host,
    port: env.email.porta,
    // A porta 465 fala TLS desde o início; as outras começam abertas e sobem com STARTTLS.
    secure: env.email.porta === 465,
    auth: comLogin ? { user: env.email.usuario, pass: env.email.senha } : undefined,
  });
}

export const transporteDeEmail = criarTransporte();
