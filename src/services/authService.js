import bcrypt from 'bcrypt';

import * as auditoriaRepository from '../repositories/auditoriaRepository.js';
import * as perfilRepository from '../repositories/perfilRepository.js';
import * as usuarioRepository from '../repositories/usuarioRepository.js';
import { ErroAplicacao } from '../utils/erros.js';

/** Autenticação de conta. Sem login de perfil separado: com perfil 1:1, não faria sentido. */

const erroCredenciais = () =>
  // Mensagem única para e-mail inexistente e senha errada: dizer qual dos dois
  // falhou entrega a um atacante a lista de e-mails cadastrados.
  new ErroAplicacao('E-mail ou senha inválidos', { status: 401, codigo: 'CREDENCIAIS_INVALIDAS' });

export async function autenticar({ email, senha }) {
  const usuario = await usuarioRepository.buscarPorEmailComSenha(email);
  if (!usuario) throw erroCredenciais();

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
  if (!senhaCorreta) throw erroCredenciais();

  if (usuario.status === 'Inativo') {
    throw new ErroAplicacao('Esta conta está inativa', { status: 403, codigo: 'CONTA_INATIVA' });
  }

  await usuarioRepository.atualizarUltimoLogin(usuario.id);

  const perfil = await perfilRepository.buscarPorUsuario(usuario.id);

  await auditoriaRepository.registrar({
    atorTipo: usuario.eh_admin ? 'Admin' : 'Usuario',
    atorId: usuario.id,
    acao: 'LOGIN',
    entidade: 'usuario',
    entidadeId: usuario.id,
  });

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    // O join com `admin` acontece uma única vez, aqui; o resultado vai para a
    // sessão e é o que o middleware requireAdmin consulta depois.
    ehAdmin: Boolean(usuario.eh_admin),
    perfilId: perfil?.id ?? null,
    onboardingConcluido: Boolean(perfil?.onboarding_concluido),
  };
}

export async function registrarLogout(usuarioId, ehAdmin) {
  await auditoriaRepository.registrar({
    atorTipo: ehAdmin ? 'Admin' : 'Usuario',
    atorId: usuarioId,
    acao: 'LOGOUT',
    entidade: 'usuario',
    entidadeId: usuarioId,
  });
}
