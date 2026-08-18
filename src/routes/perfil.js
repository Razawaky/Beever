import { Router } from 'express';
import { body, param } from 'express-validator';

import * as profilesController from '../controllers/profilesController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireOnboarding, requireOnboardingPendente } from '../middlewares/requireOnboarding.js';
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
    // RN-011 reconhece cinco durações, e o banco as repete em
    // `ck_profiles_session_minutes`. Aceitar 5 a 60 aqui deixava passar valores
    // fora da lista, que o CHECK derrubava depois — erro de formulário virando
    // 500. `isIn` compararia texto contra número e recusaria até o valor certo;
    // a conversão explícita aceita tanto `20` quanto `"20"`, que é como os dois
    // clientes mandam.
    body('minutos_por_sessao')
      .optional()
      .custom((valor) => [5, 10, 20, 30, 45].includes(Number(valor)))
      .withMessage('Tempo por sessão inválido: use 5, 10, 20, 30 ou 45'),
    // RN-050: interruptores de som e de animação. Caixa marcada chega como
    // `"on"` do formulário e como `true` do JSON; a rota aceita as duas formas e
    // quem normaliza é o controller.
    body('som_ativo').optional().isIn([true, false, 'true', 'false', 'on', '1', '0']),
    body('animacao_reduzida').optional().isIn([true, false, 'true', 'false', 'on', '1', '0']),
  ],
  validate,
  profilesController.atualizar,
);

/**
 * RF-ONB-09 e RN-013: a semana é editável depois do onboarding, e editar não
 * pode custar progresso. Só quem já concluiu chega aqui — durante o onboarding
 * quem grava os dias é o passo do wizard.
 */
router.put(
  '/:id/disponibilidade',
  requireOnboarding,
  [
    param('id').isInt({ min: 1 }),
    body('dias').custom((valor) => {
      const lista = valor === undefined ? [] : [].concat(valor);
      if (lista.length === 0) throw new Error('Escolha pelo menos um dia da semana');
      return true;
    }),
    body('dias.*').isInt({ min: 0, max: 6 }).withMessage('Dia da semana inválido'),
  ],
  validate,
  profilesController.atualizarDisponibilidade,
);

router.delete('/:id', param('id').isInt({ min: 1 }), validate, profilesController.remover);

// RF-ONB-01: cada passo respondido é gravado na hora, para que fechar a aba no
// meio não custe o começo de novo. A lista de passos válidos não é repetida
// aqui: ela é regra de produto e mora em `profilesService.PASSOS_DO_ONBOARDING`,
// que recusa passo desconhecido com o mesmo 422 que este validador daria — e a
// rota não conhece service, só controller.
router.put(
  '/:id/onboarding/passo',
  requireOnboardingPendente,
  [
    param('id').isInt({ min: 1 }),
    body('passo').trim().notEmpty().withMessage('Informe qual passo está sendo salvo').isLength({ max: 40 }),
    body('resposta').exists().withMessage('Responda para continuar'),
  ],
  validate,
  profilesController.salvarPassoDoOnboarding,
);

// Só quem ainda não concluiu pode gravar: refazer o onboarding reescreveria
// o ponto de partida do XP de uma conta que já está jogando.
router.put(
  '/:id/onboarding',
  requireOnboardingPendente,
  [
    param('id').isInt({ min: 1 }),
    body('apelido').trim().notEmpty().withMessage('Informe como quer ser chamado').isLength({ max: 60 }),
    // RF-ONB-06 é obrigatória, e até a T-04.3 esta linha era `optional()`:
    // dava para concluir o onboarding sem mascote nenhum. Que o slug exista no
    // catálogo é o service que confere, contra a tabela `avatars`.
    body('avatar').trim().notEmpty().withMessage('Escolha sua abelha').isLength({ max: 60 }),
    body('objetivo').trim().notEmpty().withMessage('Escolha um objetivo'),
    // O corpo da conclusão traz uma chave por passo do wizard: `tempo` e
    // `preferencias` vêm com o nome do passo. Ambos são opcionais porque quem
    // veio passo a passo já os gravou.
    body('tempo')
      .optional()
      .custom((valor) => [5, 10, 20, 30, 45].includes(Number(valor)))
      .withMessage('Tempo por sessão inválido: use 5, 10, 20, 30 ou 45'),
    body('preferencias.*').optional().isString().isLength({ max: 40 }),
    body('nivel')
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Nível inicial inválido'),
    // Um único dia marcado chega como string, vários chegam como lista — o
    // wildcard cobre os dois casos sem exigir que a tela mande sempre array.
    // A RF-ONB-03 exige pelo menos um dia: a tela já cobrava, o servidor não,
    // e sem isso dava para concluir o onboarding com a semana inteira vazia.
    body('dias').custom((valor) => {
      const lista = valor === undefined ? [] : [].concat(valor);
      if (lista.length === 0) throw new Error('Escolha pelo menos um dia da semana');
      return true;
    }),
    body('dias.*').optional().isInt({ min: 0, max: 6 }).withMessage('Dia da semana inválido'),
  ],
  validate,
  profilesController.salvarOnboarding,
);

export default router;
