import { Router } from 'express';
import { param } from 'express-validator';

import * as tasksController from '../controllers/tasksController.js';
import { limiteRecompensa } from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireOnboarding } from '../middlewares/requireOnboarding.js';
import { validate } from '../middlewares/validate.js';

/**
 * Rotas de tarefa.
 *
 * **Não existe rota para criar tarefa**, e isso é a correção do buraco que a
 * auditoria da E02 encontrou: com criação livre, criar e concluir em sequência
 * pagava a recompensa cheia sem cumprir nada. Quem propõe as tarefas do dia é o
 * servidor, quando o jogador entra.
 *
 * Também não existe rota de progresso: desde a T-08.5 quem move a tarefa é o
 * evento (célula concluída, dia jogado, favo fechado), lido pelo servidor. O que
 * sobrou é concluir, e só com o alvo cumprido, conferido no `WHERE` do UPDATE.
 */
const router = Router();

router.use(requireAuth, requireOnboarding);

router.get('/', tasksController.listar);

router.post(
  '/:id/concluir',
  limiteRecompensa,
  param('id').isInt({ min: 1 }),
  validate,
  tasksController.concluir,
);

export default router;
