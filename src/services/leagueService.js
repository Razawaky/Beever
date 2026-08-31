import { emTransacao } from '../config/database.js';
import { logger } from '../config/logger.js';
import * as leaguesRepository from '../repositories/leaguesRepository.js';
import { dataDoDia, diaDaSemana, somarDias } from '../utils/diaDoJogador.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';

/**
 * Liga semanal por pólen (RF-GAM-02).
 *
 * **A semana da liga é a do calendário UTC**, e não o dia do jogador. Sequência
 * e ciclo econômico usam o fuso de cada um porque falam de hábito individual; a
 * liga compara pessoas, e cada uma com uma janela diferente tornaria a
 * comparação injusta — quem estivesse num fuso adiantado teria horas a mais.
 *
 * Abre e fecha preguiçosamente, na visita à Colmeia, pelo mesmo motivo da
 * RN-036: sem cron no MVP.
 *
 * Ninguém é rebaixado e ninguém sai. A semana nova começa com todos zerados, e o
 * pódio ganha mel — é o "sem rebaixamento punitivo" escrito como comportamento.
 */

/** Trinta é o tamanho de grupo que os aplicativos do gênero usam, e o da RNF de carga. */
const TAMANHO_DO_GRUPO = 30;

/** O domingo e o sábado da semana daquele instante, em UTC. */
export function semanaDe(agora = new Date()) {
  const hoje = dataDoDia(agora, 'UTC');
  const domingo = somarDias(hoje, -diaDaSemana(hoje));

  return { hoje, domingo, sabado: somarDias(domingo, 6) };
}

/**
 * Uma data como `AAAA-MM-DD`, venha ela de texto ou do driver.
 *
 * Coluna `DATE` volta do `mysql2` como `Date`, e concatenar isso num texto
 * produziria "Sat Aug 22 2026 ..." dentro do SQL. O `toISOString` resolve porque
 * a semana da liga é UTC — se fosse o dia do jogador, o fuso mudaria o resultado.
 */
export function paraDataISO(valor) {
  return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10);
}

/** O intervalo fechado que a consulta do livro recebe, do primeiro ao último segundo. */
export function intervaloDaSemana({ domingo, sabado }) {
  return { de: `${paraDataISO(domingo)} 00:00:00`, ate: `${paraDataISO(sabado)} 23:59:59` };
}

/**
 * Ordena os membros e resolve o empate.
 *
 * Empate divide a mesma posição, e a posição seguinte pula — dois primeiros
 * lugares não podem ter um segundo lugar entre eles. Quem empatou no pódio
 * recebe o prêmio daquela posição: dividir o mel entre eles faria a criança ser
 * punida por outra ter jogado bem.
 */
export function ranquear(membros) {
  const ordenados = [...membros].sort((um, outro) => {
    const diferenca = Number(outro.polen) - Number(um.polen);
    return diferenca !== 0 ? diferenca : String(um.nickname).localeCompare(String(outro.nickname));
  });

  let posicao = 0;
  let anterior = null;

  return ordenados.map((membro, indice) => {
    if (anterior === null || Number(membro.polen) !== anterior) {
      posicao = indice + 1;
      anterior = Number(membro.polen);
    }
    return { ...membro, polen: Number(membro.polen), posicao };
  });
}

/**
 * Em qual grupo o jogador entra: o primeiro que ainda tem vaga, ou um novo.
 *
 * Pura, para o teste não precisar de banco só para conferir a conta da vaga.
 */
export function grupoComVaga(grupos, tamanho = TAMANHO_DO_GRUPO) {
  return grupos.find((grupo) => Number(grupo.membros) < tamanho) ?? null;
}

function nomeDoGrupo(quantidade) {
  return `Grupo ${quantidade + 1}`;
}

/**
 * Garante que o jogador está num grupo da semana corrente.
 *
 * Chamada na visita à Colmeia. Entrar é `INSERT IGNORE`, então duas visitas
 * simultâneas não põem o jogador em dois grupos.
 */
export async function garantirParticipacao(idUsuario, agora = new Date()) {
  const semana = semanaDe(agora);

  const jaEstava = await leaguesRepository.buscarGrupoDoJogador(idUsuario, semana.domingo);
  if (jaEstava) return jaEstava;

  const grupos = await leaguesRepository.listarDaSemana(semana.domingo);
  const comVaga = grupoComVaga(grupos);

  const idLiga =
    comVaga?.id ??
    (await leaguesRepository.criarGrupo(semana.domingo, semana.sabado, nomeDoGrupo(grupos.length)));

  await leaguesRepository.entrar(idLiga, idUsuario);
  return leaguesRepository.buscarGrupoDoJogador(idUsuario, semana.domingo);
}

/**
 * O período da semana escrito como a criança lê, para a tela não formatar data.
 * Pura: recebe as duas datas ISO que a liga já devolve.
 */
export function periodoDaLiga({ comecaEm, terminaEm }) {
  const emDiaEMes = (data) => data.slice(8, 10) + '/' + data.slice(5, 7);
  return `${emDiaEMes(comecaEm)} a ${emDiaEMes(terminaEm)}`;
}

/** O que cada posição do pódio paga, para a tela explicar antes da semana fechar. */
export async function premiosDoPodio() {
  const premios = await leaguesRepository.listarPremios();
  return premios.map((premio) => ({ posicao: Number(premio.final_rank), mel: Number(premio.reward_coins) }));
}

/**
 * A liga da semana do jogador, com o pólen somado do livro e o cache regravado.
 *
 * Devolve `null` para quem ainda não entrou em grupo nenhum: aparecer em último
 * sem ter jogado é a humilhação que a RF-GAM-02 manda evitar.
 */
export async function ligaDoJogador(idUsuario, agora = new Date()) {
  const semana = semanaDe(agora);
  const grupo = await leaguesRepository.buscarGrupoDoJogador(idUsuario, semana.domingo);
  if (!grupo) return null;

  const { de, ate } = intervaloDaSemana(semana);
  const ranqueados = ranquear(await leaguesRepository.listarMembrosComPolen(grupo.id, de, ate));

  // O cache só é regravado para quem está lendo: escrever a tabela inteira a
  // cada visita seria trinta UPDATEs para mostrar uma tela.
  const meu = ranqueados.find((membro) => Number(membro.user_id) === Number(idUsuario));
  if (meu && Number(grupo.points) !== meu.polen) {
    await leaguesRepository.atualizarPontos(grupo.id, idUsuario, meu.polen);
  }

  return {
    grupo: {
      id: grupo.id,
      nome: grupo.name,
      comecaEm: paraDataISO(grupo.starts_on),
      terminaEm: paraDataISO(grupo.ends_on),
    },
    posicao: meu?.posicao ?? null,
    polen: meu?.polen ?? 0,
    membros: ranqueados,
  };
}

/**
 * Fecha as semanas que já passaram: grava a posição final e paga o pódio.
 *
 * Idempotente pela coluna: `gravarPosicaoFinal` só escreve onde `final_rank` é
 * nulo, então duas visitas na virada da semana não pagam duas vezes — é a mesma
 * trava que o marco de sequência usa desde a T-08.4.
 */
export async function fecharSemanasVencidas(agora = new Date()) {
  const { hoje } = semanaDe(agora);
  const pendentes = await leaguesRepository.listarPendentesDeFechamento(hoje);
  if (pendentes.length === 0) return [];

  const premios = new Map(
    (await leaguesRepository.listarPremios()).map((premio) => [
      Number(premio.final_rank),
      Number(premio.reward_coins),
    ]),
  );

  const fechadas = [];
  for (const liga of pendentes) {
    fechadas.push(await fecharLiga(liga, premios));
  }
  return fechadas;
}

async function fecharLiga(liga, premios) {
  const { de, ate } = intervaloDaSemana({ domingo: liga.starts_on, sabado: liga.ends_on });
  const ranqueados = ranquear(await leaguesRepository.listarMembrosComPolen(liga.id, de, ate));

  const pagos = [];
  for (const membro of ranqueados) {
    const gravou = await leaguesRepository.gravarPosicaoFinal(
      liga.id,
      membro.user_id,
      membro.posicao,
      membro.polen,
    );
    // Quem já tinha posição foi fechado por outra visita: não paga de novo.
    if (!gravou) continue;

    const premio = premios.get(membro.posicao) ?? 0;
    if (premio > 0) {
      await pagarPremio(membro, liga, premio);
      pagos.push({ idUsuario: Number(membro.user_id), posicao: membro.posicao, mel: premio });
    }
  }

  return { liga: liga.name, semana: paraDataISO(liga.starts_on), participantes: ranqueados.length, pagos };
}

/**
 * Paga o mel do pódio, em transação e com auditoria.
 *
 * Falha aqui não desfaz o fechamento: a posição final já está gravada, e o
 * pagamento perdido vira alarme no log — é a mesma escolha que a auditoria faz.
 */
async function pagarPremio(membro, liga, premio) {
  try {
    const antes = await auditService.retratoDoSaldo(membro.user_id);

    await emTransacao((conexao) =>
      coinsService.creditar(conexao, membro.user_id, premio, {
        motivo: 'premio-de-liga',
        referenciaTipo: 'league',
        referenciaId: Number(liga.id),
      }),
    );

    await auditService.registrarRecompensa(auditService.sistema(), 'liga.premiada', {
      entidade: 'league',
      id: Number(liga.id),
      antes,
      depois: await auditService.retratoDoSaldo(membro.user_id),
      detalhes: { jogador: Number(membro.user_id), posicao: membro.posicao, semana: paraDataISO(liga.starts_on) },
    });
  } catch (erro) {
    logger.error({ erro, liga: liga.id, jogador: membro.user_id }, 'Falha ao pagar prêmio da liga');
  }
}
