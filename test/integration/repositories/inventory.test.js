import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../../helpers/banco.js';
import { emTransacao, fecharPool } from '../../../src/config/database.js';
import * as inventoryRepository from '../../../src/repositories/inventoryRepository.js';
import * as itemsRepository from '../../../src/repositories/itemsRepository.js';
import * as purchasesRepository from '../../../src/repositories/purchasesRepository.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';

/**
 * `inventoryRepository` contra banco real — o que o jogador possui.
 *
 * O contrato mudou: uma linha por unidade, sem coluna de quantidade. Estes
 * testes fixam a consequência disso — comprar duas vezes o mesmo item gera
 * duas linhas independentes, cada uma com valor e estado próprios — porque é
 * exatamente onde um service escrito na memória do schema antigo vai errar.
 *
 * O patrimônio só conta o que a regra manda contar: cosmético fica de fora.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('inventoryRepository', opcoes, () => {
  let banco;
  let conexao;
  let item;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;
    item = await itemsRepository.buscarPorSlug('patinete');
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function dono(sufixo) {
    return usersRepository.criar({
      email: `inventario-${sufixo}@beever.dev`,
      apelido: `inventario-${sufixo}`,
      dataNasc: '2014-09-09',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
  }

  it('registra a entrada com o valor pago e status ativo', async () => {
    const idUsuario = await dono('entrada');
    const preco = Number(item.price);

    const idLinha = await emTransacao((c) =>
      inventoryRepository.adicionar(c, { idUsuario, idItem: item.id, valorInicial: preco }),
    );

    const linha = await inventoryRepository.buscarPorId(idLinha);
    assert.equal(linha.status, 'ativo');
    assert.equal(Number(linha.current_value), preco);
    assert.equal(linha.item_name, item.name, 'a leitura resolve o nome do item pelo join');
  });

  it('duas unidades do mesmo item viram duas linhas, não uma com quantidade 2', async () => {
    const idUsuario = await dono('duas-unidades');

    await emTransacao(async (c) => {
      await inventoryRepository.adicionar(c, { idUsuario, idItem: item.id, valorInicial: 100 });
      await inventoryRepository.adicionar(c, { idUsuario, idItem: item.id, valorInicial: 100 });
    });

    assert.equal(await inventoryRepository.contarDoItem(idUsuario, item.id), 2);
    assert.equal((await inventoryRepository.listarPorUsuario(idUsuario)).length, 2);
  });

  it('liga a unidade à compra que a originou', async () => {
    const idUsuario = await dono('com-compra');

    const { idCompra, idLinha } = await emTransacao(async (c) => {
      const compra = await purchasesRepository.criar(c, {
        idUsuario,
        idItem: item.id,
        precoUnitario: 200,
        precoTotal: 200,
      });
      const linha = await inventoryRepository.adicionar(c, {
        idUsuario,
        idItem: item.id,
        idCompra: compra,
        valorInicial: 200,
      });
      return { idCompra: compra, idLinha: linha };
    });

    const linha = await inventoryRepository.buscarPorId(idLinha);
    assert.equal(Number(linha.purchase_id), Number(idCompra));
  });

  it('responde se o jogador possui o item, para o requisito de pré-requisito', async () => {
    const idUsuario = await dono('possui');
    const outro = await itemsRepository.buscarPorSlug('bicicleta');

    assert.equal(await inventoryRepository.possuiItem(idUsuario, item.id), false);

    await emTransacao((c) => inventoryRepository.adicionar(c, { idUsuario, idItem: item.id, valorInicial: 10 }));

    assert.equal(await inventoryRepository.possuiItem(idUsuario, item.id), true);
    assert.equal(await inventoryRepository.possuiItem(idUsuario, outro.id), false);
  });

  it('o patrimônio soma só o que conta como patrimônio', async () => {
    const idUsuario = await dono('patrimonio');
    const [cosmeticos] = await conexao
      .query(
        `SELECT i.id FROM items i JOIN item_categories c ON c.id = i.category_id
          WHERE i.counts_in_patrimony = 0 LIMIT 1`,
      )
      .then(([linhas]) => linhas);

    await emTransacao(async (c) => {
      await inventoryRepository.adicionar(c, { idUsuario, idItem: item.id, valorInicial: 300 });
      if (cosmeticos) {
        await inventoryRepository.adicionar(c, { idUsuario, idItem: cosmeticos.id, valorInicial: 999 });
      }
    });

    assert.equal(
      await inventoryRepository.valorTotalEmPatrimonio(idUsuario),
      300,
      'item marcado como fora do patrimônio não pode inflar o número',
    );
  });

  it('vende uma vez só — a segunda venda não afeta linha nenhuma', async () => {
    const idUsuario = await dono('venda');
    const idLinha = await emTransacao((c) =>
      inventoryRepository.adicionar(c, { idUsuario, idItem: item.id, valorInicial: 400 }),
    );

    const primeira = await emTransacao((c) => inventoryRepository.marcarComoVendido(c, idLinha, 250));
    const segunda = await emTransacao((c) => inventoryRepository.marcarComoVendido(c, idLinha, 250));

    assert.equal(primeira, 1);
    assert.equal(segunda, 0, 'vender de novo não pode creditar mel de novo');

    const linha = await inventoryRepository.buscarPorId(idLinha);
    assert.equal(linha.status, 'vendido');
    assert.equal(Number(linha.sold_value), 250);
    assert.ok(linha.sold_at);
  });

  it('item vendido sai da lista e para de contar no patrimônio', async () => {
    const idUsuario = await dono('vendido-some');
    const idLinha = await emTransacao((c) =>
      inventoryRepository.adicionar(c, { idUsuario, idItem: item.id, valorInicial: 500 }),
    );

    await emTransacao((c) => inventoryRepository.marcarComoVendido(c, idLinha, 300));

    assert.equal((await inventoryRepository.listarPorUsuario(idUsuario)).length, 0);
    assert.equal(await inventoryRepository.contarDoItem(idUsuario, item.id), 0);
    assert.equal(await inventoryRepository.valorTotalEmPatrimonio(idUsuario), 0);
  });

  it('valor negativo é recusado pelo banco', async () => {
    const idUsuario = await dono('valor-negativo');

    await assert.rejects(
      emTransacao((c) => inventoryRepository.adicionar(c, { idUsuario, idItem: item.id, valorInicial: -1 })),
      /ck_inventory_values/,
    );
  });
});
