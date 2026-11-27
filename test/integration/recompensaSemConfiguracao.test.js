import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { fecharPool } from '../../src/config/database.js';
import * as coinsService from '../../src/services/coinsService.js';
import * as levelsService from '../../src/services/levelsService.js';
import * as pointsService from '../../src/services/pointsService.js';
import * as patrimonyService from '../../src/services/patrimonyService.js';
import * as streakService from '../../src/services/streakService.js';
import * as taskProgressSources from '../../src/services/taskProgressSources.js';

/**
 * O que acontece quando falta configuração de recompensa (T-14.2, RNF-28).
 *
 * As três contas de recompensa — mel, pólen e XP — decidiram pagar zero e gritar
 * no log em vez de estourar, porque o buraco é de administração e derrubar a
 * partida da criança não o conserta. Essa decisão nunca tinha sido exercitada: o
 * seed sempre esteve completo, e o caminho de falha existia só no papel.
 *
 * Este arquivo mexe no seed de propósito — apaga a linha, mede, e devolve. Por
 * isso ele cria o próprio banco descartável, como todo teste de banco do
 * projeto.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const CELULA_INEXISTENTE = {
  slugDoTipoDeJogo: 'jogo-que-nao-existe',
  codigoDaFaixa: 'Z',
  estrelas: 3,
};

describe('recompensa sem configuração', opcoes, () => {
  let banco;

  before(async () => {
    banco = await criarBancoDeTeste();
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('estrela inválida não paga nada, nas três moedas', async () => {
    const celula = { ...CELULA_INEXISTENTE, slugDoTipoDeJogo: 'quiz-do-favo', codigoDaFaixa: 'A' };

    for (const estrelas of [0, -1, 2.5]) {
      assert.equal(await coinsService.calcularMelDaCelula({ ...celula, estrelas }), 0);
      assert.equal(await pointsService.calcularPolenDaCelula({ ...celula, estrelas }), 0);
      assert.equal(await levelsService.calcularXpDaCelula({ ...celula, estrelas }), 0);
    }
  });

  it('tipo de jogo sem configuração paga zero em vez de estourar', async () => {
    assert.equal(await coinsService.calcularMelDaCelula(CELULA_INEXISTENTE), 0);
    assert.equal(await pointsService.calcularPolenDaCelula(CELULA_INEXISTENTE), 0);
    assert.equal(await levelsService.calcularXpDaCelula(CELULA_INEXISTENTE), 0);
  });

  it('sem o modificador de repetição, repetir não paga — e a primeira vez continua pagando', async () => {
    const celula = { slugDoTipoDeJogo: 'quiz-do-favo', codigoDaFaixa: 'A', estrelas: 3 };

    // A linha inteira volta no fim: guardar coluna a coluna deixaria o seed
    // incompleto se a tabela ganhasse campo novo.
    const [[modificador]] = await banco.conexao.query(
      "SELECT * FROM reward_modifiers WHERE slug = 'repeticao-de-celula'",
    );
    assert.ok(modificador, 'o seed precisa ter o modificador de repetição');

    await banco.conexao.query('DELETE FROM reward_modifiers WHERE id = ?', [modificador.id]);
    try {
      assert.ok((await coinsService.calcularMelDaCelula(celula)) > 0, 'a primeira vez não depende do modificador');

      assert.equal(await coinsService.calcularMelDaCelula({ ...celula, ehRepeticao: true }), 0);
      assert.equal(await pointsService.calcularPolenDaCelula({ ...celula, ehRepeticao: true }), 0);
      assert.equal(await levelsService.calcularXpDaCelula({ ...celula, ehRepeticao: true }), 0);
    } finally {
      const colunas = Object.keys(modificador);
      await banco.conexao.query(
        `INSERT INTO reward_modifiers (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`,
        colunas.map((coluna) => modificador[coluna]),
      );
    }
  });

  it('sem o item do escudo no catálogo, a sequência conta zero em vez de quebrar', async () => {
    const [[escudo]] = await banco.conexao.query("SELECT * FROM items WHERE slug = 'escudo-de-sequencia'");
    assert.ok(escudo, 'o seed precisa ter o escudo de sequência');

    const [[usuaria]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', ['ana@beever.dev']);
    const idUsuario = Number(usuaria.id);

    await banco.conexao.query('UPDATE items SET slug = ? WHERE id = ?', ['escudo-fora-do-ar', escudo.id]);
    try {
      assert.equal(await streakService.escudosDisponiveis(idUsuario), 0);
    } finally {
      await banco.conexao.query('UPDATE items SET slug = ? WHERE id = ?', [escudo.slug, escudo.id]);
    }
  });

  it('a foto do patrimônio existe e é lida em ordem, mesmo sem tela para ela', async () => {
    const [[usuaria]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', ['ana@beever.dev']);
    const idUsuario = Number(usuaria.id);

    // A visita é quem grava a foto do dia; aqui basta pedir o patrimônio uma vez.
    await patrimonyService.obterDoUsuario(idUsuario);
    const evolucao = await patrimonyService.listarEvolucao(idUsuario, 5);

    assert.ok(Array.isArray(evolucao));
    assert.ok(evolucao.length >= 1, 'a visita grava a foto do dia');
  });

  it('a fonte de tarefa por favo concluído responde zero quando ninguém concluiu nada', async () => {
    const [[usuaria]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', ['ana@beever.dev']);
    const janela = { inicio: '2020-01-01', fim: '2020-01-07' };

    assert.equal(await taskProgressSources.medir('hive_completed', Number(usuaria.id), janela), 0);
  });

  it('com a tabela de níveis vazia, a curva acusa em vez de calcular errado', async () => {
    const [niveis] = await banco.conexao.query('SELECT * FROM levels ORDER BY level');
    await banco.conexao.query('SET FOREIGN_KEY_CHECKS = 0');
    await banco.conexao.query('DELETE FROM levels');

    try {
      await assert.rejects(() => levelsService.obterCurva(), /db:seed/);
    } finally {
      for (const nivel of niveis) {
        const colunas = Object.keys(nivel);
        await banco.conexao.query(
          `INSERT INTO levels (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`,
          colunas.map((coluna) => nivel[coluna]),
        );
      }
      await banco.conexao.query('SET FOREIGN_KEY_CHECKS = 1');
    }
  });
});
