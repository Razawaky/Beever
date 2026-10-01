import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import * as itemsRepository from '../../src/repositories/itemsRepository.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as userLevelsRepository from '../../src/repositories/userLevelsRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';
import * as walletsRepository from '../../src/repositories/walletsRepository.js';
import * as coinsService from '../../src/services/coinsService.js';
import * as purchasesService from '../../src/services/purchasesService.js';

/**
 * Idempotência da compra, contra banco real (RN-009, RNF-16, DT-18).
 *
 * O que estes testes protegem: dois cliques no mesmo botão criavam duas compras
 * e debitavam duas vezes. A chave vem do formulário, uma por renderização da
 * loja — então comprar o mesmo item de propósito, em outra visita, continua
 * possível.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('idempotência da compra', opcoes, () => {
  let banco;
  let conexao;
  let idUsuario;
  let item;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;

    idUsuario = await usersRepository.criar({
      email: 'idempotencia@beever.dev',
      apelido: 'comprador',
      dataNasc: '2014-04-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
    const idPerfil = await profilesRepository.criar({ idUsuario });
    await profilesRepository.atualizar(idPerfil, { faixaEtaria: 'C' });
    await walletsRepository.criar(idUsuario);
    await userLevelsRepository.criar(idUsuario);

    item = await itemsRepository.buscarPorSlug('patinete');
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function darMel(quantidade) {
    await emTransacao((conn) =>
      coinsService.creditar(conn, idUsuario, quantidade, { motivo: 'ajuste-administrativo' }),
    );
  }

  async function contarCompras() {
    const [linhas] = await conexao.query('SELECT COUNT(*) AS total FROM purchases WHERE user_id = ?', [
      idUsuario,
    ]);
    return Number(linhas[0].total);
  }

  it('a mesma chave compra uma vez só, mesmo enviada duas', async () => {
    await darMel(Number(item.price) * 3);
    const chave = randomUUID();

    const primeira = await purchasesService.comprar(idUsuario, item.id, { chaveDeIdempotencia: chave });
    const saldoDepoisDaPrimeira = (await coinsService.obterCarteira(idUsuario)).mel;

    const segunda = await purchasesService.comprar(idUsuario, item.id, { chaveDeIdempotencia: chave });

    assert.equal(segunda.repetida, true, 'o segundo envio não cria compra');
    assert.equal(segunda.idCompra, primeira.idCompra, 'e responde com a compra que existe');
    assert.equal((await coinsService.obterCarteira(idUsuario)).mel, saldoDepoisDaPrimeira, 'nem debita de novo');
    assert.equal(await contarCompras(), 1);
  });

  it('chave nova compra o mesmo item outra vez, porque isso é legítimo', async () => {
    const compra = await purchasesService.comprar(idUsuario, item.id, { chaveDeIdempotencia: randomUUID() });

    assert.equal(compra.repetida, false);
    assert.equal(await contarCompras(), 2);
  });

  it('chave repetida com outro pedido é recusada, em vez de engolir a compra', async () => {
    const chave = randomUUID();
    const outroItem = await itemsRepository.buscarPorSlug('bicicleta');

    await purchasesService.comprar(idUsuario, item.id, { chaveDeIdempotencia: chave });

    await assert.rejects(
      () => purchasesService.comprar(idUsuario, outroItem.id, { chaveDeIdempotencia: chave }),
      (erro) => erro.codigo === 'CHAVE_REUTILIZADA',
    );
  });

  it('a chave fica registrada com a operação que a usou', async () => {
    const [linhas] = await conexao.query(
      'SELECT operation, COUNT(*) AS total FROM idempotency_keys WHERE user_id = ? GROUP BY operation',
      [idUsuario],
    );

    assert.deepEqual(
      linhas.map((linha) => linha.operation),
      ['compra'],
    );
  });
});
