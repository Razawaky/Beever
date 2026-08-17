import { Router } from 'express';
import { body, param } from 'express-validator';

import * as usuarioController from '../controllers/usuarioController.js';
import { limiteAutenticacao } from '../middlewares/rateLimiters.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';

/** Rotas de conta. */
const router = Router();

const regrasCadastro = [
  body('nome').trim().notEmpty().withMessage('Informe o nome').isLength({ max: 255 }),
  body('email').trim().isEmail().withMessage('E-mail inválido').normalizeEmail(),
  body('data_nasc').isISO8601().withMessage('Data de nascimento inválida'),
  body('senha')
    .isLength({ min: 8 })
    .withMessage('A senha precisa ter ao menos 8 caracteres')
    .matches(/[a-zA-Z]/)
    .withMessage('A senha precisa conter letras')
    .matches(/[0-9]/)
    .withMessage('A senha precisa conter números'),
  body('confirmarSenha')
    .optional()
    .custom((valor, { req }) => valor === req.body.senha)
    .withMessage('As senhas não coincidem'),
  body('apelido').optional().trim().isLength({ max: 100 }),
];

const regrasAtualizacao = [
  param('id').isInt({ min: 1 }),
  body('nome').optional().trim().notEmpty().isLength({ max: 255 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('data_nasc').optional().isISO8601(),
  body('senha').optional().isLength({ min: 8 }).matches(/[a-zA-Z]/).matches(/[0-9]/),
];

// Listagem completa de contas é dado sensível: só administrador.
router.get('/', requireAuth, requireAdmin, usuarioController.listar);

router.post('/', limiteAutenticacao, regrasCadastro, validate, usuarioController.criar);

router.put('/:id', requireAuth, regrasAtualizacao, validate, usuarioController.atualizar);

router.delete('/:id', requireAuth, param('id').isInt({ min: 1 }), validate, usuarioController.inativar);

export default router;
