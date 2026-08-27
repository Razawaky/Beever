import { Router } from 'express';
import { body } from 'express-validator';

import * as adminController from '../controllers/adminController.js';
import { limiteAutenticacao } from '../middlewares/rateLimiters.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import { validate } from '../middlewares/validate.js';

/**
 * Rotas da área administrativa, todas sob `/admin`.
 *
 * O `requireAdmin` é montado uma vez, logo depois do login: tudo declarado
 * abaixo dele já nasce protegido, e nenhuma rota nova da E12 depende de alguém
 * lembrar de repetir o middleware.
 */
const router = Router();

const regrasLogin = [
  body('email').trim().isEmail().withMessage('E-mail inválido').normalizeEmail(),
  body('senha').notEmpty().withMessage('Informe a senha'),
];

router.get('/login', adminController.paginaDeLogin);
router.post('/login', limiteAutenticacao, regrasLogin, validate, adminController.login);

router.use(requireAdmin);

router.get('/', adminController.painel);
router.get('/usuarios', adminController.usuarios);

export default router;
