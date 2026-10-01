import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../../helpers/banco.js';
import { emTransacao, fecharPool } from '../../../src/config/database.js';
import * as itemsRepository from '../../../src/repositories/itemsRepository.js';
import * as purchasesRepository from '../../../src/repositories/purchasesRepository.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';

/**
 * `purchasesRepository` contra banco real — o extrato de compras.
 *
 * A garantia central: o preço pago fica congelado na linha. Mudar o preço do
 * item na loja depois não pode reescrever a história do que o jogador pagou.
 *
 * A segunda garantia é aritmética, e quem a impõe é o banco: `total_price` tem
 * que bater com `preço × quantidade − desconto`. Um total inventado não grava.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('purchasesRepository', opcoes, () => {
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

  async function comprador(sufixo) {
    return usersRepository.criar({
      email: `compra-${sufixo}@beever.dev`,
      apelido: `compra-${sufixo}`,
      dataNasc: '2013-01-15',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
  }

  it('grava a compra com o preço do momento', async () => {
    const idUsuario = await comprador('registro');
    const preco = Number(item.price);

    const idCompra = await emTransacao((c) =>
      purchasesRepository.criar(c, {
        idUsuario,
        idItem: item.id,
        quantidade: 1,
        precoUnitario: preco,
        precoTotal: preco,
      }),
    );

    const compra = await purchasesRepository.buscarPorId(idCompra);
    assert.equal(Number(compra.price_at_purchase), preco);
    assert.equal(Number(compra.total_price), preco);
    assert.equal(Number(compra.quantity), 1);
  });

  it('o preço pago não muda quando o item muda de preço depois', async () => {
    const idUsuario = await comprador('congelado');
    const precoOriginal = Number(item.price);

    const idCompra = await emTransacao((c) =>
      purchasesRepository.criar(c, {
        idUsuario,
        idItem: item.id,
        precoUnitario: precoOriginal,
        precoTotal: precoOriginal,
      }),
    );

    await conexao.query('UPDATE items SET price = ? WHERE id = ?', [precoOriginal + 500, item.id]);

    const compra = await purchasesRepository.buscarPorId(idCompra);
    assert.equal(Number(compra.price_at_purchase), precoOriginal, 'o extrato conta a verdade do dia da compra');

    await conexao.query('UPDATE items SET price = ? WHERE id = ?', [precoOriginal, item.id]);
  });

  it('aplica desconto e o banco confere a conta', async () => {
    const idUsuario = await comprador('desconto');

    const idCompra = await emTransacao((c) =>
      purchasesRepository.criar(c, {
        idUsuario,
        idItem: item.id,
        quantidade: 2,
        precoUnitario: 100,
        desconto: 30,
        precoTotal: 170,
      }),
    );

    const compra = await purchasesRepository.buscarPorId(idCompra);
    assert.equal(Number(compra.total_price), 170);
    assert.equal(Number(compra.discount_applied), 30);
  });

  it('total que não bate com preço × quantidade é recusado pelo banco', async () => {
    const idUsuario = await comprador('total-errado');

    await assert.rejects(
      emTransacao((c) =>
        purchasesRepository.criar(c, {
          idUsuario,
          idItem: item.id,
          quantidade: 2,
          precoUnitario: 100,
          precoTotal: 50,
        }),
      ),
      /ck_purchases_total/,
    );
  });

  it('quantidade zero é recusada', async () => {
    const idUsuario = await comprador('quantidade-zero');

    await assert.rejects(
      emTransacao((c) =>
        purchasesRepository.criar(c, {
          idUsuario,
          idItem: item.id,
          quantidade: 0,
          precoUnitario: 100,
          precoTotal: 0,
        }),
      ),
      /ck_purchases_values/,
    );
  });

  it('lista as compras do jogador da mais recente para a mais antiga, com o nome do item', async () => {
    const idUsuario = await comprador('extrato');
    const outro = await itemsRepository.buscarPorSlug('bicicleta');

    await emTransacao(async (c) => {
      await purchasesRepository.criar(c, { idUsuario, idItem: item.id, precoUnitario: 10, precoTotal: 10 });
      await purchasesRepository.criar(c, { idUsuario, idItem: outro.id, precoUnitario: 20, precoTotal: 20 });
    });

    const extrato = await purchasesRepository.listarPorUsuario(idUsuario);

    assert.equal(extrato.length, 2);
    assert.ok(extrato[0].item_name, 'o extrato precisa do nome do item, não só do id');
    assert.equal(Number(extrato[0].total_price), 20, 'a mais recente vem primeiro');
  });

  it('soma o total gasto, e devolve zero para quem nunca comprou', async () => {
    const idUsuario = await comprador('total-gasto');
    assert.equal(await purchasesRepository.totalGastoPorUsuario(idUsuario), 0);

    await emTransacao(async (c) => {
      await purchasesRepository.criar(c, { idUsuario, idItem: item.id, precoUnitario: 40, precoTotal: 40 });
      await purchasesRepository.criar(c, { idUsuario, idItem: item.id, precoUnitario: 60, precoTotal: 60 });
    });

    assert.equal(await purchasesRepository.totalGastoPorUsuario(idUsuario), 100);
  });

  it('a compra some junto com a conta, porque o histórico é do jogador', async () => {
    const idUsuario = await comprador('cascata');
    await emTransacao((c) =>
      purchasesRepository.criar(c, { idUsuario, idItem: item.id, precoUnitario: 10, precoTotal: 10 }),
    );

    await usersRepository.removerPorIds([idUsuario]);

    assert.equal((await purchasesRepository.listarPorUsuario(idUsuario)).length, 0);
  });
});
