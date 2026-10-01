import * as progressRepository from '../repositories/progressRepository.js';
import * as streaksRepository from '../repositories/streaksRepository.js';
import * as achievementsService from './achievementsService.js';
import { CRITERIOS, proximaConquista } from './criteriosDeConquista.js';
import * as patrimonyService from './patrimonyService.js';

/**
 * O catálogo de conquistas do jeito que a tela precisa (RF-GAM-01, T-13.4):
 * cada família com o que já foi destravado e o quanto falta para o degrau
 * seguinte. Mora fora do `achievementsService` porque junta números de três
 * lugares diferentes, e o service de conquista só sabe de conquista.
 */

/** O número que hoje vale para cada critério, na mesma chave que o catálogo usa. */
export async function valoresAtuais(idUsuario) {
  const [patrimonio, conquistados, sequencia] = await Promise.all([
    patrimonyService.obterDoUsuario(idUsuario),
    progressRepository.contarConquistados(idUsuario),
    streaksRepository.criarSeNaoExistir(idUsuario),
  ]);

  // A sequência usa o melhor já alcançado, e não o atual: perder um dia não
  // pode tirar da tela o degrau que a criança já tinha conquistado.
  return {
    'sequencia-dias': Number(sequencia.best_days),
    'favos-concluidos': conquistados.favos,
    'celulas-concluidas': conquistados.celulas,
    'patrimonio-total': patrimonio.total,
    'cofre-guardado': patrimonio.cofre,
  };
}

function montarDegrau(conquista, valorAtual) {
  return {
    slug: conquista.slug,
    nome: conquista.name,
    descricao: conquista.description,
    alvo: Number(conquista.criterion_target),
    mel: Number(conquista.reward_coins),
    desbloqueada: Boolean(conquista.unlocked_at),
    desbloqueadaEm: conquista.unlocked_at ?? null,
    valorAtual,
  };
}

function montarFamilia(criterio, degraus, valorAtual) {
  const proxima = proximaConquista(degraus, valorAtual);

  return {
    criterio,
    titulo: CRITERIOS[criterio],
    valorAtual,
    // Quem já subiu a escada inteira não tem próximo degrau, e a tela diz isso
    // em vez de inventar um alvo.
    falta: proxima ? proxima.falta : null,
    alvoDaProxima: proxima ? Number(proxima.conquista.criterion_target) : null,
    conquistas: degraus.map((conquista) => montarDegrau(conquista, valorAtual)),
  };
}

/**
 * O catálogo agrupado por família, na ordem em que os critérios são declarados.
 *
 * A conquista travada aparece com alvo e progresso, e não escondida: a escada
 * visível é o que dá motivo para voltar amanhã.
 */
export async function catalogoPorFamilia(idUsuario) {
  const valores = await valoresAtuais(idUsuario);
  // Avalia antes de ler o catálogo, senão a tela mostraria "12 de 12 favos" num
  // degrau ainda travado para quem chega aqui sem passar pela Colmeia.
  await achievementsService.avaliarEventos(idUsuario, valores);

  const catalogo = await achievementsService.catalogoDoUsuario(idUsuario);

  const familias = Object.keys(CRITERIOS)
    .map((criterio) => {
      const degraus = catalogo.filter((conquista) => conquista.criterion_type === criterio);
      return montarFamilia(criterio, degraus, valores[criterio] ?? 0);
    })
    .filter((familia) => familia.conquistas.length > 0);

  return {
    familias,
    total: catalogo.length,
    desbloqueadas: catalogo.filter((conquista) => conquista.unlocked_at).length,
  };
}
