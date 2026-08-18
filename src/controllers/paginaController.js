import * as goalsService from '../services/goalsService.js';
import * as inventoryService from '../services/inventoryService.js';
import * as itemsService from '../services/itemsService.js';
import * as profilesService from '../services/profilesService.js';
import * as tasksService from '../services/tasksService.js';
import { assincrono } from '../utils/erros.js';

/**
 * Controller só das páginas que renderizam EJS a partir de GET simples —
 * formulário e leitura, sem mudar estado. Ações que mudam dado (login,
 * cadastro, onboarding) continuam nos controllers de domínio, que também sabem
 * redirecionar em vez de só responder JSON.
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

// Quem pode ver esta tela é decidido pelo `requireOnboardingPendente` na
// rota, não por um `if` aqui dentro.
export const onboarding = (req, res) => {
  res.render('pages/onboarding', { titulo: 'Configurar perfil — Beever', perfilId: req.session.perfilId });
};

export const painel = assincrono(async (req, res) => {
  const [perfil, inventario, metas, tarefas] = await Promise.all([
    profilesService.obterDoUsuario(req.session.usuarioId),
    inventoryService.listarAgrupadoPorItem(req.session.usuarioId),
    goalsService.listarAtivas(req.session.usuarioId),
    tasksService.listarAtivas(req.session.usuarioId),
  ]);

  res.render('pages/painel', {
    titulo: `${perfil.apelido} — Beever`,
    perfil,
    inventario,
    metaPrincipal: metas[0] ?? null,
    tarefas,
  });
});

export const loja = assincrono(async (req, res) => {
  const [perfil, itens, possuidos] = await Promise.all([
    profilesService.obterDoUsuario(req.session.usuarioId),
    itemsService.listarCatalogo(),
    inventoryService.idsPossuidos(req.session.usuarioId),
  ]);

  res.render('pages/loja', { titulo: 'Loja — Beever', perfil, itens, possuidos });
});

export const metas = assincrono(async (req, res) => {
  const [listaDeMetas, tarefas, tiposDeTarefa] = await Promise.all([
    goalsService.listarDoUsuario(req.session.usuarioId),
    tasksService.listarDoUsuario(req.session.usuarioId),
    tasksService.listarTiposDisponiveis(),
  ]);

  res.render('pages/metas', {
    titulo: 'Metas — Beever',
    metas: listaDeMetas,
    tarefas,
    tiposDeTarefa,
  });
});

export const manutencao = (req, res) => {
  res.render('pages/manutencao', { titulo: 'Em manutenção — Beever' });
};
