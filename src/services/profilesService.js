import { emTransacao } from '../config/database.js';
import * as profilesRepository from '../repositories/profilesRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import { erroAcessoNegado, erroNaoEncontrado } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as levelsService from './levelsService.js';
import * as schedulesService from './schedulesService.js';

/**
 * Regra de negócio do perfil do jogador.
 *
 * Perfil é 1:1 com usuário, então não há listagem nem seleção: cada conta tem
 * exatamente um. A divisão entre conta e perfil, no schema novo, é esta: o
 * **apelido mora na conta** (`users.nickname`, junto do e-mail e da data de
 * nascimento), e o perfil guarda como o jogo se apresenta — avatar, faixa
 * etária, objetivo inicial, fuso e duração de sessão.
 */

export async function obterDoUsuario(idUsuario) {
  const perfil = await profilesRepository.buscarDetalhadoPorUsuario(idUsuario);
  if (!perfil) throw erroNaoEncontrado('Perfil não encontrado');

  const [usuario, nivel, carteira] = await Promise.all([
    usersRepository.buscarPorId(idUsuario),
    levelsService.obterDoUsuario(idUsuario),
    coinsService.obterCarteira(idUsuario),
  ]);

  return {
    ...perfil,
    apelido: usuario?.nickname ?? null,
    email: usuario?.email ?? null,
    onboardingConcluido: Boolean(usuario?.onboarding_completed_at),
    nivel,
    mel: carteira.mel,
    polen: carteira.polen,
  };
}

async function exigirPosse(idPerfil, idUsuario) {
  const perfil = await profilesRepository.buscarPorId(idPerfil);
  if (!perfil) throw erroNaoEncontrado('Perfil não encontrado');
  if (Number(perfil.user_id) !== Number(idUsuario)) throw erroAcessoNegado();
  return perfil;
}

/**
 * Atualiza o que é do perfil e o que é da conta na mesma chamada, porque para
 * quem usa a tela isso é uma coisa só: "meus dados". O apelido vai para
 * `users`, o resto para `profiles`.
 */
export async function atualizar(idPerfil, idUsuario, { apelido, avatar, fuso, minutosPorSessao }) {
  await exigirPosse(idPerfil, idUsuario);
  const anterior = await profilesRepository.buscarDetalhadoPorUsuario(idUsuario);
  const usuarioAnterior = await usersRepository.buscarPorId(idUsuario);

  if (apelido) await usersRepository.atualizar(idUsuario, { apelido });
  await profilesRepository.atualizar(idPerfil, { avatar, fuso, minutosPorSessao });

  await auditService.registrar(auditService.usuario(idUsuario), 'perfil.atualizado', {
    entidade: 'profile',
    id: idPerfil,
    antes: { apelido: usuarioAnterior?.nickname, avatar: anterior?.avatar },
    depois: { apelido: apelido ?? usuarioAnterior?.nickname, avatar: avatar ?? anterior?.avatar },
  });

  return obterDoUsuario(idUsuario);
}

export async function remover(idPerfil, idUsuario) {
  await exigirPosse(idPerfil, idUsuario);
  await profilesRepository.remover(idPerfil);

  await auditService.registrar(auditService.usuario(idUsuario), 'perfil.removido', {
    entidade: 'profile',
    id: idPerfil,
  });
}

/**
 * Onboarding (RN-012): fecha de uma vez o apelido, o avatar, o objetivo
 * inicial, o ponto de partida do XP e os dias da semana em que o jogador
 * pretende jogar.
 *
 * Tudo numa transação porque um onboarding pela metade é pior do que nenhum: a
 * conta ficaria marcada como configurada, com o jogador caindo num painel sem
 * nível nem agenda e sem tela nenhuma para voltar e corrigir.
 *
 * A marca de concluído é gravada por último e só uma vez — o
 * `AND onboarding_completed_at IS NULL` do repository garante que reenviar o
 * formulário não reescreve a data original.
 */
export async function salvarOnboarding(idPerfil, idUsuario, { apelido, avatar, objetivo, nivel, dias = [] }) {
  await exigirPosse(idPerfil, idUsuario);

  const resultado = await emTransacao(async (conexao) => {
    if (apelido) await usersRepository.atualizar(idUsuario, { apelido }, conexao);
    await profilesRepository.atualizar(idPerfil, { avatar, objetivoInicial: objetivo }, conexao);

    const nivelInicial = await levelsService.definirPontoDePartida(conexao, idUsuario, nivel);
    const diasMarcados = await schedulesService.definirSemana(conexao, idUsuario, dias);

    await usersRepository.marcarOnboardingConcluido(idUsuario, conexao);

    return { nivelInicial, diasMarcados };
  });

  await auditService.registrar(auditService.usuario(idUsuario), 'onboarding.concluido', {
    entidade: 'profile',
    id: idPerfil,
    depois: {
      apelido,
      avatar,
      objetivo,
      nivelInicial: resultado.nivelInicial.nivel,
      diasDisponiveis: resultado.diasMarcados,
    },
  });

  return { apelido, avatar, objetivo, ...resultado.nivelInicial, diasDisponiveis: resultado.diasMarcados };
}
