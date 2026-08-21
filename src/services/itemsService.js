import * as inventoryRepository from '../repositories/inventoryRepository.js';
import * as itemsRepository from '../repositories/itemsRepository.js';
import * as levelsService from './levelsService.js';
import { erroNaoEncontrado } from '../utils/erros.js';

/** Catálogo da loja e os requisitos de compra de cada item. */

export async function listarCatalogo() {
  return itemsRepository.listarAtivos();
}

export async function obterAtivo(idItem) {
  const item = await itemsRepository.buscarAtivoPorId(idItem);
  if (!item) throw erroNaoEncontrado('Item não encontrado');
  return item;
}

/** O que um requisito exige do jogador, na língua da criança. Null quer dizer cumprido. */
function avaliarRequisito(requisito, { nivel, idsPossuidos }) {
  switch (requisito.requirement_type) {
    case 'nivel-minimo': {
      const exigido = Number(requisito.required_level);
      if (nivel && nivel.nivel >= exigido) return null;
      return { tipo: requisito.requirement_type, mensagem: `Chegue ao nível ${exigido}` };
    }
    case 'item-prerequisito': {
      if (idsPossuidos.has(Number(requisito.required_item_id))) return null;
      return {
        tipo: requisito.requirement_type,
        mensagem: `Compre antes: ${requisito.required_item_name ?? 'outro item'}`,
      };
    }
    default:
      // favo-concluido e patrimonio-minimo: sem fonte de verdade até a E05/T-09.3.
      return {
        tipo: requisito.requirement_type,
        mensagem: 'Este requisito ainda não pode ser verificado',
        naoVerificavelAinda: true,
      };
  }
}

/**
 * Confere os requisitos de compra (RN-033) de um lote de itens e devolve um Map
 * de id do item para a lista do que falta. Em lote porque a vitrine pergunta
 * pelo catálogo inteiro de uma vez.
 *
 * Devolve a lista do que não foi cumprido em vez de lançar no primeiro
 * problema: a loja precisa poder dizer "falta nível 5 **e** o patinete", não
 * uma exigência de cada vez.
 */
export async function requisitosNaoCumpridosDosItens(idsDeItens, idUsuario) {
  const pendentesPorItem = new Map(idsDeItens.map((id) => [Number(id), []]));

  const requisitos = await itemsRepository.listarRequisitosDosItens(idsDeItens);
  if (requisitos.length === 0) return pendentesPorItem;

  const [nivel, unidades] = await Promise.all([
    levelsService.obterDoUsuario(idUsuario),
    inventoryRepository.listarPorUsuario(idUsuario),
  ]);
  const idsPossuidos = new Set(unidades.map((unidade) => Number(unidade.item_id)));

  for (const requisito of requisitos) {
    const pendencia = avaliarRequisito(requisito, { nivel, idsPossuidos });
    if (pendencia) pendentesPorItem.get(Number(requisito.item_id))?.push(pendencia);
  }

  return pendentesPorItem;
}

/** Os requisitos que faltam para um item só — o caminho da compra. */
export async function requisitosNaoCumpridos(idItem, idUsuario) {
  const pendentesPorItem = await requisitosNaoCumpridosDosItens([Number(idItem)], idUsuario);
  return pendentesPorItem.get(Number(idItem)) ?? [];
}
