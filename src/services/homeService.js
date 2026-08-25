import { dataDoDia, diferencaEmDias } from '../utils/diaDoJogador.js';
import * as contentService from './contentService.js';
import * as economicCycleService from './economicCycleService.js';
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
 * A meta pronta para a tela: percentual, dias até o prazo e quanto de mel ela
 * paga (RF-HOM-04). Conta de meta não mora na view.
 *
 * Pura, para poder ser testada sem banco.
 */
export function resumirMeta(meta, { hoje, fuso }) {
  const atual = Number(meta.current_value);
  const alvo = Number(meta.target_value);

  return {
    id: Number(meta.id),
    titulo: meta.title,
    atual,
    alvo,
    percentual: alvo === 0 ? 0 : Math.min(100, Math.round((atual / alvo) * 100)),
    diasRestantes: meta.due_at ? diferencaEmDias(hoje, dataDoDia(new Date(meta.due_at), fuso)) : null,
    melDaRecompensa: Number(meta.reward_coins),
  };
}

/**
 * As metas na ordem do vencimento, que é a ordem em que elas importam para
 * quem lê a tela. Meta sem prazo não disputa o destaque, mas continua na lista
 * resumida das outras (RF-HOM-05).
 *
 * Pura, para poder ser testada sem banco.
 */
export function ordenarPorVencimento(metas) {
  const comPrazo = metas.filter((meta) => meta.due_at);
  const semPrazo = metas.filter((meta) => !meta.due_at);
  comPrazo.sort((uma, outra) => new Date(uma.due_at) - new Date(outra.due_at));

  return [...comPrazo, ...semPrazo];
}

/** A Colmeia inteira do jogador, com os efeitos da visita já aplicados. */
export async function obterColmeia(idUsuario) {
  const ciclosDaVisita = await prepararVisita(idUsuario);

  const [perfil, patrimonio, semana, metas, tarefas, trilha, eventosDoCiclo] = await Promise.all([
    profilesService.obterDoUsuario(idUsuario),
    patrimonyService.obterDoUsuario(idUsuario),
    streakService.resumoDaSemana(idUsuario),
    goalsService.listarAtivas(idUsuario),
    tasksService.listarAtivas(idUsuario),
    contentService.listarTrilha(idUsuario),
    economicCycleService.listarEventosRecentes(idUsuario),
  ]);

  // A trilha já lida é passada adiante: pedir de novo cobraria do banco as
  // mesmas consultas duas vezes na mesma tela (RNF-04).
  const proximaCelula = await contentService.proximaCelulaPendente(idUsuario, trilha);
  const resumidas = ordenarPorVencimento(metas).map((meta) =>
    resumirMeta(meta, { hoje: semana.hoje, fuso: semana.fuso }),
  );

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
    trilha,
    proximaCelula,
    tarefas,
    ciclo: {
      aviso: economicCycleService.avisoDosCiclos(ciclosDaVisita),
      eventos: eventosDoCiclo,
    },
  };
}
