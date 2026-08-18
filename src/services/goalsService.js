import { emTransacao } from '../config/database.js';
import * as auditLogsRepository from '../repositories/auditLogsRepository.js';
import * as goalsRepository from '../repositories/goalsRepository.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as coinsService from './coinsService.js';
import * as pointsService from './pointsService.js';

/**
 * Metas do jogador.
 *
 * A meta pertence ao usuário direto — sumiu o cronograma que só existia para
 * satisfazer uma foreign key. E o progresso virou contagem até um alvo
 * (`current_value` / `target_value`), não mais um percentual derivado das
 * tarefas: cada tipo de meta declara de onde o número vem
 * (`goal_types.progress_source`), e mel guardado não se mede contando tarefas.
 *
 * **O que ainda não é feito aqui:** escolher tipo, dificuldade e alvo por conta
 * própria a partir do que o jogador quer, com prazo derivado da faixa etária —
 * isso é o `GoalPlannerService` da E04 (RN-014 e RN-015). Até lá o formulário
 * informa esses campos, e este service se limita a validar e persistir.
 */

const TIPO_PADRAO = 'acumular-mel';
const DIFICULDADE_PADRAO = 'simples';

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
 * Cria a meta. Tipo e dificuldade têm padrão declarado — "acumular mel, meta
 * simples" — porque é a meta que a maioria das crianças cria, e obrigar a
 * escolher taxonomia antes de escrever o que se quer é atrito à toa. A escolha
 * automática de verdade chega na E04.
 */
export async function criar(idUsuario, { titulo, alvo, prazo, tipo = TIPO_PADRAO, dificuldade = DIFICULDADE_PADRAO }) {
  const alvoNumero = Number(alvo);
  if (!Number.isInteger(alvoNumero) || alvoNumero <= 0) {
    throw erroValidacao('O alvo da meta precisa ser um número inteiro positivo');
  }

  const catalogo = await goalsRepository.buscarCatalogo();
  const tipoEscolhido = catalogo.tipos.find((linha) => linha.slug === tipo);
  const dificuldadeEscolhida = catalogo.dificuldades.find((linha) => linha.slug === dificuldade);

  if (!tipoEscolhido) throw erroValidacao(`Tipo de meta desconhecido: ${tipo}`);
  if (!dificuldadeEscolhida) throw erroValidacao(`Dificuldade desconhecida: ${dificuldade}`);

  const idMeta = await emTransacao((conexao) =>
    goalsRepository.criar(conexao, {
      idUsuario,
      idTipo: tipoEscolhido.id,
      idDificuldade: dificuldadeEscolhida.id,
      titulo,
      alvo: alvoNumero,
      prazo,
    }),
  );

  await auditLogsRepository.registrar({
    atorTipo: 'usuario',
    atorId: idUsuario,
    acao: 'meta.criada',
    entidade: 'goal',
    entidadeId: idMeta,
    estadoNovo: { titulo, alvo: alvoNumero, prazo, tipo, dificuldade },
  });

  return idMeta;
}

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
  const meta = await exigirPosse(idMeta, idUsuario);

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

  await auditLogsRepository.registrar({
    atorTipo: 'usuario',
    atorId: idUsuario,
    acao: 'meta.concluida',
    entidade: 'goal',
    entidadeId: idMeta,
    estadoAnterior: { status: meta.status, progresso: Number(meta.current_value) },
    estadoNovo: { status: 'concluida', melGanho: recompensa.mel, polenGanho: recompensa.polen },
  });

  return recompensa;
}
