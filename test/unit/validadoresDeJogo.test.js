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
      assert.throws(() => conferirForma('cofre-do-tempo', QUIZ), /cofre-do-tempo/);
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

  it('diz quais tipos de jogo já são jogáveis', () => {
    assert.deepEqual(tiposJogaveis(), ['quiz-do-favo', 'arraste-e-classifique']);
  });
});
