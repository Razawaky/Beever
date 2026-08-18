import { Router } from 'express';
import { body, param } from 'express-validator';

import * as profilesController from '../controllers/profilesController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireOnboardingPendente } from '../middlewares/requireOnboarding.js';
import { validate } from '../middlewares/validate.js';

/**
 * Rotas de perfil. Id do usuário não vem na URL: quem está logado já
 * identifica o perfil. Posse é checada uma vez, dentro do service.
 */
const router = Router();

router.use(requireAuth);

router.get('/meu', profilesController.meu);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }),
    body('apelido').optional().trim().notEmpty().isLength({ max: 60 }),
    body('avatar').optional().trim().isLength({ max: 60 }),
    body('fuso').optional().trim().isLength({ max: 64 }),
    body('minutos_por_sessao').optional().isInt({ min: 5, max: 60 }),
  ],
  validate,
  profilesController.atualizar,
);

router.delete('/:id', param('id').isInt({ min: 1 }), validate, profilesController.remover);

// Só quem ainda não concluiu pode gravar: refazer o onboarding reescreveria
// o ponto de partida do XP de uma conta que já está jogando.
router.put(
  '/:id/onboarding',
  requireOnboardingPendente,
  [
    param('id').isInt({ min: 1 }),
    body('apelido').trim().notEmpty().withMessage('Informe como quer ser chamado').isLength({ max: 60 }),
    body('avatar').optional().trim().isLength({ max: 60 }),
    body('objetivo').trim().notEmpty().withMessage('Escolha um objetivo'),
    body('nivel')
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Nível inicial inválido'),
    // Um único dia marcado chega como string, vários chegam como lista — o
    // wildcard cobre os dois casos sem exigir que a tela mande sempre array.
    body('dias').optional(),
    body('dias.*').optional().isInt({ min: 0, max: 6 }).withMessage('Dia da semana inválido'),
  ],
  validate,
  profilesController.salvarOnboarding,
);

export default router;
