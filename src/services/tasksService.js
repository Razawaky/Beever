import { emTransacao } from '../config/database.js';
import * as tasksRepository from '../repositories/tasksRepository.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as pointsService from './pointsService.js';
import * as schedulesService from './schedulesService.js';

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

function inicioDoDia(agora = new Date()) {
  const dia = new Date(agora);
  dia.setHours(0, 0, 0, 0);
  return dia;
}

function inicioDaSemana(agora = new Date()) {
  const inicio = inicioDoDia(agora);
  inicio.setDate(inicio.getDate() - inicio.getDay());
  return inicio;
}

function fimDoDia(agora = new Date()) {
  const dia = inicioDoDia(agora);
  dia.setDate(dia.getDate() + 1);
  return dia;
}

function fimDaSemana(agora = new Date()) {
  const fim = inicioDaSemana(agora);
  fim.setDate(fim.getDate() + 7);
  return fim;
}

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
function escolherTipos(tipos, quantidade, agora) {
  if (tipos.length === 0) return [];
  const diaDoAno = Math.floor((agora - new Date(agora.getFullYear(), 0, 0)) / 86400000);
  return Array.from({ length: Math.min(quantidade, tipos.length) }, (_, indice) => {
    return tipos[(diaDoAno + indice) % tipos.length];
  });
}

export async function garantirTarefasDoDia(idUsuario, agora = new Date()) {
  const disponiveis = await schedulesService.diasDisponiveis(idUsuario);
  const hojeVale = disponiveis.length === 0 || disponiveis.includes(agora.getDay());
  if (!hojeVale) return { criadas: 0, motivo: 'dia fora da agenda do jogador' };

  const tipos = await tasksRepository.listarTipos();
  const diarios = tipos.filter((tipo) => tipo.scope === 'diaria');
  const semanais = tipos.filter((tipo) => tipo.scope === 'semanal');

  const [jaDiarias, jaSemanais] = await Promise.all([
    tasksRepository.listarAtivasPorEscopoDesde(idUsuario, 'diaria', paraMySQL(inicioDoDia(agora))),
    tasksRepository.listarAtivasPorEscopoDesde(idUsuario, 'semanal', paraMySQL(inicioDaSemana(agora))),
  ]);

  const aCriar = [
    ...escolherTipos(diarios, TAREFAS_DIARIAS - jaDiarias.length, agora).map((tipo) => ({
      tipo,
      prazo: paraMySQL(fimDoDia(agora)),
    })),
    ...escolherTipos(semanais, TAREFAS_SEMANAIS - jaSemanais.length, agora).map((tipo) => ({
      tipo,
      prazo: paraMySQL(fimDaSemana(agora)),
    })),
  ];

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

/**
 * Quantos passos manuais cumprem uma tarefa.
 *
 * **Isto é uma ponte, e tem data para acabar.** O progresso de verdade vem do
 * evento que o tipo declara (`cell_completed`, `vault_deposit`, `active_days`),
 * e nenhum desses existe antes da E07/E08. Até lá, o jogador marca que avançou.
 *
 * O passo é uma fração do alvo, e não uma unidade, porque alvo não é número de
 * cliques: "conclua 3 células" e "deposite 50 de mel no cofre" custam o mesmo
 * esforço de dedo, e cinquenta cliques seguidos seriam uma tarefa sobre
 * paciência, não sobre dinheiro. Três passos fecham qualquer uma.
 *
 * O teto de ganho do dia continua sendo o número de tarefas geradas — é ele que
 * fechou o buraco, não o tamanho do passo.
 */
const PASSOS_PARA_CUMPRIR = 3;

/**
 * Registra um passo cumprido. Ao bater o alvo a tarefa não se conclui sozinha —
 * quem fecha é `concluir`, e é lá que a recompensa é paga.
 *
 * Quem chama diz *que* avançou, nunca *quanto*: o tamanho do passo é calculado
 * aqui, a partir do alvo que o servidor gravou. Deixar o cliente escolher seria
 * devolver ao navegador o controle sobre a recompensa, que é o que a RN-007
 * proíbe e o que a auditoria da E02 pegou.
 */
export async function registrarProgresso(idTarefa, idUsuario) {
  const tarefa = await exigirPosse(idTarefa, idUsuario);
  const passo = Math.max(1, Math.ceil(Number(tarefa.target_value) / PASSOS_PARA_CUMPRIR));

  await emTransacao((conexao) => tasksRepository.registrarProgresso(conexao, idTarefa, passo));
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

  if (Number(tarefa.current_value) < Number(tarefa.target_value)) {
    throw erroValidacao(
      `Esta tarefa ainda não foi cumprida: ${tarefa.current_value} de ${tarefa.target_value}`,
    );
  }

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

  await auditService.registrar(auditService.usuario(idUsuario), 'tarefa.concluida', {
    entidade: 'task',
    id: idTarefa,
    antes: { status: tarefa.status, progresso: Number(tarefa.current_value) },
    depois: { status: 'concluida', polenGanho: recompensa.polen, melGanho: recompensa.mel },
  });

  return recompensa;
}
