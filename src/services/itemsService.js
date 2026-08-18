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

/**
 * Confere os requisitos de compra do item (RN-036).
 *
 * Devolve a lista do que não foi cumprido em vez de lançar no primeiro
 * problema: a loja precisa poder dizer "falta nível 5 **e** o patinete", não
 * uma exigência de cada vez.
 *
 * `favo-concluido` e `patrimonio-minimo` ainda não têm como ser verificados —
 * trilha e patrimônio são E05 e E09. Ficam registrados como pendentes em vez de
 * passarem calados, porque requisito que ninguém checa é requisito que não
 * existe.
 */
export async function requisitosNaoCumpridos(idItem, idUsuario) {
  const requisitos = await itemsRepository.listarRequisitos(idItem);
  if (requisitos.length === 0) return [];

  const nivel = await levelsService.obterDoUsuario(idUsuario);
  const pendentes = [];

  for (const requisito of requisitos) {
    switch (requisito.requirement_type) {
      case 'nivel-minimo': {
        const exigido = Number(requisito.required_level);
        if (!nivel || nivel.nivel < exigido) {
          pendentes.push({ tipo: requisito.requirement_type, mensagem: `Chegue ao nível ${exigido}` });
        }
        break;
      }
      case 'item-prerequisito': {
        const possui = await inventoryRepository.possuiItem(idUsuario, requisito.required_item_id);
        if (!possui) {
          const prerequisito = await itemsRepository.buscarAtivoPorId(requisito.required_item_id);
          pendentes.push({
            tipo: requisito.requirement_type,
            mensagem: `Compre antes: ${prerequisito?.name ?? 'outro item'}`,
          });
        }
        break;
      }
      default:
        // favo-concluido e patrimonio-minimo: sem fonte de verdade até a E05/E09.
        pendentes.push({
          tipo: requisito.requirement_type,
          mensagem: 'Este requisito ainda não pode ser verificado',
          naoVerificavelAinda: true,
        });
    }
  }

  return pendentes;
}
