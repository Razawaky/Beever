import { emTransacao } from '../config/database.js';
import * as goalsRepository from '../repositories/goalsRepository.js';
import * as rewardConfigsRepository from '../repositories/rewardConfigsRepository.js';
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
 * A outra metade da RN-017, a oferta de renovação, está logo abaixo em
 * `renovar`: a meta vencida fica disponível para ser retomada.
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

/** As metas vencidas que o jogador ainda pode retomar (RN-017, RF-MET-05). */
export async function listarRenovaveis(idUsuario) {
  await expirarVencidas(idUsuario);
  return goalsRepository.listarExpiradasRenovaveis(idUsuario);
}

/**
 * Renova uma meta vencida (RN-017, RF-MET-05).
 *
 * A meta vencida não é punida: quem perdeu o prazo retoma a mesma meta, **com o
 * progresso que já tinha**, ganha prazo novo pelo plano de hoje e aceita
 * receber metade da recompensa. Recomeçar do zero tiraria justamente o trabalho
 * que a renovação existe para salvar.
 *
 * A vencida vira `renovada` na mesma transação, e é isso que impede renovar
 * duas vezes a mesma meta.
 */
export async function renovar(idMeta, idUsuario) {
  const meta = await exigirPosse(idMeta, idUsuario);
  if (meta.status !== 'expirada') {
    throw erroValidacao('Só meta vencida pode ser renovada');
  }

  const plano = await goalPlannerService.planoAtual(idUsuario);
  if (!plano) throw erroValidacao('Sem dias marcados na semana não há prazo para a meta renovada');

  const desconto = await rewardConfigsRepository.buscarModificador(rewardConfigsRepository.META_RENOVADA);
  if (!desconto) throw erroValidacao('Falta a configuração de recompensa da meta renovada');

  const prazo = new Date(Date.now() + plano.diasDePrazo * 24 * 60 * 60 * 1000);
  const recompensaMoedas = Math.round(Number(meta.reward_coins) * desconto.coins_factor);
  const recompensaPontos = Math.round(Number(meta.reward_points) * desconto.points_factor);

  const idNovaMeta = await emTransacao(async (conexao) => {
    const afetadas = await goalsRepository.marcarRenovada(conexao, idMeta);
    if (afetadas === 0) throw erroValidacao('Esta meta já foi renovada');

    const id = await goalsRepository.criar(conexao, {
      idUsuario,
      idTipo: meta.goal_type_id,
      idDificuldade: meta.difficulty_id,
      titulo: meta.title,
      alvo: Number(meta.target_value),
      recompensaMoedas,
      recompensaPontos,
      prazo,
      renovadaDe: idMeta,
    });

    // O progresso é copiado depois de criar, e não no INSERT, porque quem sabe
    // limitar o valor ao alvo é o `atualizarProgresso`.
    await goalsRepository.atualizarProgresso(conexao, id, Number(meta.current_value));
    return id;
  });

  await auditService.registrar(auditService.usuario(idUsuario), 'meta.renovada', {
    entidade: 'goal',
    id: idMeta,
    antes: {
      status: 'expirada',
      progresso: Number(meta.current_value),
      recompensaMoedas: Number(meta.reward_coins),
      recompensaPontos: Number(meta.reward_points),
    },
    depois: {
      status: 'renovada',
      novaMeta: idNovaMeta,
      prazo,
      recompensaMoedas,
      recompensaPontos,
    },
  });

  return goalsRepository.buscarPorId(idNovaMeta);
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

  // Só meta ativa paga. Sem esta linha, a vencida com alvo batido ainda podia
  // ser cobrada — e, depois da renovação, a mesma meta pagaria duas vezes: uma
  // pela vencida e outra pela renovada, que herda o progresso.
  if (meta.status !== 'ativa') {
    throw erroValidacao(`Esta meta está ${meta.status} e não paga mais recompensa`);
  }

  if (Number(meta.current_value) < Number(meta.target_value)) {
    throw erroValidacao(
      `Esta meta ainda não foi alcançada: ${meta.current_value} de ${meta.target_value}`,
    );
  }

  // Retrato antes do crédito, para a linha de auditoria (RN-010).
  const saldoAntes = await auditService.retratoDoSaldo(idUsuario);

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

  await auditService.registrarRecompensa(auditService.usuario(idUsuario), 'meta.concluida', {
    entidade: 'goal',
    id: idMeta,
    antes: { ...saldoAntes, status: meta.status, progresso: Number(meta.current_value) },
    depois: await auditService.retratoDoSaldo(idUsuario),
    detalhes: { status: 'concluida', melGanho: recompensa.mel, polenGanho: recompensa.polen },
  });

  // RN-016: meta concluída dá lugar a outra, e a RN-018 exige que sempre exista
  // pelo menos uma ativa. Fora da transação de propósito — a recompensa já está
  // paga e registrada, e o planejador é idempotente: se falhar aqui, o painel
  // completa o plano na próxima visita, sem gerar meta a mais.
  await goalPlannerService.garantirMetasAtivas(idUsuario);

  return recompensa;
}
