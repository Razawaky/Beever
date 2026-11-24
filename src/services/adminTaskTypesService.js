import * as tasksRepository from '../repositories/tasksRepository.js';
import { erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import { slugDeTexto } from '../utils/slug.js';
import * as auditService from './auditService.js';
import { fontesMensuraveis } from './taskProgressSources.js';

/**
 * Cadastro do catálogo de tipos de tarefa pelo administrador.
 *
 * O gerador não inventa tarefa: ele lê este catálogo, escolhe um tipo por dia e
 * congela alvo e recompensa na linha da tarefa. Aqui o painel só escreve o
 * catálogo — quem credita mel e pólen continua sendo o serviço do jogador.
 *
 * Escopo e fonte são listas fechadas: um tipo que ninguém sabe medir nunca
 * poderia ser cumprido. Não existe exclusão física porque `tasks` aponta para o
 * tipo com ON DELETE RESTRICT; a baixa é lógica, por `is_active`.
 */

const ESCOPOS = {
  diaria: 'Diária',
  semanal: 'Semanal',
};

export const ESCOPOS_DE_TAREFA = Object.keys(ESCOPOS);

const ROTULOS_DE_FONTE = {
  cell_completed: 'Células concluídas',
  active_days: 'Dias jogados',
  hive_completed: 'Favos concluídos',
  vault_deposit: 'Mel depositado no cofre',
};

function texto(valor) {
  return String(valor ?? '').trim();
}

/** Opções dos `<select>` do formulário, na mesma ordem das listas aceitas. */
export function opcoesDeEscopo() {
  return Object.entries(ESCOPOS).map(([slug, nome]) => ({ slug, nome }));
}

export function opcoesDeFonte() {
  return fontesMensuraveis().map((slug) => ({ slug, nome: ROTULOS_DE_FONTE[slug] ?? slug }));
}

async function exigirTipo(id) {
  const tipo = await tasksRepository.buscarTipoParaAdmin(id);
  if (!tipo) throw erroNaoEncontrado('Tipo de tarefa não encontrado');
  return tipo;
}

function exigirFonteConhecida(fonte) {
  if (!fontesMensuraveis().includes(fonte)) {
    throw erroValidacao('Escolha uma fonte de progresso que o sistema sabe medir');
  }
}

async function exigirSlugLivre(slug, idParaIgnorar = null) {
  if (await tasksRepository.slugTipoJaUsado(slug, idParaIgnorar)) {
    throw erroValidacao('Já existe um tipo de tarefa com este endereço');
  }
}

/** No formulário em branco, o endereço vem do nome — mesma regra dos itens. */
async function slugPara(dados, nome, idParaIgnorar = null, manterAtual = false) {
  const informado = texto(dados.slug);
  if (manterAtual && !informado) return null;

  const slug = informado || slugDeTexto(nome);
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw erroValidacao('Endereço inválido: use letras sem acento, números e hífen');
  }
  await exigirSlugLivre(slug, idParaIgnorar);
  return slug;
}

function normalizar(dados) {
  const nome = texto(dados.nome);
  const escopo = texto(dados.escopo);
  const fonte = texto(dados.fonte);
  const alvo = Number(dados.alvo);
  const polen = Number(dados.polen);
  const mel = Number(dados.mel);

  if (!nome) throw erroValidacao('Informe o nome da tarefa');
  if (!ESCOPOS_DE_TAREFA.includes(escopo)) throw erroValidacao('Escolha diária ou semanal');
  exigirFonteConhecida(fonte);

  if (!Number.isInteger(alvo) || alvo < 1) {
    throw erroValidacao('O alvo deve ser um número inteiro a partir de 1');
  }
  if (!Number.isInteger(polen) || polen < 0) {
    throw erroValidacao('O pólen não pode ser negativo');
  }
  if (!Number.isInteger(mel) || mel < 0) {
    throw erroValidacao('O mel não pode ser negativo');
  }

  return { nome, escopo, fonte, alvo, polen, mel };
}

export async function listar() {
  return tasksRepository.listarTiposParaAdmin();
}

export async function detalhar(id) {
  return exigirTipo(id);
}

export async function criar(dados, ator) {
  const normalizado = normalizar(dados);
  const slug = await slugPara(dados, normalizado.nome);

  const id = await tasksRepository.criarTipo({ ...normalizado, slug });
  await auditService.registrar(ator, 'tarefa-tipo.criada', {
    entidade: 'task_type',
    id,
    depois: { slug, ...normalizado },
  });
  return id;
}

export async function atualizar(id, dados, ator) {
  const antes = await exigirTipo(id);
  const normalizado = normalizar(dados);
  const slug = await slugPara(dados, normalizado.nome, antes.id, true);

  await tasksRepository.atualizarTipo(antes.id, { ...normalizado, slug });
  const depois = await exigirTipo(antes.id);
  await auditService.registrar(ator, 'tarefa-tipo.editada', {
    entidade: 'task_type',
    id: antes.id,
    antes,
    depois,
  });
  return depois;
}

export async function definirAtivo(id, ativo, ator) {
  const antes = await exigirTipo(id);
  await tasksRepository.definirTipoAtivo(id, ativo);

  await auditService.registrar(ator, ativo ? 'tarefa-tipo.reativada' : 'tarefa-tipo.desativada', {
    entidade: 'task_type',
    id,
    antes: { ativo: Boolean(antes.is_active) },
    depois: { ativo },
  });
}
