import * as schedulesRepository from '../repositories/schedulesRepository.js';
import { erroValidacao } from '../utils/erros.js';

/**
 * Agenda semanal do jogador: em que dias ele diz que vai jogar.
 *
 * Este service mudou de assunto na E01. Antes ele existia só para dar um
 * "cronograma" à meta, porque a foreign key exigia um — a meta agora aponta
 * para o usuário direto e aquele balde deixou de existir. O que sobrou é a
 * disponibilidade que a sequência (streak) e a geração de tarefas consultam
 * para saber em que dia cobrar presença.
 *
 * Dias seguem a convenção do JavaScript: 0 é domingo, 6 é sábado.
 */

const NOMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Nome do dia para a tela. Mora aqui porque a convenção de 0 a 6 é deste service. */
export function nomeDoDia(diaSemana) {
  return NOMES[Number(diaSemana)] ?? '';
}

function normalizarDias(dias) {
  const lista = Array.isArray(dias) ? dias : [dias];
  const normalizados = lista
    .filter((dia) => dia !== undefined && dia !== null && dia !== '')
    .map((dia) => Number(dia));

  for (const dia of normalizados) {
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
      throw erroValidacao(`Dia da semana inválido: ${dia}. Use 0 (domingo) a 6 (sábado).`);
    }
  }

  return [...new Set(normalizados)];
}

export async function obterSemana(idUsuario) {
  const linhas = await schedulesRepository.listarPorUsuario(idUsuario);
  return linhas.map((linha) => ({
    diaSemana: Number(linha.weekday),
    nome: NOMES[Number(linha.weekday)],
    disponivel: Boolean(linha.is_available),
  }));
}

export async function diasDisponiveis(idUsuario) {
  return schedulesRepository.diasDisponiveis(idUsuario);
}

/**
 * Grava a semana inteira. Recebe os dias escolhidos e o repository escreve os
 * sete, marcando o resto como indisponível — ausência de linha seria ambígua
 * entre "não joga nesse dia" e "ainda não respondeu".
 */
export async function definirSemana(conexao, idUsuario, dias) {
  return schedulesRepository.definirSemana(conexao, idUsuario, normalizarDias(dias));
}

export async function definirDia(conexao, idUsuario, diaSemana, disponivel) {
  const [dia] = normalizarDias([diaSemana]);
  return schedulesRepository.definirDia(conexao, { idUsuario, diaSemana: dia, disponivel });
}
