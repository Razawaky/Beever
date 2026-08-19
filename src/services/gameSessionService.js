import { randomUUID } from 'node:crypto';

import { emTransacao } from '../config/database.js';
import * as cellsRepository from '../repositories/cellsRepository.js';
import * as contentsRepository from '../repositories/contentsRepository.js';
import * as gameSessionsRepository from '../repositories/gameSessionsRepository.js';
import { erroAcessoNegado, erroNaoEncontrado } from '../utils/erros.js';
import * as coinsService from './coinsService.js';
import * as contentService from './contentService.js';
import * as levelsService from './levelsService.js';
import * as pointsService from './pointsService.js';
import * as progressService from './progressService.js';
import * as validadoresDeJogo from './validadoresDeJogo.js';

/**
 * A partida: abre com token, fecha conferindo as respostas e paga as três
 * recompensas de uma vez só.
 *
 * É o único lugar que orquestra XP, pólen e mel. Cada um continua com o seu
 * service — aqui só se decide a ordem e a transação. Uma partida que credita
 * XP e falha no mel não pode existir, e é isso que `emTransacao` garante.
 *
 * A RN-007 vive aqui: o cliente manda o que respondeu, e quem conta acerto é o
 * `validadoresDeJogo`, com o gabarito do banco. Nenhum número vindo do
 * navegador entra na conta — nem pontuação, nem estrelas, nem duração.
 *
 * As estrelas continuam sendo do `progressService` (RN-030), que já é o dono da
 * regra desde a T-05.3.
 */

/**
 * Abre a partida e devolve o token junto do conteúdo sem gabarito.
 *
 * A célula é conferida pelo `contentService`: quem não pode abri-la também não
 * pode jogá-la, mesmo mandando o pedido direto.
 */
export async function abrir(idUsuario, idCelula) {
  const { celula, conteudo } = await contentService.abrirCelula(idUsuario, idCelula);

  // Falha antes de gravar partida: conteúdo sem gabarito não é jogável, e uma
  // partida aberta que ninguém consegue fechar só sujaria a tabela.
  const paraJogar = validadoresDeJogo.conteudoParaJogar(celula.game_type_slug, conteudo.body);

  const jaConcluiu = await gameSessionsRepository.contarConcluidasNaCelula(idUsuario, idCelula);
  const token = randomUUID();

  await emTransacao((conexao) =>
    gameSessionsRepository.iniciar(conexao, {
      idUsuario,
      idCelula,
      token,
      ehRepeticao: jaConcluiu > 0,
    }),
  );

  return { token, celula, conteudo: paraJogar, ehRepeticao: jaConcluiu > 0 };
}

/** O que a partida já fechada rendeu. Reenvio recebe isto, e não um erro. */
function resultadoGravado(partida) {
  return {
    jaEstavaFechada: true,
    estrelas: Number(partida.stars),
    erros: Number(partida.errors),
    ehRepeticao: Boolean(partida.is_replay),
    xp: Number(partida.xp_awarded),
    polen: Number(partida.points_awarded),
    mel: Number(partida.coins_awarded),
    duracaoSegundos: partida.duration_seconds === null ? null : Number(partida.duration_seconds),
  };
}

/**
 * Fecha a partida: confere as respostas, grava a tentativa e paga.
 *
 * Reenviar o mesmo token devolve o resultado já gravado, sem creditar de novo
 * (RN-009). Navegador que reenvia por conexão ruim merece a tela de resultado,
 * não um erro.
 */
export async function fechar(idUsuario, token, { respostas = [] } = {}) {
  const partida = await gameSessionsRepository.buscarPorToken(token);
  if (!partida) throw erroNaoEncontrado('Partida não encontrada');
  if (Number(partida.user_id) !== Number(idUsuario)) throw erroAcessoNegado('Esta partida é de outro jogador');
  if (partida.finished_at) return resultadoGravado(partida);

  const celula = await cellsRepository.buscarPorId(partida.cell_id);
  if (!celula) throw erroNaoEncontrado('Célula não encontrada');

  const conteudo = await contentsRepository.buscarAtualDaCelula(partida.cell_id);
  if (!conteudo) throw erroNaoEncontrado('Esta célula ainda não tem conteúdo');

  const { erros, total } = validadoresDeJogo.validarRespostas(celula.game_type_slug, conteudo.body, respostas);
  const pontuacao = total === 0 ? 0 : Math.round(((total - erros) / total) * 100);

  return emTransacao(async (conexao) => {
    // Trava a partida antes de qualquer escrita. Duas conclusões ao mesmo tempo
    // viram uma: a segunda espera, encontra a partida já fechada e devolve o
    // resultado dela em vez de creditar outra vez.
    const aberta = await gameSessionsRepository.bloquearAbertaPorToken(conexao, token);
    if (!aberta) return resultadoGravado(await gameSessionsRepository.buscarPorToken(token));

    const tentativa = await progressService.registrarTentativa(
      idUsuario,
      partida.cell_id,
      { erros, pontuacao, concluiu: true },
      conexao,
    );

    const dadosDaRecompensa = {
      celula,
      estrelas: tentativa.estrelas,
      ehRepeticao: tentativa.ehRepeticao,
    };

    const xp = await levelsService.creditarPorCelula(conexao, idUsuario, dadosDaRecompensa);
    const polen = await pointsService.creditarPorCelula(conexao, idUsuario, dadosDaRecompensa);
    const mel = await coinsService.creditarPorCelula(conexao, idUsuario, dadosDaRecompensa);

    // O bônus do degrau só é conhecido depois do crédito de XP, então é o
    // último a ser pago — e quem o paga é o service do mel.
    const bonus = await coinsService.creditarBonusDeNivel(conexao, idUsuario, xp.bonusDeMelPorNivel ?? 0, {
      nivel: xp.nivel,
    });

    await gameSessionsRepository.finalizar(conexao, {
      token,
      estrelas: tentativa.estrelas,
      erros,
      xp: xp.xpCreditado,
      pontos: polen.polenCreditado,
      moedas: mel.melCreditado + bonus.melCreditado,
    });

    return {
      jaEstavaFechada: false,
      estrelas: tentativa.estrelas,
      erros,
      ehRepeticao: tentativa.ehRepeticao,
      xp: xp.xpCreditado,
      polen: polen.polenCreditado,
      mel: mel.melCreditado,
      bonusDeMelPorNivel: bonus.melCreditado,
      nivel: xp.nivel ?? null,
      subiuDeNivel: Boolean(xp.subiuDeNivel),
      favo: tentativa.favo,
      favoConcluido: tentativa.favoConcluido,
    };
  });
}

/** Desiste da partida sem creditar nada — o jogador saiu no meio. */
export async function abandonar(idUsuario, token) {
  const partida = await gameSessionsRepository.buscarPorToken(token);
  if (!partida) throw erroNaoEncontrado('Partida não encontrada');
  if (Number(partida.user_id) !== Number(idUsuario)) throw erroAcessoNegado('Esta partida é de outro jogador');

  const afetadas = await emTransacao((conexao) => gameSessionsRepository.abandonar(conexao, token));
  return { abandonada: afetadas === 1 };
}
