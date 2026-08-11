import { Router } from 'express';

import * as healthController from '../controllers/healthController.js';
import * as homeController from '../controllers/homeController.js';
import perfilRouter from './perfil.js';
import sessaoRouter from './sessao.js';
import usersRouter from './users.js';

/** Router raiz: cada domínio tem seu próprio arquivo, montado aqui. */
const router = Router();

router.get('/', homeController.mostrar);
router.get('/health', healthController.mostrar);

router.use('/users', usersRouter);
router.use('/perfil', perfilRouter);
router.use('/sessao', sessaoRouter);

export default router;
