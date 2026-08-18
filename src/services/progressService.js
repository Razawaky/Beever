import { emTransacao } from '../config/database.js';
import * as progressRepository from '../repositories/progressRepository.js';
import { erroValidacao } from '../utils/erros.js';
import * as contentService from './contentService.js';

/**
 * `ProgressService` — o que acontece quando o jogador termina uma célula
 * (RF-CON-04, RN-030, RN-031).
 *
 * Traduz o resultado da atividade em estrelas, grava a tentativa e recalcula o
 * percentual do favo, tudo na mesma transação.
 *
 * **Não paga nada.** XP, mel e pólen são do motor de recompensas (E06), que vai
 * chamar `registrarTentativa` de dentro da transação que credita — por isso toda
 * função aceita conexão de fora.
 *
 * Também não abre sessão de jogo: token e tempo de partida moram em
 * `game_sessions`, e quem os escreve é o `GameSessionService` (T-06.5).
 */

/** RN-030: erros viram estrelas. Sem vidas — errar muito nunca bloqueia. */
const FAIXAS_DE_ESTRELA = [
  { ateErros: 1, estrelas: 3 },
  { ateErros: 3, estrelas: 2 },
];

/** Concluiu com muitos erros ainda vale uma estrela. É o piso da RN-030. */
const ESTRELA_MINIMA = 1;

/**
 * Quantas estrelas a tentativa vale (RN-030). Quem não concluiu fica em zero:
 * não é punição, é só ausência de resultado — a célula continua aberta.
 *
 * Pura, para poder ser testada sem banco.
 */
export function estrelasPara(erros, concluiu) {
  if (!concluiu) return 0;

  const faixa = FAIXAS_DE_ESTRELA.find((linha) => Number(erros) <= linha.ateErros);
  return faixa ? faixa.estrelas : ESTRELA_MINIMA;
}

/**
 * Grava uma tentativa e devolve o que mudou.
 *
 * A célula é conferida antes: quem não pode abrir também não pode registrar
 * resultado nela. Sem isso, a checagem da T-05.2 protegeria só a leitura, e
 * bastaria mandar um resultado direto para destravar a trilha inteira.
 *
 * `conexao` vem preenchida quando a E06 chama de dentro da transação que paga.
 * Sem ela, o service abre a própria.
 */
export async function registrarTentativa(idUsuario, idCelula, { erros = 0, pontuacao = 0, concluiu = false }, conexao = null) {
  const errosNumero = Number(erros);
  if (!Number.isInteger(errosNumero) || errosNumero < 0) {
    throw erroValidacao('A contagem de erros precisa ser um inteiro não negativo');
  }

  // Confere o pré-requisito, não o estado atual: célula já concluída pode ser
  // repetida, célula travada não pode ser jogada.
  const { celula } = await contentService.abrirCelula(idUsuario, idCelula);
  const codigosDeFaixa = await contentService.faixasDoJogador(idUsuario);

  const estrelas = estrelasPara(errosNumero, concluiu);
  const gravar = async (c) => {
    await progressRepository.registrarTentativa(c, {
      idUsuario,
      idCelula,
      estrelas,
      erros: errosNumero,
      pontuacao: Number(pontuacao),
      concluidaEm: concluiu ? new Date() : null,
    });

    // O percentual do favo é recalculado junto: `hive_progress` é cache, e a
    // RN-027 decide desbloqueio com ele. Cache que atualiza depois é cache que
    // mente na tela seguinte.
    const favo = await progressRepository.recalcularFavo(c, idUsuario, celula.hive_id, codigosDeFaixa);
    const progressoDaCelula = await progressRepository.buscarProgressoDaCelula(idUsuario, idCelula, c);

    return { favo, progressoDaCelula };
  };

  const { favo, progressoDaCelula } = conexao ? await gravar(conexao) : await emTransacao(gravar);

  return {
    estrelas,
    concluiu,
    // Repetição é o que a RN-008 cobra mais barato: quem chama para pagar
    // precisa saber se a célula já tinha sido concluída antes desta tentativa.
    ehRepeticao: Boolean(celula.concluida),
    celula: progressoDaCelula,
    favo,
    favoConcluido: Boolean(favo?.completed_at),
  };
}

/** O percentual do favo, recontado das células. Útil quando o cache pode estar velho. */
export async function recalcularFavo(idUsuario, idFavo, conexao = null) {
  const codigosDeFaixa = await contentService.faixasDoJogador(idUsuario);

  if (conexao) return progressRepository.recalcularFavo(conexao, idUsuario, idFavo, codigosDeFaixa);
  return emTransacao((c) => progressRepository.recalcularFavo(c, idUsuario, idFavo, codigosDeFaixa));
}

/** Quanto do favo já foi feito, sem escrever no cache. */
export async function resumoDoFavo(idUsuario, idFavo) {
  const codigosDeFaixa = await contentService.faixasDoJogador(idUsuario);
  const contagem = await progressRepository.contarCelulasDoFavo(idUsuario, idFavo, codigosDeFaixa);
  const percentual = contagem.total === 0 ? 0 : Math.floor((contagem.concluidas * 100) / contagem.total);

  return { ...contagem, percentual };
}
