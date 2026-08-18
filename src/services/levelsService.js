import * as userLevelsRepository from '../repositories/userLevelsRepository.js';
import { erroValidacao } from '../utils/erros.js';

/**
 * XP e nível — só isso. Mel (`coinsService`) e pólen (`pointsService`) são
 * recompensas separadas, com regras próprias.
 *
 * **A curva vem do banco, não de fórmula em código** (RN-003). A tabela
 * `levels` guarda o XP acumulado exigido por nível, e mudar o ritmo do jogo é
 * editar aquelas linhas e rodar o seed — sem deploy. O `XP_POR_NIVEL = 1000`
 * que vivia aqui era a dívida DT-04, e ele some com este arquivo: não havia
 * como manter a constante depois que `user_levels` passou a guardar XP
 * acumulado em vez de XP dentro do nível.
 */

/**
 * Ponto de partida escolhido no onboarding. Quem já entende do assunto começa
 * adiantado em vez de repetir o básico. O nível está aqui; o XP correspondente
 * sai da curva, para os dois nunca discordarem.
 */
const NIVEL_DE_PARTIDA = {
  beginner: 1,
  intermediate: 5,
  advanced: 10,
};

export function niveisDePartidaDisponiveis() {
  return Object.keys(NIVEL_DE_PARTIDA);
}

export async function obterCurva() {
  const curva = await userLevelsRepository.buscarCurva();
  if (curva.length === 0) {
    throw new Error('A tabela `levels` está vazia: rode `npm run db:seed` antes de calcular nível.');
  }
  return curva;
}

/**
 * Qual nível corresponde a um XP acumulado. Cálculo puro, separado da
 * persistência para poder ser testado sem banco.
 *
 * A curva é a fonte: percorre-se de trás para frente e para no primeiro degrau
 * que o XP alcança. Ganhar muito XP de uma vez pode valer mais de um nível, e
 * isso sai de graça — não há laço de "subir um por um" para errar.
 */
export function nivelParaXp(curva, xpTotal) {
  let nivel = curva[0].level;
  for (const degrau of curva) {
    if (xpTotal >= Number(degrau.required_xp)) nivel = degrau.level;
    else break;
  }
  return Number(nivel);
}

/** XP acumulado que o próximo degrau exige. No topo da curva, devolve null. */
export function xpDoProximoNivel(curva, nivel) {
  const proximo = curva.find((degrau) => Number(degrau.level) === Number(nivel) + 1);
  return proximo ? Number(proximo.required_xp) : null;
}

/** XP exigido para estar no nível informado — usado pelo ponto de partida. */
export function xpDoNivel(curva, nivel) {
  const degrau = curva.find((linha) => Number(linha.level) === Number(nivel));
  if (!degrau) throw erroValidacao(`Nível fora da curva: ${nivel}`);
  return Number(degrau.required_xp);
}

/**
 * Estado de nível do jogador, já com o que a tela precisa: quanto falta para o
 * próximo degrau e o progresso dentro dele.
 */
export async function obterDoUsuario(idUsuario) {
  const [linha, curva] = await Promise.all([userLevelsRepository.buscarPorUsuario(idUsuario), obterCurva()]);
  if (!linha) return null;

  const xpTotal = Number(linha.xp_total);
  const nivel = Number(linha.level);
  const xpProximoNivel = xpDoProximoNivel(curva, nivel);
  const xpDesteNivel = xpDoNivel(curva, nivel);

  return {
    nivel,
    xpTotal,
    xpProximoNivel,
    xpNoNivel: xpTotal - xpDesteNivel,
    xpParaSubir: xpProximoNivel === null ? 0 : xpProximoNivel - xpTotal,
    progressoPercentual:
      xpProximoNivel === null ? 100 : Math.round(((xpTotal - xpDesteNivel) / (xpProximoNivel - xpDesteNivel)) * 100),
    noTopo: xpProximoNivel === null,
  };
}

/**
 * Ponto de partida do onboarding: quem já entende do assunto não recomeça do
 * zero.
 *
 * O XP inicial **entra pelo livro**, como qualquer outro. A primeira versão
 * disto gravava direto no cache, com o argumento de que o jogador não tinha
 * *ganhado* aquele XP jogando — e o `npm run db:reconcile` reprovou na hora,
 * apontando três contas com cache 1120 e livro 0. Ele estava certo: a régua do
 * projeto é que o livro explica o saldo, e saldo sem lançamento é saldo sem
 * origem. O motivo `ajuste-administrativo` é exatamente o que descreve um
 * crédito concedido pelo sistema.
 *
 * Lança-se a diferença, não o total: se a linha de nível já tiver XP, refazer o
 * ponto de partida não pode creditar tudo de novo.
 */
export async function definirPontoDePartida(conexao, idUsuario, nivelEscolhido) {
  const nivel = NIVEL_DE_PARTIDA[nivelEscolhido];
  if (!nivel) throw erroValidacao(`Nível inicial desconhecido: ${nivelEscolhido}`);

  const curva = await obterCurva();
  const xpTotal = xpDoNivel(curva, nivel);
  const xpProximoNivel = xpDoProximoNivel(curva, nivel) ?? xpTotal;

  const linha = await userLevelsRepository.buscarPorUsuario(idUsuario);
  const xpAnterior = Number(linha?.xp_total ?? 0);
  const diferenca = xpTotal - xpAnterior;

  if (diferenca > 0) {
    await userLevelsRepository.lancarXp(conexao, {
      idUsuario,
      quantidade: diferenca,
      motivo: 'ajuste-administrativo',
      referenciaTipo: 'onboarding',
      referenciaId: idUsuario,
      saldoDepois: xpTotal,
    });
  }

  await userLevelsRepository.atualizar(conexao, idUsuario, { nivel, xpTotal, xpProximoNivel });

  return { nivel, xpTotal, xpProximoNivel };
}

/**
 * Credita XP: lança no livro e atualiza o cache de `user_levels` na mesma
 * transação, que é a regra do schema — o livro é a verdade, o cache existe para
 * a tela não somar o livro inteiro a cada render.
 *
 * Exige conexão porque XP nunca anda sozinho: ele vem junto de uma célula
 * concluída, de uma partida fechada ou de uma meta batida, e todos esses
 * gravam mais de uma linha.
 *
 * Ainda **sem chamador** no MVP: quem credita XP é o motor de recompensas da
 * E06. O que mudou aqui é que agora, quando ele chamar, a conta sai da curva do
 * banco e não de uma constante inventada (DT-03 continua aberta, DT-04 não).
 */
export async function creditarXp(conexao, idUsuario, quantidade, { motivo, referenciaTipo = null, referenciaId = null }) {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw erroValidacao('XP creditado precisa ser um inteiro positivo');
  }

  const [linha, curva] = await Promise.all([userLevelsRepository.buscarPorUsuario(idUsuario), obterCurva()]);
  if (!linha) throw erroValidacao('Este jogador não tem linha de nível — a conta foi criada pela metade?');

  const nivelAnterior = Number(linha.level);
  const xpTotal = Number(linha.xp_total) + quantidade;
  const nivel = nivelParaXp(curva, xpTotal);
  const xpProximoNivel = xpDoProximoNivel(curva, nivel) ?? xpTotal;

  await userLevelsRepository.lancarXp(conexao, {
    idUsuario,
    quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
    saldoDepois: xpTotal,
  });
  await userLevelsRepository.atualizar(conexao, idUsuario, { nivel, xpTotal, xpProximoNivel });

  return { nivel, xpTotal, xpProximoNivel, subiuDeNivel: nivel > nivelAnterior };
}
