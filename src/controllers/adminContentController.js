import * as adminContentService from '../services/adminContentService.js';
import * as atividadesDoPainel from '../services/atividadesDoPainel.js';
import * as auditService from '../services/auditService.js';
import { assincrono } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';
import { querJson } from '../utils/resposta.js';

/**
 * Cadastro de conteúdo pelo painel. Como o resto da área administrativa, as
 * telas são de trabalho: formulário, lista e nada mais.
 */

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

export const listarFavos = assincrono(async (req, res) => {
  const favos = await adminContentService.listarFavos();
  if (querJson(req)) return res.json(favos);
  pagina(req, res, 'favos', { titulo: 'Favos — administração do Beever', favos });
});

export const formularioDeFavo = assincrono(async (req, res) => {
  const opcoes = await adminContentService.opcoesDeCadastro();
  const favo = req.params.id ? (await adminContentService.detalharFavo(Number(req.params.id))).favo : null;

  pagina(req, res, 'favo-formulario', {
    titulo: favo ? 'Editar favo — administração' : 'Novo favo — administração',
    favo,
    ...opcoes,
  });
});

export const criarFavo = assincrono(async (req, res) => {
  const id = await adminContentService.criarFavo(dadosDoFavo(req), ator(req));
  if (querJson(req)) return res.status(201).json({ id });
  res.redirect(`/admin/favos/${id}`);
});

export const atualizarFavo = assincrono(async (req, res) => {
  const favo = await adminContentService.atualizarFavo(Number(req.params.id), dadosDoFavo(req), ator(req));
  if (querJson(req)) return res.json(favo);
  res.redirect(`/admin/favos/${favo.id}`);
});

export const alternarFavo = assincrono(async (req, res) => {
  const ativo = req.body.ativo === 'true';
  await adminContentService.definirFavoAtivo(Number(req.params.id), ativo, ator(req));
  if (querJson(req)) return res.json({ ativo });
  res.redirect('/admin/favos');
});

export const detalharFavo = assincrono(async (req, res) => {
  const { favo, celulas } = await adminContentService.detalharFavo(Number(req.params.id));
  if (querJson(req)) return res.json({ favo, celulas });
  pagina(req, res, 'celulas', { titulo: `${favo.title} — administração`, favo, celulas });
});

export const formularioDeCelula = assincrono(async (req, res) => {
  const opcoes = await adminContentService.opcoesDeCadastro();
  const { favo } = await adminContentService.detalharFavo(Number(req.params.id));
  const celula = req.params.idCelula
    ? (await adminContentService.detalharConteudo(Number(req.params.idCelula))).celula
    : null;

  pagina(req, res, 'celula-formulario', {
    titulo: celula ? 'Editar célula — administração' : 'Nova célula — administração',
    favo,
    celula,
    ...opcoes,
  });
});

export const criarCelula = assincrono(async (req, res) => {
  const id = await adminContentService.criarCelula(Number(req.params.id), dadosDaCelula(req), ator(req));
  if (querJson(req)) return res.status(201).json({ id });
  res.redirect(`/admin/celulas/${id}/conteudo`);
});

export const atualizarCelula = assincrono(async (req, res) => {
  const celula = await adminContentService.atualizarCelula(
    Number(req.params.idCelula),
    dadosDaCelula(req),
    ator(req),
  );
  if (querJson(req)) return res.json(celula);
  res.redirect(`/admin/favos/${celula.hive_id}`);
});

export const alternarCelula = assincrono(async (req, res) => {
  const ativa = req.body.ativa === 'true';
  await adminContentService.definirCelulaAtiva(Number(req.params.idCelula), ativa, ator(req));
  if (querJson(req)) return res.json({ ativa });
  res.redirect(`/admin/favos/${req.body.idFavo}`);
});

export const moverCelula = assincrono(async (req, res) => {
  await adminContentService.moverCelula(Number(req.params.idCelula), req.body.direcao, ator(req));
  if (querJson(req)) return res.json({ movida: true });
  res.redirect(`/admin/favos/${req.body.idFavo}`);
});

export const formularioDeConteudo = assincrono(async (req, res) => {
  const { celula, atual, versoes } = await adminContentService.detalharConteudo(Number(req.params.idCelula));
  if (querJson(req)) return res.json({ celula, atual, versoes });

  pagina(req, res, 'conteudo-formulario', {
    titulo: `Conteúdo de ${celula.title} — administração`,
    celula,
    atual,
    versoes,
    // Tipo sem formulário próprio cai direto no modo avançado, em vez de mostrar
    // uma tela vazia esperando campos que não existem.
    temFormulario: atividadesDoPainel.tiposComFormulario().includes(celula.game_type_slug),
  });
});

/**
 * Dois caminhos para a mesma gravação: os campos do formulário, que é o normal,
 * e o JSON colado, que serve para conteúdo já pronto e para tipo de jogo que
 * ainda não ganhou formulário.
 */
export const salvarConteudo = assincrono(async (req, res) => {
  const { celula } = await adminContentService.detalharConteudo(Number(req.params.idCelula));

  // O formulário sempre declara o modo. Quem manda `corpo` sem declarar nada é
  // cliente JSON, e o JSON colado é o caminho avançado — foi o único que existiu
  // até a T-12.4, e continua valendo.
  const modoAvancado = req.body.modo === 'avancado' || (!req.body.modo && typeof req.body.corpo === 'string');

  const corpo = modoAvancado
    ? adminContentService.lerCorpoJson(req.body.corpo)
    : atividadesDoPainel.montarCorpo(celula.game_type_slug, req.body);

  const versao = await adminContentService.salvarConteudo(
    celula.id,
    corpo,
    req.file?.buffer ?? null,
    ator(req),
  );

  if (querJson(req)) return res.status(201).json({ versao });
  res.redirect(`/admin/celulas/${celula.id}/conteudo`);
});

/** Os campos do formulário do favo, já com os números convertidos. */
function dadosDoFavo(req) {
  return {
    titulo: req.body.titulo,
    slug: req.body.slug || null,
    descricao: req.body.descricao || null,
    idFaixa: Number(req.body.idFaixa),
    percentualDeDesbloqueio: Number(req.body.percentualDeDesbloqueio),
  };
}

function dadosDaCelula(req) {
  return {
    titulo: req.body.titulo,
    idTipoDeJogo: Number(req.body.idTipoDeJogo),
    idFaixa: Number(req.body.idFaixa),
    segundosEstimados: Number(req.body.segundosEstimados),
  };
}
