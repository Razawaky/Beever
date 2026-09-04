import { emTransacao } from '../config/database.js';
import { logger } from '../config/logger.js';
import * as achievementsRepository from '../repositories/achievementsRepository.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import { conquistasAlcancadas, exigirCriterioConhecido } from './criteriosDeConquista.js';

/**
 * Conquistas: desbloquear e pagar o mel que a conquista promete (RF-GAM-01).
 *
 * Quem decide o que destrava cada uma é o banco, desde a T-13.1: a conquista
 * declara o critério e o alvo, e quem chama diz só o número que alcançou. Antes
 * o slug carregava a regra (`sequencia-7`), e isso não se estendia às outras
 * quatro famílias — `favo-3` não diz "três favos concluídos".
 */

/**
 * Desbloqueia a conquista e credita o bônus na mesma transação.
 * Devolve `desbloqueou: false` quando o jogador já a tinha, sem pagar de novo —
 * a UNIQUE do banco é a trava, não uma consulta anterior.
 */
export async function desbloquear(idUsuario, slug) {
  const conquista = await achievementsRepository.buscarPorSlug(slug);
  if (!conquista) return { desbloqueou: false, melCreditado: 0 };

  const saldoAntes = await auditService.retratoDoSaldo(idUsuario);
  const bonus = Number(conquista.reward_coins);

  const desbloqueou = await emTransacao(async (conexao) => {
    const primeiraVez = await achievementsRepository.desbloquear(conexao, {
      idUsuario,
      idConquista: conquista.id,
    });
    if (!primeiraVez) return false;

    if (bonus > 0) {
      await coinsService.creditar(conexao, idUsuario, bonus, {
        motivo: 'marco-de-sequencia',
        referenciaTipo: 'achievement',
        referenciaId: Number(conquista.id),
      });
    }
    return true;
  });

  if (!desbloqueou) return { desbloqueou: false, melCreditado: 0 };

  await auditService.registrarRecompensa(auditService.usuario(idUsuario), 'conquista.desbloqueada', {
    entidade: 'achievement',
    id: Number(conquista.id),
    antes: saldoAntes,
    depois: await auditService.retratoDoSaldo(idUsuario),
    detalhes: { conquista: conquista.slug, melBonus: bonus },
  });

  return { desbloqueou: true, melCreditado: bonus, conquista };
}

export async function listarDoUsuario(idUsuario) {
  return achievementsRepository.listarDoUsuario(idUsuario);
}

/**
 * Desbloqueia tudo o que aquele número alcança num critério, e paga cada uma.
 *
 * Recebe o valor medido — dias de sequência, favos concluídos, patrimônio — e
 * pergunta ao catálogo o que ele destrava. Quem já estava desbloqueado é
 * descartado antes, para não gastar transação à toa; a UNIQUE continua sendo a
 * trava de verdade contra pagar duas vezes.
 *
 * Devolve o que foi desbloqueado agora, para a tela poder comemorar.
 */
export async function avaliarCriterio(idUsuario, tipo, valor) {
  exigirCriterioConhecido(tipo);

  // Uma consulta só, com o que o jogador já tem marcado: perguntar em duas
  // etapas faria a contagem de consultas mudar conforme ele tivesse ou não
  // cruzado um degrau, e a Colmeia tem teste que conta consulta (RNF-04).
  const escada = await achievementsRepository.listarCriterioComEstado(idUsuario, tipo);
  const pendentes = conquistasAlcancadas(escada, valor).filter((conquista) => !conquista.unlocked_at);

  const novas = [];
  for (const conquista of pendentes) {
    const resultado = await desbloquear(idUsuario, conquista.slug);
    if (resultado.desbloqueou) novas.push(resultado);
  }
  return novas;
}

/**
 * Avalia vários critérios de uma vez, cada um com o número dele.
 *
 * Recebe um objeto `{ criterio: valor }` e devolve tudo o que foi desbloqueado,
 * junto. É o que o fechamento da partida e a visita à Colmeia chamam: os dois
 * têm mais de uma família para conferir, e chamar em série cada uma esconderia
 * o custo real de quem lê o código.
 *
 * **Nunca lança.** Quem chama já pagou mel e gravou progresso, e perder uma
 * conquista por causa de uma falha aqui é menos grave do que desfazer o que a
 * criança acabou de ganhar — é a mesma escolha que a auditoria faz desde a E06.
 */
export async function avaliarEventos(idUsuario, valoresPorCriterio = {}) {
  const novas = [];

  for (const [criterio, valor] of Object.entries(valoresPorCriterio)) {
    try {
      novas.push(...(await avaliarCriterio(idUsuario, criterio, valor)));
    } catch (erro) {
      logger.error({ erro, idUsuario, criterio, valor }, 'Falha ao avaliar conquista — o resto seguiu');
    }
  }

  return novas.map(({ conquista, melCreditado }) => ({
    slug: conquista.slug,
    nome: conquista.name,
    descricao: conquista.description,
    criterio: conquista.criterion_type,
    alvo: Number(conquista.criterion_target),
    melCreditado,
  }));
}

/** O catálogo com o que já foi desbloqueado, para a tela da T-13.4. */
export async function catalogoDoUsuario(idUsuario) {
  return achievementsRepository.listarCatalogoDoUsuario(idUsuario);
}
