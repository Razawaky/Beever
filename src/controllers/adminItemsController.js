import * as adminItemsService from '../services/adminItemsService.js';
import * as auditService from '../services/auditService.js';
import { assincrono } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';
import { querJson } from '../utils/resposta.js';

/** Catálogo da loja pelo painel administrativo. */

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
  const itens = await adminItemsService.listarItens();
  if (querJson(req)) return res.json(itens);
  pagina(req, res, 'itens', { titulo: 'Itens — administração do Beever', itens });
});

export const formulario = assincrono(async (req, res) => {
  const opcoes = await adminItemsService.opcoesDeCadastro();
  const detalhe = req.params.id ? await adminItemsService.detalharItem(Number(req.params.id)) : null;

  pagina(req, res, 'item-formulario', {
    titulo: detalhe ? 'Editar item — administração' : 'Novo item — administração',
    item: detalhe?.item ?? null,
    requisitosDoItem: detalhe?.requisitos ?? [],
    ...opcoes,
  });
});

/**
 * O item em JSON. Quem chega por navegador vai para o formulário: era a única
 * rota da área sem representação HTML, e responder JSON cru a um clique é o tipo
 * de ponta solta que ninguém percebe até acontecer.
 */
export const detalhar = assincrono(async (req, res) => {
  if (!querJson(req)) return res.redirect(`/admin/itens/${Number(req.params.id)}/editar`);

  const detalhe = await adminItemsService.detalharItem(Number(req.params.id));
  res.json(detalhe);
});

export const criar = assincrono(async (req, res) => {
  const id = await adminItemsService.criarItem(dadosDoItem(req), req.file?.buffer ?? null, ator(req));
  if (querJson(req)) return res.status(201).json({ id });
  res.redirect('/admin/itens');
});

export const atualizar = assincrono(async (req, res) => {
  const item = await adminItemsService.atualizarItem(
    Number(req.params.id),
    dadosDoItem(req),
    req.file?.buffer ?? null,
    ator(req),
  );
  if (querJson(req)) return res.json(item);
  res.redirect('/admin/itens');
});

export const alternar = assincrono(async (req, res) => {
  const ativo = req.body.ativo === 'true';
  await adminItemsService.definirItemAtivo(Number(req.params.id), ativo, ator(req));
  if (querJson(req)) return res.json({ ativo });
  res.redirect('/admin/itens');
});

/**
 * Os campos do formulário, já com os números convertidos. Os requisitos chegam
 * como listas paralelas — `requisitoTipo[]` e `requisitoValor[]` —, que é o que
 * um formulário HTML com várias linhas produz.
 */
function dadosDoItem(req) {
  const tipos = [].concat(req.body.requisitoTipo ?? []);
  const valores = [].concat(req.body.requisitoValor ?? []);
  const linhas = tipos.map((tipo, indice) => ({ tipo, valor: valores[indice] }));

  return {
    nome: req.body.nome,
    slug: req.body.slug || null,
    descricaoInfantil: req.body.descricaoInfantil,
    idCategoria: Number(req.body.idCategoria),
    preco: Number(req.body.preco),
    contaNoPatrimonio: req.body.contaNoPatrimonio === 'on' || req.body.contaNoPatrimonio === 'true',
    taxaDeValorizacao: Number(req.body.taxaDeValorizacao),
    pisoPercentual: Number(req.body.pisoPercentual),
    tetoPercentual: Number(req.body.tetoPercentual),
    custoFixo: Number(req.body.custoFixo),
    rendaPorCiclo: Number(req.body.rendaPorCiclo),
    idItemDeOrigem: req.body.idItemDeOrigem ? Number(req.body.idItemDeOrigem) : null,
    ehConsumivel: req.body.ehConsumivel === 'on' || req.body.ehConsumivel === 'true',
    requisitos: adminItemsService.requisitosDoFormulario(linhas),
  };
}
