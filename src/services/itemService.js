import * as itemRepository from '../repositories/itemRepository.js';
import { erroNaoEncontrado } from '../utils/erros.js';

export async function listarCatalogo() {
  return itemRepository.listarAtivos();
}

export async function obterAtivo(idItem) {
  const item = await itemRepository.buscarAtivoPorId(idItem);
  if (!item) throw erroNaoEncontrado('Item não encontrado');
  return item;
}
