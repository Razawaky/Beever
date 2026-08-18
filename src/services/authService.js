import bcrypt from 'bcrypt';

import * as auditLogsRepository from '../repositories/auditLogsRepository.js';
import * as profilesRepository from '../repositories/profilesRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import { ErroAplicacao } from '../utils/erros.js';

/** Autenticação de conta. Sem login de perfil separado: com perfil 1:1, não faria sentido. */

const erroCredenciais = () =>
  // Mensagem única para e-mail inexistente e senha errada: dizer qual dos dois
  // falhou entrega a um atacante a lista de e-mails cadastrados.
  new ErroAplicacao('E-mail ou senha inválidos', { status: 401, codigo: 'CREDENCIAIS_INVALIDAS' });

export async function autenticar({ email, senha }) {
  const usuario = await usersRepository.buscarPorEmailComSenha(email);
  if (!usuario) throw erroCredenciais();

  const senhaCorreta = await bcrypt.compare(senha, usuario.password_hash);
  if (!senhaCorreta) throw erroCredenciais();

  if (!usuario.is_active) {
    throw new ErroAplicacao('Esta conta está inativa', { status: 403, codigo: 'CONTA_INATIVA' });
  }

  await usersRepository.atualizarUltimoLogin(usuario.id);

  const perfil = await profilesRepository.buscarPorUsuario(usuario.id);

  await auditLogsRepository.registrar({
    atorTipo: usuario.eh_admin ? 'admin' : 'usuario',
    atorId: usuario.id,
    acao: 'sessao.login',
    entidade: 'user',
    entidadeId: usuario.id,
  });

  return {
    id: usuario.id,
    email: usuario.email,
    apelido: usuario.nickname,
    // O join com `admins` acontece uma única vez, aqui; o resultado vai para a
    // sessão e é o que o middleware requireAdmin consulta depois.
    ehAdmin: Boolean(usuario.eh_admin),
    perfilId: perfil?.id ?? null,
    // O onboarding é marcado na conta, com data, e não no perfil: guardar
    // *quando* custa o mesmo que guardar *se* e responde uma pergunta a mais.
    onboardingConcluido: Boolean(usuario.onboarding_completed_at),
  };
}

export async function registrarLogout(usuarioId, ehAdmin) {
  await auditLogsRepository.registrar({
    atorTipo: ehAdmin ? 'admin' : 'usuario',
    atorId: usuarioId,
    acao: 'sessao.logout',
    entidade: 'user',
    entidadeId: usuarioId,
  });
}
