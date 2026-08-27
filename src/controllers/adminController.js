import * as adminService from '../services/adminService.js';
import * as auditService from '../services/auditService.js';
import * as usersService from '../services/usersService.js';
import { assincrono } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';
import { querJson } from '../utils/resposta.js';
import { iniciarSessaoLogin } from '../utils/sessaoLogin.js';

/**
 * Área administrativa. As telas não usam a casca do jogo: a navegação e a
 * paleta são de trabalho, não de criança.
 */

const FUNDO_ADMIN = 'min-h-screen bg-cera text-tinta antialiased';

export const paginaDeLogin = (req, res) => {
  if (req.session?.ehAdmin) return res.redirect('/admin');
  renderizarPagina(res, 'admin/login', {
    titulo: 'Entrar — administração do Beever',
    classeBody: FUNDO_ADMIN,
  });
};

export const login = assincrono(async (req, res) => {
  const { email, senha } = req.body;
  const admin = await adminService.autenticarAdmin({ email, senha });

  await iniciarSessaoLogin(req, {
    usuarioId: admin.id,
    email: admin.email,
    ehAdmin: admin.ehAdmin,
    perfilId: admin.perfilId,
    onboardingConcluido: admin.onboardingConcluido,
  });

  if (querJson(req)) return res.json(admin);
  res.redirect('/admin');
});

export const painel = assincrono(async (req, res) => {
  const resumo = await adminService.resumoDoPainel();
  if (querJson(req)) return res.json(resumo);

  renderizarPagina(res, 'admin/painel', {
    titulo: 'Administração — Beever',
    classeBody: FUNDO_ADMIN,
    emailDoAdmin: req.session.email,
    resumo,
  });
});

export const usuarios = assincrono(async (req, res) => {
  const contas = await usersService.listar();
  if (querJson(req)) return res.json(contas);

  renderizarPagina(res, 'admin/usuarios', {
    titulo: 'Contas — administração do Beever',
    classeBody: FUNDO_ADMIN,
    emailDoAdmin: req.session.email,
    contas,
  });
});

export const definirAdministrador = assincrono(async (req, res) => {
  const deveSerAdmin = req.body.ehAdmin === 'true';
  await adminService.definirAdministrador(Number(req.params.id), deveSerAdmin, auditService.atorDaSessao(req.session));

  if (querJson(req)) return res.json({ ehAdmin: deveSerAdmin });
  res.redirect('/admin/usuarios');
});
