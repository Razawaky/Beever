import { emTransacao } from '../config/database.js';
import * as gameSessionsRepository from '../repositories/gameSessionsRepository.js';
import * as inventoryRepository from '../repositories/inventoryRepository.js';
import * as itemsRepository from '../repositories/itemsRepository.js';
import * as streaksRepository from '../repositories/streaksRepository.js';
import { dataDoDia, diaDaSemana, diferencaEmDias, inicioDoDia, somarDias } from '../utils/diaDoJogador.js';
import * as achievementsService from './achievementsService.js';
import * as auditService from './auditService.js';
import * as profilesService from './profilesService.js';
import * as schedulesService from './schedulesService.js';

/**
 * A sequência do jogador (RN-019 a RN-021, RN-024).
 *
 * A avaliação é preguiçosa, como a expiração de meta: roda quando o jogador
 * abre uma página, não num cron que precisa estar de pé. Só dias **fechados**
 * são julgados — o de hoje ainda pode ser cumprido, e condenar o dia em
 * andamento seria quebrar a sequência de quem ainda vai jogar à noite.
 *
 * Quatro desfechos por dia: cumprido (concluiu célula em dia marcado), perdido
 * (dia marcado sem nenhuma célula), neutro (dia que o jogador não marcou — não
 * avança nem quebra, RN-020) e protegido, quando um Escudo de Sequência é
 * gasto para salvar um dia perdido (RN-022).
 *
 * O dia vem sempre do fuso do perfil, nunca do relógio do servidor.
 */

/** Sumiço maior que isto zera a sequência sem varrer o histórico inteiro. */
const MAXIMO_DE_DIAS_AVALIADOS = 60;

/** O escudo é item de loja, e o teto de dois guardados é da RN-022. */
const ESCUDO = 'escudo-de-sequencia';
const MAXIMO_DE_ESCUDOS = 2;

/** Marcos que rendem mel e conquista (RN-023). O valor de cada um vem do banco. */
const MARCOS = [7, 14, 30, 60, 100];

function paraMySQL(data) {
  return data.toISOString().slice(0, 19).replace('T', ' ');
}

/** Agenda vazia vale como "todo dia", igual à geração de tarefas (RN-011). */
function ehDiaMarcado(agenda, dataISO) {
  return agenda.length === 0 || agenda.includes(diaDaSemana(dataISO));
}

/** O desfecho de um dia fechado, antes de o escudo ter chance de salvá-lo. */
function desfechoDoDia(agenda, dia, cumpriu) {
  if (!ehDiaMarcado(agenda, dia)) return 'neutro';
  if (cumpriu) return 'cumprido';
  return 'perdido';
}

async function idDoEscudo() {
  const item = await itemsRepository.buscarPorSlug(ESCUDO);
  return item ? Number(item.id) : null;
}

/** Quantos escudos o jogador tem em mãos. A verdade é o inventário. */
export async function escudosDisponiveis(idUsuario) {
  const idItem = await idDoEscudo();
  if (!idItem) return 0;
  return inventoryRepository.contarAtivosDoItem(idUsuario, idItem);
}

/**
 * Copia para `streaks.shields_available` a contagem real do inventário.
 *
 * Chamada pela compra e por todo consumo: coluna que atualiza depois é cache
 * que mente na tela seguinte, e aqui ela ainda por cima carrega o `CHECK` do
 * teto da RN-022.
 */
export async function sincronizarEscudos(conexao, idUsuario) {
  const idItem = await idDoEscudo();
  if (!idItem) return 0;

  const emMaos = await inventoryRepository.contarAtivosDoItem(idUsuario, idItem, conexao);
  const guardados = Math.min(emMaos, MAXIMO_DE_ESCUDOS);

  await streaksRepository.criarSeNaoExistir(idUsuario, conexao);
  await streaksRepository.definirEscudos(conexao, idUsuario, guardados);
  return guardados;
}

/**
 * Gasta um escudo, se houver. Devolve `true` quando o dia foi salvo.
 *
 * Tudo numa transação porque são três escritas que só fazem sentido juntas:
 * travar a unidade, marcá-la consumida e refazer o espelho da contagem.
 */
async function consumirEscudo(idUsuario) {
  const idItem = await idDoEscudo();
  if (!idItem) return false;

  return emTransacao(async (conexao) => {
    const unidade = await inventoryRepository.bloquearUnidadeAtivaDoItem(conexao, idUsuario, idItem);
    if (!unidade) return false;

    const consumiu = await inventoryRepository.marcarComoConsumido(conexao, unidade.id);
    if (!consumiu) return false;

    await sincronizarEscudos(conexao, idUsuario);
    return true;
  });
}

async function agendaDoJogador(idUsuario) {
  const dias = await schedulesService.diasDisponiveis(idUsuario);
  return dias.map(Number);
}

/**
 * De onde a varredura começa: o dia em que o jogador foi avaliado pela última
 * vez, porque naquela hora ele ainda estava aberto e ninguém o julgou.
 */
function primeiroDiaNaoAvaliado(sequencia, hoje, fuso) {
  const referencia = sequencia.last_evaluated_at ?? sequencia.created_at;
  const dia = referencia ? dataDoDia(new Date(referencia), fuso) : hoje;
  const limite = somarDias(hoje, -MAXIMO_DE_DIAS_AVALIADOS);
  return diferencaEmDias(dia, limite) > 0 ? limite : dia;
}

function diasFechados(primeiroDia, hoje) {
  const dias = [];
  for (let dia = primeiroDia; diferencaEmDias(dia, hoje) > 0; dia = somarDias(dia, 1)) {
    dias.push(dia);
  }
  return dias;
}

/**
 * Em que dias o jogador concluiu pelo menos uma célula (RN-019).
 *
 * A fonte é `game_sessions`, que guarda uma linha por partida e por isso lembra
 * de todos os dias — `cell_progress` só guarda a última conclusão de cada
 * célula e perderia o dia anterior quando a criança repete a mesma célula.
 */
async function diasComCelulaConcluida(idUsuario, primeiroDia, hoje, fuso) {
  const conclusoes = await gameSessionsRepository.listarConclusoesNoIntervalo(
    idUsuario,
    paraMySQL(inicioDoDia(primeiroDia, fuso)),
    paraMySQL(inicioDoDia(hoje, fuso)),
  );

  return new Set(conclusoes.map((linha) => dataDoDia(new Date(linha.finished_at), fuso)));
}

/**
 * Paga o marco quando a sequência bate o número exato. A conquista é única por
 * jogador, então chegar de novo aos 7 dias não paga segunda vez.
 */
async function conferirMarco(idUsuario, diasAtuais) {
  if (!MARCOS.includes(diasAtuais)) return null;

  const { desbloqueou, melCreditado } = await achievementsService.desbloquear(idUsuario, `sequencia-${diasAtuais}`);
  return desbloqueou ? { dias: diasAtuais, melCreditado } : null;
}

/**
 * Avalia os dias fechados desde a última visita e devolve a sequência de hoje.
 *
 * Chamar duas vezes no mesmo dia não muda nada: cada dia já avaliado tem evento
 * gravado, e evento existente é pulado.
 */
export async function avaliar(idUsuario, agora = new Date()) {
  const fuso = await profilesService.fusoDoUsuario(idUsuario);
  const hoje = dataDoDia(agora, fuso);
  const sequencia = await streaksRepository.criarSeNaoExistir(idUsuario);

  const primeiroDia = primeiroDiaNaoAvaliado(sequencia, hoje, fuso);
  const dias = diasFechados(primeiroDia, hoje);

  let diasAtuais = Number(sequencia.current_days);
  let melhorDias = Number(sequencia.best_days);
  let ultimoDiaContado = sequencia.last_counted_date;
  let quebrou = false;
  const protegidos = [];
  const marcos = [];

  if (dias.length > 0) {
    const [agenda, cumpridos, jaAvaliados] = await Promise.all([
      agendaDoJogador(idUsuario),
      diasComCelulaConcluida(idUsuario, primeiroDia, hoje, fuso),
      streaksRepository.listarEventos(idUsuario, primeiroDia, hoje),
    ]);

    const comDesfecho = new Set(jaAvaliados.map((evento) => evento.data));

    for (const dia of dias) {
      if (comDesfecho.has(dia)) continue;

      let tipo = desfechoDoDia(agenda, dia, cumpridos.has(dia));

      // O escudo só é gasto quando há sequência para salvar: proteger um dia de
      // quem já está zerado queimaria 400 de mel para não mudar nada.
      if (tipo === 'perdido' && diasAtuais > 0 && (await consumirEscudo(idUsuario))) {
        tipo = 'protegido';
        protegidos.push(dia);
      }

      await streaksRepository.registrarEvento({ idUsuario, data: dia, tipo });

      if (tipo === 'cumprido') {
        diasAtuais += 1;
        ultimoDiaContado = dia;
        melhorDias = Math.max(melhorDias, diasAtuais);

        const marco = await conferirMarco(idUsuario, diasAtuais);
        if (marco) marcos.push(marco);
      }

      if (tipo === 'perdido' && diasAtuais > 0) {
        quebrou = true;
        diasAtuais = 0;
      }
    }
  }

  await streaksRepository.atualizar(idUsuario, {
    diasAtuais,
    melhorDias,
    ultimoDiaContado,
    avaliadoEm: paraMySQL(agora),
  });

  if (quebrou) {
    await auditService.registrar(auditService.sistema(), 'sequencia.quebrada', {
      entidade: 'streak',
      id: Number(sequencia.id),
      antes: { diasAtuais: Number(sequencia.current_days) },
      depois: { diasAtuais: 0 },
    });
  }

  for (const dia of protegidos) {
    await auditService.registrar(auditService.sistema(), 'sequencia.escudo-consumido', {
      entidade: 'streak',
      id: Number(sequencia.id),
      antes: { diaSalvo: dia, diasAtuais },
      depois: { escudosGuardados: await escudosDisponiveis(idUsuario) },
    });
  }

  return { diasAtuais, melhorDias, ultimoDiaContado, protegidos, marcos, hoje, fuso };
}

/**
 * Conta o dia de hoje como cumprido, na hora em que a célula é concluída.
 *
 * Vem antes a avaliação dos dias fechados: sem ela, quem perdeu ontem somaria
 * em cima de uma sequência que já devia estar zerada.
 *
 * Dia não marcado ganha evento neutro e mais nada — atividade em dia de folga
 * conta XP e mel, mas não mexe na sequência (RN-020).
 */
export async function registrarDiaCumprido(idUsuario, agora = new Date()) {
  const resumo = await avaliar(idUsuario, agora);
  const agenda = await agendaDoJogador(idUsuario);
  const marcado = ehDiaMarcado(agenda, resumo.hoje);

  const gravou = await streaksRepository.registrarEvento({
    idUsuario,
    data: resumo.hoje,
    tipo: marcado ? 'cumprido' : 'neutro',
  });

  // Dia que já tinha desfecho não conta de novo: a sequência anda um dia por
  // dia, por mais células que a criança jogue.
  if (!gravou || !marcado) return resumo;

  const diasAtuais = resumo.diasAtuais + 1;
  const melhorDias = Math.max(resumo.melhorDias, diasAtuais);

  await streaksRepository.atualizar(idUsuario, {
    diasAtuais,
    melhorDias,
    ultimoDiaContado: resumo.hoje,
    avaliadoEm: paraMySQL(agora),
  });

  const marco = await conferirMarco(idUsuario, diasAtuais);
  const marcos = marco ? [...resumo.marcos, marco] : resumo.marcos;

  return { ...resumo, diasAtuais, melhorDias, ultimoDiaContado: resumo.hoje, marcos };
}
