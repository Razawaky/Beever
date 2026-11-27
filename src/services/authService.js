import bcrypt from 'bcrypt';

import * as profilesRepository from '../repositories/profilesRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import { ErroAplicacao } from '../utils/erros.js';
import * as auditService from './auditService.js';

/**
 * Autenticação de conta. Perfil adicional não tem e-mail nem senha, então não
 * existe login de perfil separado: quem autentica é sempre a conta principal.
 * As consultas do repository filtram `owner_user_id IS NULL` para que uma
 * linha-filha nunca vire porta de entrada.
 */

const erroCredenciais = () =>
  // Mensagem única para e-mail inexistente e senha errada: dizer qual dos dois
  // falhou entrega a um atacante a lista de e-mails cadastrados.
  new ErroAplicacao('E-mail ou senha inválidos', { status: 401, codigo: 'CREDENCIAIS_INVALIDAS' });

export async function autenticar({ email, senha }) {
  const usuario = await usersRepository.buscarPorEmailComSenha(email);
  // Conta criada pelo Google não tem senha: entra pelo Google ou define uma pelo "Esqueceu a senha?".
  if (!usuario || !usuario.password_hash) throw erroCredenciais();

  const senhaCorreta = await bcrypt.compare(senha, usuario.password_hash);
  if (!senhaCorreta) throw erroCredenciais();

  return concluirLogin(usuario, 'senha');
}

/** Confirma a senha da conta atual antes de abrir áreas sensíveis nas configurações. */
export async function verificarSenhaDaConta(idConta, senha) {
  if (!senha || !String(senha).trim()) {
    throw new ErroAplicacao('Digite a senha da conta para continuar.', {
      status: 400,
      codigo: 'SENHA_OBRIGATORIA',
    });
  }

  const usuario = await usersRepository.buscarPorIdComSenha(idConta);
  if (!usuario || !usuario.password_hash) {
    throw new ErroAplicacao('Não foi possível confirmar a senha desta conta.', {
      status: 400,
      codigo: 'SENHA_INDISPONIVEL',
    });
  }

  const senhaCorreta = await bcrypt.compare(String(senha), usuario.password_hash);
  if (!senhaCorreta) {
    throw new ErroAplicacao('Senha incorreta. Tente novamente.', {
      status: 401,
      codigo: 'SENHA_INCORRETA',
    });
  }

  return true;
}

/**
 * Parte do login que vale para senha e para Google: confere se a conta está ativa,
 * registra a entrada e devolve o que vai para a sessão.
 */
export async function concluirLogin(usuario, metodo) {
  if (!usuario.is_active) {
    throw new ErroAplicacao('Esta conta está inativa', { status: 403, codigo: 'CONTA_INATIVA' });
  }

  await usersRepository.atualizarUltimoLogin(usuario.id);

  const perfil = await profilesRepository.buscarPorUsuario(usuario.id);

  const ator = usuario.eh_admin ? auditService.admin(usuario.id) : auditService.usuario(usuario.id);
  await auditService.registrar(ator, 'sessao.login', { entidade: 'user', id: usuario.id, depois: { metodo } });

  return {
    id: usuario.id,
    // Quem autenticou é a conta (o responsável). `perfilId` pode vir nulo:
    // conta criada depois da separação ainda não tem persona, e o login a manda
    // para `/perfis` escolher ou criar uma criança.
    contaUsuarioId: usuario.id,
    email: usuario.email,
    apelido: usuario.nickname,
    // O join com `admins` acontece uma única vez, aqui; o resultado vai para a
    // sessão e é o que o middleware requireAdmin consulta depois.
    ehAdmin: Boolean(usuario.eh_admin),
    perfilId: perfil?.id ?? null,
    // Cada persona tem a própria data de onboarding concluído em `users`. O
    // perfil adicional começa pendente mesmo que a conta principal já jogue.
    onboardingConcluido: Boolean(usuario.onboarding_completed_at),
  };
}

export async function registrarLogout(usuarioId, ehAdmin) {
  const ator = ehAdmin ? auditService.admin(usuarioId) : auditService.usuario(usuarioId);
  await auditService.registrar(ator, 'sessao.logout', { entidade: 'user', id: usuarioId });
}
