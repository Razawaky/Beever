import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  conferirForma,
  conteudoParaJogar,
  tiposJogaveis,
  validarRespostas,
} from '../../src/services/validadoresDeJogo.js';

/**
 * O contrato de jogo, testado sem banco.
 *
 * Este é o coração da RN-007: se a contagem de erros estiver errada aqui, o
 * motor de recompensas paga certinho o valor errado. Até a T-07.1 o validador
 * só era exercido de lado, por teste de integração — era a lacuna L-5 do laudo
 * da E06.
 */

const QUIZ = {
  tipo: 'quiz',
  perguntas: [
    { enunciado: 'Para que serve o mel?', alternativas: ['Comprar', 'Nada'], correta: 0 },
    { enunciado: 'De onde vem?', alternativas: ['Atividades', 'Sozinho', 'Pedindo'], correta: 0 },
  ],
};

const ARRASTE = {
  tipo: 'arraste',
  enunciado: 'Isso é necessidade ou desejo?',
  categorias: [
    { id: 'necessidade', nome: 'Necessidade' },
    { id: 'desejo', nome: 'Desejo' },
  ],
  cartas: [
    { texto: 'Comida', categoria: 'necessidade' },
    { texto: 'Videogame novo', categoria: 'desejo' },
  ],
};

const ORCAMENTO = {
  tipo: 'orcamento',
  enunciado: 'Divida 50 de mel.',
  total: 50,
  passo: 5,
  categorias: [
    { id: 'guardar', nome: 'Guardar', minimo: 20, maximo: 50 },
    { id: 'lanche', nome: 'Lanche', minimo: 10, maximo: 20 },
    { id: 'brinquedo', nome: 'Brinquedo', minimo: 0, maximo: 15 },
  ],
};

const COFRE = {
  tipo: 'cofre',
  enunciado: 'Entram 20 de mel por semana.',
  nomeDoCiclo: 'semana',
  entradaPorCiclo: 20,
  minimoPorCiclo: 5,
  taxaPorCiclo: 10,
  ciclos: 4,
  meta: 60,
};

const MERCADO = {
  tipo: 'mercado',
  rodadas: [
    {
      enunciado: 'Qual saquinho de bala vale mais a pena?',
      unidade: 'bala',
      opcoes: [
        { texto: 'Saquinho com 10 balas', preco: 5, quantidade: 10 },
        { texto: 'Saquinho com 30 balas', preco: 12, quantidade: 30 },
      ],
    },
    {
      enunciado: 'E o suco?',
      unidade: 'litro',
      opcoes: [
        { texto: 'Garrafa de 1 litro', preco: 6, quantidade: 1 },
        { texto: 'Garrafa de 2 litros', preco: 10, quantidade: 2 },
      ],
    },
  ],
};

describe('validadoresDeJogo', () => {
  describe('validarRespostas', () => {
    it('não acha erro quando tudo está certo', () => {
      assert.deepEqual(validarRespostas('quiz-do-favo', QUIZ, [0, 0]), { erros: 0, total: 2 });
    });

    it('conta um erro por resposta diferente do gabarito', () => {
      assert.equal(validarRespostas('quiz-do-favo', QUIZ, [1, 0]).erros, 1);
      assert.equal(validarRespostas('quiz-do-favo', QUIZ, [1, 2]).erros, 2);
    });

    it('pergunta deixada em branco conta como erro', () => {
      assert.equal(validarRespostas('quiz-do-favo', QUIZ, [0]).erros, 1, 'faltou responder a segunda');
      assert.equal(validarRespostas('quiz-do-favo', QUIZ, []).erros, 2);
    });

    it('resposta a mais é ignorada, e não vira acerto', () => {
      assert.deepEqual(validarRespostas('quiz-do-favo', QUIZ, [0, 0, 0, 0]), { erros: 0, total: 2 });
    });

    it('recusa resposta que não veio em lista', () => {
      assert.throws(() => validarRespostas('quiz-do-favo', QUIZ, 'tudo certo'), { codigo: 'VALIDACAO' });
    });
  });

  describe('conferirForma', () => {
    it('recusa conteúdo sem gabarito', () => {
      assert.throws(() => conferirForma('quiz-do-favo', { tipo: 'placeholder' }), { codigo: 'VALIDACAO' });
      assert.throws(() => conferirForma('quiz-do-favo', { tipo: 'quiz', perguntas: [] }), {
        codigo: 'VALIDACAO',
      });
    });

    it('recusa pergunta com menos de duas alternativas', () => {
      const torto = { tipo: 'quiz', perguntas: [{ enunciado: 'Só uma?', alternativas: ['Sim'], correta: 0 }] };

      assert.throws(() => conferirForma('quiz-do-favo', torto), { codigo: 'VALIDACAO' });
    });

    it('recusa resposta certa fora das alternativas', () => {
      const torto = {
        tipo: 'quiz',
        perguntas: [{ enunciado: 'Qual?', alternativas: ['A', 'B'], correta: 7 }],
      };

      assert.throws(() => conferirForma('quiz-do-favo', torto), { codigo: 'VALIDACAO' });
    });

    it('recusa tipo de jogo sem validador, dizendo qual é', () => {
      // O último jogo sem validador é o Ordene a Prioridade, ainda nesta tarefa.
      assert.throws(() => conferirForma('ordene-a-prioridade', QUIZ), /ordene-a-prioridade/);
    });
  });

  describe('conteudoParaJogar', () => {
    it('entrega as perguntas sem a resposta certa', () => {
      const paraTela = conteudoParaJogar('quiz-do-favo', QUIZ);

      assert.equal(paraTela.perguntas.length, 2);
      for (const pergunta of paraTela.perguntas) {
        assert.equal(pergunta.correta, undefined);
        assert.ok(pergunta.enunciado && pergunta.alternativas.length >= 2);
      }
    });

    it('não altera o conteúdo original', () => {
      conteudoParaJogar('quiz-do-favo', QUIZ);

      assert.equal(QUIZ.perguntas[0].correta, 0, 'o gabarito precisa continuar no lugar');
    });
  });

  describe('Arraste e Classifique', () => {
    it('não acha erro quando cada carta está na caixa certa', () => {
      assert.deepEqual(validarRespostas('arraste-e-classifique', ARRASTE, ['necessidade', 'desejo']), {
        erros: 0,
        total: 2,
      });
    });

    it('conta um erro por carta na caixa errada', () => {
      assert.equal(validarRespostas('arraste-e-classifique', ARRASTE, ['desejo', 'desejo']).erros, 1);
      assert.equal(validarRespostas('arraste-e-classifique', ARRASTE, ['desejo', 'necessidade']).erros, 2);
    });

    it('carta deixada fora de qualquer caixa conta como erro', () => {
      assert.equal(validarRespostas('arraste-e-classifique', ARRASTE, ['necessidade']).erros, 1);
      assert.equal(validarRespostas('arraste-e-classifique', ARRASTE, [null, null]).erros, 2);
    });

    it('recusa conteúdo com menos de duas caixas ou sem carta', () => {
      const semCaixa = { tipo: 'arraste', categorias: [{ id: 'a', nome: 'A' }], cartas: ARRASTE.cartas };
      const semCarta = { tipo: 'arraste', categorias: ARRASTE.categorias, cartas: [] };

      assert.throws(() => conferirForma('arraste-e-classifique', semCaixa), { codigo: 'VALIDACAO' });
      assert.throws(() => conferirForma('arraste-e-classifique', semCarta), { codigo: 'VALIDACAO' });
    });

    it('recusa carta cuja caixa certa não existe', () => {
      const torto = {
        tipo: 'arraste',
        categorias: ARRASTE.categorias,
        cartas: [{ texto: 'Cinema', categoria: 'investimento' }],
      };

      assert.throws(() => conferirForma('arraste-e-classifique', torto), { codigo: 'VALIDACAO' });
    });

    it('recusa duas caixas com o mesmo identificador', () => {
      const torto = {
        tipo: 'arraste',
        categorias: [
          { id: 'necessidade', nome: 'Necessidade' },
          { id: 'necessidade', nome: 'Preciso' },
        ],
        cartas: ARRASTE.cartas,
      };

      assert.throws(() => conferirForma('arraste-e-classifique', torto), { codigo: 'VALIDACAO' });
    });

    it('entrega as cartas sem dizer a caixa certa', () => {
      const paraTela = conteudoParaJogar('arraste-e-classifique', ARRASTE);

      assert.equal(paraTela.cartas.length, 2);
      for (const carta of paraTela.cartas) {
        assert.equal(carta.categoria, undefined);
        assert.ok(carta.texto);
      }
      assert.equal(paraTela.categorias.length, 2, 'as caixas continuam indo para a tela');
      assert.equal(ARRASTE.cartas[0].categoria, 'necessidade', 'o gabarito precisa continuar no lugar');
    });
  });

  describe('Monte o Orçamento', () => {
    it('não acha erro quando cada categoria está na faixa e o total fecha', () => {
      assert.deepEqual(validarRespostas('monte-o-orcamento', ORCAMENTO, [25, 15, 10]), { erros: 0, total: 4 });
    });

    it('conta um erro por categoria fora da faixa', () => {
      // 55 passa do máximo de "guardar", -5 nem é valor, e a soma não fecha.
      assert.equal(validarRespostas('monte-o-orcamento', ORCAMENTO, [55, 15, -5]).erros, 3, 'duas faixas e o total');
      assert.equal(validarRespostas('monte-o-orcamento', ORCAMENTO, [40, 5, 5]).erros, 1, 'só o lanche está baixo');
    });

    it('sobrar ou faltar mel conta como o erro do total', () => {
      assert.equal(validarRespostas('monte-o-orcamento', ORCAMENTO, [20, 10, 0]).erros, 1, 'sobraram 20');
      assert.equal(validarRespostas('monte-o-orcamento', ORCAMENTO, [30, 20, 15]).erros, 1, 'passou do total');
    });

    it('categoria em branco conta erro de faixa e derruba o total', () => {
      assert.equal(validarRespostas('monte-o-orcamento', ORCAMENTO, [25, 15]).erros, 2);
    });

    it('recusa orçamento cujas regras não fecham', () => {
      const minimosAltos = {
        ...ORCAMENTO,
        categorias: ORCAMENTO.categorias.map((categoria) => ({ ...categoria, minimo: 30, maximo: 40 })),
      };
      const maximosBaixos = {
        ...ORCAMENTO,
        categorias: ORCAMENTO.categorias.map((categoria) => ({ ...categoria, minimo: 0, maximo: 5 })),
      };

      assert.throws(() => conferirForma('monte-o-orcamento', minimosAltos), { codigo: 'VALIDACAO' });
      assert.throws(() => conferirForma('monte-o-orcamento', maximosBaixos), { codigo: 'VALIDACAO' });
    });

    it('recusa passo que não cabe no total um número exato de vezes', () => {
      assert.throws(() => conferirForma('monte-o-orcamento', { ...ORCAMENTO, passo: 7 }), { codigo: 'VALIDACAO' });
    });

    it('entrega as regras para a tela, porque elas são o enunciado', () => {
      const paraTela = conteudoParaJogar('monte-o-orcamento', ORCAMENTO);

      assert.equal(paraTela.total, 50);
      assert.equal(paraTela.categorias[0].minimo, 20);
      assert.equal(paraTela.categorias[0].maximo, 50);
    });
  });

  describe('Cofre do Tempo', () => {
    /**
     * A conta à mão, com o depósito entrando no começo do ciclo e o rendimento
     * caindo no fim, arredondando para baixo a cada ciclo:
     *
     *   guardando 20: 22, 46, 72, 101   guardando 5: 5, 11, 17, 24
     *
     * A meta é 60, então guardar tudo bate e guardar o mínimo não bate.
     */
    it('guardar tudo bate a meta e não acha erro nenhum', () => {
      assert.deepEqual(validarRespostas('cofre-do-tempo', COFRE, [20, 20, 20, 20]), { erros: 0, total: 5 });
    });

    it('guardar o mínimo respeita a regra de todo ciclo e ainda assim perde a meta', () => {
      assert.deepEqual(validarRespostas('cofre-do-tempo', COFRE, [5, 5, 5, 5]), { erros: 1, total: 5 });
    });

    it('guardar cedo rende mais do que guardar tarde', () => {
      const cedo = validarRespostas('cofre-do-tempo', COFRE, [20, 20, 5, 5]);
      const tarde = validarRespostas('cofre-do-tempo', COFRE, [5, 5, 20, 20]);

      assert.equal(cedo.erros, 0, 'guardando cedo a meta vem');
      assert.equal(tarde.erros, 1, 'os mesmos 50 de mel, guardados tarde, não chegam à meta');
    });

    it('depósito fora da regra é erro, e aquele ciclo não guarda nada', () => {
      // O ciclo inválido rende sobre o que já havia, mas o depósito é perdido.
      assert.equal(validarRespostas('cofre-do-tempo', COFRE, [50, 20, 20, 20]).erros, 1, 'acima da entrada');
      assert.equal(validarRespostas('cofre-do-tempo', COFRE, [0, 20, 20, 20]).erros, 1, 'abaixo do mínimo');
    });

    it('ciclo deixado em branco conta como erro', () => {
      assert.equal(validarRespostas('cofre-do-tempo', COFRE, [20, 20, 20]).erros, 1, 'faltou o quarto ciclo');
    });

    /**
     * Um ciclo perdido custa a meta só quando os outros também vão mal — é a
     * RN-030 na prática: a criança não é bloqueada por um erro.
     */
    it('um ciclo perdido não derruba a meta se os outros forem bem', () => {
      assert.equal(validarRespostas('cofre-do-tempo', COFRE, [50, 20, 20, 20]).erros, 1, 'a meta veio assim mesmo');
      assert.equal(validarRespostas('cofre-do-tempo', COFRE, [50, 5, 5, 5]).erros, 2, 'aí sim, o ciclo e a meta');
    });

    it('recusa meta inalcançável e meta que o mínimo já alcança', () => {
      assert.throws(() => conferirForma('cofre-do-tempo', { ...COFRE, meta: 500 }), { codigo: 'VALIDACAO' });
      assert.throws(() => conferirForma('cofre-do-tempo', { ...COFRE, meta: 10 }), { codigo: 'VALIDACAO' });
    });

    it('recusa taxa, ciclos ou mínimo tortos', () => {
      assert.throws(() => conferirForma('cofre-do-tempo', { ...COFRE, taxaPorCiclo: 0 }), { codigo: 'VALIDACAO' });
      assert.throws(() => conferirForma('cofre-do-tempo', { ...COFRE, ciclos: 9 }), { codigo: 'VALIDACAO' });
      assert.throws(() => conferirForma('cofre-do-tempo', { ...COFRE, minimoPorCiclo: 30 }), {
        codigo: 'VALIDACAO',
      });
    });

    it('entrega as regras para a tela, porque elas são o enunciado', () => {
      const paraTela = conteudoParaJogar('cofre-do-tempo', COFRE);

      assert.equal(paraTela.meta, 60);
      assert.equal(paraTela.taxaPorCiclo, 10);
      assert.equal(paraTela.ciclos, 4);
    });
  });

  describe('Mercado Esperto', () => {
    it('a melhor compra é a mais barata por unidade, e não a mais barata na etiqueta', () => {
      // 12 por 30 balas sai a 0,40 cada; 5 por 10 balas sai a 0,50.
      assert.deepEqual(validarRespostas('mercado-esperto', MERCADO, [1, 1]), { erros: 0, total: 2 });
    });

    it('escolher a etiqueta mais barata conta erro quando ela rende menos', () => {
      assert.equal(validarRespostas('mercado-esperto', MERCADO, [0, 1]).erros, 1);
      assert.equal(validarRespostas('mercado-esperto', MERCADO, [0, 0]).erros, 2);
    });

    it('rodada sem resposta conta como erro', () => {
      assert.equal(validarRespostas('mercado-esperto', MERCADO, [1]).erros, 1);
    });

    it('recusa rodada com menos de duas opções ou com número torto', () => {
      const umaOpcao = { tipo: 'mercado', rodadas: [{ enunciado: 'Só uma?', opcoes: [MERCADO.rodadas[0].opcoes[0]] }] };
      const precoZerado = {
        tipo: 'mercado',
        rodadas: [
          { enunciado: 'De graça?', opcoes: [{ texto: 'A', preco: 0, quantidade: 1 }, { texto: 'B', preco: 2, quantidade: 1 }] },
        ],
      };

      assert.throws(() => conferirForma('mercado-esperto', umaOpcao), { codigo: 'VALIDACAO' });
      assert.throws(() => conferirForma('mercado-esperto', precoZerado), { codigo: 'VALIDACAO' });
    });

    it('recusa empate na melhor compra, que daria duas respostas certas', () => {
      const empate = {
        tipo: 'mercado',
        rodadas: [
          {
            enunciado: 'Tanto faz?',
            opcoes: [
              { texto: '1 kg por 6', preco: 6, quantidade: 1 },
              { texto: '2 kg por 12', preco: 12, quantidade: 2 },
            ],
          },
        ],
      };

      assert.throws(() => conferirForma('mercado-esperto', empate), { codigo: 'VALIDACAO' });
    });

    it('entrega preço e quantidade para a tela, porque a conta é o jogo', () => {
      const paraTela = conteudoParaJogar('mercado-esperto', MERCADO);

      assert.equal(paraTela.rodadas[0].opcoes[0].preco, 5);
      assert.equal(paraTela.rodadas[0].opcoes[0].quantidade, 10);
      assert.equal(paraTela.rodadas[0].unidade, 'bala');
    });
  });

  it('diz quais tipos de jogo já são jogáveis', () => {
    assert.deepEqual(tiposJogaveis(), [
      'quiz-do-favo',
      'arraste-e-classifique',
      'monte-o-orcamento',
      'cofre-do-tempo',
      'mercado-esperto',
    ]);
  });
});
