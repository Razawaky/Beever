import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';

/**
 * Limites de requisição. O documento exige rate limiting nas rotas de
 * autenticação e de compra — os pontos onde força bruta e repetição acidental
 * causam dano real.
 *
 * Em teste os limites são desligados para não interferir nas asserções.
 */
const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.teste,
};

/** Rede de segurança geral, aplicada a toda a aplicação. */
export const limiteGlobal = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: { erro: 'Muitas requisições. Tente de novo em alguns minutos.' },
});

/** Login e cadastro: apertado, para conter força bruta. */
export const limiteAutenticacao = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { erro: 'Muitas tentativas de acesso. Aguarde alguns minutos.' },
});

/**
 * Rotas que creditam recompensa: progresso e conclusão de tarefa e de meta.
 *
 * A regra de negócio já impede ganhar sem cumprir; isto é a rede de baixo — se
 * algum dia uma checagem escapar, o estrago fica limitado ao que cabe em um
 * minuto, em vez de ser tão rápido quanto o navegador aguentar.
 */
export const limiteRecompensa = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 30,
  message: { erro: 'Calma aí! Espere um instante antes de continuar.' },
});

/** Compras: evita duplo clique virar débito duplo e limita abuso. */
export const limiteCompra = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 20,
  message: { erro: 'Muitas compras seguidas. Aguarde um instante.' },
});
