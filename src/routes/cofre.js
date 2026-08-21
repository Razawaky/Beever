import { Router } from 'express';
import { body, query } from 'express-validator';

import * as vaultController from '../controllers/vaultController.js';
import { limiteCompra } from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireOnboarding } from '../middlewares/requireOnboarding.js';
import { validate } from '../middlewares/validate.js';

/**
 * Rotas do cofre. Depósito e saque entram no mesmo limitador da compra: são as
 * operações que movem mel, e é disso que o limitador cuida.
 */
const router = Router();

router.use(requireAuth, requireOnboarding);

router.get(
  '/',
  query('porSemana').optional({ values: 'falsy' }).isInt({ min: 0, max: 1000000 }),
  query('semanas').optional({ values: 'falsy' }).isInt({ min: 1, max: 52 }),
  validate,
  vaultController.meu,
);

router.post(
  '/depositos',
  limiteCompra,
  body('valor').isInt({ min: 1 }).withMessage('Diga quanto mel quer guardar'),
  validate,
  vaultController.depositar,
);

router.post(
  '/saques',
  limiteCompra,
  body('valor').isInt({ min: 1 }).withMessage('Diga quanto mel quer tirar'),
  validate,
  vaultController.sacar,
);

router.put(
  '/meta',
  body('valor').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('A meta precisa ser maior que zero'),
  body('prazo').optional({ values: 'falsy' }).isISO8601().withMessage('Prazo inválido'),
  validate,
  vaultController.definirMeta,
);

export default router;
