import { Router } from 'express';
import { body, param } from 'express-validator';

import * as usersController from '../controllers/usersController.js';
import { limiteAutenticacao } from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';

/**
 * Rotas de conta.
 *
 * O cadastro **não pede nome completo**: a RN-049 proíbe coletar dado pessoal
 * de criança além de apelido e avatar, e o schema não tem onde guardar. Por
 * isso o apelido, que antes era opcional (o nome real fazia as vezes dele),
 * agora é obrigatório.
 */
const router = Router();

const regrasCadastro = [
  body('apelido').trim().notEmpty().withMessage('Informe como você quer ser chamado').isLength({ max: 60 }),
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
  // Quem decide se o consentimento é obrigatório é o service, que conhece a
  // idade. Aqui só se garante que o valor tenha forma de "sim ou não" — um
  // texto qualquer no lugar do checkbox não pode virar autorização.
  body('consentimento_responsavel')
    .optional()
    .isIn(['on', 'true', '1', true, 'false', '0', false])
    .withMessage('Confirmação de responsável inválida'),
];

const regrasAtualizacao = [
  param('id').isInt({ min: 1 }),
  body('apelido').optional().trim().notEmpty().isLength({ max: 60 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('data_nasc').optional().isISO8601(),
  body('senha').optional().isLength({ min: 8 }).matches(/[a-zA-Z]/).matches(/[0-9]/),
];

// A listagem de contas era a única rota administrativa do sistema e mudou de
// endereço na T-12.1: agora é `GET /admin/usuarios`, sob o prefixo da E12.
router.post('/', limiteAutenticacao, regrasCadastro, validate, usersController.criar);

router.put('/:id', requireAuth, regrasAtualizacao, validate, usersController.atualizar);

router.delete('/:id', requireAuth, param('id').isInt({ min: 1 }), validate, usersController.inativar);

export default router;
