import * as achievementsService from './achievementsService.js';
import * as contentService from './contentService.js';
import * as economicCycleService from './economicCycleService.js';
import { criteriosDosEventos } from './eventosDeConquista.js';
import * as goalPlannerService from './goalPlannerService.js';
import * as goalsService from './goalsService.js';
import * as patrimonyService from './patrimonyService.js';
import * as profilesService from './profilesService.js';
import * as streakService from './streakService.js';
import * as tasksService from './tasksService.js';

/**
 * A Colmeia (RF-HOM-01 a 09): tudo o que a home mostra sai daqui pronto, numa
 * chamada só. O controller pede e entrega, e é este service que responde pelo
 * "sem consulta N+1" da RNF-04 — cada bloco custa um número fixo de consultas,
 * não uma por favo, meta ou item.
 */

/**
 * O que acontece quando o jogador chega, antes de qualquer leitura. A ordem
 * importa: o ciclo econômico fecha as semanas que passaram (RN-036), a
 * sequência julga os dias fechados (RN-021), e só então metas e tarefas são
 * recontadas em cima do que sobrou.
 */
export async function prepararVisita(idUsuario) {
  const ciclosDaVisita = await economicCycleService.processarPendentes(idUsuario);
  await streakService.avaliar(idUsuario);
  await tasksService.garantirTarefasDoDia(idUsuario);
  await tasksService.sincronizarProgresso(idUsuario);
  // Sincronizar expira o que venceu (RN-017); invertido, a meta vencida ainda
  // contaria como ativa e o planejador deixaria o plano incompleto (RN-018).
  await goalsService.sincronizarProgresso(idUsuario);
  await goalPlannerService.garantirMetasAtivas(idUsuario);

  return ciclosDaVisita;
}

/**
 * Marca em qual favo a Colmeia põe o foco (RF-HOM-06): o que está em andamento e
 * o seguinte. Os demais continuam na trilha, com o estado que já tinham — sumir
 * com eles tiraria a régua do que a criança está construindo.
 *
 * Pura, para poder ser testada sem banco.
 */
export function marcarFocoDaTrilha(trilha) {
  const atual = trilha.findIndex((favo) => favo.aberto && !favo.concluido);

  return trilha.map((favo, posicao) => ({
    ...favo,
    emFoco: atual >= 0 && (posicao === atual || posicao === atual + 1),
  }));
}

/** A Colmeia inteira do jogador, com os efeitos da visita já aplicados. */
export async function obterColmeia(idUsuario) {
  await prepararVisita(idUsuario);

  const [perfil, patrimonio, semana, metas, tarefas, trilha, eventosDoCiclo, avisoDoCiclo] = await Promise.all([
    profilesService.obterDoUsuario(idUsuario),
    patrimonyService.obterDoUsuario(idUsuario),
    streakService.resumoDaSemana(idUsuario),
    goalsService.listarAtivas(idUsuario),
    tasksService.listarAtivas(idUsuario),
    contentService.listarTrilha(idUsuario),
    economicCycleService.listarEventosRecentes(idUsuario),
    economicCycleService.avisoDoDia(idUsuario),
  ]);

  // Patrimônio e cofre são avaliados aqui, e não no evento que os move: somar
  // carteira, cofre e bens é a conta mais cara do sistema, e a visita já a fez
  // uma vez para o cabeçalho. Célula e favo não passam por aqui — aqueles a
  // partida avalia na hora, porque o dado já está em mãos (T-13.2).
  const conquistas = await achievementsService.avaliarEventos(
    idUsuario,
    Object.fromEntries(
      criteriosDosEventos(['patrimonio-mudou', 'cofre-mudou']).map((criterio) => [
        criterio,
        criterio === 'cofre-guardado' ? patrimonio.cofre : patrimonio.total,
      ]),
    ),
  );

  // A trilha já lida é passada adiante: pedir de novo cobraria do banco as
  // mesmas consultas duas vezes na mesma tela (RNF-04).
  const proximaCelula = await contentService.proximaCelulaPendente(idUsuario, trilha);
  // Quem sabe resumir meta é o `goalsService`: a Colmeia só escolhe qual vai
  // para o destaque (RF-HOM-04) e qual fica na lista das outras (RF-HOM-05).
  const resumidas = goalsService
    .ordenarPorVencimento(metas)
    .map((meta) => goalsService.resumirMeta(meta, { hoje: semana.hoje, fuso: semana.fuso }));

  return {
    jogador: {
      apelido: perfil.apelido,
      nivel: perfil.nivel,
      mel: perfil.mel,
      polen: perfil.polen,
      patrimonio,
    },
    sequencia: semana,
    metaEmDestaque: resumidas[0] ?? null,
    outrasMetas: resumidas.slice(1),
    trilha: marcarFocoDaTrilha(trilha),
    proximaCelula,
    tarefas: tarefas.map(tasksService.resumirTarefa),
    ciclo: {
      // O destaque é do dia do jogador, e não da visita: recarregar a Colmeia
      // não pode apagar a notícia (DT-63).
      aviso: avisoDoCiclo,
      eventos: eventosDoCiclo,
    },
    // O que a visita destravou de patrimônio e de cofre. A tela é da T-13.4.
    conquistas,
  };
}
