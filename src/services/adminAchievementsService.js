import * as achievementsRepository from '../repositories/achievementsRepository.js';
import { erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import { slugDeTexto } from '../utils/slug.js';
import * as auditService from './auditService.js';
import { CRITERIOS, exigirCriterioConhecido } from './criteriosDeConquista.js';

/**
 * Cadastro do catálogo de conquistas pelo administrador.
 *
 * A regra de desbloqueio não é inventada aqui: `criterion_type` só aceita um dos
 * critérios que o sistema sabe medir, e `criterion_target` é o número a partir
 * do qual a conquista vale. O bônus continua sendo creditado no servidor, dentro
 * de `achievementsService`, quando o evento acontece — o painel só escreve o
 * catálogo.
 *
 * Não existe exclusão física: `user_achievements` aponta para a conquista com
 * ON DELETE RESTRICT, e apagar apagaria o histórico de quem já a desbloqueou. A
 * baixa é lógica, por `is_active`, igual à dos itens da loja.
 */

function texto(valor) {
  return String(valor ?? '').trim();
}

/** Os critérios disponíveis no `<select>` do formulário. */
export function opcoesDeCriterio() {
  return Object.entries(CRITERIOS).map(([slug, nome]) => ({ slug, nome }));
}

async function exigirConquista(id) {
  const conquista = await achievementsRepository.buscarParaAdmin(id);
  if (!conquista) throw erroNaoEncontrado('Conquista não encontrada');
  return conquista;
}

async function exigirSlugLivre(slug, idParaIgnorar = null) {
  if (await achievementsRepository.slugJaUsado(slug, idParaIgnorar)) {
    throw erroValidacao('Já existe uma conquista com este endereço');
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
  const descricao = texto(dados.descricao);
  const criterio = texto(dados.criterio);
  const alvo = Number(dados.alvo);
  const mel = Number(dados.mel);

  if (!nome) throw erroValidacao('Informe o nome da conquista');
  if (!descricao) throw erroValidacao('Explique a conquista');
  exigirCriterioConhecido(criterio);

  if (!Number.isInteger(alvo) || alvo < 1) {
    throw erroValidacao('O alvo deve ser um número inteiro a partir de 1');
  }
  if (!Number.isInteger(mel) || mel < 0) {
    throw erroValidacao('O bônus em mel não pode ser negativo');
  }

  return { nome, descricao, criterio, alvo, mel };
}

export async function listar() {
  return achievementsRepository.listarParaAdmin();
}

export async function detalhar(id) {
  return exigirConquista(id);
}

export async function criar(dados, ator) {
  const normalizado = normalizar(dados);
  const slug = await slugPara(dados, normalizado.nome);

  const id = await achievementsRepository.criar({ ...normalizado, slug });
  await auditService.registrar(ator, 'conquista.criada', {
    entidade: 'conquista',
    id,
    depois: { slug, ...normalizado },
  });
  return id;
}

export async function atualizar(id, dados, ator) {
  const antes = await exigirConquista(id);
  const normalizado = normalizar(dados);
  const slug = await slugPara(dados, normalizado.nome, antes.id, true);

  await achievementsRepository.atualizar(antes.id, { ...normalizado, slug });
  const depois = await exigirConquista(antes.id);
  await auditService.registrar(ator, 'conquista.editada', {
    entidade: 'conquista',
    id: antes.id,
    antes,
    depois,
  });
  return depois;
}

export async function definirAtivo(id, ativo, ator) {
  const antes = await exigirConquista(id);
  await achievementsRepository.definirAtivo(id, ativo);

  await auditService.registrar(ator, ativo ? 'conquista.reativada' : 'conquista.desativada', {
    entidade: 'conquista',
    id,
    antes: { ativo: Boolean(antes.is_active) },
    depois: { ativo },
  });
}
