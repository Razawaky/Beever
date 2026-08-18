import { Router } from 'express';
import { body, param } from 'express-validator';

import * as goalsController from '../controllers/goalsController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireOnboarding } from '../middlewares/requireOnboarding.js';
import { validate } from '../middlewares/validate.js';

/**
 * Rotas de meta.
 *
 * A criação de tarefa saiu daqui. Ela era aninhada (`/metas/:idMeta/tarefas`)
 * porque no schema antigo a tarefa pendurava numa meta; hoje a tarefa é do
 * usuário e nasce de um tipo do catálogo, então mora em `/tarefas`.
 */
const router = Router();

router.use(requireAuth, requireOnboarding);

router.get('/', goalsController.listar);

router.post(
  '/',
  [
    body('titulo').trim().notEmpty().withMessage('Informe um título').isLength({ max: 160 }),
    body('alvo').isInt({ min: 1 }).withMessage('Informe quanto você quer alcançar'),
    body('data_final').isISO8601().withMessage('Data final inválida'),
    body('tipo').optional().trim().notEmpty(),
    body('dificuldade').optional().trim().notEmpty(),
  ],
  validate,
  goalsController.criar,
);

router.post('/:id/concluir', param('id').isInt({ min: 1 }), validate, goalsController.concluir);

export default router;
