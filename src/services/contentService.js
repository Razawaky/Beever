import * as cellsRepository from '../repositories/cellsRepository.js';
import * as contentsRepository from '../repositories/contentsRepository.js';
import * as hivesRepository from '../repositories/hivesRepository.js';
import * as profilesRepository from '../repositories/profilesRepository.js';
import * as progressRepository from '../repositories/progressRepository.js';
import { erroAcessoNegado, erroNaoEncontrado } from '../utils/erros.js';
import * as inventoryService from './inventoryService.js';
import * as patrimonyService from './patrimonyService.js';
import * as validadoresDeJogo from './validadoresDeJogo.js';

/**
 * `ContentService` — o que o jogador pode abrir na trilha, e por que não pode o
 * resto (RF-CON-01 a 03 e 06).
 *
 * Quatro regras decidem o estado de cada coisa:
 * - RN-026: a célula seguinte abre quando a anterior é concluída com 1 estrela.
 * - RN-027: o favo seguinte abre quando o anterior chega ao `unlock_percent`.
 * - RN-028: o favo pode exigir patrimônio mínimo ou um item do inventário.
 * - RN-029: o jogador só vê a própria faixa e as anteriores.
 *
 * O estado sai daqui pronto — `estado` e `motivo` —, para a view não refazer a
 * conta e a mesma resposta servir para JSON.
 *
 * Não grava nada: registrar tentativa e recalcular percentual é do
 * `ProgressService`.
 */

export const ESTADOS = {
  disponivel: 'disponivel',
  concluido: 'concluido',
  travadoPorCelulaAnterior: 'travado-por-celula-anterior',
  travadoPorPercentual: 'travado-por-percentual',
  travadoPorItem: 'travado-por-item',
  travadoPorPatrimonio: 'travado-por-patrimonio',
};

/**
 * As faixas que o jogador enxerga: a dele e as anteriores (RN-029). Sem faixa
 * definida ele não vê nada — e é assim que deve ser, porque conteúdo é
 * segmentado por idade, não aberto por omissão.
 *
 * Pura, para poder ser testada sem banco.
 */
export function faixasVisiveis(faixas, codigoDoJogador) {
  const dele = faixas.find((faixa) => faixa.code === codigoDoJogador);
  if (!dele) return [];

  return faixas
    .filter((faixa) => Number(faixa.min_age) <= Number(dele.min_age))
    .map((faixa) => faixa.code);
}

/**
 * O estado de um favo. A ordem das checagens é a ordem em que elas importam
 * para quem lê a tela: primeiro o que depende de jogar, depois o que depende de
 * ter.
 *
 * Pura, para poder ser testada sem banco.
 */
export function estadoDoFavo({ favo, progressoDoAnterior, temItemExigido, patrimonio }) {
  const exigePercentual = Boolean(favo.anterior_id);
  const percentualDoAnterior = Number(progressoDoAnterior?.percent ?? 0);

  if (exigePercentual && percentualDoAnterior < Number(favo.unlock_percent)) {
    return {
      estado: ESTADOS.travadoPorPercentual,
      motivo: `Conclua ${favo.unlock_percent}% do favo anterior para abrir este`,
    };
  }

  if (favo.required_item_id && !temItemExigido) {
    return {
      estado: ESTADOS.travadoPorItem,
      motivo: `Você precisa de ${favo.required_item_name ?? 'um item especial'} para abrir este favo`,
    };
  }

  if (Number(favo.required_patrimony) > 0 && Number(patrimonio) < Number(favo.required_patrimony)) {
    return {
      estado: ESTADOS.travadoPorPatrimonio,
      motivo: `Você precisa de ${favo.required_patrimony} de patrimônio para abrir este favo`,
    };
  }

  return { estado: ESTADOS.disponivel, motivo: null };
}

/**
 * O estado de cada célula do favo, na ordem. A primeira abre sempre; as demais
 * dependem da anterior ter sido concluída com ao menos uma estrela (RN-026).
 *
 * Pura, para poder ser testada sem banco.
 */
export function estadosDasCelulas(celulas) {
  let anteriorConcluida = true;

  return celulas.map((celula) => {
    const concluida = Boolean(celula.first_completed_at) && Number(celula.stars) >= 1;

    const estado = concluida
      ? ESTADOS.concluido
      : anteriorConcluida
        ? ESTADOS.disponivel
        : ESTADOS.travadoPorCelulaAnterior;

    const motivo = estado === ESTADOS.travadoPorCelulaAnterior ? 'Conclua a célula anterior para abrir esta' : null;

    anteriorConcluida = concluida;
    // `aberta` sai daqui pronta: comparar o estado com texto na view espalha o
    // vocabulário de `ESTADOS` por arquivos que não são donos dele.
    return { ...celula, concluida, aberta: estado !== ESTADOS.travadoPorCelulaAnterior, estado, motivo };
  });
}

/** As faixas que este jogador enxerga hoje (RN-029). Quem filtra célula precisa delas. */
export async function faixasDoJogador(idUsuario) {
  const [perfil, faixas] = await Promise.all([
    profilesRepository.buscarDetalhadoPorUsuario(idUsuario),
    profilesRepository.listarFaixasEtarias(),
  ]);

  return faixasVisiveis(faixas, perfil?.faixa_etaria);
}

/** Junta o que as regras de favo precisam saber sobre o jogador. */
async function contextoDoJogador(idUsuario) {
  const [perfil, faixas, progressos, patrimonio, itensPossuidos] = await Promise.all([
    profilesRepository.buscarDetalhadoPorUsuario(idUsuario),
    profilesRepository.listarFaixasEtarias(),
    progressRepository.listarProgressoDosFavos(idUsuario),
    patrimonyService.obterDoUsuario(idUsuario),
    inventoryService.idsPossuidos(idUsuario),
  ]);

  return {
    codigosVisiveis: faixasVisiveis(faixas, perfil?.faixa_etaria),
    progressoPorFavo: new Map(progressos.map((linha) => [Number(linha.hive_id), linha])),
    // O favo com requisito de patrimônio (RN-028) mede o patrimônio da RN-039,
    // que inclui carteira e cofre, e não só o valor dos bens.
    patrimonio: patrimonio.total,
    // `idsPossuidos` já devolve um Set de números.
    itensPossuidos,
  };
}

/**
 * A trilha do jogador: os favos que ele vê, com percentual e estado
 * (RF-CON-01).
 */
export async function listarTrilha(idUsuario) {
  const contexto = await contextoDoJogador(idUsuario);
  const favos = await hivesRepository.listarPorFaixas(contexto.codigosVisiveis);

  // O total de células vem do catálogo, não do cache: `hive_progress` só ganha
  // linha depois da primeira tentativa, e até lá a trilha mostrava "0 de ?".
  const totais = await cellsRepository.contarPorFavos(
    favos.map((favo) => favo.id),
    contexto.codigosVisiveis,
  );

  const trilha = [];
  let anteriorDaFaixa = null;

  for (const favo of favos) {
    // O favo anterior é o vizinho da mesma faixa: quem entra na faixa C não
    // precisa fechar a faixa A antes de começar.
    const anterior = anteriorDaFaixa?.age_band_id === favo.age_band_id ? anteriorDaFaixa : null;
    const progresso = contexto.progressoPorFavo.get(Number(favo.id)) ?? null;

    const { estado, motivo } = estadoDoFavo({
      favo: { ...favo, anterior_id: anterior?.id ?? null },
      progressoDoAnterior: anterior ? contexto.progressoPorFavo.get(Number(anterior.id)) : null,
      temItemExigido: contexto.itensPossuidos.has(Number(favo.required_item_id)),
      patrimonio: contexto.patrimonio,
    });

    trilha.push({
      ...favo,
      // Mesma ideia da célula: quem responde "está aberto?" é o dono da regra.
      aberto: estado === ESTADOS.disponivel,
      percentual: Number(progresso?.percent ?? 0),
      celulasConcluidas: Number(progresso?.completed_cells ?? 0),
      celulasTotais: totais.get(Number(favo.id)) ?? Number(progresso?.total_cells ?? 0),
      concluido: Boolean(progresso?.completed_at),
      estado,
      motivo,
    });

    anteriorDaFaixa = favo;
  }

  return trilha;
}

/** O favo com o estado dele, ou erro se o jogador não pode nem vê-lo. */
async function exigirFavoVisivel(idUsuario, idFavo) {
  const trilha = await listarTrilha(idUsuario);
  const favo = trilha.find((linha) => Number(linha.id) === Number(idFavo));

  if (!favo) throw erroNaoEncontrado('Favo não encontrado');
  return favo;
}

/**
 * A célula oferece o botão "Jogar"?
 *
 * Não basta o tipo de jogo ter validador: o conteúdo daquela célula precisa
 * passar pelo `conferirForma`. Sem esta segunda pergunta, célula com conteúdo de
 * demonstração mostrava o botão e o clique morria em 422 — o botão prometia o
 * que o servidor recusaria.
 */
function podeJogar(slugDoTipoDeJogo, corpo) {
  if (!corpo) return false;

  try {
    validadoresDeJogo.conferirForma(slugDoTipoDeJogo, corpo);
    return true;
  } catch {
    return false;
  }
}

/**
 * As células do favo, com estado (RF-CON-02). Favo travado não lista célula: a
 * lista é a porta de entrada, e mostrá-la seria contar o que ainda não é dele.
 */
export async function listarCelulasDoFavo(idUsuario, idFavo) {
  const favo = await exigirFavoVisivel(idUsuario, idFavo);
  if (favo.estado !== ESTADOS.disponivel) throw erroAcessoNegado(favo.motivo);

  return { favo, celulas: await celulasDoFavo(idUsuario, favo) };
}

/**
 * As células de um favo já resolvido, com estado, conteúdo e jogo. Não confere
 * se o favo está aberto: quem chama já sabe disso, e conferir de novo custaria
 * a trilha inteira mais uma vez.
 */
async function celulasDoFavo(idUsuario, favo) {
  const codigosDeFaixa = await faixasDoJogador(idUsuario);
  const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, codigosDeFaixa);
  const conteudos = await contentsRepository.listarConteudoAtualDasCelulas(celulas.map((c) => c.id));
  const corpoPorCelula = new Map(conteudos.map((linha) => [Number(linha.cell_id), linha.body]));

  return estadosDasCelulas(celulas).map((celula) => ({
    ...celula,
    temConteudo: corpoPorCelula.has(Number(celula.id)),
    temJogo: podeJogar(celula.game_type_slug, corpoPorCelula.get(Number(celula.id))),
  }));
}

/**
 * A próxima célula que o jogador tem para jogar na trilha (RF-HOM-07), para o
 * botão "Continuar" da Colmeia.
 *
 * Olha só o primeiro favo aberto e ainda não concluído: varrer os demais
 * custaria uma consulta por favo, e quem fechou aquele favo já tem a trilha
 * inteira na tela para escolher. Recebe a trilha pronta quando quem chama já a
 * leu, para não repetir consulta na mesma página.
 */
export async function proximaCelulaPendente(idUsuario, trilha = null) {
  const favos = trilha ?? (await listarTrilha(idUsuario));
  const favo = favos.find((linha) => linha.estado === ESTADOS.disponivel && !linha.concluido);
  if (!favo) return null;

  const celulas = await celulasDoFavo(idUsuario, favo);
  const proxima = celulas.find(
    (celula) => !celula.concluida && celula.temJogo && celula.estado === ESTADOS.disponivel,
  );
  if (!proxima) return null;

  return { id: Number(proxima.id), titulo: proxima.title, idFavo: Number(favo.id), tituloDoFavo: favo.title };
}

/**
 * A próxima célula jogável do mesmo favo, ou `null` quando não há.
 *
 * A tela de resultado usa para empurrar a criança ao próximo jogo em vez de
 * devolvê-la a uma lista. Célula travada, sem conteúdo ou de jogo que ainda não
 * existe não conta como próxima: o botão levaria a um beco.
 *
 * Célula já concluída conta, sim: quem repete uma célula continua tendo para
 * onde ir depois dela.
 */
export async function proximaCelulaJogavel(idUsuario, idCelula) {
  const celula = await cellsRepository.buscarPorId(idCelula);
  if (!celula) return null;

  const { celulas } = await listarCelulasDoFavo(idUsuario, celula.hive_id);
  const posicao = celulas.findIndex((linha) => Number(linha.id) === Number(idCelula));
  const proxima = celulas[posicao + 1];

  if (!proxima || !proxima.temJogo || proxima.estado === ESTADOS.travadoPorCelulaAnterior) return null;
  return { id: Number(proxima.id), titulo: proxima.title, idFavo: Number(celula.hive_id) };
}

/**
 * Abre a célula e devolve o conteúdo (RF-CON-03).
 *
 * É aqui que o pré-requisito é conferido de novo, e não só na tela: a lista pode
 * esconder o botão, mas quem digita a URL chega direto neste ponto.
 */
export async function abrirCelula(idUsuario, idCelula) {
  const celula = await cellsRepository.buscarPorId(idCelula);
  if (!celula) throw erroNaoEncontrado('Célula não encontrada');

  const { celulas } = await listarCelulasDoFavo(idUsuario, celula.hive_id);
  const escolhida = celulas.find((linha) => Number(linha.id) === Number(idCelula));

  if (!escolhida) throw erroNaoEncontrado('Célula não encontrada');
  if (escolhida.estado === ESTADOS.travadoPorCelulaAnterior) throw erroAcessoNegado(escolhida.motivo);

  const conteudo = await contentsRepository.buscarAtualDaCelula(idCelula);
  if (!conteudo) throw erroNaoEncontrado('Esta célula ainda não tem conteúdo');

  return { celula: escolhida, conteudo };
}
