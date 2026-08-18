import * as goalsService from '../services/goalsService.js';
import * as inventoryService from '../services/inventoryService.js';
import * as itemsService from '../services/itemsService.js';
import * as profilesService from '../services/profilesService.js';
import * as tasksService from '../services/tasksService.js';
import { assincrono } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';

/**
 * Controller só das páginas que renderizam EJS a partir de GET simples —
 * formulário e leitura, sem mudar estado. Ações que mudam dado (login,
 * cadastro, onboarding) continuam nos controllers de domínio, que também sabem
 * redirecionar em vez de só responder JSON.
 *
 * O esqueleto da página (doctype, head, cabeçalho, rodapé) mora no layout: aqui
 * só se diz qual página, com quais dados, e o que ela tem de diferente do
 * padrão — a cor de fundo, um script, um cabeçalho.
 */

const FUNDO_CERA = 'min-h-screen bg-cera text-tinta antialiased';

function redirecionarLogado(req, res) {
  res.redirect(req.session.onboardingConcluido ? '/painel' : '/onboarding');
}

export const login = (req, res) => {
  if (req.session?.usuarioId) return redirecionarLogado(req, res);
  renderizarPagina(res, 'login', { titulo: 'Entrar — Beever' });
};

export const cadastro = (req, res) => {
  if (req.session?.usuarioId) return redirecionarLogado(req, res);
  renderizarPagina(res, 'cadastro', {
    titulo: 'Criar conta — Beever',
    scripts: ['/js/cadastro.js'],
  });
};

// Quem pode ver esta tela é decidido pelo `requireOnboardingPendente` na rota,
// não por um `if` aqui dentro.
export const onboarding = (req, res) => {
  renderizarPagina(res, 'onboarding', {
    titulo: 'Configurar perfil — Beever',
    classeBody: 'flex min-h-screen flex-col items-center justify-center bg-cera p-4 text-tinta antialiased',
    // O wizard é montado em JavaScript e lê estes dois do `dataset` do body.
    dadosBody: { 'perfil-id': req.session.perfilId, 'csrf-token': res.locals.csrfToken },
    scripts: ['/js/onboarding.js'],
  });
};

export const painel = assincrono(async (req, res) => {
  await tasksService.garantirTarefasDoDia(req.session.usuarioId);
  await goalsService.sincronizarProgresso(req.session.usuarioId);

  const [perfil, inventario, metas, tarefas] = await Promise.all([
    profilesService.obterDoUsuario(req.session.usuarioId),
    inventoryService.listarAgrupadoPorItem(req.session.usuarioId),
    goalsService.listarAtivas(req.session.usuarioId),
    tasksService.listarAtivas(req.session.usuarioId),
  ]);

  renderizarPagina(res, 'painel', {
    titulo: `${perfil.apelido} — Beever`,
    classeBody: 'min-h-screen bg-cera py-10 text-tinta antialiased',
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

  renderizarPagina(res, 'loja', { titulo: 'Loja — Beever', classeBody: FUNDO_CERA, perfil, itens, possuidos });
});

export const metas = assincrono(async (req, res) => {
  // As tarefas do dia nascem aqui, quando o jogador entra — geração *lazy*, como
  // o ciclo econômico —, e o progresso das metas é relido das fontes reais antes
  // de a tela mostrar qualquer número.
  await tasksService.garantirTarefasDoDia(req.session.usuarioId);
  await goalsService.sincronizarProgresso(req.session.usuarioId);

  const [listaDeMetas, tarefas] = await Promise.all([
    goalsService.listarDoUsuario(req.session.usuarioId),
    tasksService.listarDoUsuario(req.session.usuarioId),
  ]);

  renderizarPagina(res, 'metas', {
    titulo: 'Metas — Beever',
    classeBody: FUNDO_CERA,
    metas: listaDeMetas,
    tarefas,
  });
});

export const manutencao = (req, res) => {
  renderizarPagina(res, 'manutencao', {
    titulo: 'Em manutenção — Beever',
    classeBody: 'flex min-h-screen flex-col items-center justify-center bg-breu p-6 text-center antialiased',
  });
};
