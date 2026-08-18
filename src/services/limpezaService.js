import cron from 'node-cron';

import { logger } from '../config/logger.js';
import * as usersRepository from '../repositories/usersRepository.js';
import * as auditService from './auditService.js';

/**
 * Expurgo de contas inativas (RN-053). Ver
 * `usersRepository.listarInativosParaExpurgo`: a consulta tem parênteses de
 * propósito, para não apagar conta ativa recém-criada — foi bug real uma vez, e
 * hoje tem teste com nome próprio em `test/integration/repositories/users.test.js`.
 */

const DIAS_ATE_EXPURGO = 15;

const AGENDA_DIARIA = '0 0 * * *'; // todo dia à meia-noite

export async function expurgarContasInativas(dias = DIAS_ATE_EXPURGO) {
  const alvos = await usersRepository.listarInativosParaExpurgo(dias);
  if (alvos.length === 0) return { removidos: 0 };

  for (const usuario of alvos) {
    // A linha de auditoria sobrevive ao expurgo: `audit_logs` não tem foreign
    // key para `users` justamente para que apagar a conta não apague o rastro
    // de que ela existiu (RN-053).
    await auditService.registrar(auditService.sistema(), 'conta.expurgada', {
      entidade: 'user',
      id: usuario.id,
      antes: { apelido: usuario.nickname, email: usuario.email, diasInativo: dias },
    });
  }

  const removidos = await usersRepository.removerPorIds(alvos.map((usuario) => usuario.id));
  return { removidos };
}

/** Chamado uma vez no bootstrap. Fora do app.js para não rodar durante os testes. */
export function agendarLimpezas() {
  return cron.schedule(AGENDA_DIARIA, async () => {
    try {
      const { removidos } = await expurgarContasInativas();
      logger.info({ removidos }, 'Expurgo de contas inativas concluído');
    } catch (erro) {
      logger.error({ erro }, 'Falha no expurgo de contas inativas');
    }
  });
}
