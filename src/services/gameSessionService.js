import { randomUUID } from 'node:crypto';

import { emTransacao } from '../config/database.js';
import * as cellsRepository from '../repositories/cellsRepository.js';
import * as contentsRepository from '../repositories/contentsRepository.js';
import * as gameSessionsRepository from '../repositories/gameSessionsRepository.js';
import * as progressRepository from '../repositories/progressRepository.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as achievementsService from './achievementsService.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as contentService from './contentService.js';
import { criteriosDosEventos } from './eventosDeConquista.js';
import { sortearAtividade } from './sorteioDeConteudo.js';
import * as idempotencyService from './idempotencyService.js';
import * as levelsService from './levelsService.js';
import * as pointsService from './pointsService.js';
import * as progressService from './progressService.js';
import * as streakService from './streakService.js';
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
 *
 * Se o jogador já tem uma partida aberta nesta célula, ela é devolvida em vez de
 * uma nova (RF-JOG-07): é assim que fechar a aba no meio do jogo deixa de custar
 * o progresso. Abrir sempre uma partida nova encheria a tabela de partidas
 * órfãs e faria a criança recomeçar do zero.
 */
export async function abrir(idUsuario, idCelula) {
  const { celula, acervo } = await contentService.abrirCelula(idUsuario, idCelula);

  // Quem retoma continua com a mesma atividade que estava jogando: sortear de
  // novo trocaria as perguntas debaixo das respostas já dadas.
  const emAndamento = await gameSessionsRepository.buscarAbertaDaCelula(idUsuario, idCelula);
  if (emAndamento) {
    const conteudo = await conteudoDaPartida(emAndamento);
    return {
      token: emAndamento.token,
      celula,
      conteudo: validadoresDeJogo.conteudoParaJogar(celula.game_type_slug, conteudo.body),
      ehRepeticao: Boolean(emAndamento.is_replay),
      estado: emAndamento.saved_state ?? null,
      retomada: true,
    };
  }

  const ultimoJogado = await gameSessionsRepository.ultimoConteudoJogado(idUsuario, idCelula);
  const sorteada = sortearAtividade(acervo, ultimoJogado);

  // Falha antes de gravar partida: conteúdo sem gabarito não é jogável, e uma
  // partida aberta que ninguém consegue fechar só sujaria a tabela.
  const paraJogar = validadoresDeJogo.conteudoParaJogar(celula.game_type_slug, sorteada.body);

  const jaConcluiu = await gameSessionsRepository.contarConcluidasNaCelula(idUsuario, idCelula);
  const token = randomUUID();

  await emTransacao((conexao) =>
    gameSessionsRepository.iniciar(conexao, {
      idUsuario,
      idCelula,
      idConteudo: sorteada.id,
      token,
      ehRepeticao: jaConcluiu > 0,
    }),
  );

  return { token, celula, conteudo: paraJogar, ehRepeticao: jaConcluiu > 0, estado: null, retomada: false };
}

/**
 * A atividade que aquela partida está jogando.
 *
 * Partida gravada antes da migration 018 não tem `content_id`: para ela, o
 * conteúdo atual da célula é o melhor palpite disponível, e é o comportamento
 * que existia antes.
 */
async function conteudoDaPartida(partida) {
  const conteudo = partida.content_id
    ? await contentsRepository.buscarPorId(partida.content_id)
    : await contentsRepository.buscarAtualDaCelula(partida.cell_id);

  if (!conteudo) throw erroNaoEncontrado('Esta célula ainda não tem conteúdo');
  return conteudo;
}

/**
 * Guarda o progresso parcial da partida (RF-JOG-07).
 *
 * Rascunho, não nota: o que é salvo aqui não entra em conta nenhuma, e o
 * resultado continua saindo do gabarito do banco quando a partida fecha
 * (RN-007). Por isso o estado é aceito como veio, com um limite de tamanho — o
 * que ele significa é assunto de cada jogo.
 */
export async function salvarEstado(idUsuario, token, respostasParciais) {
  const partida = await gameSessionsRepository.buscarPorToken(token);
  if (!partida) throw erroNaoEncontrado('Partida não encontrada');
  if (Number(partida.user_id) !== Number(idUsuario)) throw erroAcessoNegado('Esta partida é de outro jogador');
  if (partida.finished_at) throw erroValidacao('Esta partida já foi encerrada e não guarda mais progresso');

  const celula = await cellsRepository.buscarPorId(partida.cell_id);
  const estado = validadoresDeJogo.estadoParaSalvar(celula.game_type_slug, respostasParciais);

  await gameSessionsRepository.salvarEstado(token, estado);
  return { salvo: true };
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
 * O que acontece dentro da transação da conclusão: grava a tentativa, paga as
 * três recompensas e fecha a partida.
 *
 * Separado de `fechar` para a função não virar uma escada — aqui é a parte que
 * escreve, lá é a que confere.
 */
async function creditarPartida(conexao, { idUsuario, token, partida, celula, erros, pontuacao }) {
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

  // O bônus do degrau só é conhecido depois do crédito de XP, então é o último a
  // ser pago — e quem o paga é o service do mel.
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
    ehRepeticao: tentativa.ehRepeticao,
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
  // Partida encerrada sem conclusão não tem resultado para mostrar. Devolver o
  // registro zerado faria a tela anunciar "zero estrelas, zero mel" como se
  // fosse desempenho, quando o que houve foi desistência.
  if (partida.finished_at && partida.status !== 'concluida') {
    throw erroValidacao(`Esta partida foi ${partida.status} e não pode ser concluída`);
  }
  if (partida.finished_at) return comProximaCelula(idUsuario, partida.cell_id, resultadoGravado(partida));

  const celula = await cellsRepository.buscarPorId(partida.cell_id);
  if (!celula) throw erroNaoEncontrado('Célula não encontrada');

  // A correção usa a atividade que a criança jogou, e não a atual da célula:
  // publicar outra versão no meio da partida não pode trocar o gabarito dela.
  const conteudo = await conteudoDaPartida(partida);

  const { erros, total } = validadoresDeJogo.validarRespostas(celula.game_type_slug, conteudo.body, respostas);
  const pontuacao = total === 0 ? 0 : Math.round(((total - erros) / total) * 100);

  // Retrato antes da partida, para a linha de auditoria (RN-010). Lido aqui, e
  // não dentro da transação, porque é o estado que a partida encontrou.
  const antes = await auditService.retratoDoSaldo(idUsuario);

  // A chave é o próprio token: ele já é único por partida, e assim o cliente não
  // precisa inventar nada. O pedido fica fora do hash de propósito — quem reenvia
  // com respostas diferentes recebe o resultado gravado, porque o crédito já
  // aconteceu e resposta trocada depois não o desfaz.
  const resultado = await idempotencyService.executarUmaVezSo(
    { chave: `partida:${token}`, idUsuario, operacao: 'partida.fechar' },
    {
      executar: (conexao) => creditarPartida(conexao, { idUsuario, token, partida, celula, erros, pontuacao }),
      aoRepetir: async () => resultadoGravado(await gameSessionsRepository.buscarPorToken(token)),
    },
  );

  // Uma linha por partida, e não uma por crédito: três linhas descreveriam o
  // detalhe e perderiam o fato. Reenvio não gera linha, porque nada mudou.
  if (!resultado.jaEstavaFechada) {
    await auditService.registrarRecompensa(auditService.usuario(idUsuario), 'partida.concluida', {
      entidade: 'game_session',
      id: Number(partida.id),
      antes,
      depois: await auditService.retratoDoSaldo(idUsuario),
      detalhes: {
        celula: Number(partida.cell_id),
        estrelas: resultado.estrelas,
        erros: resultado.erros,
        ehRepeticao: resultado.ehRepeticao,
        xpGanho: resultado.xp,
        polenGanho: resultado.polen,
        melGanho: resultado.mel + resultado.bonusDeMelPorNivel,
      },
    });
  }

  // A sequência avança na hora em que a célula é concluída (RN-019), e não na
  // avaliação preguiçosa do dia seguinte: o jogador precisa ver o dia contado
  // enquanto ainda está na tela de resultado. Fica fora da transação do crédito
  // porque sequência não é saldo — falha aqui não pode desfazer o mel pago.
  if (!resultado.jaEstavaFechada) {
    await streakService.registrarDiaCumprido(idUsuario);
  }

  const conquistas = resultado.jaEstavaFechada ? [] : await conquistasDaPartida(idUsuario, resultado);

  return comProximaCelula(idUsuario, partida.cell_id, { ...resultado, conquistas });
}

/**
 * As conquistas que a partida acabou de destravar (RF-GAM-01).
 *
 * Célula e favo são avaliados aqui, e não na visita seguinte à Colmeia, porque o
 * dado já está em mãos e porque a comemoração pertence à tela de resultado — a
 * criança fez por merecer agora. Custa uma consulta de contagem, que é o preço
 * de não mandá-la descobrir depois.
 *
 * O mel da conquista **não** entra no que a partida rendeu: ele vem em lista
 * própria, senão a mesma célula pareceria pagar diferente das outras.
 */
async function conquistasDaPartida(idUsuario, resultado) {
  const { celulas, favos } = await progressRepository.contarConquistados(idUsuario);

  const criterios = criteriosDosEventos([
    'celula-concluida',
    ...(resultado.favoConcluido ? ['favo-concluido'] : []),
  ]);

  const valores = { 'celulas-concluidas': celulas };
  if (criterios.includes('favos-concluidos')) valores['favos-concluidos'] = favos;

  return achievementsService.avaliarEventos(idUsuario, valores);
}

/**
 * Junta ao resultado para onde a tela de resultado leva (RF-CON-05).
 *
 * Vai no fim de propósito: a próxima célula só abre depois de esta ser
 * concluída, então perguntar antes do crédito traria sempre `null`.
 */
async function comProximaCelula(idUsuario, idCelula, resultado) {
  return { ...resultado, proximaCelula: await contentService.proximaCelulaJogavel(idUsuario, idCelula) };
}

/** Desiste da partida sem creditar nada — o jogador saiu no meio. */
export async function abandonar(idUsuario, token) {
  const partida = await gameSessionsRepository.buscarPorToken(token);
  if (!partida) throw erroNaoEncontrado('Partida não encontrada');
  if (Number(partida.user_id) !== Number(idUsuario)) throw erroAcessoNegado('Esta partida é de outro jogador');

  const afetadas = await emTransacao((conexao) => gameSessionsRepository.abandonar(conexao, token));
  return { abandonada: afetadas === 1 };
}
