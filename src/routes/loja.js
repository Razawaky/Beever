import { Router } from 'express';
import { body } from 'express-validator';

import * as inventoryController from '../controllers/inventoryController.js';
import * as itemsController from '../controllers/itemsController.js';
import * as purchasesController from '../controllers/purchasesController.js';
import { limiteCompra } from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';

/** Rotas da loja: catálogo, compra, inventário e extrato — tudo do usuário logado. */
const router = Router();

router.use(requireAuth);

router.get('/itens', itemsController.listar);
router.get('/inventario', inventoryController.meu);
router.get('/compras', purchasesController.meuExtrato);

router.post(
  '/compras',
  limiteCompra,
  body('idItem').isInt({ min: 1 }).withMessage('Item inválido'),
  validate,
  purchasesController.criar,
);

export default router;
