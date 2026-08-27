import * as adminsRepository from '../repositories/adminsRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import { ErroAplicacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as authService from './authService.js';

/**
 * Porta da área administrativa (RF-ADM-01).
 *
 * A senha é conferida pelo mesmo `authService` do jogador — hash e sessão são
 * um só. O que muda aqui é a exigência de linha em `admins` (RN-051), avaliada
 * depois da senha para não virar um jeito de descobrir quem é administrador.
 */

export async function autenticarAdmin({ email, senha }) {
  const usuario = await authService.autenticar({ email, senha });
  if (usuario.ehAdmin) return usuario;

  // Mesma mensagem do login comum: dizer "sua conta não é admin" confirmaria a
  // quem tentou que a senha estava certa. A tentativa fica na auditoria.
  await auditService.registrar(auditService.usuario(usuario.id), 'admin.login.recusado', {
    entidade: 'user',
    id: usuario.id,
  });
  throw new ErroAplicacao('E-mail ou senha inválidos', { status: 401, codigo: 'CREDENCIAIS_INVALIDAS' });
}

/** O que o painel mostra hoje. As métricas de verdade são a T-12.7. */
export async function resumoDoPainel() {
  const [contas, administradores] = await Promise.all([usersRepository.contar(), adminsRepository.listar()]);
  return { contas, administradores };
}
