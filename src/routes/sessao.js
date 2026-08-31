import { Router } from 'express';
import { body } from 'express-validator';

import * as authController from '../controllers/authController.js';
import { limiteAutenticacao, limitePorCredencial } from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';

/** Rotas de sessão de login. Sessão de jogo é outro domínio. */
const router = Router();

const regrasLogin = [
  body('email').trim().toLowerCase().isEmail().withMessage('E-mail inválido'),
  body('senha').notEmpty().withMessage('Informe a senha'),
];

router.post('/login', limiteAutenticacao, limitePorCredencial, regrasLogin, validate, authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/check', requireAuth, authController.sessaoAtual);

export default router;
