import * as adminsRepository from '../repositories/adminsRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import { ErroAplicacao, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
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

/**
 * Promove ou rebaixa uma conta (RN-051, RN-052).
 *
 * Ninguém rebaixa a si mesmo: quem faz isso perde o painel na próxima entrada e,
 * se for o último administrador, tranca a área para todo mundo. Recusar aqui é
 * mais barato do que reabrir por SQL depois.
 *
 * A mudança só vale na próxima entrada de quem foi rebaixado, porque o papel é
 * lido no login e guardado na sessão (dívida DT-82). O aviso está na tela.
 */
export async function definirAdministrador(idUsuario, deveSerAdmin, ator) {
  if (!deveSerAdmin && Number(idUsuario) === Number(ator.id)) {
    throw erroValidacao('Você não pode tirar o seu próprio acesso de administrador');
  }

  const usuario = await usersRepository.buscarPorId(idUsuario);
  if (!usuario) throw erroNaoEncontrado('Conta não encontrada');

  const eraAdmin = await adminsRepository.ehAdministrador(idUsuario);
  if (deveSerAdmin) await adminsRepository.promover(idUsuario);
  else await adminsRepository.rebaixar(idUsuario);

  await auditService.registrar(ator, deveSerAdmin ? 'admin.promovido' : 'admin.rebaixado', {
    entidade: 'user',
    id: Number(idUsuario),
    antes: { ehAdmin: eraAdmin },
    depois: { ehAdmin: deveSerAdmin },
  });
}
