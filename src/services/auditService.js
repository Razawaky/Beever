import { hashDoIpDaRequisicao, idDaRequisicao } from '../config/contextoRequisicao.js';
import { logger } from '../config/logger.js';
import * as auditLogsRepository from '../repositories/auditLogsRepository.js';
import * as userLevelsRepository from '../repositories/userLevelsRepository.js';
import * as walletsRepository from '../repositories/walletsRepository.js';

/**
 * Porta única da trilha de auditoria (RN-010, RNF-17).
 *
 * Antes disto, sete services chamavam o repository direto e cada um montava o
 * registro à mão: um mandava `atorTipo: 'Usuario'`, outro `'usuario'`, um
 * lembrava do estado anterior, outro não, e ninguém preenchia `ip_hash`. Uma
 * trilha de auditoria só vale se as linhas forem comparáveis entre si — se cada
 * chamador inventa o próprio formato, o que existe é um punhado de anotações,
 * não uma trilha.
 *
 * Duas coisas passam a ser preenchidas sozinhas, porque nenhum service tem como
 * conhecê-las sem ferir a arquitetura: o id da requisição e o hash do IP, os
 * dois vindos do contexto assíncrono. É o que permite pular da linha de
 * auditoria ("esta compra aconteceu") para o log daquela requisição inteira.
 *
 * **Auditoria não derruba a operação.** Uma falha ao registrar é logada em
 * nível de erro e engolida: se o mel já saiu da carteira e o item já está no
 * inventário, estourar aqui desfaria uma compra legítima por causa do
 * histórico. O registro perdido vira alarme no log — que é onde alguém vai
 * procurar —, não um erro na cara da criança.
 */

/** Ator humano comum. */
export function usuario(id) {
  return { tipo: 'usuario', id };
}

/** Ator administrador — a distinção vem do join com `admins`, feito no login. */
export function admin(id) {
  return { tipo: 'admin', id };
}

/**
 * Ator sistema: cron, script, rotina automática. Sem id, porque não há pessoa
 * por trás — e inventar um seria mentir sobre quem agiu.
 */
export function sistema() {
  return { tipo: 'sistema', id: null };
}

/** Escolhe entre usuário e admin a partir do que a sessão já sabe. */
export function atorDaSessao(sessao) {
  return sessao?.ehAdmin ? admin(sessao.usuarioId) : usuario(sessao.usuarioId);
}

/**
 * Registra uma ação na trilha.
 *
 * @param {{tipo: string, id: number|null}} ator quem agiu — use `usuario()`, `admin()` ou `sistema()`
 * @param {string} acao o que aconteceu, no formato `entidade.verbo` (`compra.realizada`)
 * @param {{entidade: string, id?: number|null, antes?: object|null, depois?: object|null}} alvo
 */
export async function registrar(ator, acao, alvo) {
  const { entidade, id = null, antes = null, depois = null } = alvo;

  try {
    await auditLogsRepository.registrar({
      atorTipo: ator.tipo,
      atorId: ator.id,
      acao,
      entidade,
      entidadeId: id,
      estadoAnterior: antes,
      estadoNovo: depois,
      ipHash: hashDoIpDaRequisicao() ?? null,
      requestId: idDaRequisicao() ?? null,
    });
  } catch (erro) {
    logger.error(
      { erro, acao, entidade, entidadeId: id, atorTipo: ator.tipo, atorId: ator.id },
      'Falha ao registrar auditoria — a operação seguiu, mas o rastro se perdeu',
    );
  }
}

/**
 * Retrato do que o jogador tem agora: mel, pólen, XP e nível.
 *
 * É o "antes" e o "depois" que a RN-010 pede para crédito de recompensa. Lido do
 * banco nos dois momentos, e não calculado a partir do valor creditado: conta
 * feita de cabeça vira mentira no primeiro crédito concorrente.
 */
export async function retratoDoSaldo(idUsuario) {
  const [carteira, nivel] = await Promise.all([
    walletsRepository.buscarPorUsuario(idUsuario),
    userLevelsRepository.buscarPorUsuario(idUsuario),
  ]);

  return {
    mel: Number(carteira?.coins ?? 0),
    polen: Number(carteira?.points_total ?? 0),
    xp: Number(nivel?.xp_total ?? 0),
    nivel: Number(nivel?.level ?? 0),
  };
}

/**
 * Registra um crédito de recompensa com os dois retratos de saldo.
 *
 * `detalhes` é o que a operação rendeu (estrelas, item, meta), e vai junto do
 * retrato do depois — a linha conta o que mudou e por causa de quê.
 */
export async function registrarRecompensa(ator, acao, { entidade, id = null, antes, depois, detalhes = null }) {
  await registrar(ator, acao, {
    entidade,
    id,
    antes,
    depois: detalhes ? { ...depois, ...detalhes } : depois,
  });
}
