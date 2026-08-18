import * as inventoryRepository from '../repositories/inventoryRepository.js';

/**
 * Inventário do jogador.
 *
 * Uma linha por unidade possuída, não uma linha por item com contagem — foi o
 * que o schema novo passou a exigir. A tela normalmente quer ver o agrupado
 * ("2 patinetes"), então o agrupamento acontece aqui, no service, sem perder a
 * identidade de cada unidade: o valor atual de cada uma é diferente assim que o
 * primeiro ciclo econômico roda.
 */

export async function listarDoUsuario(idUsuario) {
  return inventoryRepository.listarPorUsuario(idUsuario);
}

/** Agrupa por item, somando as unidades e o valor — o formato que a tela pede. */
export async function listarAgrupadoPorItem(idUsuario) {
  const unidades = await inventoryRepository.listarPorUsuario(idUsuario);
  const porItem = new Map();

  for (const unidade of unidades) {
    const chave = Number(unidade.item_id);
    const grupo = porItem.get(chave) ?? {
      itemId: chave,
      nome: unidade.item_name,
      slug: unidade.item_slug,
      categoria: unidade.category_name,
      quantidade: 0,
      valorTotal: 0,
      unidades: [],
    };

    grupo.quantidade += 1;
    grupo.valorTotal += Number(unidade.current_value);
    grupo.unidades.push(unidade);
    porItem.set(chave, grupo);
  }

  return [...porItem.values()];
}

/** Ids dos itens que o jogador já tem — a loja usa para marcar "você já tem". */
export async function idsPossuidos(idUsuario) {
  const unidades = await inventoryRepository.listarPorUsuario(idUsuario);
  return new Set(unidades.map((unidade) => Number(unidade.item_id)));
}

export async function valorEmPatrimonio(idUsuario) {
  return inventoryRepository.valorTotalEmPatrimonio(idUsuario);
}
