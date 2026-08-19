import { emTransacao } from '../config/database.js';
import * as achievementsRepository from '../repositories/achievementsRepository.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';

/**
 * Conquistas: desbloquear e pagar o mel que a conquista promete.
 * Hoje só a sequência desbloqueia (RN-023), mas favo concluído e patrimônio
 * entram pela mesma porta nas etapas seguintes.
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
