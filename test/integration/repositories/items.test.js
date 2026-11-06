import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../../helpers/banco.js';
import { fecharPool } from '../../../src/config/database.js';
import * as itemsRepository from '../../../src/repositories/itemsRepository.js';

/**
 * `itemsRepository` contra banco real — o catálogo da loja.
 *
 * O que estes testes protegem: a categoria virou tabela, então uma leitura que
 * esqueça o join volta sem o rótulo e a loja mostra item sem categoria; e item
 * dado como inativo ou apagado logicamente não pode aparecer na vitrine, senão
 * o jogador compra o que não está à venda.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('itemsRepository', opcoes, () => {
  let banco;
  let conexao;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('lista os itens ativos com o nome da categoria resolvido', async () => {
    const itens = await itemsRepository.listarAtivos();

    assert.ok(itens.length > 0, 'o seed do catálogo deveria trazer itens');
    for (const item of itens) {
      assert.ok(item.category_name, `item ${item.slug} veio sem categoria`);
      assert.ok(Number(item.price) >= 0);
    }
  });

  it('busca por slug e por id o mesmo item', async () => {
    const porSlug = await itemsRepository.buscarPorSlug('patinete');
    assert.ok(porSlug, 'o seed deveria ter o item patinete');

    const porId = await itemsRepository.buscarAtivoPorId(porSlug.id);
    assert.equal(porId.slug, 'patinete');
    assert.equal(porId.name, porSlug.name);
  });

  it('não devolve item inativo nem item com baixa lógica', async () => {
    const alvo = await itemsRepository.buscarPorSlug('bicicleta');

    await conexao.query('UPDATE items SET is_active = 0 WHERE id = ?', [alvo.id]);
    assert.equal(await itemsRepository.buscarAtivoPorId(alvo.id), null);

    await conexao.query('UPDATE items SET is_active = 1, deleted_at = NOW() WHERE id = ?', [alvo.id]);
    assert.equal(await itemsRepository.buscarAtivoPorId(alvo.id), null);

    const listados = await itemsRepository.listarAtivos();
    assert.ok(!listados.some((item) => item.id === alvo.id), 'item com baixa lógica não pode ir para a vitrine');

    await conexao.query('UPDATE items SET deleted_at = NULL WHERE id = ?', [alvo.id]);
  });

  it('lista os requisitos de compra com o tipo em texto', async () => {
    const [comRequisito] = await conexao
      .query('SELECT item_id FROM item_requirements LIMIT 1')
      .then(([linhas]) => linhas);
    assert.ok(comRequisito, 'o seed deveria trazer requisitos de compra');

    const requisitos = await itemsRepository.listarRequisitos(comRequisito.item_id);

    assert.ok(requisitos.length > 0);
    for (const requisito of requisitos) {
      assert.ok(
        ['nivel-minimo', 'favo-concluido', 'item-prerequisito', 'patrimonio-minimo'].includes(
          requisito.requirement_type,
        ),
        `tipo de requisito inesperado: ${requisito.requirement_type}`,
      );
    }
  });

  it('devolve nulo para item que não existe', async () => {
    assert.equal(await itemsRepository.buscarAtivoPorId(9999999), null);
    assert.equal(await itemsRepository.buscarPorSlug('item-que-nao-existe'), null);
  });
});
