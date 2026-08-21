import * as inventoryRepository from '../repositories/inventoryRepository.js';
import * as patrimonyService from './patrimonyService.js';

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
      contaNoPatrimonio: Boolean(unidade.counts_in_patrimony),
      custoSemanal: Number(unidade.upkeep_cost),
      rendaSemanal: Number(unidade.income_per_cycle),
      quantidade: 0,
      valorTotal: 0,
      valorPago: 0,
      unidades: [],
    };

    grupo.quantidade += 1;
    grupo.valorTotal += Number(unidade.current_value);
    grupo.valorPago += Number(unidade.purchase_price ?? unidade.current_value);
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

/**
 * O inventário como a tela pede (RF-INV-02 e RF-INV-04): bens e cosméticos
 * separados, com a composição do patrimônio junto. Cosmético é consumo, e o
 * jogador precisa ver que ele não aumenta o que tem.
 */
export async function resumoDoUsuario(idUsuario) {
  const [grupos, patrimonio] = await Promise.all([
    listarAgrupadoPorItem(idUsuario),
    patrimonyService.obterDoUsuario(idUsuario),
  ]);

  return {
    patrimonio,
    bens: grupos.filter((grupo) => grupo.contaNoPatrimonio),
    cosmeticos: grupos.filter((grupo) => !grupo.contaNoPatrimonio),
  };
}
