import { Router } from 'express';
import { body, param } from 'express-validator';

import * as gameSessionsController from '../controllers/gameSessionsController.js';
import { limiteRecompensa } from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireOnboarding } from '../middlewares/requireOnboarding.js';
import { validate } from '../middlewares/validate.js';

/**
 * Partidas de jogo (RF-JOG-08). Só JSON — a tela vive em `/trilha`.
 *
 * As respostas chegam como lista, uma por decisão do jogo — número no quiz, id
 * de caixa no arrastar. O que cada item significa é do validador do tipo de
 * jogo, e o servidor nunca aceita pontuação pronta (RN-007). Campo estranho no
 * corpo é ignorado, não é erro: recusar a partida inteira por causa de lixo
 * enviado junto castigaria o jogador por um bug do front.
 */
const router = Router();

router.use(requireAuth, requireOnboarding);

// A partida é a maior fonte de XP, pólen e mel do jogo, e por isso carrega o
// mesmo limitador das outras rotas que creditam. Salvar progresso fica de fora
// de propósito: ele é chamado a cada decisão do jogador — a cada toque no + do
// orçamento, por exemplo — e um limite de recompensa ali castigaria quem está
// só jogando.
router.post(
  '/',
  limiteRecompensa,
  body('idCelula').isInt({ min: 1 }).withMessage('Célula inválida'),
  validate,
  gameSessionsController.abrir,
);

router.post(
  '/:token/resultado',
  limiteRecompensa,
  param('token').isUUID().withMessage('Partida inválida'),
  body('respostas').isArray({ max: 100 }).withMessage('As respostas precisam vir em lista'),
  validate,
  gameSessionsController.fechar,
);

router.put(
  '/:token/estado',
  param('token').isUUID().withMessage('Partida inválida'),
  body('respostas').isArray({ max: 100 }).withMessage('O progresso precisa vir em lista'),
  validate,
  gameSessionsController.salvarEstado,
);

router.post(
  '/:token/abandono',
  param('token').isUUID().withMessage('Partida inválida'),
  validate,
  gameSessionsController.abandonar,
);

export default router;
