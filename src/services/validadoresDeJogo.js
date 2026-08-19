import { erroValidacao } from '../utils/erros.js';

/**
 * Como cada tipo de jogo confere as respostas do jogador.
 *
 * A RN-007 manda que a nota saia do servidor: o cliente envia o que respondeu,
 * nunca quanto acertou. O gabarito mora em `contents.body`, e é daqui que a
 * contagem de erros sai.
 *
 * Um validador por slug de `game_types`, com três funções cada — o contrato
 * está em `docs/CONTRATO-DE-JOGO.md`:
 *
 *   conferirForma(corpo)          o conteúdo é jogável? erro de validação se não
 *   paraJogar(corpo)              o que vai para a tela, sem o gabarito
 *   validar(corpo, respostas)     devolve { erros, total }
 *
 * Este módulo mora separado do `gameSessionService` pelo mesmo motivo que
 * `goalProgressSources`: a lista vai crescer, e o service não deve engordar
 * junto.
 */

/**
 * Quiz do Favo (RF-JOG-01): múltipla escolha, uma resposta certa por pergunta.
 *
 * Corpo esperado: `{ tipo, perguntas: [{ enunciado, alternativas, correta }] }`,
 * em que `correta` é o índice da alternativa certa.
 */
const quiz = {
  conferirForma(corpo) {
    const perguntas = corpo?.perguntas;
    if (!Array.isArray(perguntas) || perguntas.length === 0) {
      throw erroValidacao('Esta célula ainda não é jogável: o conteúdo não tem gabarito');
    }

    for (const pergunta of perguntas) {
      if (!Array.isArray(pergunta.alternativas) || pergunta.alternativas.length < 2) {
        throw erroValidacao('Pergunta sem alternativas suficientes: o conteúdo está incompleto');
      }
      const foraDaLista = pergunta.correta < 0 || pergunta.correta >= pergunta.alternativas.length;
      if (!Number.isInteger(pergunta.correta) || foraDaLista) {
        throw erroValidacao('Pergunta com resposta certa fora das alternativas');
      }
    }
  },

  paraJogar(corpo) {
    return {
      tipo: corpo.tipo,
      perguntas: corpo.perguntas.map((pergunta) => ({
        enunciado: pergunta.enunciado,
        alternativas: pergunta.alternativas,
      })),
    };
  },

  /** Pergunta sem resposta conta como erro: deixar em branco não pode valer estrela. */
  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma por pergunta');
    }

    let erros = 0;
    corpo.perguntas.forEach((pergunta, indice) => {
      if (Number(respostas[indice]) !== Number(pergunta.correta)) erros += 1;
    });

    return { erros, total: corpo.perguntas.length };
  },
};

const VALIDADORES = {
  'quiz-do-favo': quiz,
};

function escolher(slugDoTipoDeJogo) {
  const validador = VALIDADORES[slugDoTipoDeJogo];
  if (!validador) {
    throw erroValidacao(`Este jogo ainda não pode ser jogado: falta o validador de "${slugDoTipoDeJogo}"`);
  }
  return validador;
}

/** Quais tipos de jogo já têm validador. A trilha usa para não abrir célula sem jogo. */
export function tiposJogaveis() {
  return Object.keys(VALIDADORES);
}

/** Recusa conteúdo que não dá para jogar, antes de a partida ser aberta. */
export function conferirForma(slugDoTipoDeJogo, corpo) {
  escolher(slugDoTipoDeJogo).conferirForma(corpo);
}

/** Erros e total de perguntas, a partir do gabarito guardado no conteúdo. */
export function validarRespostas(slugDoTipoDeJogo, corpo, respostas) {
  const validador = escolher(slugDoTipoDeJogo);
  validador.conferirForma(corpo);
  return validador.validar(corpo, respostas);
}

/**
 * O conteúdo como o jogador pode vê-lo, sem as respostas certas.
 *
 * Mandar o gabarito para a tela tornaria a validação no servidor teatro: quem
 * abre o inspetor do navegador leria a resposta antes de responder.
 */
export function conteudoParaJogar(slugDoTipoDeJogo, corpo) {
  const validador = escolher(slugDoTipoDeJogo);
  validador.conferirForma(corpo);
  return validador.paraJogar(corpo);
}
