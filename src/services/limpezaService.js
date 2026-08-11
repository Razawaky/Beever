import cron from 'node-cron';

import { logger } from '../config/logger.js';
import * as auditoriaRepository from '../repositories/auditoriaRepository.js';
import * as usuarioRepository from '../repositories/usuarioRepository.js';

/**
 * Expurgo de contas inativas. Ver usuarioRepository.listarInativosParaExpurgo:
 * a query tem parênteses de propósito, pra não apagar conta ativa recém-criada.
 */

const DIAS_ATE_EXPURGO = 15;

const AGENDA_DIARIA = '0 0 * * *'; // todo dia à meia-noite

export async function expurgarContasInativas(dias = DIAS_ATE_EXPURGO) {
  const alvos = await usuarioRepository.listarInativosParaExpurgo(dias);
  if (alvos.length === 0) return { removidos: 0 };

  for (const usuario of alvos) {
    await auditoriaRepository.registrar({
      atorTipo: 'Sistema',
      acao: 'EXPURGAR_CONTA_INATIVA',
      entidade: 'usuario',
      entidadeId: usuario.id,
      estadoAnterior: { nome: usuario.nome, email: usuario.email, diasInativo: dias },
    });
  }

  const removidos = await usuarioRepository.removerPorIds(alvos.map((usuario) => usuario.id));
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
