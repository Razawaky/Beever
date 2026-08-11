import { Router } from 'express';
import { body, param } from 'express-validator';

import * as perfilController from '../controllers/perfilController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';

/**
 * Rotas de perfil. Id do usuário não vem na URL: quem está logado já
 * identifica o perfil. Posse é checada uma vez, dentro do service.
 */
const router = Router();

// Todas as rotas de perfil exigem login.
router.use(requireAuth);

router.get('/meu', perfilController.meu);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }),
    body('apelido').optional().trim().notEmpty().isLength({ max: 100 }),
    body('avatar_img').optional().trim().isLength({ max: 255 }),
  ],
  validate,
  perfilController.atualizar
);

router.delete('/:id', param('id').isInt({ min: 1 }), validate, perfilController.remover);

router.put(
  '/:id/onboarding',
  [
    param('id').isInt({ min: 1 }),
    body('apelido').trim().notEmpty().withMessage('Informe como quer ser chamado').isLength({ max: 100 }),
    body('objetivo').trim().notEmpty().withMessage('Escolha um objetivo'),
    body('nivel')
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Nível inicial inválido'),
  ],
  validate,
  perfilController.salvarOnboarding
);

export default router;
