import * as authService from '../services/authService.js';
import { assincrono } from '../utils/erros.js';

export const login = assincrono(async (req, res) => {
  const { email, senha } = req.body;
  const usuario = await authService.autenticar({ email, senha });

  // Troca o id da sessão no login, pra ninguém conseguir "plantar" um id
  // conhecido na vítima antes dela logar e depois assumir a conta com ele.
  await new Promise((resolve, reject) => {
    req.session.regenerate((erro) => (erro ? reject(erro) : resolve()));
  });

  req.session.usuarioId = usuario.id;
  req.session.email = usuario.email;
  req.session.ehAdmin = usuario.ehAdmin;
  req.session.perfilId = usuario.perfilId;

  res.json(usuario);
});

export const logout = assincrono(async (req, res) => {
  const { usuarioId, ehAdmin } = req.session;
  await authService.registrarLogout(usuarioId, ehAdmin);

  // Promissificado de propósito: um throw dentro do callback do destroy ficaria
  // fora da cadeia de promises e nunca chegaria ao handler global de erros.
  await new Promise((resolve, reject) => {
    req.session.destroy((erro) => (erro ? reject(erro) : resolve()));
  });

  res.clearCookie('beever.sid');
  res.json({ mensagem: 'Logout realizado com sucesso' });
});

export const sessaoAtual = (req, res) => {
  res.json({
    autenticado: true,
    usuarioId: req.session.usuarioId,
    perfilId: req.session.perfilId,
    ehAdmin: Boolean(req.session.ehAdmin),
  });
};
