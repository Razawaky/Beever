import * as nivelRepository from '../repositories/nivelRepository.js';
import { erroValidacao } from '../utils/erros.js';

/**
 * Cálculo de XP e nível — só isso. Pontos e moedas são recompensas separadas,
 * moram no perfil e têm seu próprio service.
 */

const XP_POR_NIVEL = 1000;

/**
 * Ponto de partida escolhido no onboarding. Quem já entende do assunto começa
 * adiantado em vez de repetir o conteúdo básico.
 */
const PONTOS_DE_PARTIDA = {
  beginner: { nivel: 1, xp: 0 },
  intermediate: { nivel: 5, xp: 1000 },
  advanced: { nivel: 10, xp: 3000 },
};

export function calcularXpProximoNivel(nivel) {
  return nivel * XP_POR_NIVEL;
}

export async function definirPontoDePartida(idPerfil, nivelEscolhido) {
  const partida = PONTOS_DE_PARTIDA[nivelEscolhido];
  if (!partida) {
    throw erroValidacao(`Nível inicial desconhecido: ${nivelEscolhido}`);
  }

  const xpProximoNivel = calcularXpProximoNivel(partida.nivel);
  const existente = await nivelRepository.buscarPorPerfil(idPerfil);

  if (existente) {
    await nivelRepository.atualizar(idPerfil, {
      nivel: partida.nivel,
      xpAtual: partida.xp,
      xpProximoNivel,
    });
  } else {
    await nivelRepository.criar({
      idPerfil,
      nivel: partida.nivel,
      xpAtual: partida.xp,
      xpProximoNivel,
    });
  }

  return { nivel: partida.nivel, xpAtual: partida.xp, xpProximoNivel };
}

/**
 * Cálculo puro do ganho de XP, separado da persistência para poder ser testado
 * sem banco. Ganhar muito XP de uma vez pode valer mais de um nível, por isso o
 * laço em vez de um único incremento.
 */
export function aplicarXp(estadoAtual, xpGanho) {
  if (!Number.isInteger(xpGanho) || xpGanho < 0) {
    throw erroValidacao('XP creditado precisa ser um inteiro não negativo');
  }

  let nivel = estadoAtual.nivel;
  let xpAtual = estadoAtual.xpAtual + xpGanho;
  let xpProximoNivel = estadoAtual.xpProximoNivel;

  while (xpAtual >= xpProximoNivel) {
    xpAtual -= xpProximoNivel;
    nivel += 1;
    xpProximoNivel = calcularXpProximoNivel(nivel);
  }

  return { nivel, xpAtual, xpProximoNivel, subiuDeNivel: nivel > estadoAtual.nivel };
}

/** Credita XP ao perfil e persiste o novo estado. */
export async function creditarXp(idPerfil, xpGanho) {
  const linha = await nivelRepository.buscarPorPerfil(idPerfil);
  const estadoAtual = linha
    ? { nivel: linha.nivel, xpAtual: linha.xp_atual, xpProximoNivel: linha.xp_proximo_nivel }
    : { nivel: 1, xpAtual: 0, xpProximoNivel: calcularXpProximoNivel(1) };

  const { subiuDeNivel, ...dados } = aplicarXp(estadoAtual, xpGanho);

  const afetadas = await nivelRepository.atualizar(idPerfil, dados);
  if (afetadas === 0) await nivelRepository.criar({ idPerfil, ...dados });

  return { ...dados, subiuDeNivel };
}
