import { emTransacao } from '../config/database.js';
import * as goalsRepository from '../repositories/goalsRepository.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as goalPlannerService from './goalPlannerService.js';
import * as goalProgressSources from './goalProgressSources.js';
import * as pointsService from './pointsService.js';

/**
 * Metas do jogador: listar, sincronizar progresso, expirar e pagar ao concluir.
 *
 * O progresso é contagem até um alvo, e cada tipo declara de onde o número vem
 * (`goal_types.progress_source`).
 *
 * Não cria meta. Quem escolhe tipo, alvo, prazo e dificuldade é o
 * `goalPlannerService`, pela disponibilidade do jogador (RF-MET-01, RN-014).
 */

export async function listarDoUsuario(idUsuario) {
  return goalsRepository.listarPorUsuario(idUsuario);
}

export async function listarAtivas(idUsuario) {
  return goalsRepository.listarAtivasPorUsuario(idUsuario);
}

export async function exigirPosse(idMeta, idUsuario) {
  const meta = await goalsRepository.buscarPorId(idMeta);
  if (!meta) throw erroNaoEncontrado('Meta não encontrada');
  if (Number(meta.user_id) !== Number(idUsuario)) throw erroAcessoNegado();
  return meta;
}

/**
 * Expira as metas fora do prazo (RN-017). Preguiçosa: acontece quando o jogador
 * abre a tela, porque não há rotina diária neste MVP.
 *
 * Vencer não é punição — nada é removido, a meta só deixa de valer recompensa.
 * A oferta de renovação da RN-017 é da E06 (DT-33).
 */
export async function expirarVencidas(idUsuario) {
  const vencidas = await goalsRepository.listarVencidasPorUsuario(idUsuario);
  if (vencidas.length === 0) return { expiradas: 0 };

  await emTransacao((conexao) => goalsRepository.expirarVencidasDoUsuario(conexao, idUsuario));

  for (const meta of vencidas) {
    await auditService.registrar(auditService.usuario(idUsuario), 'meta.expirada', {
      entidade: 'goal',
      id: meta.id,
      antes: { status: 'ativa', progresso: Number(meta.current_value), alvo: Number(meta.target_value) },
      depois: { status: 'expirada', recompensaPaga: 0 },
    });
  }

  return { expiradas: vencidas.length };
}

/**
 * Recalcula o progresso das metas ativas a partir da fonte de cada tipo.
 *
 * É *lazy*, chamada quando o jogador abre a tela: uma meta de "juntar 200 de
 * mel" não precisa de ninguém observando a carteira: basta olhar o saldo na hora
 * de mostrar a meta.
 */
export async function sincronizarProgresso(idUsuario) {
  // Antes de reler qualquer número, tira da frente o que já venceu: meta fora do
  // prazo não recebe progresso novo nem entra na conta do planejador.
  await expirarVencidas(idUsuario);

  const metas = await goalsRepository.listarAtivasPorUsuario(idUsuario);
  let sincronizadas = 0;

  for (const meta of metas) {
    const valor = await goalProgressSources.medir(meta.progress_source, idUsuario);
    if (valor === null) continue;
    if (valor === Number(meta.current_value)) continue;

    await emTransacao((conexao) => goalsRepository.atualizarProgresso(conexao, meta.id, Number(valor)));
    sincronizadas += 1;
  }

  return { sincronizadas };
}

/** Progresso informado de fora, para as fontes que ainda não têm consulta própria. */
export async function atualizarProgresso(idMeta, idUsuario, valorAtual) {
  await exigirPosse(idMeta, idUsuario);
  await emTransacao((conexao) => goalsRepository.atualizarProgresso(conexao, idMeta, Number(valorAtual)));
  return goalsRepository.buscarPorId(idMeta);
}

/**
 * Conclui a meta e paga a recompensa na mesma transação.
 *
 * O crédito só acontece se a conclusão afetou linha: `concluir` tem o
 * `completed_at IS NULL` dentro do próprio `WHERE`, então dois cliques rápidos
 * não pagam duas vezes — o segundo vê zero linhas e sai sem creditar nada.
 */
export async function concluir(idMeta, idUsuario) {
  // Sincroniza antes de conferir: quem clica "concluir" pode ter batido o alvo
  // agora mesmo, numa compra ou numa tarefa da mesma sessão.
  await sincronizarProgresso(idUsuario);
  const meta = await exigirPosse(idMeta, idUsuario);

  if (Number(meta.current_value) < Number(meta.target_value)) {
    throw erroValidacao(
      `Esta meta ainda não foi alcançada: ${meta.current_value} de ${meta.target_value}`,
    );
  }

  const recompensa = await emTransacao(async (conexao) => {
    const afetadas = await goalsRepository.concluir(conexao, idMeta);
    if (afetadas === 0) throw erroValidacao('Esta meta já foi concluída');

    const mel = Number(meta.reward_coins);
    const polen = Number(meta.reward_points);

    if (mel > 0) {
      await coinsService.creditar(conexao, idUsuario, mel, {
        motivo: 'conclusao-meta',
        referenciaTipo: 'goal',
        referenciaId: idMeta,
      });
    }
    if (polen > 0) {
      await pointsService.creditar(conexao, idUsuario, polen, {
        motivo: 'conclusao-meta',
        referenciaTipo: 'goal',
        referenciaId: idMeta,
      });
    }

    return { mel, polen };
  });

  await auditService.registrar(auditService.usuario(idUsuario), 'meta.concluida', {
    entidade: 'goal',
    id: idMeta,
    antes: { status: meta.status, progresso: Number(meta.current_value) },
    depois: { status: 'concluida', melGanho: recompensa.mel, polenGanho: recompensa.polen },
  });

  // RN-016: meta concluída dá lugar a outra, e a RN-018 exige que sempre exista
  // pelo menos uma ativa. Fora da transação de propósito — a recompensa já está
  // paga e registrada, e o planejador é idempotente: se falhar aqui, o painel
  // completa o plano na próxima visita, sem gerar meta a mais.
  await goalPlannerService.garantirMetasAtivas(idUsuario);

  return recompensa;
}
