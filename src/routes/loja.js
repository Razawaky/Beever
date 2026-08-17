import { Router } from 'express';
import { body } from 'express-validator';

import * as compraController from '../controllers/compraController.js';
import * as inventarioController from '../controllers/inventarioController.js';
import * as itemController from '../controllers/itemController.js';
import { limiteCompra } from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';

/** Rotas da loja: catálogo, compra e inventário — tudo por perfil logado. */
const router = Router();

router.use(requireAuth);

router.get('/itens', itemController.listar);
router.get('/inventario', inventarioController.meu);

router.post(
  '/compras',
  limiteCompra,
  body('idItem').isInt({ min: 1 }).withMessage('Item inválido'),
  validate,
  compraController.criar
);

export default router;
