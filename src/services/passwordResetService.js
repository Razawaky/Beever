import crypto from 'node:crypto';

import bcrypt from 'bcrypt';

import { emTransacao } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import * as passwordResetTokensRepository from '../repositories/passwordResetTokensRepository.js';
import * as sessionsRepository from '../repositories/sessionsRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import { ErroAplicacao, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as emailService from './emailService.js';
import { CUSTO_BCRYPT, senhaValida } from './usersService.js';

/**
 * Recuperação de senha por e-mail (RF-AUT-06): gera o link, valida o token e grava a senha nova.
 * Não monta o texto do e-mail (emailService) nem abre sessão de login.
 */

// Uma hora porque a criança muitas vezes precisa do responsável para abrir o e-mail.
export const VALIDADE_DO_LINK_EM_MINUTOS = 60;
const BYTES_DO_TOKEN = 32;

export function gerarToken() {
  return crypto.randomBytes(BYTES_DO_TOKEN).toString('hex');
}

export function hashDoToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function montarLink(token) {
  const link = new URL('/redefinir-senha', env.urlDaAplicacao);
  link.searchParams.set('token', token);
  return link.toString();
}

/** Gera um link novo e manda por e-mail. Não devolve nada, para o controller não ter como revelar se a conta existe. */
export async function solicitarRecuperacao(email) {
  const usuario = await usersRepository.buscarPorEmail(email);
  if (!usuario || !usuario.is_active) return;

  const token = gerarToken();
  await passwordResetTokensRepository.invalidarAbertosDoUsuario(usuario.id);
  await passwordResetTokensRepository.criar({
    usuarioId: usuario.id,
    tokenHash: hashDoToken(token),
    validadeEmMinutos: VALIDADE_DO_LINK_EM_MINUTOS,
  });

  await auditService.registrar(auditService.usuario(usuario.id), 'senha.recuperacao_solicitada', {
    entidade: 'user',
    id: usuario.id,
  });

  // O envio não segura a resposta: esperar o SMTP deixaria o pedido de conta que
  // existe mais lento que o de conta que não existe, e o tempo entregaria quem tem conta.
  emailService
    .enviarRecuperacaoDeSenha({
      para: usuario.email,
      apelido: usuario.nickname,
      link: montarLink(token),
      validadeEmMinutos: VALIDADE_DO_LINK_EM_MINUTOS,
    })
    .catch((erro) => logger.error({ erro, usuarioId: usuario.id }, 'Falha ao enviar e-mail de recuperação'));
}

const FORMATO_DO_TOKEN = /^[0-9a-f]{64}$/;

/** Diz se o link ainda serve. Token fora do formato nem chega ao banco. */
export async function linkValido(token) {
  if (!FORMATO_DO_TOKEN.test(token)) return false;
  return passwordResetTokensRepository.existeValidoPorHash(hashDoToken(token));
}

const erroLinkInvalido = () =>
  new ErroAplicacao('Este link de troca de senha venceu ou já foi usado. Peça um novo.', {
    status: 400,
    codigo: 'LINK_INVALIDO',
  });

/** Troca a senha pelo token do link. Com `desconectarTodos`, derruba todas as sessões abertas da conta. */
export async function redefinirSenha({ token, senha, desconectarTodos }) {
  if (!senhaValida(senha)) {
    throw erroValidacao('A senha precisa ter ao menos 8 caracteres, com letras e números');
  }

  const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);

  const usuarioId = await emTransacao(async (conexao) => {
    const registro = await passwordResetTokensRepository.travarValidoPorHash(conexao, hashDoToken(token));
    if (!registro) throw erroLinkInvalido();

    await usersRepository.atualizar(registro.user_id, { senhaHash }, conexao);
    await passwordResetTokensRepository.marcarUsado(conexao, registro.id);
    return registro.user_id;
  });

  let sessoesDerrubadas = 0;
  if (desconectarTodos) sessoesDerrubadas = await sessionsRepository.removerDoUsuario(usuarioId);

  await auditService.registrar(auditService.usuario(usuarioId), 'senha.redefinida', {
    entidade: 'user',
    id: usuarioId,
    depois: { desconectarTodos, sessoesDerrubadas },
  });
}
