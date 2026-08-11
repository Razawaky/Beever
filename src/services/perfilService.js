import * as auditoriaRepository from '../repositories/auditoriaRepository.js';
import * as nivelRepository from '../repositories/nivelRepository.js';
import * as perfilRepository from '../repositories/perfilRepository.js';
import * as nivelService from './nivelService.js';
import { erroAcessoNegado, erroNaoEncontrado } from '../utils/erros.js';

/**
 * Regra de negócio do perfil do jogador.
 *
 * Perfil é 1:1 com usuário, então não há listagem nem seleção: cada conta tem
 * exatamente um. A checagem de posse continua existindo — trocada da comparação
 * manual de `id_user` que se repetia em cada rota para um único ponto aqui.
 */

export async function obterDoUsuario(idUsuario) {
  const perfil = await perfilRepository.buscarPorUsuario(idUsuario);
  if (!perfil) throw erroNaoEncontrado('Perfil não encontrado');

  const nivel = await nivelRepository.buscarPorPerfil(perfil.id);
  return { ...perfil, nivel: nivel ?? null };
}

async function exigirPosse(idPerfil, idUsuario) {
  const perfil = await perfilRepository.buscarPorId(idPerfil);
  if (!perfil) throw erroNaoEncontrado('Perfil não encontrado');
  if (perfil.id_usuario !== idUsuario) throw erroAcessoNegado();
  return perfil;
}

export async function atualizar(idPerfil, idUsuario, { apelido, avatarImg }) {
  const anterior = await exigirPosse(idPerfil, idUsuario);

  await perfilRepository.atualizar(idPerfil, { apelido, avatarImg });

  await auditoriaRepository.registrar({
    atorTipo: 'Usuario',
    atorId: idUsuario,
    acao: 'ATUALIZAR_PERFIL',
    entidade: 'perfil',
    entidadeId: idPerfil,
    estadoAnterior: { apelido: anterior.apelido, avatarImg: anterior.avatar_img },
    estadoNovo: { apelido: apelido ?? anterior.apelido, avatarImg: avatarImg ?? anterior.avatar_img },
  });

  return perfilRepository.buscarPorId(idPerfil);
}

export async function remover(idPerfil, idUsuario) {
  await exigirPosse(idPerfil, idUsuario);
  await perfilRepository.remover(idPerfil);

  await auditoriaRepository.registrar({
    atorTipo: 'Usuario',
    atorId: idUsuario,
    acao: 'REMOVER_PERFIL',
    entidade: 'perfil',
    entidadeId: idPerfil,
  });
}

/**
 * Onboarding: grava o apelido escolhido e delega o XP inicial ao service de
 * nível, que é quem sabe calcular XP.
 */
export async function salvarOnboarding(idPerfil, idUsuario, { apelido, objetivo, nivel }) {
  await exigirPosse(idPerfil, idUsuario);

  await perfilRepository.atualizar(idPerfil, { apelido });
  const resultadoNivel = await nivelService.definirPontoDePartida(idPerfil, nivel);

  await auditoriaRepository.registrar({
    atorTipo: 'Usuario',
    atorId: idUsuario,
    acao: 'CONCLUIR_ONBOARDING',
    entidade: 'perfil',
    entidadeId: idPerfil,
    estadoNovo: { apelido, objetivo, nivelInicial: resultadoNivel.nivel },
  });

  return { apelido, objetivo, ...resultadoNivel };
}
