import { emTransacao } from '../config/database.js';
import * as goalsRepository from '../repositories/goalsRepository.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as levelsService from './levelsService.js';
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

  // A recompensa é congelada na criação, e vem da dificuldade escolhida — o
  // mesmo princípio do preço na compra e da recompensa da tarefa: mudar a tabela
  // amanhã não reescreve o que a meta de hoje prometeu.
  const recompensaMoedas = Number(dificuldadeEscolhida.reward_coins);
  const recompensaPontos = Number(dificuldadeEscolhida.reward_points);

  const idMeta = await emTransacao((conexao) =>
    goalsRepository.criar(conexao, {
      idUsuario,
      idTipo: tipoEscolhido.id,
      idDificuldade: dificuldadeEscolhida.id,
      titulo,
      alvo: alvoNumero,
      recompensaMoedas,
      recompensaPontos,
      prazo,
    }),
  );

  await auditService.registrar(auditService.usuario(idUsuario), 'meta.criada', {
    entidade: 'goal',
    id: idMeta,
    depois: { titulo, alvo: alvoNumero, prazo, tipo, dificuldade, recompensaMoedas, recompensaPontos },
  });

  return idMeta;
}

/**
 * Onde cada tipo de meta busca o número que mede o progresso.
 *
 * O tipo declara a fonte em `goal_types.progress_source`; aqui está quem sabe
 * consultá-la. Duas já existem no MVP. As outras — favo, células, sequência,
 * cofre, patrimônio — só passam a existir nas etapas que as constroem, e até lá
 * a meta correspondente fica parada em zero. Parada e honesta: melhor do que
 * deixar concluir sem ter alcançado, que era o que acontecia.
 */
const FONTES_DE_PROGRESSO = {
  // As chaves são os valores de `goal_types.progress_source`, tal como semeados.
  async coin_balance(idUsuario) {
    const carteira = await coinsService.obterCarteira(idUsuario);
    return carteira.mel;
  },
  async user_level(idUsuario) {
    const nivel = await levelsService.obterDoUsuario(idUsuario);
    return nivel?.nivel ?? 0;
  },
};

/**
 * Recalcula o progresso das metas ativas a partir da fonte de cada tipo.
 *
 * É *lazy*, chamada quando o jogador abre a tela: uma meta de "juntar 200 de
 * mel" não precisa de ninguém observando a carteira: basta olhar o saldo na hora
 * de mostrar a meta.
 */
export async function sincronizarProgresso(idUsuario) {
  const metas = await goalsRepository.listarAtivasPorUsuario(idUsuario);
  let sincronizadas = 0;

  for (const meta of metas) {
    const fonte = FONTES_DE_PROGRESSO[meta.progress_source];
    if (!fonte) continue;

    const valor = await fonte(idUsuario);
    if (Number(valor) === Number(meta.current_value)) continue;

    await emTransacao((conexao) => goalsRepository.atualizarProgresso(conexao, meta.id, Number(valor)));
    sincronizadas += 1;
  }

  return { sincronizadas };
}

/** Progresso informado de fora, para as fontes que ainda não têm consulta própria. */
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
  // Sincroniza antes de conferir: quem clica "concluir" pode ter batido o alvo
  // agora mesmo, numa compra ou numa tarefa da mesma sessão.
  await sincronizarProgresso(idUsuario);
  const meta = await exigirPosse(idMeta, idUsuario);

  if (Number(meta.current_value) < Number(meta.target_value)) {
    throw erroValidacao(
      `Esta meta ainda não foi alcançada: ${meta.current_value} de ${meta.target_value}`,
    );
  }

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

  await auditService.registrar(auditService.usuario(idUsuario), 'meta.concluida', {
    entidade: 'goal',
    id: idMeta,
    antes: { status: meta.status, progresso: Number(meta.current_value) },
    depois: { status: 'concluida', melGanho: recompensa.mel, polenGanho: recompensa.polen },
  });

  return recompensa;
}
