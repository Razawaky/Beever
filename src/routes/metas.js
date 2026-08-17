import { Router } from 'express';
import { body, param } from 'express-validator';

import * as metaController from '../controllers/metaController.js';
import * as tarefaController from '../controllers/tarefaController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';

/** Rotas de meta e, aninhada, criação de tarefa dentro de uma meta. */
const router = Router();

router.use(requireAuth);

router.get('/', metaController.listar);

router.post(
  '/',
  [
    body('titulo').trim().notEmpty().withMessage('Informe um título').isLength({ max: 255 }),
    body('descricao').trim().notEmpty().withMessage('Informe uma descrição').isLength({ max: 500 }),
    body('data_final').isISO8601().withMessage('Data final inválida'),
  ],
  validate,
  metaController.criar
);

router.post(
  '/:idMeta/tarefas',
  [
    param('idMeta').isInt({ min: 1 }),
    body('titulo').trim().notEmpty().withMessage('Informe um título').isLength({ max: 255 }),
    body('descricao').trim().notEmpty().withMessage('Informe uma descrição').isLength({ max: 500 }),
    body('data_prazo').isISO8601().withMessage('Prazo inválido'),
    body('prioridade').isIn(['Baixa', 'Media', 'Alta']).withMessage('Prioridade inválida'),
  ],
  validate,
  tarefaController.criar
);

export default router;
