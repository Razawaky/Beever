import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  conferirForma,
  estadoParaSalvar,
  validarRespostas,
} from '../../src/services/validadoresDeJogo.js';

/**
 * As recusas de entrada dos oito validadores (RN-007, RNF-28).
 *
 * A auditoria da E14 mediu o `validadoresDeJogo` e achou 46 linhas nunca
 * executadas, todas guardas: o portão da cobertura não media este arquivo, e
 * ele é quem transforma resposta em número de erros, que vira estrela e vira
 * recompensa. Cada caso aqui é uma dessas guardas.
 */

const ARRASTE = {
  tipo: 'arraste',
  enunciado: 'Necessidade ou desejo?',
  categorias: [
    { id: 'necessidade', nome: 'Necessidade' },
    { id: 'desejo', nome: 'Desejo' },
  ],
  cartas: [{ texto: 'Comida', categoria: 'necessidade' }],
};

const ORCAMENTO = {
  tipo: 'orcamento',
  enunciado: 'Divida 50 de mel.',
  total: 50,
  passo: 5,
  categorias: [
    { id: 'guardar', nome: 'Guardar', minimo: 20, maximo: 50 },
    { id: 'lanche', nome: 'Lanche', minimo: 10, maximo: 30 },
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
      enunciado: 'Qual saquinho vale mais a pena?',
      unidade: 'bala',
      opcoes: [
        { texto: '10 balas', preco: 5, quantidade: 10 },
        { texto: '30 balas', preco: 12, quantidade: 30 },
      ],
    },
  ],
};

const ORDENE = {
  tipo: 'ordene',
  enunciado: 'Em que ordem você resolve?',
  itens: [
    { id: 'luz', texto: 'Conta de luz', ordem: 1 },
    { id: 'mercado', texto: 'Compra do mês', ordem: 2 },
    { id: 'cinema', texto: 'Cinema', ordem: 3 },
  ],
};

const LISTAS = {
  tipo: 'listas',
  enunciado: 'Complete a frase.',
  lacunas: [{ texto: 'Guardar mel é', opcoes: ['poupar', 'gastar'], correta: 0 }],
};

const QUADRINHO = {
  tipo: 'quadrinho',
  paineis: [
    { texto: 'A Beenie recebeu a mesada.' },
    { texto: 'O que ela faz?', escolhas: ['Guarda', 'Gasta tudo'], correta: 0 },
  ],
};

/** Toda recusa de conteúdo ou de resposta sai como erro de validação. */
function recusa(acao) {
  assert.throws(acao, { codigo: 'VALIDACAO' });
}

describe('guardas de conteúdo dos validadores', () => {
  it('arraste recusa caixa sem identificador ou sem nome', () => {
    const semNome = { ...ARRASTE, categorias: [{ id: 'necessidade' }, { id: 'desejo', nome: 'Desejo' }] };
    const semId = { ...ARRASTE, categorias: [{ id: '', nome: 'Necessidade' }, { id: 'desejo', nome: 'Desejo' }] };

    recusa(() => conferirForma('arraste-e-classifique', semNome));
    recusa(() => conferirForma('arraste-e-classifique', semId));
  });

  it('orçamento recusa conteúdo sem total e com menos de duas categorias', () => {
    recusa(() => conferirForma('monte-o-orcamento', { ...ORCAMENTO, total: 0 }));
    recusa(() => conferirForma('monte-o-orcamento', { ...ORCAMENTO, categorias: [ORCAMENTO.categorias[0]] }));
  });

  it('orçamento recusa categoria sem nome e categorias com o mesmo identificador', () => {
    const semNome = { ...ORCAMENTO, categorias: [{ id: 'guardar', minimo: 20, maximo: 50 }, ORCAMENTO.categorias[1]] };
    const repetida = { ...ORCAMENTO, categorias: [ORCAMENTO.categorias[0], { ...ORCAMENTO.categorias[1], id: 'guardar' }] };

    recusa(() => conferirForma('monte-o-orcamento', semNome));
    recusa(() => conferirForma('monte-o-orcamento', repetida));
  });

  it('cofre recusa conteúdo sem entrada por ciclo ou sem meta', () => {
    recusa(() => conferirForma('cofre-do-tempo', { ...COFRE, entradaPorCiclo: 0 }));
    recusa(() => conferirForma('cofre-do-tempo', { ...COFRE, meta: 0 }));
  });

  it('mercado recusa conteúdo sem rodadas', () => {
    recusa(() => conferirForma('mercado-esperto', { tipo: 'mercado' }));
    recusa(() => conferirForma('mercado-esperto', { tipo: 'mercado', rodadas: [] }));
  });

  it('ordene recusa item sem identificador ou sem texto', () => {
    const semTexto = { ...ORDENE, itens: [{ id: 'luz', ordem: 1 }, ORDENE.itens[1], ORDENE.itens[2]] };
    const semId = { ...ORDENE, itens: [{ id: '', texto: 'Conta de luz', ordem: 1 }, ORDENE.itens[1], ORDENE.itens[2]] };

    recusa(() => conferirForma('ordene-a-prioridade', semTexto));
    recusa(() => conferirForma('ordene-a-prioridade', semId));
  });

  it('listas recusa frase sem lacuna, lacuna com uma opção só e resposta fora das opções', () => {
    recusa(() => conferirForma('listas-suspensas', { tipo: 'listas', lacunas: [] }));
    recusa(() =>
      conferirForma('listas-suspensas', { ...LISTAS, lacunas: [{ texto: 'X', opcoes: ['poupar'], correta: 0 }] }),
    );
    recusa(() =>
      conferirForma('listas-suspensas', { ...LISTAS, lacunas: [{ ...LISTAS.lacunas[0], correta: 5 }] }),
    );
  });

  it('quadrinho recusa história sem painel, escolha curta e escolha certa fora das opções', () => {
    recusa(() => conferirForma('quadrinho-interativo', { tipo: 'quadrinho', paineis: [] }));
    recusa(() =>
      conferirForma('quadrinho-interativo', {
        ...QUADRINHO,
        paineis: [{ texto: 'Decide', escolhas: ['Guarda'], correta: 0 }],
      }),
    );
    recusa(() =>
      conferirForma('quadrinho-interativo', {
        ...QUADRINHO,
        paineis: [{ texto: 'Decide', escolhas: ['Guarda', 'Gasta'], correta: 9 }],
      }),
    );
  });

  it('quadrinho recusa história em que ninguém decide nada', () => {
    const soNarrativa = { tipo: 'quadrinho', paineis: [{ texto: 'A Beenie voou.' }, { texto: 'E pousou.' }] };

    recusa(() => conferirForma('quadrinho-interativo', soNarrativa));
  });
});

describe('guardas de resposta dos validadores', () => {
  it('nenhum jogo aceita resposta que não veio em lista', () => {
    recusa(() => validarRespostas('arraste-e-classifique', ARRASTE, 'necessidade'));
    recusa(() => validarRespostas('monte-o-orcamento', ORCAMENTO, 50));
    recusa(() => validarRespostas('cofre-do-tempo', COFRE, 20));
    recusa(() => validarRespostas('mercado-esperto', MERCADO, 0));
    recusa(() => validarRespostas('ordene-a-prioridade', ORDENE, 'luz'));
    recusa(() => validarRespostas('listas-suspensas', LISTAS, 0));
    recusa(() => validarRespostas('quadrinho-interativo', QUADRINHO, 0));
  });

  it('o progresso salvo também precisa vir em lista', () => {
    recusa(() => estadoParaSalvar('quiz-do-favo', { respostas: [0, 1] }));
  });
});
