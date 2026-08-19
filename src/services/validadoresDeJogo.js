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

/**
 * Arraste e Classifique (RF-JOG-02): cada carta vai para uma das caixas.
 *
 * Corpo esperado:
 * `{ tipo, enunciado, categorias: [{ id, nome }], cartas: [{ texto, categoria }] }`,
 * em que `categoria` é o `id` da caixa certa. As respostas chegam como lista de
 * `id`, uma por carta, na mesma ordem em que as cartas foram enviadas à tela.
 */
const arraste = {
  conferirForma(corpo) {
    const categorias = corpo?.categorias;
    const cartas = corpo?.cartas;

    if (!Array.isArray(categorias) || categorias.length < 2) {
      throw erroValidacao('Esta célula ainda não é jogável: precisa de pelo menos duas caixas');
    }
    if (!Array.isArray(cartas) || cartas.length === 0) {
      throw erroValidacao('Esta célula ainda não é jogável: o conteúdo não tem cartas');
    }

    const idsDasCategorias = new Set();
    for (const categoria of categorias) {
      if (typeof categoria.id !== 'string' || categoria.id === '' || !categoria.nome) {
        throw erroValidacao('Caixa sem identificador ou sem nome');
      }
      if (idsDasCategorias.has(categoria.id)) {
        throw erroValidacao('Duas caixas com o mesmo identificador');
      }
      idsDasCategorias.add(categoria.id);
    }

    for (const carta of cartas) {
      if (!carta.texto) throw erroValidacao('Carta sem texto');
      if (!idsDasCategorias.has(carta.categoria)) {
        throw erroValidacao('Carta com resposta certa fora das caixas');
      }
    }
  },

  paraJogar(corpo) {
    return {
      tipo: corpo.tipo,
      enunciado: corpo.enunciado,
      categorias: corpo.categorias.map((categoria) => ({ id: categoria.id, nome: categoria.nome })),
      cartas: corpo.cartas.map((carta) => ({ texto: carta.texto })),
    };
  },

  /** Carta deixada fora de qualquer caixa conta como erro, igual à pergunta em branco. */
  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma por carta');
    }

    let erros = 0;
    corpo.cartas.forEach((carta, indice) => {
      if (respostas[indice] !== carta.categoria) erros += 1;
    });

    return { erros, total: corpo.cartas.length };
  },
};

/**
 * Monte o Orçamento (RF-JOG-03): repartir uma quantia entre categorias.
 *
 * Corpo esperado:
 * `{ tipo, enunciado, total, passo, categorias: [{ id, nome, minimo, maximo, dica }] }`.
 * As respostas chegam como lista de números, um por categoria, na ordem enviada.
 *
 * Este é o único jogo sem gabarito escondido: a regra de cada categoria é o
 * próprio enunciado, e o jogador precisa vê-la para decidir. O que o servidor
 * guarda não é a resposta certa — é o critério.
 */
const orcamento = {
  conferirForma(corpo) {
    const categorias = corpo?.categorias;

    if (!Number.isInteger(corpo?.total) || corpo.total <= 0) {
      throw erroValidacao('Esta célula ainda não é jogável: o orçamento não tem total');
    }
    if (!Number.isInteger(corpo?.passo) || corpo.passo <= 0 || corpo.total % corpo.passo !== 0) {
      throw erroValidacao('O passo precisa ser inteiro e caber no total um número exato de vezes');
    }
    if (!Array.isArray(categorias) || categorias.length < 2) {
      throw erroValidacao('Esta célula ainda não é jogável: precisa de pelo menos duas categorias');
    }

    const idsDasCategorias = new Set();
    let somaDosMinimos = 0;
    let somaDosMaximos = 0;

    for (const categoria of categorias) {
      if (typeof categoria.id !== 'string' || categoria.id === '' || !categoria.nome) {
        throw erroValidacao('Categoria sem identificador ou sem nome');
      }
      if (idsDasCategorias.has(categoria.id)) {
        throw erroValidacao('Duas categorias com o mesmo identificador');
      }
      idsDasCategorias.add(categoria.id);

      const faixaTorta =
        !Number.isInteger(categoria.minimo) ||
        !Number.isInteger(categoria.maximo) ||
        categoria.minimo < 0 ||
        categoria.maximo < categoria.minimo ||
        categoria.maximo > corpo.total;
      if (faixaTorta) throw erroValidacao(`A faixa da categoria "${categoria.nome}" não faz sentido`);

      somaDosMinimos += categoria.minimo;
      somaDosMaximos += categoria.maximo;
    }

    // Sem isto, existiria conteúdo em que nenhuma divisão zera os erros: os
    // mínimos estourariam o total, ou os máximos não o alcançariam.
    if (somaDosMinimos > corpo.total || somaDosMaximos < corpo.total) {
      throw erroValidacao('As regras deste orçamento não fecham: nenhuma divisão as respeita');
    }
  },

  paraJogar(corpo) {
    return {
      tipo: corpo.tipo,
      enunciado: corpo.enunciado,
      total: corpo.total,
      passo: corpo.passo,
      categorias: corpo.categorias.map((categoria) => ({
        id: categoria.id,
        nome: categoria.nome,
        minimo: categoria.minimo,
        maximo: categoria.maximo,
        dica: categoria.dica ?? null,
      })),
    };
  },

  /**
   * Uma decisão por categoria, mais uma pelo total: quem erra uma categoria
   * ainda sai com três estrelas, e quem erra tudo sai com uma (RN-030).
   */
  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma por categoria');
    }

    let erros = 0;
    let distribuido = 0;

    corpo.categorias.forEach((categoria, indice) => {
      const valor = Number(respostas[indice]);
      if (!Number.isInteger(valor) || valor < categoria.minimo || valor > categoria.maximo) {
        erros += 1;
        // Valor sem sentido não entra na soma: só o que dá para gastar conta.
        if (Number.isInteger(valor) && valor > 0) distribuido += valor;
        return;
      }
      distribuido += valor;
    });

    if (distribuido !== corpo.total) erros += 1;

    return { erros, total: corpo.categorias.length + 1 };
  },
};

const VALIDADORES = {
  'quiz-do-favo': quiz,
  'arraste-e-classifique': arraste,
  'monte-o-orcamento': orcamento,
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
