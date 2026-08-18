import { emTransacao } from '../config/database.js';
import * as tasksRepository from '../repositories/tasksRepository.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as pointsService from './pointsService.js';

/**
 * Tarefas diárias e semanais.
 *
 * Duas mudanças herdadas do schema novo, e as duas mexem em como este service
 * funciona:
 *
 * 1. **A tarefa não pertence a uma meta.** É do usuário e nasce de um
 *    `task_type` do catálogo, que carrega o texto ("Conclua 3 células hoje"), o
 *    alvo e a recompensa. O jogador não escreve tarefa à mão — ele cumpre as
 *    que o jogo propõe.
 * 2. **A recompensa vem do catálogo, não de constante.** O
 *    `PONTOS_POR_TAREFA_CONCLUIDA = 10` que vivia no service de pontos era a
 *    dívida DT-04: quanto uma tarefa paga é dado, e cada tarefa carrega o seu.
 *
 * A geração automática das tarefas do dia, respeitando a agenda semanal, é a
 * E08. Aqui existe a criação avulsa, que é o que a tela usa hoje.
 */

export async function listarDoUsuario(idUsuario) {
  return tasksRepository.listarPorUsuario(idUsuario);
}

export async function listarAtivas(idUsuario) {
  return tasksRepository.listarAtivasPorUsuario(idUsuario);
}

export async function listarTiposDisponiveis() {
  return tasksRepository.listarTipos();
}

async function exigirPosse(idTarefa, idUsuario) {
  const tarefa = await tasksRepository.buscarPorId(idTarefa);
  if (!tarefa) throw erroNaoEncontrado('Tarefa não encontrada');
  if (Number(tarefa.user_id) !== Number(idUsuario)) throw erroAcessoNegado();
  return tarefa;
}

export async function criar(idUsuario, { tipo, prazo, alvo = null }) {
  const tipos = await tasksRepository.listarTipos();
  const escolhido = tipos.find((linha) => linha.slug === tipo);
  if (!escolhido) throw erroValidacao(`Tipo de tarefa desconhecido: ${tipo}`);

  const idTarefa = await emTransacao((conexao) =>
    tasksRepository.criar(conexao, { idUsuario, idTipo: escolhido.id, alvo, prazo }),
  );

  await auditService.registrar(auditService.usuario(idUsuario), 'tarefa.criada', {
    entidade: 'task',
    id: idTarefa,
    depois: { tipo, prazo, alvo: alvo ?? Number(escolhido.default_target) },
  });

  return idTarefa;
}

/** Soma progresso na tarefa; ao bater o alvo, ela não se conclui sozinha — quem fecha é `concluir`. */
export async function registrarProgresso(idTarefa, idUsuario, incremento = 1) {
  await exigirPosse(idTarefa, idUsuario);
  await emTransacao((conexao) => tasksRepository.registrarProgresso(conexao, idTarefa, Number(incremento)));
  return tasksRepository.buscarPorId(idTarefa);
}

/**
 * Conclui e paga, tudo dentro da mesma transação.
 *
 * A recompensa sai da própria tarefa (`reward_points` e `reward_coins`, que
 * vieram do tipo no momento da criação) — congelada ali por decisão de projeto,
 * pelo mesmo motivo do preço na compra: mudar o catálogo amanhã não pode
 * reescrever o que a tarefa de hoje prometeu.
 *
 * O crédito só acontece se `concluir` afetou linha. Clicar duas vezes rápido
 * devolve zero na segunda, e nada é pago de novo.
 */
export async function concluir(idTarefa, idUsuario) {
  const tarefa = await exigirPosse(idTarefa, idUsuario);

  const recompensa = await emTransacao(async (conexao) => {
    const afetadas = await tasksRepository.concluir(conexao, idTarefa);
    if (afetadas === 0) throw erroValidacao('Esta tarefa já foi concluída');

    const polen = Number(tarefa.reward_points);
    const mel = Number(tarefa.reward_coins);

    if (polen > 0) {
      await pointsService.creditar(conexao, idUsuario, polen, {
        motivo: 'conclusao-tarefa',
        referenciaTipo: 'task',
        referenciaId: idTarefa,
      });
    }
    if (mel > 0) {
      await coinsService.creditar(conexao, idUsuario, mel, {
        motivo: 'conclusao-tarefa',
        referenciaTipo: 'task',
        referenciaId: idTarefa,
      });
    }

    return { polen, mel };
  });

  await auditService.registrar(auditService.usuario(idUsuario), 'tarefa.concluida', {
    entidade: 'task',
    id: idTarefa,
    antes: { status: tarefa.status, progresso: Number(tarefa.current_value) },
    depois: { status: 'concluida', polenGanho: recompensa.polen, melGanho: recompensa.mel },
  });

  return recompensa;
}
