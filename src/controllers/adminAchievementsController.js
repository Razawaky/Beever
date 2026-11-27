import * as adminAchievementsService from '../services/adminAchievementsService.js';
import * as auditService from '../services/auditService.js';
import { assincrono } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';
import { querJson } from '../utils/resposta.js';

/** Catálogo de conquistas pelo painel administrativo. */

const FUNDO_ADMIN = 'min-h-screen bg-cera text-tinta antialiased';

function ator(req) {
  return auditService.atorDaSessao(req.session);
}

function pagina(req, res, nome, dados) {
  return renderizarPagina(res, `admin/${nome}`, {
    classeBody: FUNDO_ADMIN,
    emailDoAdmin: req.session.email,
    ...dados,
  });
}

export const listar = assincrono(async (req, res) => {
  const conquistas = await adminAchievementsService.listar();
  const criterios = adminAchievementsService.opcoesDeCriterio();
  if (querJson(req)) return res.json(conquistas);
  pagina(req, res, 'conquistas', {
    titulo: 'Conquistas — administração do Beever',
    conquistas,
    criterios,
  });
});

export const formulario = assincrono(async (req, res) => {
  const conquista = req.params.id
    ? await adminAchievementsService.detalhar(Number(req.params.id))
    : null;

  pagina(req, res, 'conquista-formulario', {
    titulo: conquista ? 'Editar conquista — administração' : 'Nova conquista — administração',
    conquista,
    criterios: adminAchievementsService.opcoesDeCriterio(),
  });
});

export const detalhar = assincrono(async (req, res) => {
  if (!querJson(req)) return res.redirect(`/admin/conquistas/${Number(req.params.id)}/editar`);
  res.json(await adminAchievementsService.detalhar(Number(req.params.id)));
});

export const criar = assincrono(async (req, res) => {
  const id = await adminAchievementsService.criar(dadosDaConquista(req), ator(req));
  if (querJson(req)) return res.status(201).json({ id });
  res.redirect('/admin/conquistas');
});

export const atualizar = assincrono(async (req, res) => {
  const conquista = await adminAchievementsService.atualizar(
    Number(req.params.id),
    dadosDaConquista(req),
    ator(req),
  );
  if (querJson(req)) return res.json(conquista);
  res.redirect('/admin/conquistas');
});

export const alternar = assincrono(async (req, res) => {
  const ativo = req.body.ativo === 'true';
  await adminAchievementsService.definirAtivo(Number(req.params.id), ativo, ator(req));
  if (querJson(req)) return res.json({ ativo });
  res.redirect('/admin/conquistas');
});

/** Os campos do formulário, já com os números convertidos. */
function dadosDaConquista(req) {
  return {
    nome: req.body.nome,
    slug: req.body.slug || null,
    descricao: req.body.descricao,
    criterio: req.body.criterio,
    alvo: Number(req.body.alvo),
    mel: Number(req.body.mel),
  };
}
