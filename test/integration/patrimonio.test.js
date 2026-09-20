import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import * as itemsRepository from '../../src/repositories/itemsRepository.js';
import * as patrimonyRepository from '../../src/repositories/patrimonyRepository.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as userLevelsRepository from '../../src/repositories/userLevelsRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';
import * as vaultsRepository from '../../src/repositories/vaultsRepository.js';
import * as walletsRepository from '../../src/repositories/walletsRepository.js';
import * as coinsService from '../../src/services/coinsService.js';
import * as inventoryService from '../../src/services/inventoryService.js';
import * as levelsService from '../../src/services/levelsService.js';
import * as patrimonyService from '../../src/services/patrimonyService.js';
import * as profilesService from '../../src/services/profilesService.js';
import * as purchasesService from '../../src/services/purchasesService.js';
import { dataDoDia } from '../../src/utils/diaDoJogador.js';

/**
 * Patrimônio contra banco real (RN-039 e RN-041).
 *
 * O que estes testes protegem é a conta fechar no centavo: comprar um bem
 * troca mel por bem e não muda o total, comprar cosmético é consumo e diminui,
 * e o cofre entra na soma. A foto de `patrimony_snapshots` é conferida como
 * foto, nunca como fonte.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const SENHA_FALSA = '$2b$10$hashfalsoparatestes000000000000000000000000000000000000';

describe('patrimônio', opcoes, () => {
  let banco;
  let patinete;
  let cosmetico;

  before(async () => {
    banco = await criarBancoDeTeste();
    patinete = await itemsRepository.buscarPorSlug('patinete');
    cosmetico = (await itemsRepository.listarAtivos()).find((item) => item.counts_in_patrimony === 0);
    assert.ok(cosmetico, 'o catálogo precisa ter ao menos um cosmético');
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function criarJogador(apelido, mel) {
    const idUsuario = await usersRepository.criar({
      email: `${apelido}@beever.dev`,
      apelido,
      dataNasc: '2014-04-02',
      senhaHash: SENHA_FALSA,
    });
    const idPerfil = await profilesRepository.criar({ idUsuario });
    await profilesRepository.atualizar(idPerfil, { faixaEtaria: 'C' });
    await walletsRepository.criar(idUsuario);
    await userLevelsRepository.criar(idUsuario);

    const curva = await levelsService.obterCurva();
    await emTransacao((conexao) =>
      userLevelsRepository.atualizar(conexao, idUsuario, {
        nivel: 12,
        xpTotal: levelsService.xpDoNivel(curva, 12),
        xpProximoNivel: levelsService.xpDoProximoNivel(curva, 12),
      }),
    );

    if (mel > 0) {
      await emTransacao((conexao) =>
        coinsService.creditar(conexao, idUsuario, mel, { motivo: 'ajuste-administrativo' }),
      );
    }
    return idUsuario;
  }

  /** Depósito no cofre pelo repository: o `VaultService` é a T-09.4. */
  async function depositar(idUsuario, valor) {
    await emTransacao(async (conexao) => {
      await vaultsRepository.criarSeNaoExistir(idUsuario, conexao);
      await coinsService.debitar(conexao, idUsuario, valor, { motivo: 'ajuste-administrativo' });
      await vaultsRepository.creditar(conexao, idUsuario, valor);
    });
  }

  it('jogador sem nada tem patrimônio zero, e ler não cria cofre', async () => {
    const idUsuario = await criarJogador('patrimonio-zerado', 0);

    const patrimonio = await patrimonyService.obterDoUsuario(idUsuario);

    assert.deepEqual(patrimonio, { carteira: 0, cofre: 0, bens: 0, total: 0 });
    assert.equal(await vaultsRepository.buscarPorUsuario(idUsuario), null, 'leitura não cria linha em vaults');
  });

  it('comprar um bem troca mel por bem e o total não se mexe', async () => {
    const idUsuario = await criarJogador('patrimonio-bem', Number(patinete.price));
    const antes = await patrimonyService.obterDoUsuario(idUsuario);

    await purchasesService.comprar(idUsuario, patinete.id);
    const depois = await patrimonyService.obterDoUsuario(idUsuario);

    assert.equal(depois.carteira, antes.carteira - Number(patinete.price));
    assert.equal(depois.bens, Number(patinete.price));
    assert.equal(depois.total, antes.total, 'o bem vale o que foi pago por ele');
  });

  it('cosmético é consumo: sai da carteira e não entra no patrimônio (RN-041)', async () => {
    const idUsuario = await criarJogador('patrimonio-cosmetico', Number(cosmetico.price));
    const antes = await patrimonyService.obterDoUsuario(idUsuario);

    await purchasesService.comprar(idUsuario, cosmetico.id);
    const depois = await patrimonyService.obterDoUsuario(idUsuario);

    assert.equal(depois.bens, 0, 'cosmético não vira bem');
    assert.equal(depois.total, antes.total - Number(cosmetico.price));
  });

  it('o mel guardado no cofre continua sendo patrimônio (RN-039)', async () => {
    const idUsuario = await criarJogador('patrimonio-cofre', 500);
    await depositar(idUsuario, 300);

    const patrimonio = await patrimonyService.obterDoUsuario(idUsuario);

    assert.equal(patrimonio.carteira, 200);
    assert.equal(patrimonio.cofre, 300);
    assert.equal(patrimonio.total, 500, 'guardar não empobrece ninguém');
  });

  it('a foto do dia é gravada uma vez e reescrita quando o total muda', async () => {
    const idUsuario = await criarJogador('patrimonio-foto', Number(patinete.price) + 100);
    const fuso = await profilesService.fusoDoUsuario(idUsuario);
    const hoje = dataDoDia(new Date(), fuso);

    await patrimonyService.obterDoUsuario(idUsuario);
    const primeira = await patrimonyRepository.buscarDoDia(idUsuario, hoje);
    assert.equal(Number(primeira.total_value), Number(patinete.price) + 100);

    // Ler de novo sem nada mudar não pode duplicar nem alterar a foto.
    await patrimonyService.obterDoUsuario(idUsuario);
    const segunda = await patrimonyRepository.buscarDoDia(idUsuario, hoje);
    assert.equal(segunda.id, primeira.id, 'uma foto por dia');

    // Comprar cosmético diminui o total, e a foto do dia acompanha.
    await purchasesService.comprar(idUsuario, cosmetico.id);
    const patrimonio = await patrimonyService.obterDoUsuario(idUsuario);
    const terceira = await patrimonyRepository.buscarDoDia(idUsuario, hoje);

    assert.equal(terceira.id, primeira.id, 'continua sendo a mesma linha do dia');
    assert.equal(Number(terceira.total_value), patrimonio.total);
    assert.equal(Number(terceira.items_value), patrimonio.bens);
  });

  it('o inventário separa bens de cosméticos e traz a composição (RF-INV-02 e 04)', async () => {
    const idUsuario = await criarJogador('patrimonio-inventario', Number(patinete.price) + Number(cosmetico.price));
    await purchasesService.comprar(idUsuario, patinete.id);
    await purchasesService.comprar(idUsuario, cosmetico.id);

    const resumo = await inventoryService.resumoDoUsuario(idUsuario);

    assert.equal(resumo.bens.length, 1);
    assert.equal(Number(resumo.bens[0].itemId), Number(patinete.id));
    assert.equal(resumo.bens[0].valorPago, Number(patinete.price), 'o valor pago vem da compra');
    assert.equal(resumo.cosmeticos.length, 1);
    assert.equal(resumo.patrimonio.bens, Number(patinete.price));
    assert.equal(
      resumo.patrimonio.total,
      resumo.patrimonio.carteira + resumo.patrimonio.cofre + resumo.patrimonio.bens,
    );
  });
});
