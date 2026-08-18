import { Router } from 'express';
import { body, param } from 'express-validator';

import * as tasksController from '../controllers/tasksController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';

/**
 * Rotas de tarefa. O jogador não escreve o texto da tarefa: escolhe um tipo do
 * catálogo, que já traz título, alvo padrão e recompensa.
 */
const router = Router();

router.use(requireAuth);

router.get('/', tasksController.listar);

router.post(
  '/',
  [
    body('tipo').trim().notEmpty().withMessage('Escolha um tipo de tarefa'),
    body('data_prazo').isISO8601().withMessage('Prazo inválido'),
    body('alvo').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Alvo inválido'),
  ],
  validate,
  tasksController.criar,
);

router.post('/:id/concluir', param('id').isInt({ min: 1 }), validate, tasksController.concluir);

export default router;
