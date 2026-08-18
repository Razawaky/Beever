import { emTransacao } from '../config/database.js';
import * as goalsRepository from '../repositories/goalsRepository.js';
import * as profilesRepository from '../repositories/profilesRepository.js';
import { erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as goalProgressSources from './goalProgressSources.js';
import * as schedulesService from './schedulesService.js';

/**
 * `GoalPlannerService` — quem decide as metas do jogador (RN-014, RN-015).
 *
 * A RN-014 é uma tabela de três linhas: quem joga 1 ou 2 dias por semana recebe
 * 1 meta de 28 dias, dificuldade alta e recompensa dobrada; 3 ou 4 dias, 2 metas
 * de 14 dias; 5 a 7 dias, 3 metas de 7 dias. Nenhum desses números vive aqui —
 * eles moram em `goal_plan_rules` e `goal_difficulties`, e mexer no ritmo do
 * jogo é editar seed, não código.
 *
 * **Como o tamanho do alvo é decidido.** O princípio veio dos aplicativos que
 * fazem isso há anos com criança e adolescente: a meta é dimensionada pelo tempo
 * que a pessoa **disse** ter, nunca por um número fixo, e não pode nascer nem já
 * cumprida nem impossível. Como o onboarding coleta dias por semana e minutos
 * por sessão (T-04.3), o alvo sai do que o jogador consegue jogar dentro do
 * prazo da meta:
 *
 *   incremento = base por sessão × (minutos ÷ 10) × dias × semanas do prazo
 *
 * arredondado para um número redondo — criança lê "300 de mel", não "287" — e
 * preso entre um piso e um teto, para o desafio ficar na faixa em que ela ainda
 * vence. O efeito é que 2 dias × 10 min e 6 dias × 20 min recebem metas
 * diferentes, cada uma proporcional ao que aquele jogador de fato joga, em vez
 * de a mesma meta para os dois.
 *
 * O alvo é **absoluto**, não um delta: "chegue a 300 de mel" e não "junte mais
 * 300". É assim porque o progresso da meta é lido do saldo (`current_value`
 * caminha até `target_value`), e um alvo relativo mediria uma coisa e mostraria
 * outra. Por isso o incremento é somado ao valor de hoje.
 *
 * **O sorteio pergunta antes de escolher** (RN-015). Dos sete tipos semeados, o
 * MVP só sabe medir dois — mel acumulado e nível —; patrimônio, favo, células,
 * sequência e cofre chegam na E05, E08 e E09. O planejador cruza os tipos que
 * têm régua de alvo com os que têm fonte de progresso, e sorteia só na
 * interseção. Quando as etapas seguintes entregarem suas fontes, o leque abre
 * sozinho: basta a linha no seed.
 *
 * **O planejador é idempotente.** Ele completa o que falta para chegar à
 * quantidade da faixa e nunca apaga meta ativa. Por isso pode ser chamado ao
 * concluir o onboarding (RF-ONB-07), ao concluir uma meta (RN-016) e toda vez
 * que o painel abre (RN-018) sem gerar meta a mais.
 */

/** A sessão de referência da régua de alvo. Mesma unidade do seed. */
const MINUTOS_DE_REFERENCIA = 10;

/** Como o título de cada meta é escrito, por fonte de progresso. */
const TITULOS = {
  coin_balance: (alvo) => `Chegue a ${alvo} de mel`,
  user_level: (alvo) => `Chegue ao nível ${alvo}`,
};

function titularMeta(tipo, alvo) {
  const escritor = TITULOS[tipo.progress_source];
  return escritor ? escritor(alvo) : `${tipo.name}: chegue a ${alvo}`;
}

/**
 * A linha da RN-014 que atende esta quantidade de dias marcados.
 *
 * Função pura, e exportada por isso: a tabela da regra é o coração da tarefa e
 * merece teste que não dependa de banco no ar.
 */
export function escolherPlano(regras, dias) {
  return (
    regras.find((regra) => dias >= Number(regra.min_weekdays) && dias <= Number(regra.max_weekdays)) ?? null
  );
}

/**
 * O alvo de uma meta, absoluto: o valor de hoje mais o quanto se espera que o
 * jogador avance dentro do prazo.
 *
 * `repeticao` existe para o caso em que a faixa pede mais metas do que há tipos
 * mensuráveis — hoje, três metas para dois tipos. Repetir o mesmo tipo com o
 * mesmo alvo daria duas metas idênticas na tela; com a repetição, a segunda
 * pede mais que a primeira, e as duas fazem sentido lado a lado.
 *
 * Pura de propósito, para poder ser testada sem banco.
 */
export function calcularAlvo({ regraDeAlvo, valorAtual, dias, minutosPorSessao, diasDePrazo, repeticao = 1 }) {
  const semanas = diasDePrazo / 7;
  const sessoes = dias * semanas;
  const fatorDeTempo = minutosPorSessao / MINUTOS_DE_REFERENCIA;

  const bruto = Number(regraDeAlvo.base_per_session) * fatorDeTempo * sessoes * repeticao;
  const passo = Number(regraDeAlvo.rounding_step);
  const arredondado = Math.round(bruto / passo) * passo;

  const piso = Number(regraDeAlvo.min_increment) * repeticao;
  const teto = Number(regraDeAlvo.max_increment) * repeticao;
  const incremento = Math.min(teto, Math.max(piso, arredondado));

  return Number(valorAtual) + incremento;
}

/**
 * Monta o plano sem gravar nada: quantas metas faltam, de que tipo, com que
 * alvo e até quando.
 *
 * Devolve `null` quando não há o que planejar — semana vazia (que a RF-ONB-03
 * impede, mas conta antiga pode ter) ou plano já completo. Assim quem chama a
 * cada visita ao painel não paga uma transação para descobrir que não há
 * trabalho.
 */
async function montarPlano(idUsuario) {
  const [dias, perfil, regras, ativas] = await Promise.all([
    schedulesService.diasDisponiveis(idUsuario),
    profilesRepository.buscarPorUsuario(idUsuario),
    goalsRepository.listarRegrasDePlano(),
    goalsRepository.listarAtivasPorUsuario(idUsuario),
  ]);

  if (dias.length === 0) return null;

  const plano = escolherPlano(regras, dias.length);
  if (!plano) throw erroValidacao(`Não há regra de plano de metas para ${dias.length} dia(s) na semana`);

  const faltam = Number(plano.active_goals) - ativas.length;
  if (faltam <= 0) return null;

  // RN-015: só entra no sorteio o tipo que tem régua de alvo **e** fonte de
  // progresso que alguém sabe medir. É esta interseção que impede o planejador
  // de criar hoje uma meta de patrimônio, que ficaria parada em zero para
  // sempre porque a E09 ainda não existe.
  const mensuraveis = new Set(goalProgressSources.fontesMensuraveis());
  const candidatos = (await goalsRepository.listarRegrasDeAlvo()).filter((tipo) =>
    mensuraveis.has(tipo.progress_source),
  );
  if (candidatos.length === 0) return null;

  const minutosPorSessao = Number(perfil?.session_minutes ?? MINUTOS_DE_REFERENCIA);
  const diasDePrazo = Number(plano.default_days);
  const prazo = new Date(Date.now() + diasDePrazo * 24 * 60 * 60 * 1000);

  // Tipo que já está em uso não é sorteado de novo enquanto houver tipo livre:
  // duas metas iguais na tela é pior do que uma meta de cada assunto.
  const usados = new Map();
  for (const meta of ativas) usados.set(meta.type_slug, (usados.get(meta.type_slug) ?? 0) + 1);

  const metas = [];
  for (let i = 0; i < faltam; i += 1) {
    const livres = candidatos.filter((tipo) => !usados.has(tipo.slug));
    const escolhido = sortear(livres.length > 0 ? livres : candidatos);
    const repeticao = (usados.get(escolhido.slug) ?? 0) + 1;
    usados.set(escolhido.slug, repeticao);

    const valorAtual = (await goalProgressSources.medir(escolhido.progress_source, idUsuario)) ?? 0;
    const alvo = calcularAlvo({
      regraDeAlvo: escolhido,
      valorAtual,
      dias: dias.length,
      minutosPorSessao,
      diasDePrazo,
      repeticao,
    });

    metas.push({
      idTipo: escolhido.goal_type_id,
      tipo: escolhido.slug,
      idDificuldade: plano.difficulty_id,
      dificuldade: plano.difficulty,
      titulo: titularMeta(escolhido, alvo),
      alvo,
      prazo,
      recompensaMoedas: Number(plano.reward_coins),
      recompensaPontos: Number(plano.reward_points),
    });
  }

  return { dias: dias.length, plano, metas };
}

/** Sorteio simples. A RN-015 pede sorteio, não rodízio: duas contas iguais não recebem o mesmo par. */
function sortear(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * Completa o plano do jogador até a quantidade que a RN-014 manda, e devolve o
 * que criou.
 *
 * Nunca mexe em meta que já existe: a RN-013 garante que reduzir dias não apaga
 * progresso, e mesmo sem ela apagar meta em andamento seria roubar trabalho já
 * feito. Quando sobra meta — jogador que reduziu a disponibilidade —, o excesso
 * fica até vencer ou ser concluído, e o planejador simplesmente não repõe.
 */
export async function garantirMetasAtivas(idUsuario) {
  const plano = await montarPlano(idUsuario);
  if (!plano) return { criadas: 0, metas: [] };

  const criadas = await emTransacao(async (conexao) => {
    const ids = [];
    for (const meta of plano.metas) {
      ids.push(await goalsRepository.criar(conexao, { idUsuario, ...meta }));
    }
    return ids;
  });

  for (let i = 0; i < criadas.length; i += 1) {
    const meta = plano.metas[i];
    await auditService.registrar(auditService.usuario(idUsuario), 'meta.criada', {
      entidade: 'goal',
      id: criadas[i],
      depois: {
        origem: 'planejador',
        titulo: meta.titulo,
        alvo: meta.alvo,
        tipo: meta.tipo,
        dificuldade: meta.dificuldade,
        diasDisponiveis: plano.dias,
        recompensaMoedas: meta.recompensaMoedas,
        recompensaPontos: meta.recompensaPontos,
      },
    });
  }

  return { criadas: criadas.length, metas: plano.metas };
}
