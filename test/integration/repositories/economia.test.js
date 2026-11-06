import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../../helpers/banco.js';
import { emTransacao, fecharPool } from '../../../src/config/database.js';
import * as economicCyclesRepository from '../../../src/repositories/economicCyclesRepository.js';
import * as inventoryRepository from '../../../src/repositories/inventoryRepository.js';
import * as itemsRepository from '../../../src/repositories/itemsRepository.js';
import * as patrimonyRepository from '../../../src/repositories/patrimonyRepository.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';

/**
 * O que a E09 precisa ler e escrever para o ciclo econômico funcionar:
 * `economic_cycles`, `patrimony_snapshots`, os comportamentos de cada item e as
 * operações de ciclo sobre o inventário.
 *
 * O que estes testes protegem: o mesmo ciclo nunca é aplicado duas vezes
 * (RN-036), o valor do item respeita piso e teto sem depender de quem chamou
 * (RN-034), e a inadimplência conta ciclos em vez de virar dívida (RN-037).
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

/** Números do seed, conferidos aqui de propósito: se o catálogo mudar, o teste avisa. */
const CELULAR = { preco: 1500, taxa: -4, pisoPct: 20 };
const TERRENO = { preco: 4000, taxa: 1.5, tetoPct: 200 };

describe('repositories da economia', opcoes, () => {
  let banco;
  let celular;
  let terreno;
  let videogame;
  let oculos;

  before(async () => {
    banco = await criarBancoDeTeste();
    celular = await itemsRepository.buscarPorSlug('celular');
    terreno = await itemsRepository.buscarPorSlug('terreno');
    videogame = await itemsRepository.buscarPorSlug('videogame');
    oculos = await itemsRepository.buscarPorSlug('oculos-escuros');
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function dono(sufixo) {
    return usersRepository.criar({
      email: `economia-${sufixo}@beever.dev`,
      apelido: `economia-${sufixo}`,
      dataNasc: '2013-03-03',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
  }

  async function comprar(idUsuario, item, valorInicial) {
    return emTransacao((conexao) =>
      inventoryRepository.adicionar(conexao, {
        idUsuario,
        idItem: item.id,
        valorInicial,
      }),
    );
  }

  async function valorDaUnidade(id) {
    return Number((await inventoryRepository.buscarPorId(id)).current_value);
  }

  describe('economicCyclesRepository', () => {
    it('o mesmo ciclo só é registrado uma vez (RN-036)', async () => {
      const idUsuario = await dono('ciclo-unico');

      const primeira = await emTransacao((conexao) =>
        economicCyclesRepository.registrar(conexao, { idUsuario, numeroDoCiclo: 1 }),
      );
      const segunda = await emTransacao((conexao) =>
        economicCyclesRepository.registrar(conexao, { idUsuario, numeroDoCiclo: 1 }),
      );

      assert.equal(primeira, true, 'a primeira marcação é a que vale');
      assert.equal(segunda, false, 'quem chega depois não aplica efeito nenhum');
    });

    it('diz qual foi o último ciclo processado, e zero para quem nunca teve', async () => {
      const idUsuario = await dono('ultimo-ciclo');
      assert.equal(await economicCyclesRepository.ultimoNumeroProcessado(idUsuario), 0);

      await emTransacao(async (conexao) => {
        for (const numero of [1, 2, 3]) {
          await economicCyclesRepository.registrar(conexao, { idUsuario, numeroDoCiclo: numero });
        }
      });

      assert.equal(await economicCyclesRepository.ultimoNumeroProcessado(idUsuario), 3);
    });

    it('guarda o resumo do ciclo, que é o extrato da Colmeia', async () => {
      const idUsuario = await dono('resumo');
      const resumo = { valorizou: 60, cobrou: 20, vendidos: ['celular'] };

      await emTransacao((conexao) =>
        economicCyclesRepository.registrar(conexao, { idUsuario, numeroDoCiclo: 7, resumo }),
      );

      const ciclo = await economicCyclesRepository.buscarPorNumero(idUsuario, 7);
      assert.deepEqual(ciclo.summary, resumo);

      const ultimos = await economicCyclesRepository.listarUltimos(idUsuario);
      assert.equal(Number(ultimos[0].cycle_number), 7, 'o mais novo vem primeiro');
    });
  });

  describe('patrimonyRepository', () => {
    it('grava a foto do dia e regravar o mesmo dia sobrescreve, não duplica', async () => {
      const idUsuario = await dono('snapshot');
      const hoje = '2026-08-20';

      await emTransacao((conexao) =>
        patrimonyRepository.gravar(conexao, {
          idUsuario,
          data: hoje,
          carteira: 100,
          cofre: 50,
          itens: 300,
          total: 450,
        }),
      );
      await emTransacao((conexao) =>
        patrimonyRepository.gravar(conexao, {
          idUsuario,
          data: hoje,
          carteira: 120,
          cofre: 50,
          itens: 300,
          total: 470,
        }),
      );

      const foto = await patrimonyRepository.buscarDoDia(idUsuario, hoje);
      assert.equal(Number(foto.total_value), 470, 'a última leitura do dia é a que fica');
      assert.equal((await patrimonyRepository.listarUltimas(idUsuario)).length, 1);
    });
  });

  describe('comportamento econômico do item', () => {
    it('um item pode ter mais de um comportamento (RN-035)', async () => {
      const comportamentos = (await itemsRepository.listarComportamentos(videogame.id)).map(
        (linha) => linha.behavior,
      );

      assert.deepEqual(comportamentos.sort(), ['custo_fixo', 'deprecia']);
    });

    it('cosmético é neutro e não conta no patrimônio (RN-041)', async () => {
      const comportamentos = (await itemsRepository.listarComportamentos(oculos.id)).map(
        (linha) => linha.behavior,
      );

      assert.deepEqual(comportamentos, ['neutro']);
      assert.equal(Number(oculos.counts_in_patrimony), 0);
    });

    it('lê os comportamentos de vários itens numa consulta só', async () => {
      const linhas = await itemsRepository.listarComportamentosDosItens([celular.id, terreno.id]);
      const porItem = new Map();
      for (const linha of linhas) {
        porItem.set(Number(linha.item_id), [...(porItem.get(Number(linha.item_id)) ?? []), linha.behavior]);
      }

      assert.deepEqual(porItem.get(Number(celular.id)), ['deprecia']);
      assert.deepEqual(porItem.get(Number(terreno.id)), ['valoriza']);
      assert.deepEqual(await itemsRepository.listarComportamentosDosItens([]), [], 'lista vazia não vai ao banco');
    });

    it('acha a melhoria de um item, que é o upgrade com desconto da loja', async () => {
      const casaPequena = await itemsRepository.buscarPorSlug('casa-pequena');
      const upgrades = (await itemsRepository.listarUpgradesDe(casaPequena.id)).map((linha) => linha.slug);

      assert.ok(upgrades.includes('casa-media'), `a casa média deveria ser upgrade da pequena: ${upgrades}`);
    });
  });

  describe('inventário no ciclo econômico', () => {
    it('deprecia pela taxa do item, arredondando para inteiro', async () => {
      const idUsuario = await dono('deprecia');
      const idUnidade = await comprar(idUsuario, celular, CELULAR.preco);

      await emTransacao((conexao) => inventoryRepository.aplicarCicloDeValor(conexao, idUnidade));

      const esperado = Math.round(CELULAR.preco * (1 + CELULAR.taxa / 100));
      assert.equal(await valorDaUnidade(idUnidade), esperado, 'um ciclo de -4% sobre 1500 dá 1440');
    });

    it('a depreciação para no piso do item, nunca chega a zero', async () => {
      const idUsuario = await dono('piso');
      const piso = (CELULAR.preco * CELULAR.pisoPct) / 100;
      const idUnidade = await comprar(idUsuario, celular, piso + 10);

      await emTransacao((conexao) => inventoryRepository.aplicarCicloDeValor(conexao, idUnidade));

      assert.equal(await valorDaUnidade(idUnidade), piso, 'o piso é 20% do que a unidade custou');
    });

    it('a valorização para no teto do item', async () => {
      const idUsuario = await dono('teto');
      const teto = (TERRENO.preco * TERRENO.tetoPct) / 100;
      const idUnidade = await comprar(idUsuario, terreno, teto - 10);

      await emTransacao((conexao) => inventoryRepository.aplicarCicloDeValor(conexao, idUnidade));

      assert.equal(await valorDaUnidade(idUnidade), teto, 'o teto é 200% do que a unidade custou');
    });

    it('lista para o ciclo o que está em mãos, com os números do item', async () => {
      const idUsuario = await dono('lista-do-ciclo');
      await comprar(idUsuario, videogame, 2800);
      await comprar(idUsuario, oculos, 150);

      const unidades = await inventoryRepository.listarParaCiclo(idUsuario);

      assert.equal(unidades.length, 2);
      const jogo = unidades.find((linha) => linha.item_slug === 'videogame');
      assert.equal(Number(jogo.upkeep_cost), 20, 'o custo por ciclo vem junto, sem consulta a mais');
      assert.equal(jogo.status, 'ativo');
    });

    /**
     * RN-037: sem saldo para o custo fixo o item fica inadimplente e conta
     * ciclos. Nunca vira dívida — quem deve é o item, não a criança.
     */
    it('a inadimplência conta ciclos e a unidade continua no ciclo seguinte', async () => {
      const idUsuario = await dono('inadimplente');
      const idUnidade = await comprar(idUsuario, videogame, 2800);

      await emTransacao(async (conexao) => {
        await inventoryRepository.marcarInadimplente(conexao, idUnidade);
        await inventoryRepository.marcarInadimplente(conexao, idUnidade);
      });

      const unidade = await inventoryRepository.buscarPorId(idUnidade);
      assert.equal(unidade.status, 'inadimplente');
      assert.equal(Number(unidade.overdue_cycles), 2);

      const noCiclo = await inventoryRepository.listarParaCiclo(idUsuario);
      assert.equal(noCiclo.length, 1, 'inadimplente continua sendo olhado pelo ciclo');
    });

    it('lista quem passou do limite de ciclos, que é quem a RN-037 manda vender', async () => {
      const idUsuario = await dono('vencidos');
      const emDia = await comprar(idUsuario, videogame, 2800);
      const vencido = await comprar(idUsuario, videogame, 2800);

      await emTransacao(async (conexao) => {
        await inventoryRepository.marcarInadimplente(conexao, emDia);
        await inventoryRepository.marcarInadimplente(conexao, vencido);
        await inventoryRepository.marcarInadimplente(conexao, vencido);
      });

      const vencidas = await inventoryRepository.listarInadimplentesVencidas(idUsuario, 2);

      assert.equal(vencidas.length, 1);
      assert.equal(Number(vencidas[0].id), vencido);
    });

    it('pagar o que devia devolve a unidade para ativa e zera o atraso', async () => {
      const idUsuario = await dono('regulariza');
      const idUnidade = await comprar(idUsuario, videogame, 2800);
      await emTransacao((conexao) => inventoryRepository.marcarInadimplente(conexao, idUnidade));

      await emTransacao((conexao) => inventoryRepository.regularizar(conexao, idUnidade));

      const unidade = await inventoryRepository.buscarPorId(idUnidade);
      assert.equal(unidade.status, 'ativo');
      assert.equal(Number(unidade.overdue_cycles), 0);
    });
  });
});
