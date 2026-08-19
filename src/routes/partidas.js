import { Router } from 'express';
import { body, param } from 'express-validator';

import * as gameSessionsController from '../controllers/gameSessionsController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireOnboarding } from '../middlewares/requireOnboarding.js';
import { validate } from '../middlewares/validate.js';

/**
 * Partidas de jogo (RF-JOG-08). Só JSON — a tela vive em `/trilha`.
 *
 * As respostas chegam como lista de números; o que cada número significa é do
 * validador do tipo de jogo, e o servidor nunca aceita pontuação pronta
 * (RN-007). Campo estranho no corpo é ignorado, não é erro: recusar a partida
 * inteira por causa de lixo enviado junto castigaria o jogador por um bug do
 * front.
 */
const router = Router();

router.use(requireAuth, requireOnboarding);

router.post(
  '/',
  body('idCelula').isInt({ min: 1 }).withMessage('Célula inválida'),
  validate,
  gameSessionsController.abrir,
);

router.post(
  '/:token/resultado',
  param('token').isUUID().withMessage('Partida inválida'),
  body('respostas').isArray({ max: 100 }).withMessage('As respostas precisam vir em lista'),
  validate,
  gameSessionsController.fechar,
);

router.post(
  '/:token/abandono',
  param('token').isUUID().withMessage('Partida inválida'),
  validate,
  gameSessionsController.abandonar,
);

export default router;
