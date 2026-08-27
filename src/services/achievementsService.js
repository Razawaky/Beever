import { emTransacao } from '../config/database.js';
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

  const catalogo = await achievementsRepository.listarPorCriterio(tipo);
  const alcancadas = conquistasAlcancadas(catalogo, valor);
  if (alcancadas.length === 0) return [];

  const jaTem = new Set(
    await achievementsRepository.listarDesbloqueadas(
      idUsuario,
      alcancadas.map((conquista) => Number(conquista.id)),
    ),
  );

  const novas = [];
  for (const conquista of alcancadas) {
    if (jaTem.has(Number(conquista.id))) continue;

    const resultado = await desbloquear(idUsuario, conquista.slug);
    if (resultado.desbloqueou) novas.push(resultado);
  }
  return novas;
}

/** O catálogo com o que já foi desbloqueado, para a tela da T-13.4. */
export async function catalogoDoUsuario(idUsuario) {
  return achievementsRepository.listarCatalogoDoUsuario(idUsuario);
}
