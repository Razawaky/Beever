import { erroValidacao } from '../utils/erros.js';

/**
 * Como cada tipo de jogo confere as respostas do jogador.
 *
 * A RN-007 manda que a nota saia do servidor: o cliente envia o que respondeu,
 * nunca quanto acertou. O gabarito mora em `contents.body`, e é daqui que a
 * contagem de erros sai.
 *
 * Um validador por slug de `game_types`. Hoje só o quiz tem conteúdo de verdade
 * semeado; a T-07.1 formaliza o contrato de jogo e as tarefas da E07
 * acrescentam os outros cinco neste mesmo mapa.
 *
 * Este módulo mora separado do `gameSessionService` pelo mesmo motivo que
 * `goalProgressSources`: a lista vai crescer, e o service não deve engordar
 * junto.
 */

/**
 * Confere um quiz de múltipla escolha.
 *
 * `respostas` é a lista de índices escolhidos, na ordem das perguntas. Pergunta
 * sem resposta conta como erro — deixar em branco não pode valer estrela.
 */
function validarQuiz(corpo, respostas) {
  const perguntas = corpo?.perguntas;
  if (!Array.isArray(perguntas) || perguntas.length === 0) {
    throw erroValidacao('Esta célula ainda não é jogável: o conteúdo não tem gabarito');
  }

  if (!Array.isArray(respostas)) {
    throw erroValidacao('As respostas precisam vir em lista, uma por pergunta');
  }

  let erros = 0;
  perguntas.forEach((pergunta, indice) => {
    if (Number(respostas[indice]) !== Number(pergunta.correta)) erros += 1;
  });

  return { erros, total: perguntas.length };
}

/** Prepara o conteúdo do quiz para ir à tela: as perguntas sem o gabarito. */
function quizParaJogar(corpo) {
  return {
    tipo: corpo.tipo,
    perguntas: corpo.perguntas.map((pergunta) => ({
      enunciado: pergunta.enunciado,
      alternativas: pergunta.alternativas,
    })),
  };
}

const VALIDADORES = {
  'quiz-do-favo': { validar: validarQuiz, paraJogar: quizParaJogar },
};

function escolher(slugDoTipoDeJogo) {
  const validador = VALIDADORES[slugDoTipoDeJogo];
  if (!validador) {
    throw erroValidacao(`Este jogo ainda não pode ser jogado: falta o validador de "${slugDoTipoDeJogo}"`);
  }
  return validador;
}

/** Erros e total de perguntas, a partir do gabarito guardado no conteúdo. */
export function validarRespostas(slugDoTipoDeJogo, corpo, respostas) {
  return escolher(slugDoTipoDeJogo).validar(corpo, respostas);
}

/**
 * O conteúdo como o jogador pode vê-lo — sem as respostas certas.
 *
 * Mandar o gabarito para a tela tornaria a validação no servidor teatro: quem
 * abre o inspetor do navegador leria a resposta antes de responder.
 */
export function conteudoParaJogar(slugDoTipoDeJogo, corpo) {
  const validador = escolher(slugDoTipoDeJogo);
  validador.validar(corpo, []);
  return validador.paraJogar(corpo);
}
