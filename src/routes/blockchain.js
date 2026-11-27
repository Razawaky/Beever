import { Router } from 'express';

import * as blockchainController from '../controllers/blockchainController.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';

const router = Router();

router.get('/', requireAdmin, blockchainController.listar);
router.get('/verificar', requireAdmin, blockchainController.verificar);

export default router;