import bcrypt from 'bcrypt';

import * as auditoriaRepository from '../repositories/auditoriaRepository.js';
import * as nivelRepository from '../repositories/nivelRepository.js';
import * as perfilRepository from '../repositories/perfilRepository.js';
import * as usuarioRepository from '../repositories/usuarioRepository.js';
import { ErroAplicacao, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';

/**
 * Regra de negócio de contas. Zero SQL aqui — tudo passa pelos repositories.
 */

const CUSTO_BCRYPT = 10;

/** Política do documento: mínimo 8 caracteres, com letras e números. */
export function senhaValida(senha) {
  return typeof senha === 'string' && senha.length >= 8 && /[a-zA-Z]/.test(senha) && /[0-9]/.test(senha);
}

function exigirSenhaValida(senha) {
  if (!senhaValida(senha)) {
    throw erroValidacao('A senha precisa ter ao menos 8 caracteres, com letras e números');
  }
}

export async function listar() {
  return usuarioRepository.listar();
}

export async function obter(id) {
  const usuario = await usuarioRepository.buscarPorId(id);
  if (!usuario) throw erroNaoEncontrado('Usuário não encontrado');
  return usuario;
}

/**
 * Cria a conta e, junto, o perfil e o nível — como perfil é 1:1 com usuário,
 * não existe conta sem perfil.
 */
export async function criar({ nome, email, dataNasc, senha, apelido }) {
  exigirSenhaValida(senha);

  if (await usuarioRepository.emailJaUsado(email)) {
    throw new ErroAplicacao('Este e-mail já está cadastrado', { status: 409, codigo: 'EMAIL_EM_USO' });
  }

  const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
  const idUsuario = await usuarioRepository.criar({ nome, email, dataNasc, senhaHash });

  const idPerfil = await perfilRepository.criar({ idUsuario, apelido: apelido?.trim() || nome });
  await nivelRepository.criar({ idPerfil });

  await auditoriaRepository.registrar({
    atorTipo: 'Usuario',
    atorId: idUsuario,
    acao: 'CRIAR_CONTA',
    entidade: 'usuario',
    entidadeId: idUsuario,
    estadoNovo: { nome, email },
  });

  return { id: idUsuario, nome, email, idPerfil };
}

export async function atualizar(id, { nome, email, dataNasc, senha }, ator) {
  const anterior = await obter(id);

  let senhaHash = null;
  if (senha) {
    exigirSenhaValida(senha);
    senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
  }

  const afetadas = await usuarioRepository.atualizar(id, { nome, email, dataNasc, senhaHash });
  if (afetadas === 0) throw erroNaoEncontrado('Usuário não encontrado');

  await auditoriaRepository.registrar({
    atorTipo: ator.ehAdmin ? 'Admin' : 'Usuario',
    atorId: ator.id,
    acao: 'ATUALIZAR_CONTA',
    entidade: 'usuario',
    entidadeId: id,
    estadoAnterior: { nome: anterior.nome, email: anterior.email },
    // A senha nova nunca entra na auditoria, só o fato de ter mudado.
    estadoNovo: { nome: nome ?? anterior.nome, email: email ?? anterior.email, senhaAlterada: Boolean(senha) },
  });

  return usuarioRepository.buscarPorId(id);
}

/**
 * Exclusão lógica: a conta vira Inativa e o expurgo definitivo fica a cargo do
 * cron, 15 dias depois — dando margem para arrependimento.
 */
export async function inativar(id, ator) {
  const usuario = await obter(id);

  const afetadas = await usuarioRepository.inativar(id);
  if (afetadas === 0) throw erroNaoEncontrado('Usuário não encontrado');

  await auditoriaRepository.registrar({
    atorTipo: ator.ehAdmin ? 'Admin' : 'Usuario',
    atorId: ator.id,
    acao: 'INATIVAR_CONTA',
    entidade: 'usuario',
    entidadeId: id,
    estadoAnterior: { status: usuario.status },
    estadoNovo: { status: 'Inativo' },
  });
}
