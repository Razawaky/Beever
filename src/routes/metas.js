import { Router } from 'express';
import { param } from 'express-validator';

import * as goalsController from '../controllers/goalsController.js';
import { limiteRecompensa } from '../middlewares/rateLimiters.js';
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

// Não há POST aqui: meta é gerada pela disponibilidade (RF-MET-01, RN-014), e
// deixar o jogador escolher alvo e prazo furaria a regra inteira.

router.post('/:id/concluir', limiteRecompensa, param('id').isInt({ min: 1 }), validate, goalsController.concluir);

export default router;
