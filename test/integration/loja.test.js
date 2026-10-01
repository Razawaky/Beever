import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import * as inventoryRepository from '../../src/repositories/inventoryRepository.js';
import * as itemsRepository from '../../src/repositories/itemsRepository.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as purchasesRepository from '../../src/repositories/purchasesRepository.js';
import * as userLevelsRepository from '../../src/repositories/userLevelsRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';
import * as walletsRepository from '../../src/repositories/walletsRepository.js';
import * as coinsService from '../../src/services/coinsService.js';
import * as levelsService from '../../src/services/levelsService.js';
import * as purchasesService from '../../src/services/purchasesService.js';
import * as shopService from '../../src/services/shopService.js';

/**
 * A loja contra banco real (RF-LOJ, RN-032/033).
 *
 * O que estes testes protegem é a aritmética da troca: no upgrade o valor do
 * bem antigo vira desconto, e o patrimônio do jogador não pode encolher nem
 * crescer por causa disso — o que sai da carteira tem que aparecer no bem.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const SENHA_FALSA = '$2b$10$hashfalsoparatestes000000000000000000000000000000000000';

describe('loja', opcoes, () => {
  let banco;
  let casaPequena;
  let casaMedia;
  let patinete;

  before(async () => {
    banco = await criarBancoDeTeste();
    casaPequena = await itemsRepository.buscarPorSlug('casa-pequena');
    casaMedia = await itemsRepository.buscarPorSlug('casa-media');
    patinete = await itemsRepository.buscarPorSlug('patinete');
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  /** Um jogador pronto para comprar: perfil, carteira, nível alto e mel na mão. */
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

    // O nível entra direto: estes testes são sobre a loja, não sobre como o XP
    // foi ganho, e casa-pequena exige nível 5.
    const curva = await levelsService.obterCurva();
    await emTransacao((conexao) =>
      userLevelsRepository.atualizar(conexao, idUsuario, {
        nivel: 12,
        xpTotal: levelsService.xpDoNivel(curva, 12),
        xpProximoNivel: levelsService.xpDoProximoNivel(curva, 12),
      }),
    );

    if (mel > 0) await creditar(idUsuario, mel);
    return idUsuario;
  }

  async function creditar(idUsuario, quantidade) {
    await emTransacao((conexao) =>
      coinsService.creditar(conexao, idUsuario, quantidade, { motivo: 'ajuste-administrativo' }),
    );
  }

  async function melDe(idUsuario) {
    return (await coinsService.obterCarteira(idUsuario)).mel;
  }

  async function unidadesDe(idUsuario) {
    return inventoryRepository.listarPorUsuario(idUsuario);
  }

  it('compra sem mel suficiente é recusada e não deixa rastro', async () => {
    const idUsuario = await criarJogador('loja-sem-mel', Number(casaPequena.price) - 1);

    await assert.rejects(
      () => purchasesService.comprar(idUsuario, casaPequena.id),
      (erro) => erro.codigo === 'MEL_INSUFICIENTE',
    );

    assert.equal(await melDe(idUsuario), Number(casaPequena.price) - 1, 'o saldo não se mexe');
    assert.equal((await unidadesDe(idUsuario)).length, 0, 'nada entrou no inventário');
  });

  it('requisito de item não cumprido barra a compra antes do débito', async () => {
    const idUsuario = await criarJogador('loja-sem-requisito', Number(casaMedia.price));

    await assert.rejects(
      () => purchasesService.comprar(idUsuario, casaMedia.id),
      (erro) => erro.codigo === 'REQUISITO_NAO_CUMPRIDO',
    );

    assert.equal(await melDe(idUsuario), Number(casaMedia.price), 'o saldo não se mexe');
  });

  it('o upgrade abate o valor da unidade entregue e conserva o patrimônio', async () => {
    const idUsuario = await criarJogador('loja-upgrade', Number(casaPequena.price));
    const primeira = await purchasesService.comprar(idUsuario, casaPequena.id);

    const unidadeAntiga = (await unidadesDe(idUsuario))[0];
    const desconto = Number(unidadeAntiga.current_value);
    const aPagar = Number(casaMedia.price) - desconto;
    await creditar(idUsuario, aPagar);

    const patrimonioAntes = (await melDe(idUsuario)) + (await inventoryRepository.valorTotalEmPatrimonio(idUsuario));

    const compra = await purchasesService.comprar(idUsuario, casaMedia.id, {
      idUnidadeTrocada: unidadeAntiga.id,
    });

    assert.equal(compra.desconto, desconto, 'o desconto é o valor atual da unidade entregue');
    assert.equal(compra.precoPago, aPagar);
    assert.equal(await melDe(idUsuario), 0, 'saiu da carteira só a diferença');

    const linha = await purchasesRepository.buscarPorId(compra.idCompra);
    assert.equal(Number(linha.price_at_purchase), Number(casaMedia.price), 'o preço de tabela fica congelado');
    assert.equal(Number(linha.discount_applied), desconto);
    assert.equal(Number(linha.total_price), aPagar);

    const emMaos = await unidadesDe(idUsuario);
    assert.equal(emMaos.length, 1, 'a casa entregue saiu do inventário');
    assert.equal(Number(emMaos[0].item_id), Number(casaMedia.id));
    assert.equal(Number(emMaos[0].current_value), Number(casaMedia.price), 'a nova nasce valendo o preço cheio');

    const patrimonioDepois = (await melDe(idUsuario)) + (await inventoryRepository.valorTotalEmPatrimonio(idUsuario));
    assert.equal(patrimonioDepois, patrimonioAntes, 'trocar não cria nem destrói patrimônio');

    const vendida = await inventoryRepository.buscarPorId(unidadeAntiga.id);
    assert.equal(vendida.status, 'vendido');
    assert.equal(Number(vendida.sold_value), desconto);
    assert.ok(primeira.idCompra, 'a compra da casa pequena continua no extrato');
  });

  it('entregar unidade que não é a substituída pelo upgrade é recusado', async () => {
    const mel = Number(patinete.price) + Number(casaPequena.price) + Number(casaMedia.price);
    const idUsuario = await criarJogador('loja-troca-errada', mel);
    await purchasesService.comprar(idUsuario, patinete.id);
    await purchasesService.comprar(idUsuario, casaPequena.id);

    const unidades = await unidadesDe(idUsuario);
    const unidadeDoPatinete = unidades.find((unidade) => Number(unidade.item_id) === Number(patinete.id));
    const antes = await melDe(idUsuario);

    // A casa média substitui a pequena, não o patinete.
    await assert.rejects(
      () => purchasesService.comprar(idUsuario, casaMedia.id, { idUnidadeTrocada: unidadeDoPatinete.id }),
      (erro) => erro.codigo === 'TROCA_INVALIDA',
    );

    assert.equal(await melDe(idUsuario), antes, 'compra recusada não mexe no saldo');
    assert.equal((await unidadesDe(idUsuario)).length, 2, 'nada saiu do inventário');
  });

  it('item que não é melhoria de nada não aceita entrada', async () => {
    const idUsuario = await criarJogador('loja-sem-upgrade', Number(patinete.price) * 2);
    await purchasesService.comprar(idUsuario, patinete.id);
    const unidade = (await unidadesDe(idUsuario))[0];

    await assert.rejects(
      () => purchasesService.comprar(idUsuario, patinete.id, { idUnidadeTrocada: unidade.id }),
      (erro) => erro.codigo === 'TROCA_INVALIDA',
    );
  });

  it('o mesmo upgrade enviado duas vezes compra uma vez só', async () => {
    const idUsuario = await criarJogador('loja-upgrade-duplo', Number(casaPequena.price) + Number(casaMedia.price));
    await purchasesService.comprar(idUsuario, casaPequena.id);
    const unidadeAntiga = (await unidadesDe(idUsuario))[0];

    const chave = randomUUID();
    const pedido = { chaveDeIdempotencia: chave, idUnidadeTrocada: unidadeAntiga.id };

    const primeira = await purchasesService.comprar(idUsuario, casaMedia.id, pedido);
    const segunda = await purchasesService.comprar(idUsuario, casaMedia.id, pedido);

    assert.equal(segunda.repetida, true);
    assert.equal(segunda.idCompra, primeira.idCompra, 'a segunda devolve a compra da primeira');
    assert.equal(segunda.precoPago, primeira.precoPago);

    const emMaos = await unidadesDe(idUsuario);
    assert.equal(emMaos.length, 1, 'só uma casa média entrou');
  });

  it('a vitrine mostra o desconto da troca e o que falta de mel', async () => {
    const idUsuario = await criarJogador('loja-vitrine', Number(casaPequena.price));
    await purchasesService.comprar(idUsuario, casaPequena.id);

    const vitrine = await shopService.listarVitrine(idUsuario);
    const media = vitrine.itens.find((item) => item.slug === 'casa-media');

    assert.equal(vitrine.mel, 0);
    assert.equal(media.troca.desconto, Number(casaPequena.price), 'a entrega oferecida é a casa que ele tem');
    assert.equal(media.precoComDesconto, Number(casaMedia.price) - Number(casaPequena.price));
    assert.equal(media.podeComprar, false, 'sem mel para a diferença, ainda não dá');
    assert.equal(media.faltamDeMel, media.precoComDesconto);

    const pequena = vitrine.itens.find((item) => item.slug === 'casa-pequena');
    assert.equal(pequena.quantidadePossuida, 1);
  });

  it('a prévia mostra o impacto da compra antes de confirmar', async () => {
    const idUsuario = await criarJogador('loja-previa', Number(casaPequena.price) + Number(casaMedia.price));
    await purchasesService.comprar(idUsuario, casaPequena.id);
    const unidadeAntiga = (await unidadesDe(idUsuario))[0];

    const previa = await shopService.previaDaCompra(idUsuario, casaMedia.id, {
      idUnidadeTrocada: unidadeAntiga.id,
    });

    assert.equal(previa.desconto, Number(casaPequena.price));
    assert.equal(previa.precoPago, Number(casaMedia.price) - Number(casaPequena.price));
    assert.equal(previa.saldoDepois, previa.saldoAtual - previa.precoPago);
    assert.equal(previa.custoSemanal, Number(casaMedia.upkeep_cost), 'a tela precisa dizer quanto vai custar por semana');
    assert.equal(previa.podeComprar, true);
  });
});
