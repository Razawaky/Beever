import * as authService from '../services/authService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';
import { encerrarSessao, iniciarSessaoLogin } from '../utils/sessaoLogin.js';

export const login = assincrono(async (req, res) => {
  const { email, senha } = req.body;
  const usuario = await authService.autenticar({ email, senha });

  await iniciarSessaoLogin(req, {
    usuarioId: usuario.id,
    contaUsuarioId: usuario.contaUsuarioId,
    email: usuario.email,
    ehAdmin: usuario.ehAdmin,
    perfilId: usuario.perfilId,
    onboardingConcluido: usuario.onboardingConcluido,
  });

  if (querJson(req)) return res.json(usuario);
  res.redirect(usuario.onboardingConcluido ? '/perfis' : '/onboarding');
});

export const logout = assincrono(async (req, res) => {
  const { usuarioId, ehAdmin } = req.session;
  await authService.registrarLogout(usuarioId, ehAdmin);

  await encerrarSessao(req);

  res.clearCookie('beever.sid');
  if (querJson(req)) return res.json({ mensagem: 'Logout realizado com sucesso' });
  res.redirect('/');
});

export const sessaoAtual = (req, res) => {
  res.json({
    autenticado: true,
    usuarioId: req.session.usuarioId,
    contaUsuarioId: req.session.contaUsuarioId ?? req.session.usuarioId,
    perfilId: req.session.perfilId,
    ehAdmin: Boolean(req.session.ehAdmin),
  });
};
