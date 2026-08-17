import * as inventarioService from '../services/inventarioService.js';
import * as itemService from '../services/itemService.js';
import * as metaService from '../services/metaService.js';
import * as perfilService from '../services/perfilService.js';
import { assincrono } from '../utils/erros.js';

/**
 * Controller só das páginas que renderizam EJS a partir de GET simples —
 * formulário e leitura, sem mudar estado. Ações que mudam dado (login,
 * cadastro, onboarding) continuam nos controllers de domínio, que agora
 * também sabem redirecionar em vez de só responder JSON.
 */

function redirecionarLogado(req, res) {
  res.redirect(req.session.onboardingConcluido ? '/painel' : '/onboarding');
}

export const login = (req, res) => {
  if (req.session?.usuarioId) return redirecionarLogado(req, res);
  res.render('pages/login', { titulo: 'Entrar — Beever' });
};

export const cadastro = (req, res) => {
  if (req.session?.usuarioId) return redirecionarLogado(req, res);
  res.render('pages/cadastro', { titulo: 'Criar conta — Beever' });
};

export const onboarding = (req, res) => {
  if (req.session.onboardingConcluido) return res.redirect('/painel');
  res.render('pages/onboarding', { titulo: 'Configurar perfil — Beever', perfilId: req.session.perfilId });
};

export const painel = assincrono(async (req, res) => {
  if (!req.session.onboardingConcluido) return res.redirect('/onboarding');
  const [perfil, inventario, metasDoPerfil] = await Promise.all([
    perfilService.obterDoUsuario(req.session.usuarioId),
    inventarioService.listarDoPerfil(req.session.perfilId),
    metaService.listarDoPerfil(req.session.perfilId),
  ]);
  res.render('pages/painel', { titulo: `${perfil.apelido} — Beever`, perfil, inventario, metaPrincipal: metasDoPerfil[0] ?? null });
});

export const loja = assincrono(async (req, res) => {
  const [perfil, itens, inventario] = await Promise.all([
    perfilService.obterDoUsuario(req.session.usuarioId),
    itemService.listarCatalogo(),
    inventarioService.listarDoPerfil(req.session.perfilId),
  ]);

  const possuidos = new Set(inventario.map((linha) => linha.id_item));

  res.render('pages/loja', { titulo: 'Loja — Beever', perfil, itens, possuidos });
});

export const manutencao = (req, res) => {
  res.render('pages/manutencao', { titulo: 'Em manutenção — Beever' });
};
