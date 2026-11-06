import crypto from 'node:crypto';

import { CodeChallengeMethod } from 'google-auth-library';

import { env } from '../config/env.js';
import { clienteGoogle, googleConfigurado } from '../config/google.js';
import { logger } from '../config/logger.js';
import * as usersRepository from '../repositories/usersRepository.js';
import { ErroAplicacao, erroNaoEncontrado } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as authService from './authService.js';
import * as usersService from './usersService.js';

/**
 * Login com Google: monta o endereço de ida, confere a volta e decide entre
 * entrar, vincular a conta existente ou pedir o resto do cadastro.
 * Não guarda nada na sessão; isso é do controller.
 */

// Só e-mail: o nome completo que o Google mandaria a RN-049 proíbe guardar.
const ESCOPOS = ['openid', 'email'];

const erroGoogle = () =>
  new ErroAplicacao('Não deu para entrar com o Google. Tente de novo.', { status: 400, codigo: 'GOOGLE_FALHOU' });

function exigirGoogleConfigurado() {
  if (!googleConfigurado) throw erroNaoEncontrado('Login com Google não está disponível');
}

/** Endereço do Google mais o `state` e o verificador PKCE que o controller guarda para conferir na volta. */
export async function iniciarLogin() {
  exigirGoogleConfigurado();

  const state = crypto.randomBytes(16).toString('hex');
  const { codeVerifier, codeChallenge } = await clienteGoogle.generateCodeVerifierAsync();

  const endereco = clienteGoogle.generateAuthUrl({
    scope: ESCOPOS,
    state,
    code_challenge_method: CodeChallengeMethod.S256,
    code_challenge: codeChallenge,
    prompt: 'select_account',
  });

  return { endereco, state, codeVerifier };
}

/** Troca o código da volta pelo e-mail e pelo id da pessoa, conferindo a assinatura do Google. */
export async function perfilDoRetorno({ codigo, stateRecebido, ida }) {
  exigirGoogleConfigurado();

  // O state prova que a volta é da ida que esta sessão começou, e não de um link plantado por outra pessoa.
  if (!ida || !codigo || stateRecebido !== ida.state) throw erroGoogle();
  const { codeVerifier } = ida;

  try {
    const { tokens } = await clienteGoogle.getToken({ code: codigo, codeVerifier });
    const ticket = await clienteGoogle.verifyIdToken({ idToken: tokens.id_token, audience: env.google.idDoCliente });
    const dados = ticket.getPayload();
    return { googleSub: dados.sub, email: dados.email.toLowerCase(), emailVerificado: dados.email_verified === true };
  } catch (erro) {
    logger.warn({ erro }, 'Falha ao trocar o código do Google');
    throw erroGoogle();
  }
}

/**
 * Decide o que fazer com quem voltou do Google. Devolve `{ usuario }` para entrar
 * ou `{ cadastroPendente }` quando ainda não existe conta.
 */
export async function entrar({ googleSub, email, emailVerificado }) {
  const jaVinculado = await usersRepository.buscarPorGoogleSub(googleSub);
  if (jaVinculado) return { usuario: await authService.concluirLogin(jaVinculado, 'google') };

  // Sem e-mail verificado não dá para provar que a pessoa é dona do endereço.
  if (!emailVerificado) throw erroGoogle();

  const mesmoEmail = await usersRepository.buscarPorEmailComSenha(email);
  if (!mesmoEmail) return { cadastroPendente: { googleSub, email } };

  await usersRepository.vincularGoogle(mesmoEmail.id, googleSub);
  await auditService.registrar(auditService.usuario(mesmoEmail.id), 'conta.google_vinculado', {
    entidade: 'user',
    id: mesmoEmail.id,
  });
  return { usuario: await authService.concluirLogin(mesmoEmail, 'google') };
}

/** Cria a conta de quem veio do Google, com as mesmas regras de idade e consentimento do cadastro. */
export async function completarCadastro({ googleSub, email, apelido, dataNasc, consentimentoResponsavel }) {
  return usersService.criarComGoogle({ email, googleSub, apelido, dataNasc, consentimentoResponsavel });
}
