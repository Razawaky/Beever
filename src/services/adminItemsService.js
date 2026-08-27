import { emTransacao } from '../config/database.js';
import { guardarIlustracao } from '../config/uploads.js';
import * as itemsRepository from '../repositories/itemsRepository.js';
import { erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import { comportamentosDosNumeros } from './comportamentosDoItem.js';

/**
 * Cadastro do catálogo da loja pelo administrador (RF-ADM-03).
 *
 * O comportamento econômico não é escolhido à mão: ele é **derivado dos
 * números** do item e regravado a cada salvamento. Antes desta tarefa a
 * derivação morava dentro do seed, e um CRUD que gravasse só `valuation_rate` e
 * `upkeep_cost` deixaria o mapa da RN-035 desatualizado no dia seguinte.
 */

/** Transforma o nome em slug. O administrador pode escrever o dele; isto é o padrão. */
export function slugDoNome(nome) {
  return String(nome ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Os requisitos de compra que vieram do formulário (RN-033), já sem as linhas
 * em branco. Cada tipo usa um campo diferente, e os outros vão nulos.
 */
export function requisitosDoFormulario(linhas = []) {
  return linhas
    .filter((linha) => linha && linha.tipo && linha.valor !== '' && linha.valor !== null && linha.valor !== undefined)
    .map((linha) => ({
      tipo: linha.tipo,
      nivelMinimo: linha.tipo === 'nivel-minimo' ? Number(linha.valor) : null,
      idFavo: linha.tipo === 'favo-concluido' ? Number(linha.valor) : null,
      idItem: linha.tipo === 'item-prerequisito' ? Number(linha.valor) : null,
      patrimonioMinimo: linha.tipo === 'patrimonio-minimo' ? Number(linha.valor) : null,
    }));
}

async function exigirItem(id) {
  const item = await itemsRepository.buscarParaAdmin(id);
  if (!item) throw erroNaoEncontrado('Item não encontrado');
  return item;
}

async function exigirSlugLivre(slug, idParaIgnorar = null) {
  if (await itemsRepository.slugJaUsado(slug, idParaIgnorar)) {
    throw erroValidacao('Já existe um item com este endereço');
  }
}

/** O piso não pode passar o teto: o banco recusa, e a mensagem dele não explica. */
function conferirFaixaDeValor({ pisoPercentual, tetoPercentual }) {
  if (pisoPercentual > tetoPercentual) {
    throw erroValidacao('O valor mínimo não pode ser maior que o valor máximo');
  }
}

export async function opcoesDeCadastro() {
  const [categorias, comportamentos, tiposDeRequisito, itens] = await Promise.all([
    itemsRepository.listarCategorias(),
    itemsRepository.listarComportamentosDoCatalogo(),
    itemsRepository.listarTiposDeRequisito(),
    itemsRepository.listarParaAdmin(),
  ]);
  return { categorias, comportamentos, tiposDeRequisito, itens };
}

export async function listarItens() {
  return itemsRepository.listarParaAdmin();
}

export async function detalharItem(idItem) {
  const item = await exigirItem(idItem);
  const [comportamentos, requisitos] = await Promise.all([
    itemsRepository.listarComportamentos(item.id),
    itemsRepository.listarRequisitos(item.id),
  ]);
  return { item, comportamentos, requisitos };
}

export async function criarItem(dados, ilustracao, ator) {
  const slug = dados.slug || slugDoNome(dados.nome);
  await exigirSlugLivre(slug);
  conferirFaixaDeValor(dados);

  const caminhoDaImagem = ilustracao ? await guardarIlustracao(ilustracao) : null;
  const comportamentos = comportamentosDosNumeros(dados);

  const id = await emTransacao(async (conexao) => {
    const novoId = await itemsRepository.criar({ ...dados, slug, caminhoDaImagem }, conexao);
    await itemsRepository.substituirComportamentos(novoId, comportamentos, conexao);
    await itemsRepository.substituirRequisitos(novoId, dados.requisitos, conexao);
    return novoId;
  });

  await auditService.registrar(ator, 'item.criado', {
    entidade: 'item',
    id,
    depois: { slug, nome: dados.nome, preco: dados.preco, comportamentos },
  });
  return id;
}

/**
 * Editar preço não mexe em compra passada: `purchases.price_at_purchase` guarda
 * o valor do dia, e é ele que a economia lê. O preço novo vale da próxima compra
 * em diante.
 */
export async function atualizarItem(idItem, dados, ilustracao, ator) {
  const antes = await exigirItem(idItem);
  if (dados.slug) await exigirSlugLivre(dados.slug, antes.id);
  conferirFaixaDeValor(dados);

  const caminhoDaImagem = ilustracao ? await guardarIlustracao(ilustracao) : null;
  const comportamentos = comportamentosDosNumeros(dados);

  await emTransacao(async (conexao) => {
    await itemsRepository.atualizar(antes.id, { ...dados, caminhoDaImagem }, conexao);
    await itemsRepository.substituirComportamentos(antes.id, comportamentos, conexao);
    await itemsRepository.substituirRequisitos(antes.id, dados.requisitos, conexao);
  });

  const depois = await exigirItem(antes.id);
  await auditService.registrar(ator, 'item.editado', { entidade: 'item', id: antes.id, antes, depois });
  return depois;
}

export async function definirItemAtivo(idItem, ativo, ator) {
  const item = await exigirItem(idItem);
  await itemsRepository.definirAtivo(item.id, ativo);

  await auditService.registrar(ator, ativo ? 'item.reativado' : 'item.desativado', {
    entidade: 'item',
    id: item.id,
    antes: { ativo: Boolean(item.is_active) },
    depois: { ativo },
  });
}
