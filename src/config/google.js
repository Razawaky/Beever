import { OAuth2Client } from 'google-auth-library';

import { env } from './env.js';

/**
 * Cliente OAuth do Google — singleton do processo, como o pool do banco.
 * Fica nulo quando as chaves não foram configuradas, e aí o login com Google some da tela.
 */

export const googleConfigurado = Boolean(env.google.idDoCliente && env.google.segredoDoCliente);

export const enderecoDeRetorno = new URL('/sessao/google/retorno', env.urlDaAplicacao).toString();

export const clienteGoogle = googleConfigurado
  ? new OAuth2Client(env.google.idDoCliente, env.google.segredoDoCliente, enderecoDeRetorno)
  : null;
