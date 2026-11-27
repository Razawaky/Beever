import * as adminTaskTypesService from '../services/adminTaskTypesService.js';
import * as auditService from '../services/auditService.js';
import { assincrono } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';
import { querJson } from '../utils/resposta.js';

/** Catálogo de tipos de tarefa pelo painel administrativo. */

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
  const tarefas = await adminTaskTypesService.listar();
  if (querJson(req)) return res.json(tarefas);
  pagina(req, res, 'tarefas', {
    titulo: 'Tarefas — administração do Beever',
    tarefas,
    escopos: adminTaskTypesService.opcoesDeEscopo(),
    fontes: adminTaskTypesService.opcoesDeFonte(),
  });
});

export const formulario = assincrono(async (req, res) => {
  const tarefa = req.params.id
    ? await adminTaskTypesService.detalhar(Number(req.params.id))
    : null;

  pagina(req, res, 'tarefa-formulario', {
    titulo: tarefa ? 'Editar tarefa — administração' : 'Nova tarefa — administração',
    tarefa,
    escopos: adminTaskTypesService.opcoesDeEscopo(),
    fontes: adminTaskTypesService.opcoesDeFonte(),
  });
});

export const detalhar = assincrono(async (req, res) => {
  if (!querJson(req)) return res.redirect(`/admin/tarefas/${Number(req.params.id)}/editar`);
  res.json(await adminTaskTypesService.detalhar(Number(req.params.id)));
});

export const criar = assincrono(async (req, res) => {
  const id = await adminTaskTypesService.criar(dadosDaTarefa(req), ator(req));
  if (querJson(req)) return res.status(201).json({ id });
  res.redirect('/admin/tarefas');
});

export const atualizar = assincrono(async (req, res) => {
  const tarefa = await adminTaskTypesService.atualizar(
    Number(req.params.id),
    dadosDaTarefa(req),
    ator(req),
  );
  if (querJson(req)) return res.json(tarefa);
  res.redirect('/admin/tarefas');
});

export const alternar = assincrono(async (req, res) => {
  const ativo = req.body.ativo === 'true';
  await adminTaskTypesService.definirAtivo(Number(req.params.id), ativo, ator(req));
  if (querJson(req)) return res.json({ ativo });
  res.redirect('/admin/tarefas');
});

/** Os campos do formulário, já com os números convertidos. */
function dadosDaTarefa(req) {
  return {
    nome: req.body.nome,
    slug: req.body.slug || null,
    escopo: req.body.escopo,
    fonte: req.body.fonte,
    alvo: Number(req.body.alvo),
    polen: Number(req.body.polen),
    mel: Number(req.body.mel),
  };
}
