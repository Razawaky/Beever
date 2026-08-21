import * as inventoryRepository from '../repositories/inventoryRepository.js';
import * as itemsService from './itemsService.js';
import * as patrimonyService from './patrimonyService.js';

/**
 * A loja já respondida para o jogador: o que dá para comprar, o que falta e
 * quanto sai o upgrade de quem tem o item anterior. Quem transaciona a compra é
 * o `purchasesService`; aqui só se monta a vitrine e a prévia, para a tela não
 * ter conta nenhuma para fazer.
 */

/** As unidades que ainda estão em mãos e podem ser dadas como entrada. */
function unidadesAtivasDoItem(unidades, idItem) {
  return unidades.filter(
    (unidade) => unidade.status === 'ativo' && Number(unidade.item_id) === Number(idItem),
  );
}

/**
 * A entrada do upgrade (RF-LOJ-07): a unidade mais valiosa do item que esta
 * melhoria substitui. Mais valiosa porque é o melhor desconto possível, e a
 * criança não tem por que escolher o pior.
 */
function ofertaDeTroca(item, unidades) {
  if (!item.upgrade_of_item_id) return null;

  const candidatas = unidadesAtivasDoItem(unidades, item.upgrade_of_item_id);
  if (candidatas.length === 0) return null;

  const melhor = candidatas.reduce((maior, unidade) =>
    Number(unidade.current_value) > Number(maior.current_value) ? unidade : maior,
  );

  return {
    idUnidade: melhor.id,
    itemTrocado: melhor.item_name,
    desconto: Math.min(Number(melhor.current_value), Number(item.price)),
  };
}

/** O catálogo com o estado de compra de cada item para este jogador. */
export async function listarVitrine(idUsuario) {
  const [catalogo, patrimonio, unidades] = await Promise.all([
    itemsService.listarCatalogo(),
    patrimonyService.obterDoUsuario(idUsuario),
    inventoryRepository.listarPorUsuario(idUsuario),
  ]);

  const pendenciasPorItem = await itemsService.requisitosNaoCumpridosDosItens(
    catalogo.map((item) => item.id),
    idUsuario,
  );

  const itens = catalogo.map((item) => {
    const pendencias = pendenciasPorItem.get(Number(item.id)) ?? [];
    const bloqueios = pendencias.filter((pendencia) => !pendencia.naoVerificavelAinda);
    const troca = ofertaDeTroca(item, unidades);
    const preco = Number(item.price) - (troca?.desconto ?? 0);

    return {
      ...item,
      quantidadePossuida: unidadesAtivasDoItem(unidades, item.id).length,
      precoDeTabela: Number(item.price),
      precoComDesconto: preco,
      troca,
      bloqueios,
      avisos: pendencias.filter((pendencia) => pendencia.naoVerificavelAinda),
      podeComprar: bloqueios.length === 0 && patrimonio.carteira >= preco,
      faltamDeMel: Math.max(preco - patrimonio.carteira, 0),
    };
  });

  // Mel e patrimônio ficam no topo da loja (RF-LOJ-01).
  return { mel: patrimonio.carteira, patrimonio, itens };
}

/**
 * O impacto da compra antes de confirmar (RF-LOJ-05): quanto sai do bolso,
 * quanto sobra e o que o item passa a cobrar ou a render por semana.
 *
 * `idUnidadeTrocada` ausente usa a melhor entrada disponível, que é a mesma que
 * a vitrine ofereceu. A conferência de verdade da troca é do `purchasesService`,
 * dentro da transação — aqui é retrato, não decisão.
 */
export async function previaDaCompra(idUsuario, idItem, { idUnidadeTrocada = null } = {}) {
  const item = await itemsService.obterAtivo(idItem);
  const [patrimonio, unidades, pendencias] = await Promise.all([
    patrimonyService.obterDoUsuario(idUsuario),
    inventoryRepository.listarPorUsuario(idUsuario),
    itemsService.requisitosNaoCumpridos(idItem, idUsuario),
  ]);

  const oferta = ofertaDeTroca(item, unidades);
  const escolhida = idUnidadeTrocada
    ? unidades.find((unidade) => Number(unidade.id) === Number(idUnidadeTrocada) && unidade.status === 'ativo')
    : null;

  let troca = oferta;
  if (idUnidadeTrocada) {
    troca = escolhida
      ? {
          idUnidade: escolhida.id,
          itemTrocado: escolhida.item_name,
          desconto: Math.min(Number(escolhida.current_value), Number(item.price)),
        }
      : null;
  }

  const desconto = troca?.desconto ?? 0;
  const precoPago = Number(item.price) - desconto;
  const entraNoPatrimonio = Boolean(item.counts_in_patrimony);
  const bloqueios = pendencias.filter((pendencia) => !pendencia.naoVerificavelAinda);

  // O bem novo entra pelo preço de tabela e o entregue sai pelo desconto: é
  // assim que a tela consegue dizer "seu patrimônio vai para X" (RF-LOJ-05).
  const patrimonioDepois =
    patrimonio.total - precoPago + (entraNoPatrimonio ? Number(item.price) : 0) - desconto;

  return {
    item,
    precoDeTabela: Number(item.price),
    desconto,
    precoPago,
    troca,
    saldoAtual: patrimonio.carteira,
    saldoDepois: patrimonio.carteira - precoPago,
    patrimonioAtual: patrimonio.total,
    patrimonioDepois,
    custoSemanal: Number(item.upkeep_cost),
    rendaSemanal: Number(item.income_per_cycle),
    entraNoPatrimonio,
    bloqueios,
    avisos: pendencias.filter((pendencia) => pendencia.naoVerificavelAinda),
    podeComprar: bloqueios.length === 0 && patrimonio.carteira >= precoPago,
  };
}
