import { emTransacao } from '../config/database.js';
import * as inventoryRepository from '../repositories/inventoryRepository.js';
import * as purchasesRepository from '../repositories/purchasesRepository.js';
import { ErroAplicacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as idempotencyService from './idempotencyService.js';
import * as itemsService from './itemsService.js';

/**
 * Comprar um item é uma coisa só: debitar o mel, lançar no livro, gravar a
 * compra e dar entrada no inventário. Se qualquer passo falhar — saldo curto,
 * item que sumiu do catálogo —, nada do resto acontece.
 *
 * O preço é lido do catálogo e gravado na compra. Nunca se confia no preço que
 * veio do formulário: o cliente pediu o **item**, não o preço dele.
 */

/**
 * Grava a compra: debita, registra e dá entrada no inventário. Tudo ou nada.
 */
async function registrarCompra(conexao, { idUsuario, idItem, preco }) {
  await coinsService.debitar(conexao, idUsuario, preco, {
    motivo: 'compra',
    referenciaTipo: 'item',
    referenciaId: idItem,
  });

  const compra = await purchasesRepository.criar(conexao, {
    idUsuario,
    idItem,
    quantidade: 1,
    precoUnitario: preco,
    precoTotal: preco,
  });

  // Uma linha por unidade: no schema novo o inventário não tem quantidade,
  // porque cada unidade valoriza, deprecia e é vendida por conta própria.
  await inventoryRepository.adicionar(conexao, {
    idUsuario,
    idItem,
    idCompra: compra,
    valorInicial: preco,
  });

  return compra;
}

/**
 * `chaveDeIdempotencia` vem do formulário, uma por renderização da loja. Dois
 * cliques no mesmo botão mandam a mesma chave e compram uma vez só; abrir a
 * loja de novo traz chave nova, então comprar o mesmo item de propósito
 * continua possível (DT-18).
 *
 * Sem chave, a compra roda como antes — é o caminho de quem chama a API direto,
 * e a proteção fica por conta de quem chama.
 */
export async function comprar(idUsuario, idItem, { chaveDeIdempotencia = null } = {}) {
  const item = await itemsService.obterAtivo(idItem);
  const preco = Number(item.price);

  // Requisito que ainda não tem fonte de verdade (favo concluído, patrimônio
  // mínimo — E05 e E09) não bloqueia a compra: travar a loja por uma checagem
  // que ninguém sabe fazer deixaria itens do catálogo impossíveis de comprar.
  // Ele volta como aviso, para a tela poder mostrar.
  const pendencias = await itemsService.requisitosNaoCumpridos(idItem, idUsuario);
  const bloqueios = pendencias.filter((pendencia) => !pendencia.naoVerificavelAinda);

  if (bloqueios.length > 0) {
    throw new ErroAplicacao('Você ainda não cumpre os requisitos deste item', {
      status: 422,
      codigo: 'REQUISITO_NAO_CUMPRIDO',
      detalhes: bloqueios,
    });
  }

  if (!chaveDeIdempotencia) {
    const idCompra = await emTransacao((conexao) => registrarCompra(conexao, { idUsuario, idItem, preco }));
    return concluir(idUsuario, idItem, item, preco, idCompra, pendencias);
  }

  const { idCompra, repetida } = await idempotencyService.executarUmaVezSo(
    {
      chave: chaveDeIdempotencia,
      idUsuario,
      operacao: 'compra',
      pedido: { idItem },
    },
    {
      executar: async (conexao) => ({
        idCompra: await registrarCompra(conexao, { idUsuario, idItem, preco }),
        repetida: false,
      }),
      // A tabela de chaves guarda hash, não resposta: quem repete recebe a
      // compra que o primeiro envio gravou, que é a mais recente daquele item.
      aoRepetir: async () => ({
        idCompra: (await purchasesRepository.buscarUltimaDoItem(idUsuario, idItem))?.id ?? null,
        repetida: true,
      }),
    },
  );

  if (repetida) {
    return { idCompra, item, precoPago: preco, repetida: true, avisos: [] };
  }

  return concluir(idUsuario, idItem, item, preco, idCompra, pendencias);
}

/** Auditoria e resposta, comuns aos dois caminhos da compra. */
async function concluir(idUsuario, idItem, item, preco, idCompra, pendencias) {
  await auditService.registrar(auditService.usuario(idUsuario), 'compra.realizada', {
    entidade: 'purchase',
    id: idCompra,
    depois: { idItem, item: item.name, precoTotal: preco },
  });

  return {
    idCompra,
    item,
    precoPago: preco,
    repetida: false,
    avisos: pendencias.filter((pendencia) => pendencia.naoVerificavelAinda),
  };
}

export async function listarDoUsuario(idUsuario) {
  return purchasesRepository.listarPorUsuario(idUsuario);
}
