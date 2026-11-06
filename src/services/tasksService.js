import { emTransacao } from '../config/database.js';
import * as tasksRepository from '../repositories/tasksRepository.js';
import {
  dataDoDia,
  diaDaSemana,
  diaDoAno,
  fimDaSemana,
  fimDoDia,
  inicioDaSemana,
  inicioDoDia,
} from '../utils/diaDoJogador.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as pointsService from './pointsService.js';
import * as profilesService from './profilesService.js';
import * as schedulesService from './schedulesService.js';
import * as taskProgressSources from './taskProgressSources.js';

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

/**
 * A tarefa pronta para a tela (RF-HOM-08): progresso em percentual e a resposta
 * de "já dá para receber?". Conta de tarefa não mora na view.
 *
 * Pura, para poder ser testada sem banco.
 */
export function resumirTarefa(tarefa) {
  const atual = Number(tarefa.current_value);
  const alvo = Number(tarefa.target_value);

  return {
    id: Number(tarefa.id),
    titulo: tarefa.title,
    atual,
    alvo,
    percentual: alvo === 0 ? 0 : Math.min(100, Math.round((atual / alvo) * 100)),
    escopo: tarefa.scope,
    status: tarefa.status,
    concluida: tarefa.status === 'concluida',
    cumprida: atual >= alvo,
    melDaRecompensa: Number(tarefa.reward_coins),
    polenDaRecompensa: Number(tarefa.reward_points),
  };
}

export async function listarAtivas(idUsuario) {
  return tasksRepository.listarAtivasPorUsuario(idUsuario);
}

async function exigirPosse(idTarefa, idUsuario) {
  const tarefa = await tasksRepository.buscarPorId(idTarefa);
  if (!tarefa) throw erroNaoEncontrado('Tarefa não encontrada');
  if (Number(tarefa.user_id) !== Number(idUsuario)) throw erroAcessoNegado();
  return tarefa;
}

/**
 * Garante que o jogador tenha as tarefas do dia, e só elas.
 *
 * O jogador **não cria tarefa**. Isso não é restrição de interface: era o buraco
 * que a auditoria da E02 encontrou. Com criação livre, criar e concluir em
 * sequência pagava recompensa cheia sem cumprir nada, em laço — mel infinito.
 * Agora quem propõe é a colmeia, e o teto de ganho do dia passa a ser um número
 * fixo em vez de "o que o navegador aguentar".
 *
 * A geração é *lazy*, como o ciclo econômico da RN-036: acontece quando o
 * jogador entra, não por um cron que precisa estar de pé. Se ele não abrir o
 * jogo, não há tarefa pendente acumulando cobrança.
 *
 * Só gera em dia marcado na agenda (RN-011). Agenda vazia — conta que nunca
 * passou pelo onboarding — vale como "todo dia", para ninguém ficar sem jogo por
 * causa de configuração faltando.
 */
const TAREFAS_DIARIAS = 2;
const TAREFAS_SEMANAIS = 1;

/** Teto duro da RN-047, contando o que sobrou de ontem, não cota por escopo. */
const MAXIMO_DE_ATIVAS = 3;

function paraMySQL(data) {
  return data.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Escolhe quais tipos entram hoje, girando a lista pelo dia do ano.
 *
 * Determinístico de propósito: sorteio daria variedade, mas o mesmo jogador
 * poderia receber a mesma tarefa três dias seguidos por azar, e um teste não
 * teria como afirmar nada. A rotação garante variedade sem depender de sorte.
 */
function escolherTipos(tipos, quantidade, hoje) {
  if (tipos.length === 0) return [];
  const dia = diaDoAno(hoje);
  return Array.from({ length: Math.min(quantidade, tipos.length) }, (_, indice) => {
    return tipos[(dia + indice) % tipos.length];
  });
}

export async function garantirTarefasDoDia(idUsuario, agora = new Date()) {
  // O dia é o do jogador, não o do servidor (RN-024): em outro fuso, a virada
  // no relógio da máquina entregava as tarefas na hora errada.
  const fuso = await profilesService.fusoDoUsuario(idUsuario);
  const hoje = dataDoDia(agora, fuso);

  // Expira antes de contar. Tarefa vencida ocupando vaga faria o teto de 3
  // bloquear a geração de hoje, e o jogador ficaria sem tarefa nenhuma.
  await emTransacao((conexao) => tasksRepository.expirarVencidasDoUsuario(idUsuario, conexao));

  const disponiveis = await schedulesService.diasDisponiveis(idUsuario);
  const hojeVale = disponiveis.length === 0 || disponiveis.includes(diaDaSemana(hoje));
  if (!hojeVale) return { criadas: 0, motivo: 'dia fora da agenda do jogador' };

  const vagas = MAXIMO_DE_ATIVAS - (await tasksRepository.contarAtivas(idUsuario));
  if (vagas <= 0) return { criadas: 0, motivo: 'o jogador já tem o máximo de tarefas ativas' };

  // Tipo cuja fonte ninguém sabe medir não é proposto, pelo mesmo motivo do
  // planejador de metas: tarefa impossível de cumprir não é tarefa.
  const mensuraveis = taskProgressSources.fontesMensuraveis();
  const tipos = (await tasksRepository.listarTipos()).filter((tipo) =>
    mensuraveis.includes(tipo.progress_source),
  );
  const diarios = tipos.filter((tipo) => tipo.scope === 'diaria');
  const semanais = tipos.filter((tipo) => tipo.scope === 'semanal');

  const [jaDiarias, jaSemanais] = await Promise.all([
    tasksRepository.listarAtivasPorEscopoDesde(idUsuario, 'diaria', paraMySQL(inicioDoDia(hoje, fuso))),
    tasksRepository.listarAtivasPorEscopoDesde(idUsuario, 'semanal', paraMySQL(inicioDaSemana(hoje, fuso))),
  ]);

  const aCriar = [
    ...escolherTipos(diarios, TAREFAS_DIARIAS - jaDiarias.length, hoje).map((tipo) => ({
      tipo,
      prazo: paraMySQL(fimDoDia(hoje, fuso)),
    })),
    ...escolherTipos(semanais, TAREFAS_SEMANAIS - jaSemanais.length, hoje).map((tipo) => ({
      tipo,
      prazo: paraMySQL(fimDaSemana(hoje, fuso)),
    })),
  ].slice(0, vagas);

  for (const { tipo, prazo } of aCriar) {
    const idTarefa = await emTransacao((conexao) =>
      tasksRepository.criar(conexao, { idUsuario, idTipo: tipo.id, prazo }),
    );

    await auditService.registrar(auditService.sistema(), 'tarefa.gerada', {
      entidade: 'task',
      id: idTarefa,
      depois: { tipo: tipo.slug, escopo: tipo.scope, prazo, alvo: Number(tipo.default_target) },
    });
  }

  return { criadas: aCriar.length };
}

/** O pedaço de tempo que a tarefa mede: da criação dela até o prazo. */
function janelaDaTarefa(tarefa, fuso) {
  const inicio = new Date(tarefa.created_at);
  const fim = new Date(tarefa.due_at);
  const ultimoInstante = new Date(fim.getTime() - 1000);

  return {
    inicio: paraMySQL(inicio),
    fim: paraMySQL(fim),
    dataInicial: dataDoDia(inicio, fuso),
    dataFinal: dataDoDia(ultimoInstante, fuso),
  };
}

/**
 * Relê o progresso de cada tarefa ativa na fonte que o tipo declara (RF-TAR-02).
 * Substitui o passo manual da DT-21: quem move a tarefa é a célula concluída, o
 * dia jogado e o favo fechado, nunca um clique em "avancei".
 */
export async function sincronizarProgresso(idUsuario) {
  const fuso = await profilesService.fusoDoUsuario(idUsuario);
  const ativas = await tasksRepository.listarAtivasPorUsuario(idUsuario);
  let atualizadas = 0;

  for (const tarefa of ativas) {
    const medido = await taskProgressSources.medir(tarefa.progress_source, idUsuario, janelaDaTarefa(tarefa, fuso));
    if (medido === null) continue;

    await emTransacao((conexao) => tasksRepository.definirProgresso(conexao, tarefa.id, medido));
    atualizadas += 1;
  }

  return { atualizadas };
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

  if (Number(tarefa.current_value) < Number(tarefa.target_value)) {
    throw erroValidacao(
      `Esta tarefa ainda não foi cumprida: ${tarefa.current_value} de ${tarefa.target_value}`,
    );
  }

  // Retrato antes do crédito, para a linha de auditoria (RN-010).
  const saldoAntes = await auditService.retratoDoSaldo(idUsuario);

  const recompensa = await emTransacao(async (conexao) => {
    const afetadas = await tasksRepository.concluir(conexao, idTarefa);
    // Zero linhas aqui, depois da checagem acima, significa corrida: outra
    // requisição concluiu no meio do caminho. O `WHERE` é quem decide.
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

  await auditService.registrarRecompensa(auditService.usuario(idUsuario), 'tarefa.concluida', {
    entidade: 'task',
    id: idTarefa,
    antes: { ...saldoAntes, status: tarefa.status, progresso: Number(tarefa.current_value) },
    depois: await auditService.retratoDoSaldo(idUsuario),
    detalhes: { status: 'concluida', polenGanho: recompensa.polen, melGanho: recompensa.mel },
  });

  return recompensa;
}
