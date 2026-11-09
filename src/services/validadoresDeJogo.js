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

/**
 * O saldo do cofre depois de todos os ciclos.
 *
 * O depósito entra no começo do ciclo e o rendimento cai no fim, que é o que
 * faz guardar cedo valer mais do que guardar tarde — a lição do jogo. O saldo é
 * arredondado para baixo a cada ciclo, para que o servidor e a tela cheguem ao
 * mesmo número sem depender de casa decimal.
 *
 * O mesmo cálculo roda no `cofre.js`. Se um dos dois mudar, o outro muda junto.
 */
function saldoDoCofre(corpo, depositos) {
  let saldo = 0;

  for (let ciclo = 0; ciclo < corpo.ciclos; ciclo += 1) {
    saldo = Math.floor(((saldo + depositos[ciclo]) * (100 + corpo.taxaPorCiclo)) / 100);
  }
  return saldo;
}

/**
 * Cofre do Tempo (RF-JOG-04): quanto guardar em cada ciclo, para chegar à meta.
 *
 * Corpo esperado: `{ tipo, enunciado, nomeDoCiclo, entradaPorCiclo, minimoPorCiclo,
 * taxaPorCiclo, ciclos, meta }`. As respostas chegam como lista de depósitos, um
 * por ciclo, na ordem.
 *
 * Este jogo é simulação e não encosta na tabela `vaults`: o Cofre de verdade,
 * com a taxa da RN-042, é da etapa da economia.
 */
const cofre = {
  conferirForma(corpo) {
    const inteiroPositivo = (valor) => Number.isInteger(valor) && valor > 0;

    if (!inteiroPositivo(corpo?.entradaPorCiclo) || !inteiroPositivo(corpo?.meta)) {
      throw erroValidacao('Esta célula ainda não é jogável: falta a entrada por ciclo ou a meta');
    }
    if (!Number.isInteger(corpo.taxaPorCiclo) || corpo.taxaPorCiclo <= 0 || corpo.taxaPorCiclo > 100) {
      throw erroValidacao('A taxa por ciclo precisa ser um percentual inteiro entre 1 e 100');
    }
    // Seis ciclos é o que cabe no gráfico a 320 px sem virar risco no meio da tela.
    if (!Number.isInteger(corpo.ciclos) || corpo.ciclos < 2 || corpo.ciclos > 6) {
      throw erroValidacao('O cofre precisa ter de dois a seis ciclos');
    }
    if (
      !Number.isInteger(corpo.minimoPorCiclo) ||
      corpo.minimoPorCiclo < 0 ||
      corpo.minimoPorCiclo > corpo.entradaPorCiclo
    ) {
      throw erroValidacao('O mínimo por ciclo precisa caber na entrada do ciclo');
    }

    const ciclos = Array.from({ length: corpo.ciclos });
    const saldoGuardandoTudo = saldoDoCofre(corpo, ciclos.map(() => corpo.entradaPorCiclo));
    const saldoGuardandoOMinimo = saldoDoCofre(corpo, ciclos.map(() => corpo.minimoPorCiclo));

    // Meta inalcançável faria a criança perder estrela por defeito do conteúdo;
    // meta que o mínimo já alcança faria o jogo não pedir decisão nenhuma.
    if (corpo.meta > saldoGuardandoTudo) {
      throw erroValidacao('A meta deste cofre é inalcançável: nem guardando tudo o saldo chega lá');
    }
    if (corpo.meta <= saldoGuardandoOMinimo) {
      throw erroValidacao('A meta deste cofre já é alcançada guardando o mínimo: não há decisão a tomar');
    }
  },

  paraJogar(corpo) {
    return {
      tipo: corpo.tipo,
      enunciado: corpo.enunciado,
      nomeDoCiclo: corpo.nomeDoCiclo ?? 'ciclo',
      entradaPorCiclo: corpo.entradaPorCiclo,
      minimoPorCiclo: corpo.minimoPorCiclo,
      taxaPorCiclo: corpo.taxaPorCiclo,
      ciclos: corpo.ciclos,
      meta: corpo.meta,
    };
  },

  /**
   * Um erro por ciclo com depósito fora da regra, mais um se a meta não vier.
   *
   * O tempo passa mesmo quando o depósito é inválido: o ciclo rende sobre o que
   * já estava guardado, e só o depósito daquele ciclo é perdido.
   */
  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma por ciclo');
    }

    let erros = 0;
    const depositos = [];

    for (let ciclo = 0; ciclo < corpo.ciclos; ciclo += 1) {
      const deposito = Number(respostas[ciclo]);
      const foraDaRegra =
        !Number.isInteger(deposito) || deposito < corpo.minimoPorCiclo || deposito > corpo.entradaPorCiclo;

      if (foraDaRegra) erros += 1;
      depositos.push(foraDaRegra ? 0 : deposito);
    }

    if (saldoDoCofre(corpo, depositos) < corpo.meta) erros += 1;

    return { erros, total: corpo.ciclos + 1 };
  },
};

/** Quanto custa cada unidade da opção. É a conta que o jogo ensina a fazer. */
function precoPorUnidade(opcao) {
  return opcao.preco / opcao.quantidade;
}

/** Qual opção sai mais barata por unidade. `-1` quando há empate no primeiro lugar. */
function indiceDaMelhorCompra(opcoes) {
  let melhor = 0;
  let empatada = false;

  opcoes.forEach((opcao, indice) => {
    if (indice === 0) return;
    if (precoPorUnidade(opcao) < precoPorUnidade(opcoes[melhor])) {
      melhor = indice;
      empatada = false;
      return;
    }
    if (precoPorUnidade(opcao) === precoPorUnidade(opcoes[melhor])) empatada = true;
  });

  return empatada ? -1 : melhor;
}

/**
 * Mercado Esperto (RF-JOG-05): qual embalagem vale mais a pena.
 *
 * Corpo esperado: `{ tipo, rodadas: [{ enunciado, unidade, opcoes: [{ texto, preco, quantidade }] }] }`.
 * As respostas chegam como lista de índices de opção, um por rodada.
 *
 * O gabarito não é escrito no conteúdo: é calculado a partir de preço e
 * quantidade. Conteúdo não pode declarar uma "melhor compra" que a conta
 * desmente.
 */
const mercado = {
  conferirForma(corpo) {
    const rodadas = corpo?.rodadas;
    if (!Array.isArray(rodadas) || rodadas.length === 0) {
      throw erroValidacao('Esta célula ainda não é jogável: o conteúdo não tem rodadas');
    }

    for (const rodada of rodadas) {
      if (!Array.isArray(rodada.opcoes) || rodada.opcoes.length < 2) {
        throw erroValidacao('Rodada com menos de duas opções: não há o que comparar');
      }
      for (const opcao of rodada.opcoes) {
        const numerosTortos =
          !Number.isFinite(opcao.preco) || opcao.preco <= 0 || !Number.isFinite(opcao.quantidade) || opcao.quantidade <= 0;
        if (!opcao.texto || numerosTortos) {
          throw erroValidacao('Opção sem texto, sem preço ou sem quantidade válida');
        }
      }
      // Duas opções igualmente baratas dariam duas respostas certas, e a
      // contagem de erros passaria a depender de qual delas o jogador marcou.
      if (indiceDaMelhorCompra(rodada.opcoes) === -1) {
        throw erroValidacao('Rodada com empate na melhor compra: não existe resposta única');
      }
    }
  },

  /** Preço e quantidade são o enunciado: escondê-los tiraria a conta do jogo. */
  paraJogar(corpo) {
    return {
      tipo: corpo.tipo,
      rodadas: corpo.rodadas.map((rodada) => ({
        enunciado: rodada.enunciado,
        unidade: rodada.unidade ?? 'unidade',
        opcoes: rodada.opcoes.map((opcao) => ({
          texto: opcao.texto,
          preco: opcao.preco,
          quantidade: opcao.quantidade,
        })),
      })),
    };
  },

  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma por rodada');
    }

    let erros = 0;
    corpo.rodadas.forEach((rodada, indice) => {
      if (Number(respostas[indice]) !== indiceDaMelhorCompra(rodada.opcoes)) erros += 1;
    });

    return { erros, total: corpo.rodadas.length };
  },
};

/**
 * Ordene a Prioridade (RF-JOG-06): o que vem primeiro.
 *
 * Corpo esperado: `{ tipo, enunciado, itens: [{ id, texto, ordem }] }`, com
 * `ordem` indo de 1 até a quantidade de itens, sem repetir. A resposta é a lista
 * de `id` na ordem escolhida pelo jogador.
 *
 * O erro é contado por par invertido, e não por posição fora do lugar: trocar
 * dois vizinhos custa um erro só, enquanto mover um item para o topo bagunçaria
 * todas as posições seguintes e viraria nota zero por uma bobagem. Errar pouco
 * tem que doer pouco (RN-030).
 */
const ordene = {
  conferirForma(corpo) {
    const itens = corpo?.itens;
    if (!Array.isArray(itens) || itens.length < 3) {
      throw erroValidacao('Esta célula ainda não é jogável: ordenar pede pelo menos três itens');
    }

    const ids = new Set();
    const ordens = new Set();

    for (const item of itens) {
      if (typeof item.id !== 'string' || item.id === '' || !item.texto) {
        throw erroValidacao('Item sem identificador ou sem texto');
      }
      if (ids.has(item.id)) throw erroValidacao('Dois itens com o mesmo identificador');
      if (!Number.isInteger(item.ordem) || item.ordem < 1 || item.ordem > itens.length) {
        throw erroValidacao(`A ordem do item "${item.texto}" está fora da lista`);
      }
      if (ordens.has(item.ordem)) throw erroValidacao('Dois itens disputando a mesma posição');
      ids.add(item.id);
      ordens.add(item.ordem);
    }
  },

  /** Embaralhado, senão a tela entregaria a resposta na ordem em que a recebeu. */
  paraJogar(corpo) {
    const itens = corpo.itens.map((item) => ({ id: item.id, texto: item.texto }));

    for (let posicao = itens.length - 1; posicao > 0; posicao -= 1) {
      const sorteada = Math.floor(Math.random() * (posicao + 1));
      [itens[posicao], itens[sorteada]] = [itens[sorteada], itens[posicao]];
    }

    return { tipo: corpo.tipo, enunciado: corpo.enunciado, itens };
  },

  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma posição por item');
    }

    // Item que o jogador não colocou fica depois de todos: quem não ordena
    // erra todos os pares daquele item, e não fica de fora da conta.
    const posicaoEscolhida = new Map(respostas.map((id, posicao) => [id, posicao]));
    const naOrdemCerta = [...corpo.itens].sort((um, outro) => um.ordem - outro.ordem);

    let erros = 0;
    let pares = 0;

    for (let primeiro = 0; primeiro < naOrdemCerta.length; primeiro += 1) {
      for (let segundo = primeiro + 1; segundo < naOrdemCerta.length; segundo += 1) {
        pares += 1;
        const posicaoDoPrimeiro = posicaoEscolhida.get(naOrdemCerta[primeiro].id) ?? Infinity;
        const posicaoDoSegundo = posicaoEscolhida.get(naOrdemCerta[segundo].id) ?? Infinity;
        if (posicaoDoPrimeiro >= posicaoDoSegundo) erros += 1;
      }
    }

    return { erros, total: pares };
  },
};

/**
 * Listas Suspensas (RF-JOG-09): completar a frase escolhendo em cada lacuna.
 *
 * Corpo esperado: `{ tipo, enunciado, lacunas: [{ texto, opcoes, correta }] }`,
 * em que `correta` é o índice da opção certa. As respostas chegam como lista de
 * índices, uma por lacuna, na ordem.
 *
 * Parece o quiz e não é: ali cada pergunta é uma tela, aqui a frase inteira fica
 * à vista e a criança vê como uma escolha muda o sentido da outra.
 */
const listas = {
  conferirForma(corpo) {
    const lacunas = corpo?.lacunas;
    if (!Array.isArray(lacunas) || lacunas.length === 0) {
      throw erroValidacao('Esta célula ainda não é jogável: a frase não tem lacunas');
    }

    for (const lacuna of lacunas) {
      if (!Array.isArray(lacuna.opcoes) || lacuna.opcoes.length < 2) {
        throw erroValidacao('Lacuna com menos de duas opções: não há o que escolher');
      }
      const foraDaLista = lacuna.correta < 0 || lacuna.correta >= lacuna.opcoes.length;
      if (!Number.isInteger(lacuna.correta) || foraDaLista) {
        throw erroValidacao('Lacuna com resposta certa fora das opções');
      }
    }
  },

  paraJogar(corpo) {
    return {
      tipo: corpo.tipo,
      enunciado: corpo.enunciado,
      lacunas: corpo.lacunas.map((lacuna) => ({ texto: lacuna.texto, opcoes: lacuna.opcoes })),
    };
  },

  /** Lacuna deixada em branco conta como erro, igual à pergunta não respondida. */
  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma por lacuna');
    }

    let erros = 0;
    corpo.lacunas.forEach((lacuna, indice) => {
      if (Number(respostas[indice]) !== Number(lacuna.correta)) erros += 1;
    });

    return { erros, total: corpo.lacunas.length };
  },
};

/**
 * Quadrinho Interativo (RF-JOG-10): uma história em painéis, e em alguns deles a
 * criança decide o que acontece a seguir.
 *
 * Corpo esperado: `{ tipo, paineis: [{ texto, imagem, escolhas, correta }] }`.
 * Painel sem `escolhas` é narrativa, e só avança; painel com escolhas conta na
 * nota. As respostas chegam como lista de índices, uma por painel de escolha, na
 * ordem em que aparecem.
 *
 * Precisa de pelo menos uma escolha: sem nenhuma seria leitura, não atividade, e
 * a partida fecharia com nota cheia sem a criança decidir nada.
 */
const quadrinho = {
  conferirForma(corpo) {
    const paineis = corpo?.paineis;
    if (!Array.isArray(paineis) || paineis.length === 0) {
      throw erroValidacao('Esta célula ainda não é jogável: a história não tem painéis');
    }

    let comEscolha = 0;
    for (const painel of paineis) {
      if (!painel.texto) throw erroValidacao('Painel sem texto');
      if (painel.escolhas === undefined) continue;

      if (!Array.isArray(painel.escolhas) || painel.escolhas.length < 2) {
        throw erroValidacao('Painel de escolha com menos de duas opções');
      }
      const foraDaLista = painel.correta < 0 || painel.correta >= painel.escolhas.length;
      if (!Number.isInteger(painel.correta) || foraDaLista) {
        throw erroValidacao('Painel com escolha certa fora das opções');
      }
      comEscolha += 1;
    }

    if (comEscolha === 0) {
      throw erroValidacao('A história precisa de pelo menos um painel com escolha');
    }
  },

  paraJogar(corpo) {
    return {
      tipo: corpo.tipo,
      paineis: corpo.paineis.map((painel) => ({
        texto: painel.texto,
        imagem: painel.imagem ?? null,
        escolhas: painel.escolhas ?? null,
      })),
    };
  },

  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma por escolha');
    }

    const comEscolha = corpo.paineis.filter((painel) => Array.isArray(painel.escolhas));

    let erros = 0;
    comEscolha.forEach((painel, indice) => {
      if (Number(respostas[indice]) !== Number(painel.correta)) erros += 1;
    });

    return { erros, total: comEscolha.length };
  },
};

const VALIDADORES = {
  'quiz-do-favo': quiz,
  'arraste-e-classifique': arraste,
  'monte-o-orcamento': orcamento,
  'cofre-do-tempo': cofre,
  'mercado-esperto': mercado,
  'ordene-a-prioridade': ordene,
  'listas-suspensas': listas,
  'quadrinho-interativo': quadrinho,
};

function escolher(slugDoTipoDeJogo) {
  const validador = VALIDADORES[slugDoTipoDeJogo];
  if (!validador) {
    throw erroValidacao(`Este jogo ainda não pode ser jogado: falta o validador de "${slugDoTipoDeJogo}"`);
  }
  return validador;
}

/**
 * O que pode ser guardado como progresso parcial da partida (RF-JOG-07).
 *
 * É a quarta função do contrato, e a única opcional: o padrão serve a todos os
 * jogos de hoje, porque em todos eles o progresso é a lista do que já foi
 * decidido, na ordem. Um jogo que precise guardar outra coisa declara o próprio
 * `estadoParaSalvar` no validador dele.
 *
 * O limite de itens não é capricho: é o que impede alguém de usar a coluna de
 * rascunho como depósito de dados, mandando uma lista sem fim.
 */
const LIMITE_DE_RESPOSTAS_PARCIAIS = 100;

export function estadoParaSalvar(slugDoTipoDeJogo, respostasParciais) {
  const validador = escolher(slugDoTipoDeJogo);
  if (validador.estadoParaSalvar) return validador.estadoParaSalvar(respostasParciais);

  if (!Array.isArray(respostasParciais)) {
    throw erroValidacao('O progresso precisa vir em lista, na ordem em que foi decidido');
  }
  return { respostas: respostasParciais.slice(0, LIMITE_DE_RESPOSTAS_PARCIAIS) };
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
  const conteudo = validador.paraJogar(corpo);

  // A mídia da atividade é da casca da tela, não do jogo: ela atravessa aqui,
  // num lugar só, em vez de cada `paraJogar` ter que lembrar de repassá-la.
  return corpo.imagem ? { ...conteudo, imagem: corpo.imagem } : conteudo;
}
