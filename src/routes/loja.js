import { Router } from 'express';
import { body, param, query } from 'express-validator';

import * as inventoryController from '../controllers/inventoryController.js';
import * as purchasesController from '../controllers/purchasesController.js';
import * as shopController from '../controllers/shopController.js';
import { limiteCompra } from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireOnboarding } from '../middlewares/requireOnboarding.js';
import { validate } from '../middlewares/validate.js';

/** Rotas da loja: vitrine, prévia, compra, inventário e extrato — tudo do usuário logado. */
const router = Router();

// Loja é jogo: quem não configurou o perfil não tem carteira em uso nem
// faixa etária definida, e comprar antes disso não faz sentido.
router.use(requireAuth, requireOnboarding);

router.get('/itens', shopController.vitrine);

router.get(
  '/itens/:idItem/previa',
  param('idItem').isInt({ min: 1 }).withMessage('Item inválido'),
  query('idUnidadeTrocada').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Item de troca inválido'),
  validate,
  shopController.previa,
);

router.get('/inventario', inventoryController.meu);
router.get('/compras', purchasesController.meuExtrato);

router.post(
  '/compras',
  limiteCompra,
  body('idItem').isInt({ min: 1 }).withMessage('Item inválido'),
  body('idUnidadeTrocada').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Item de troca inválido'),
  body('chaveDeIdempotencia').optional({ values: 'falsy' }).isUUID().withMessage('Chave de compra inválida'),
  validate,
  purchasesController.criar,
);

export default router;
