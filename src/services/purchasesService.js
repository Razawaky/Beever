import { emTransacao } from '../config/database.js';
import * as inventoryRepository from '../repositories/inventoryRepository.js';
import * as purchasesRepository from '../repositories/purchasesRepository.js';
import { ErroAplicacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as idempotencyService from './idempotencyService.js';
import * as itemsService from './itemsService.js';
import * as streakService from './streakService.js';

/**
 * Comprar um item é uma coisa só: debitar o mel, lançar no livro, gravar a
 * compra e dar entrada no inventário. Se qualquer passo falhar — saldo curto,
 * item que sumiu do catálogo —, nada do resto acontece.
 *
 * O preço é lido do catálogo e gravado na compra. Nunca se confia no preço que
 * veio do formulário: o cliente pediu o **item**, não o preço dele.
 */

const ESCUDO = 'escudo-de-sequencia';
const MAXIMO_DE_ESCUDOS = 2;

/**
 * O teto de dois escudos guardados é da RN-022, e é conferido antes do débito:
 * recusar depois de tirar o mel devolveria a criança à loja sem o mel e sem o
 * item.
 */
async function exigirVagaParaEscudo(idUsuario, item) {
  if (item.slug !== ESCUDO) return;
  if ((await streakService.escudosDisponiveis(idUsuario)) < MAXIMO_DE_ESCUDOS) return;

  throw new ErroAplicacao('Você já tem dois Escudos de Sequência guardados', {
    status: 422,
    codigo: 'LIMITE_DE_ESCUDOS',
  });
}

/**
 * Recusa a compra que não cumpre os requisitos do item (RN-033) e devolve o que
 * ficou apenas como aviso.
 *
 * Requisito que ainda não tem fonte de verdade (favo concluído, patrimônio
 * mínimo — E05 e T-09.3) não bloqueia: travar a loja por uma checagem que
 * ninguém sabe fazer deixaria itens do catálogo impossíveis de comprar.
 */
async function exigirRequisitos(idItem, idUsuario) {
  const pendencias = await itemsService.requisitosNaoCumpridos(idItem, idUsuario);
  const bloqueios = pendencias.filter((pendencia) => !pendencia.naoVerificavelAinda);

  if (bloqueios.length > 0) {
    throw new ErroAplicacao('Você ainda não cumpre os requisitos deste item', {
      status: 422,
      codigo: 'REQUISITO_NAO_CUMPRIDO',
      detalhes: bloqueios,
    });
  }

  return pendencias;
}

/**
 * A unidade que o jogador entrega no upgrade (RF-LOJ-07), travada e conferida
 * dentro da transação: o valor dela vira desconto, e ler antes deixaria a
 * janela para trocar a mesma casa duas vezes.
 *
 * O abatimento é o valor atual cheio, não os 60% da venda voluntária (RN-040):
 * na troca o jogador não está se desfazendo do bem, está movendo o valor dele
 * para um bem maior.
 */
async function resolverTroca(conexao, { idUsuario, item, preco, idUnidadeTrocada }) {
  if (!idUnidadeTrocada) return null;

  if (!item.upgrade_of_item_id) {
    throw new ErroAplicacao('Este item não é melhoria de nenhum outro', {
      status: 422,
      codigo: 'TROCA_INVALIDA',
    });
  }

  const unidade = await inventoryRepository.bloquearUnidadeAtiva(conexao, idUnidadeTrocada, idUsuario);
  if (!unidade || Number(unidade.item_id) !== Number(item.upgrade_of_item_id)) {
    throw new ErroAplicacao('Esse item não pode ser dado como entrada nesta compra', {
      status: 422,
      codigo: 'TROCA_INVALIDA',
    });
  }

  // O desconto nunca passa do preço: mel de troco não existe, a compra é que
  // sai de graça.
  return { id: unidade.id, desconto: Math.min(Number(unidade.current_value), preco) };
}

/**
 * Grava a compra: debita, registra e dá entrada no inventário. Tudo ou nada.
 *
 * A unidade nasce valendo o preço de tabela mesmo quando houve troca — o valor
 * do bem antigo foi transferido para o novo, e não sumiu do patrimônio.
 *
 * Os requisitos são conferidos aqui dentro, e não antes: o reenvio idempotente
 * de um upgrade não pode ser recusado pelo pré-requisito que a própria primeira
 * compra acabou de consumir.
 */
async function registrarCompra(conexao, { idUsuario, item, preco, idUnidadeTrocada }) {
  const idItem = item.id;
  await exigirVagaParaEscudo(idUsuario, item);
  const pendencias = await exigirRequisitos(idItem, idUsuario);

  const troca = await resolverTroca(conexao, { idUsuario, item, preco, idUnidadeTrocada });
  const desconto = troca?.desconto ?? 0;
  const aPagar = preco - desconto;

  // Troca que cobre o preço inteiro não passa pela carteira: debitar zero é
  // recusado pelo `coinsService`, e não há mel a tirar mesmo.
  if (aPagar > 0) {
    await coinsService.debitar(conexao, idUsuario, aPagar, {
      motivo: 'compra',
      referenciaTipo: 'item',
      referenciaId: idItem,
    });
  }

  const compra = await purchasesRepository.criar(conexao, {
    idUsuario,
    idItem,
    quantidade: 1,
    precoUnitario: preco,
    desconto,
    precoTotal: aPagar,
  });

  // Uma linha por unidade: no schema novo o inventário não tem quantidade,
  // porque cada unidade valoriza, deprecia e é vendida por conta própria.
  await inventoryRepository.adicionar(conexao, {
    idUsuario,
    idItem,
    idCompra: compra,
    valorInicial: preco,
  });

  // A unidade entregue sai do inventário pelo valor que virou desconto.
  if (troca) await inventoryRepository.marcarComoVendido(conexao, troca.id, desconto);

  // O escudo tem espelho em `streaks.shields_available`, e ele é refeito na
  // mesma transação da compra (RN-022).
  if (item.slug === ESCUDO) await streakService.sincronizarEscudos(conexao, idUsuario);

  return { idCompra: compra, desconto, aPagar, pendencias };
}

/**
 * `chaveDeIdempotencia` vem do formulário, uma por renderização da loja. Dois
 * cliques no mesmo botão mandam a mesma chave e compram uma vez só; abrir a
 * loja de novo traz chave nova, então comprar o mesmo item de propósito
 * continua possível (DT-18).
 *
 * Sem chave, a compra roda como antes — é o caminho de quem chama a API direto,
 * e a proteção fica por conta de quem chama.
 *
 * `idUnidadeTrocada` é opcional: quem quiser ficar com a casa pequena paga o
 * preço cheio da média.
 */
export async function comprar(idUsuario, idItem, { chaveDeIdempotencia = null, idUnidadeTrocada = null } = {}) {
  const item = await itemsService.obterAtivo(idItem);
  const preco = Number(item.price);

  // Retrato antes do débito. A compra é a única operação que tira mel, e a
  // RN-010 pede o antes/depois justamente do que muda o saldo.
  const saldoAntes = await auditService.retratoDoSaldo(idUsuario);
  const pedido = { idUsuario, item, preco, idUnidadeTrocada };

  if (!chaveDeIdempotencia) {
    const gravada = await emTransacao((conexao) => registrarCompra(conexao, pedido));
    return concluir({ idUsuario, item, preco, gravada, saldoAntes, idUnidadeTrocada });
  }

  const { gravada, repetida, compraAnterior } = await idempotencyService.executarUmaVezSo(
    {
      chave: chaveDeIdempotencia,
      idUsuario,
      operacao: 'compra',
      pedido: { idItem, idUnidadeTrocada },
    },
    {
      executar: async (conexao) => ({ gravada: await registrarCompra(conexao, pedido), repetida: false }),
      // A tabela de chaves guarda hash, não resposta: quem repete recebe a
      // compra que o primeiro envio gravou, que é a mais recente daquele item.
      aoRepetir: async () => ({
        compraAnterior: await purchasesRepository.buscarUltimaDoItem(idUsuario, idItem),
        repetida: true,
      }),
    },
  );

  if (repetida) {
    return {
      idCompra: compraAnterior?.id ?? null,
      item,
      precoDeTabela: preco,
      desconto: Number(compraAnterior?.discount_applied ?? 0),
      precoPago: Number(compraAnterior?.total_price ?? preco),
      repetida: true,
      avisos: [],
    };
  }

  return concluir({ idUsuario, item, preco, gravada, saldoAntes, idUnidadeTrocada });
}

/** Auditoria e resposta, comuns aos dois caminhos da compra. */
async function concluir({ idUsuario, item, preco, gravada, saldoAntes, idUnidadeTrocada }) {
  await auditService.registrarRecompensa(auditService.usuario(idUsuario), 'compra.realizada', {
    entidade: 'purchase',
    id: gravada.idCompra,
    antes: saldoAntes,
    depois: await auditService.retratoDoSaldo(idUsuario),
    detalhes: {
      idItem: item.id,
      item: item.name,
      precoTotal: gravada.aPagar,
      desconto: gravada.desconto,
      unidadeTrocada: idUnidadeTrocada ?? null,
    },
  });

  return {
    idCompra: gravada.idCompra,
    item,
    precoDeTabela: preco,
    desconto: gravada.desconto,
    precoPago: gravada.aPagar,
    repetida: false,
    avisos: gravada.pendencias.filter((pendencia) => pendencia.naoVerificavelAinda),
  };
}

export async function listarDoUsuario(idUsuario) {
  return purchasesRepository.listarPorUsuario(idUsuario);
}
