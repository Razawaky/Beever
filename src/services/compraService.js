import { emTransacao } from '../config/database.js';
import * as auditoriaRepository from '../repositories/auditoriaRepository.js';
import * as compraRepository from '../repositories/compraRepository.js';
import * as inventarioRepository from '../repositories/inventarioRepository.js';
import * as itemService from './itemService.js';
import * as moedasService from './moedasService.js';

/**
 * Comprar um item precisa debitar moedas, gravar a compra e atualizar o
 * inventário como uma coisa só — se qualquer passo falhar (ex.: saldo
 * insuficiente), nada do resto acontece.
 */
export async function comprar(idPerfil, idItem, idUsuario) {
  const item = await itemService.obterAtivo(idItem);

  const resultado = await emTransacao(async (conexao) => {
    await moedasService.debitar(conexao, idPerfil, item.preco);

    await compraRepository.criar(conexao, {
      idPerfil,
      idItem,
      quantidade: 1,
      precoUnitario: item.preco,
      precoTotal: item.preco,
    });

    await inventarioRepository.adicionarOuIncrementar(conexao, { idPerfil, idItem, quantidade: 1 });

    return { item };
  });

  await auditoriaRepository.registrar({
    atorTipo: 'Usuario',
    atorId: idUsuario,
    acao: 'COMPRAR_ITEM',
    entidade: 'compra',
    entidadeId: idItem,
    estadoNovo: { idItem, nome: item.nome, precoTotal: item.preco },
  });

  return resultado;
}
