import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { montarCorpo, tiposComFormulario } from '../../src/services/atividadesDoPainel.js';
import { conferirForma } from '../../src/services/validadoresDeJogo.js';

/**
 * A tradução de "campos de formulário" para "o formato que o motor entende"
 * (T-12.4), sem banco.
 *
 * Cada caso termina no `conferirForma` do próprio tipo de jogo: montar um objeto
 * bonito não prova nada se o validador o recusar, e é o validador que decide se
 * a criança consegue jogar.
 */

/** O formulário manda tudo como texto, e com as linhas em branco junto. */
const seisCampos = (preenchidos) => [...preenchidos, '', '', ''];

describe('montagem da atividade a partir do formulário', () => {
  it('os oito tipos de jogo têm formulário', () => {
    assert.equal(tiposComFormulario().length, 8);
  });

  it('quiz: descarta a pergunta em branco e converte a resposta certa para índice', () => {
    const corpo = montarCorpo('quiz-do-favo', {
      perguntaEnunciado: seisCampos(['Para que serve o mel?', 'O que é guardar?']),
      perguntaAlternativas: seisCampos(['Comprar\nNada', 'Deixar para depois\nGastar tudo']),
      perguntaCorreta: seisCampos(['1', '1']),
    });

    assert.equal(corpo.perguntas.length, 2, 'as três linhas vazias saem fora');
    assert.equal(corpo.perguntas[0].correta, 0, 'a alternativa 1 da tela é o índice 0 do motor');
    assert.deepEqual(corpo.perguntas[0].alternativas, ['Comprar', 'Nada']);
    conferirForma('quiz-do-favo', corpo);
  });

  it('arraste: a carta aponta a caixa pelo número da linha', () => {
    const corpo = montarCorpo('arraste-e-classifique', {
      enunciado: 'Separe o que é necessidade',
      categoriaNome: ['Preciso', 'Quero', '', '', ''],
      cartaTexto: ['Comida', 'Videogame', '', ''],
      cartaCaixa: ['1', '2', '1', '1'],
    });

    assert.deepEqual(
      corpo.categorias.map((categoria) => categoria.id),
      ['preciso', 'quero'],
    );
    assert.equal(corpo.cartas[0].categoria, 'preciso');
    assert.equal(corpo.cartas[1].categoria, 'quero');
    conferirForma('arraste-e-classifique', corpo);
  });

  it('mercado: cada opção é "nome | preço | quantidade"', () => {
    const corpo = montarCorpo('mercado-esperto', {
      rodadaEnunciado: ['Qual leva mais suco por moeda?', '', '', ''],
      rodadaUnidade: ['litro', '', '', ''],
      rodadaOpcoes: ['garrafa pequena | 6 | 1\ngarrafa grande | 10 | 2', '', '', ''],
    });

    assert.deepEqual(corpo.rodadas[0].opcoes[1], { texto: 'garrafa grande', preco: 10, quantidade: 2 });
    conferirForma('mercado-esperto', corpo);
  });

  it('mercado: opção sem as três partes é recusada com a explicação do formato', () => {
    assert.throws(
      () =>
        montarCorpo('mercado-esperto', {
          rodadaEnunciado: ['Qual leva mais?'],
          rodadaUnidade: ['litro'],
          rodadaOpcoes: ['garrafa grande'],
        }),
      /nome \| preço \| quantidade/,
    );
  });

  it('ordene: o identificador sai do texto e a posição vem do formulário', () => {
    const corpo = montarCorpo('ordene-a-prioridade', {
      enunciado: 'O que vem primeiro?',
      itemTexto: seisCampos(['Comida', 'Aluguel', 'Cinema']),
      itemOrdem: seisCampos(['2', '1', '3']),
    });

    assert.deepEqual(
      corpo.itens.map((item) => [item.id, item.ordem]),
      [
        ['comida', 2],
        ['aluguel', 1],
        ['cinema', 3],
      ],
    );
    conferirForma('ordene-a-prioridade', corpo);
  });

  it('listas suspensas: uma opção por linha, resposta certa por número', () => {
    const corpo = montarCorpo('listas-suspensas', {
      enunciado: 'Complete a frase',
      lacunaTexto: seisCampos(['O mel serve para...']),
      lacunaOpcoes: seisCampos(['comprar na loja\nnada']),
      lacunaCorreta: seisCampos(['1']),
    });

    assert.equal(corpo.lacunas.length, 1);
    assert.equal(corpo.lacunas[0].correta, 0);
    conferirForma('listas-suspensas', corpo);
  });

  it('quadrinho: painel sem escolhas vira narrativa e não entra na nota', () => {
    const corpo = montarCorpo('quadrinho-interativo', {
      painelTexto: seisCampos(['É sábado de manhã.', 'O que você faz com o mel?']),
      painelEscolhas: seisCampos(['', 'Guardo\nGasto tudo']),
      painelCorreta: seisCampos(['1', '1']),
    });

    assert.equal(corpo.paineis[0].escolhas, undefined, 'painel de narrativa não ganha escolhas');
    assert.equal(corpo.paineis[1].correta, 0);
    conferirForma('quadrinho-interativo', corpo);
  });

  it('tipo sem formulário manda usar o modo avançado', () => {
    assert.throws(() => montarCorpo('jogo-que-nao-existe', {}), /modo avançado/);
  });
});
