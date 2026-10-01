import { Router } from 'express';
import { body, query } from 'express-validator';

import * as authController from '../controllers/authController.js';
import * as googleAuthController from '../controllers/googleAuthController.js';
import * as passwordResetController from '../controllers/passwordResetController.js';
import {
  limiteAutenticacao,
  limitePorCredencial,
  limiteRecuperacaoDeSenha,
} from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';
import { exigirApelidoPublico } from '../services/apelidoPublico.js';

/** Rotas de sessão de login. Sessão de jogo é outro domínio. */
const router = Router();

const regrasLogin = [
  body('email').trim().toLowerCase().isEmail().withMessage('E-mail inválido'),
  body('senha').notEmpty().withMessage('Informe a senha'),
];

const regrasPedidoDeRecuperacao = [body('email').trim().toLowerCase().isEmail().withMessage('E-mail inválido')];

const regrasSenhaNova = [
  body('token').isHexadecimal().isLength({ min: 64, max: 64 }).withMessage('Link inválido'),
  body('senha')
    .isLength({ min: 8 })
    .withMessage('A senha precisa ter ao menos 8 caracteres')
    .matches(/[a-zA-Z]/)
    .withMessage('A senha precisa conter letras')
    .matches(/[0-9]/)
    .withMessage('A senha precisa conter números'),
  body('confirmarSenha')
    .custom((valor, { req }) => valor === req.body.senha)
    .withMessage('As senhas não coincidem'),
  body('desconectarTodos').optional().isIn(['on', 'true', true]).withMessage('Opção inválida'),
];

const regrasRetornoDoGoogle = [
  query('code').optional().isString(),
  query('state').optional().isString(),
  query('error').optional().isString(),
];

// Mesmas regras do cadastro, menos e-mail e senha: o e-mail vem verificado do Google.
const regrasCadastroPeloGoogle = [
  body('apelido')
    .trim()
    .notEmpty()
    .withMessage('Informe como você quer ser chamado')
    .custom(exigirApelidoPublico),
  body('data_nasc').isISO8601().withMessage('Data de nascimento inválida'),
  body('consentimento_responsavel')
    .optional()
    .isIn(['on', 'true', '1', true, 'false', '0', false])
    .withMessage('Confirmação de responsável inválida'),
];

router.post('/login', limiteAutenticacao, limitePorCredencial, regrasLogin, validate, authController.login);
router.post(
  '/recuperar-senha',
  limiteRecuperacaoDeSenha,
  regrasPedidoDeRecuperacao,
  validate,
  passwordResetController.solicitar,
);
router.post('/redefinir-senha', limiteAutenticacao, regrasSenhaNova, validate, passwordResetController.redefinir);
router.get('/google', limiteAutenticacao, googleAuthController.iniciar);
router.get('/google/retorno', limiteAutenticacao, regrasRetornoDoGoogle, validate, googleAuthController.retorno);
router.post(
  '/google/cadastro',
  limiteAutenticacao,
  regrasCadastroPeloGoogle,
  validate,
  googleAuthController.completarCadastro,
);
router.post('/logout', requireAuth, authController.logout);
router.get('/check', requireAuth, authController.sessaoAtual);

export default router;
