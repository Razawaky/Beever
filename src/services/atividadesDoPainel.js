import { erroValidacao } from '../utils/erros.js';
import { slugDeTexto } from '../utils/slug.js';

/**
 * Monta o corpo JSON de uma atividade a partir dos campos do formulário do
 * painel (RF-ADM-02).
 *
 * Não valida forma: quem diz se a atividade é jogável continua sendo o
 * `conferirForma` do tipo de jogo. Aqui só se traduz "campos de formulário" em
 * "o formato que o motor entende" — o formulário evita o erro bobo, o validador
 * continua com a palavra final.
 *
 * O formulário é HTML puro, sem JavaScript, então cada bloco repetido vem como
 * listas paralelas de campos com o mesmo nome. Linha em branco é descartada, que
 * é como o administrador cadastra três perguntas num formulário de seis.
 */

/** Um campo repetido sempre vira lista, mesmo quando veio uma linha só. */
function lista(valor) {
  return [].concat(valor ?? []);
}

/** Junta campos paralelos em linhas, e joga fora a linha sem o campo principal. */
function linhas(campos, campoPrincipal) {
  const nomes = Object.keys(campos);
  const total = Math.max(...nomes.map((nome) => lista(campos[nome]).length), 0);

  const montadas = [];
  for (let indice = 0; indice < total; indice += 1) {
    const linha = {};
    for (const nome of nomes) linha[nome] = lista(campos[nome])[indice] ?? '';
    if (String(linha[campoPrincipal]).trim() !== '') montadas.push(linha);
  }
  return montadas;
}

/** Uma opção por linha da área de texto, sem as linhas vazias. */
function opcoesDoTexto(texto) {
  return String(texto ?? '')
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '');
}

/**
 * O formulário numera as respostas a partir de 1, porque é o que a pessoa lê na
 * tela; o motor guarda índice a partir de 0.
 */
function indiceDaCerta(numero) {
  return Number(numero) - 1;
}

const inteiro = (valor) => Number.parseInt(valor, 10);

const construtores = {
  'quiz-do-favo'(campos) {
    const perguntas = linhas(
      {
        enunciado: campos.perguntaEnunciado,
        alternativas: campos.perguntaAlternativas,
        correta: campos.perguntaCorreta,
      },
      'enunciado',
    );

    return {
      perguntas: perguntas.map((pergunta) => ({
        enunciado: pergunta.enunciado.trim(),
        alternativas: opcoesDoTexto(pergunta.alternativas),
        correta: indiceDaCerta(pergunta.correta),
      })),
    };
  },

  'arraste-e-classifique'(campos) {
    // A carta aponta a caixa pelo número da linha, e não pelo identificador: sem
    // JavaScript a tela não teria como oferecer uma lista das caixas digitadas.
    const caixas = linhas({ nome: campos.categoriaNome }, 'nome');
    const categorias = caixas.map((caixa) => ({
      id: slugDeTexto(caixa.nome, 30),
      nome: caixa.nome.trim(),
    }));

    const cartas = linhas({ texto: campos.cartaTexto, caixa: campos.cartaCaixa }, 'texto');

    return {
      enunciado: String(campos.enunciado ?? '').trim(),
      categorias,
      cartas: cartas.map((carta) => ({
        texto: carta.texto.trim(),
        categoria: categorias[inteiro(carta.caixa) - 1]?.id ?? '',
      })),
    };
  },

  'monte-o-orcamento'(campos) {
    const categorias = linhas(
      {
        nome: campos.categoriaNome,
        minimo: campos.categoriaMinimo,
        maximo: campos.categoriaMaximo,
        dica: campos.categoriaDica,
      },
      'nome',
    );

    return {
      enunciado: String(campos.enunciado ?? '').trim(),
      total: inteiro(campos.total),
      passo: inteiro(campos.passo),
      categorias: categorias.map((categoria) => ({
        id: slugDeTexto(categoria.nome, 30),
        nome: categoria.nome.trim(),
        minimo: inteiro(categoria.minimo),
        maximo: inteiro(categoria.maximo),
        dica: categoria.dica.trim(),
      })),
    };
  },

  'cofre-do-tempo'(campos) {
    return {
      enunciado: String(campos.enunciado ?? '').trim(),
      nomeDoCiclo: String(campos.nomeDoCiclo ?? '').trim(),
      entradaPorCiclo: inteiro(campos.entradaPorCiclo),
      minimoPorCiclo: inteiro(campos.minimoPorCiclo),
      // Percentual inteiro, que é o que o validador do cofre exige.
      taxaPorCiclo: inteiro(campos.taxaPorCiclo),
      ciclos: inteiro(campos.ciclos),
      meta: inteiro(campos.meta),
    };
  },

  'mercado-esperto'(campos) {
    const rodadas = linhas(
      { enunciado: campos.rodadaEnunciado, unidade: campos.rodadaUnidade, opcoes: campos.rodadaOpcoes },
      'enunciado',
    );

    return {
      rodadas: rodadas.map((rodada) => ({
        enunciado: rodada.enunciado.trim(),
        unidade: rodada.unidade.trim() || 'unidade',
        opcoes: opcoesDoTexto(rodada.opcoes).map((linha) => {
          const [texto, preco, quantidade] = linha.split('|').map((parte) => parte.trim());
          if (preco === undefined || quantidade === undefined) {
            throw erroValidacao('Cada opção do mercado é "nome | preço | quantidade", separados por barra');
          }
          return { texto, preco: Number(preco), quantidade: Number(quantidade) };
        }),
      })),
    };
  },

  'ordene-a-prioridade'(campos) {
    const itens = linhas({ texto: campos.itemTexto, ordem: campos.itemOrdem }, 'texto');

    return {
      enunciado: String(campos.enunciado ?? '').trim(),
      itens: itens.map((item) => ({
        id: slugDeTexto(item.texto, 30),
        texto: item.texto.trim(),
        ordem: inteiro(item.ordem),
      })),
    };
  },

  'listas-suspensas'(campos) {
    const lacunas = linhas(
      { texto: campos.lacunaTexto, opcoes: campos.lacunaOpcoes, correta: campos.lacunaCorreta },
      'texto',
    );

    return {
      enunciado: String(campos.enunciado ?? '').trim(),
      lacunas: lacunas.map((lacuna) => ({
        texto: lacuna.texto.trim(),
        opcoes: opcoesDoTexto(lacuna.opcoes),
        correta: indiceDaCerta(lacuna.correta),
      })),
    };
  },

  'quadrinho-interativo'(campos) {
    const paineis = linhas(
      { texto: campos.painelTexto, escolhas: campos.painelEscolhas, correta: campos.painelCorreta },
      'texto',
    );

    return {
      paineis: paineis.map((painel) => {
        const escolhas = opcoesDoTexto(painel.escolhas);
        // Painel sem escolha é narrativa: ele só avança, e não entra na nota.
        if (escolhas.length === 0) return { texto: painel.texto.trim() };

        return {
          texto: painel.texto.trim(),
          escolhas,
          correta: indiceDaCerta(painel.correta),
        };
      }),
    };
  },
};

/** Quais tipos de jogo já têm formulário próprio no painel. */
export function tiposComFormulario() {
  return Object.keys(construtores);
}

export function montarCorpo(slugDoTipoDeJogo, campos) {
  const construtor = construtores[slugDoTipoDeJogo];
  if (!construtor) {
    throw erroValidacao('Este tipo de jogo ainda não tem formulário: use o modo avançado');
  }

  return { tipo: slugDoTipoDeJogo, ...construtor(campos) };
}
