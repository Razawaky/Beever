import { Router } from 'express';
import { param } from 'express-validator';

import * as tarefaController from '../controllers/tarefaController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

router.use(requireAuth);

router.post('/:id/concluir', param('id').isInt({ min: 1 }), validate, tarefaController.concluir);

export default router;
