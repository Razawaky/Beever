import { emTransacao } from '../config/database.js';
import * as cellsRepository from '../repositories/cellsRepository.js';
import * as contentsRepository from '../repositories/contentsRepository.js';
import * as hivesRepository from '../repositories/hivesRepository.js';
import * as profilesRepository from '../repositories/profilesRepository.js';
import { erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import { conferirForma } from './validadoresDeJogo.js';

/**
 * Cadastro de favo, célula e conteúdo pelo administrador (RF-ADM-02).
 *
 * Nada aqui apaga: favo e célula saem por `is_active`, porque `cell_progress` e
 * as partidas apontam para eles e o progresso já pago não pode sumir. Como as
 * consultas da trilha já filtram o ativo, desativar basta para o jogador parar
 * de ver a célula sem perder o que ganhou nela.
 */

// A ordem é UNIQUE por favo, então trocar duas células exige um valor de
// passagem. 65535 é o teto do SMALLINT UNSIGNED, longe de qualquer trilha real.
const ORDEM_DE_PASSAGEM = 65535;

const DURACAO_PADRAO_EM_SEGUNDOS = 300;

/**
 * Transforma o título em slug: minúsculas, sem acento e com hífen no lugar do
 * espaço. O administrador pode escrever o slug à mão; isto é só o padrão.
 */
export function slugDoTitulo(titulo) {
  return String(titulo ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Lê o JSON do formulário e recusa o que nem sintaxe tem. */
export function lerCorpoJson(texto) {
  try {
    return JSON.parse(texto);
  } catch (erro) {
    throw erroValidacao(`O conteúdo não é um JSON válido: ${erro.message}`);
  }
}

async function exigirFavo(id) {
  const favo = await hivesRepository.buscarParaAdmin(id);
  if (!favo) throw erroNaoEncontrado('Favo não encontrado');
  return favo;
}

async function exigirCelula(id) {
  const celula = await cellsRepository.buscarParaAdmin(id);
  if (!celula) throw erroNaoEncontrado('Célula não encontrada');
  return celula;
}

async function exigirSlugLivre(slug, idParaIgnorar = null) {
  if (await hivesRepository.slugJaUsado(slug, idParaIgnorar)) {
    throw erroValidacao('Já existe um favo com este endereço');
  }
}

/** O que os formulários precisam para montar as listas de escolha. */
export async function opcoesDeCadastro() {
  const [faixas, tiposDeJogo] = await Promise.all([
    profilesRepository.listarFaixasEtarias(),
    cellsRepository.listarTiposDeJogo(),
  ]);
  return { faixas, tiposDeJogo };
}

export async function listarFavos() {
  return hivesRepository.listarParaAdmin();
}

export async function detalharFavo(idFavo) {
  const favo = await exigirFavo(idFavo);
  const celulas = await cellsRepository.listarDoFavoParaAdmin(favo.id);
  return { favo, celulas };
}

export async function criarFavo(dados, ator) {
  const slug = dados.slug || slugDoTitulo(dados.titulo);
  await exigirSlugLivre(slug);

  const ordem = (await hivesRepository.ultimaOrdemDaFaixa(dados.idFaixa)) + 1;
  const id = await hivesRepository.criar({ ...dados, slug, ordem });

  await auditService.registrar(ator, 'favo.criado', {
    entidade: 'hive',
    id,
    depois: { slug, titulo: dados.titulo, faixa: dados.idFaixa, ordem },
  });
  return id;
}

export async function atualizarFavo(idFavo, dados, ator) {
  const antes = await exigirFavo(idFavo);
  if (dados.slug) await exigirSlugLivre(dados.slug, antes.id);

  await hivesRepository.atualizar(antes.id, dados);
  const depois = await exigirFavo(antes.id);

  await auditService.registrar(ator, 'favo.editado', { entidade: 'hive', id: antes.id, antes, depois });
  return depois;
}

export async function definirFavoAtivo(idFavo, ativo, ator) {
  const favo = await exigirFavo(idFavo);
  await hivesRepository.definirAtivo(favo.id, ativo);

  await auditService.registrar(ator, ativo ? 'favo.reativado' : 'favo.desativado', {
    entidade: 'hive',
    id: favo.id,
    antes: { ativo: Boolean(favo.is_active) },
    depois: { ativo },
  });
}

export async function criarCelula(idFavo, dados, ator) {
  const favo = await exigirFavo(idFavo);
  const ordem = (await cellsRepository.ultimaOrdemDoFavo(favo.id)) + 1;

  const id = await cellsRepository.criar({
    idFavo: favo.id,
    idTipoDeJogo: dados.idTipoDeJogo,
    idFaixa: dados.idFaixa,
    ordem,
    titulo: dados.titulo,
    segundosEstimados: dados.segundosEstimados ?? DURACAO_PADRAO_EM_SEGUNDOS,
  });

  await auditService.registrar(ator, 'celula.criada', {
    entidade: 'cell',
    id,
    depois: { favo: favo.id, titulo: dados.titulo, ordem },
  });
  return id;
}

export async function atualizarCelula(idCelula, dados, ator) {
  const antes = await exigirCelula(idCelula);
  await cellsRepository.atualizar(antes.id, dados);
  const depois = await exigirCelula(antes.id);

  await auditService.registrar(ator, 'celula.editada', { entidade: 'cell', id: antes.id, antes, depois });
  return depois;
}

export async function definirCelulaAtiva(idCelula, ativa, ator) {
  const celula = await exigirCelula(idCelula);
  await cellsRepository.definirAtivo(celula.id, ativa);

  await auditService.registrar(ator, ativa ? 'celula.reativada' : 'celula.desativada', {
    entidade: 'cell',
    id: celula.id,
    antes: { ativa: Boolean(celula.is_active) },
    depois: { ativa },
  });
}

/**
 * Move a célula uma posição para cima ou para baixo trocando o `order_index`
 * com a vizinha. A troca passa por um valor livre porque a ordem é UNIQUE
 * dentro do favo: o caminho direto esbarraria nela no meio da operação.
 */
export async function moverCelula(idCelula, direcao, ator) {
  const celula = await exigirCelula(idCelula);
  const vizinha = await cellsRepository.buscarVizinha(celula.hive_id, celula.order_index, direcao);
  if (!vizinha) throw erroValidacao('A célula já está na ponta do favo');

  await emTransacao(async (conexao) => {
    await cellsRepository.definirOrdem(celula.id, ORDEM_DE_PASSAGEM, conexao);
    await cellsRepository.definirOrdem(vizinha.id, celula.order_index, conexao);
    await cellsRepository.definirOrdem(celula.id, vizinha.order_index, conexao);
  });

  await auditService.registrar(ator, 'celula.reordenada', {
    entidade: 'cell',
    id: celula.id,
    antes: { ordem: celula.order_index },
    depois: { ordem: vizinha.order_index },
  });
}

export async function detalharConteudo(idCelula) {
  const celula = await exigirCelula(idCelula);
  const [atual, versoes] = await Promise.all([
    contentsRepository.buscarAtualDaCelula(celula.id),
    contentsRepository.listarVersoesDaCelula(celula.id),
  ]);
  return { celula, atual, versoes };
}

/**
 * Grava o conteúdo como uma versão nova, depois de o validador do tipo de jogo
 * dizer que ele é jogável. Sem esse portão, o painel cadastraria pergunta sem
 * alternativa e o erro só apareceria na cara da criança.
 */
export async function salvarConteudo(idCelula, corpo, ator) {
  const celula = await exigirCelula(idCelula);
  conferirForma(celula.game_type_slug, corpo);

  const versao = (await contentsRepository.ultimaVersaoDaCelula(celula.id)) + 1;

  await emTransacao(async (conexao) => {
    await contentsRepository.criarVersao(celula.id, versao, corpo, conexao);
    await contentsRepository.desativarVersoesAnteriores(celula.id, versao, conexao);
  });

  await auditService.registrar(ator, 'conteudo.publicado', {
    entidade: 'content',
    id: celula.id,
    depois: { celula: celula.id, versao, tipo: celula.game_type_slug },
  });
  return versao;
}
