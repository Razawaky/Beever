import { Router } from 'express';
import { param, query } from 'express-validator';

import * as healthController from '../controllers/healthController.js';
import * as homeController from '../controllers/homeController.js';
import * as paginaController from '../controllers/paginaController.js';
import { requireOnboarding, requireOnboardingPendente } from '../middlewares/requireOnboarding.js';
import { somentePagina } from '../middlewares/somentePagina.js';
import { validate, validateEnderecoDePagina } from '../middlewares/validate.js';
import adminRouter from './admin.js';
import cofreRouter from './cofre.js';
import lojaRouter from './loja.js';
import metasRouter from './metas.js';
import partidasRouter from './partidas.js';
import perfilRouter from './perfil.js';
import sessaoRouter from './sessao.js';
import tarefasRouter from './tarefas.js';
import usersRouter from './users.js';

/** Router raiz: cada domínio tem seu próprio arquivo, montado aqui. */
const router = Router();

router.get('/', homeController.mostrar);
router.get('/health', healthController.mostrar);

/**
 * Páginas EJS. Login e cadastro em si (POST) moram em `sessao.js` e `users.js`;
 * aqui é só a tela (GET).
 *
 * **A ordem destas declarações importa.** Uma rota de página e um router de
 * domínio montados no mesmo caminho se escondem em silêncio: `GET /metas`
 * declarado aqui e `router.use('/metas', ...)` logo abaixo respondem ao mesmo
 * path, e quem chega primeiro ganha. Já foi bug real com `/loja`, que estava
 * montado duas vezes e só funcionava por acidente de ordenação.
 *
 * A regra passa a ser explícita: a página vem primeiro e, quando o cliente
 * pede JSON, o `somentePagina` passa a vez para o router de domínio. Assim o
 * mesmo caminho serve navegador e API sem que um esconda o outro.
 */
router.get('/privacidade', paginaController.privacidade);
router.get('/login', paginaController.login);
router.get('/cadastro', paginaController.cadastro);
router.get('/onboarding', requireOnboardingPendente, paginaController.onboarding);
router.get('/painel', requireOnboarding, paginaController.painel);
router.get('/loja', somentePagina, requireOnboarding, paginaController.loja);
router.get(
  '/loja/itens/:idItem/confirmar',
  requireOnboarding,
  param('idItem').isInt({ min: 1 }),
  validateEnderecoDePagina,
  paginaController.confirmarCompra,
);
router.get('/inventario', requireOnboarding, paginaController.inventario);
// A projeção do cofre entra por query, e a página valida o mesmo que a rota
// JSON já validava: sem isso, `?porSemana=abc` desenhava a projeção inteira
// como NaN, e um número absurdo passava direto.
router.get(
  '/cofre',
  somentePagina,
  requireOnboarding,
  query('porSemana').optional({ values: 'falsy' }).isInt({ min: 0, max: 1000000 }),
  validate,
  paginaController.cofre,
);
router.get('/metas', somentePagina, requireOnboarding, paginaController.metas);
router.get('/conquistas', requireOnboarding, paginaController.conquistas);
router.get('/liga', requireOnboarding, paginaController.liga);
router.get('/perfil', somentePagina, requireOnboarding, paginaController.perfil);
router.get('/trilha', requireOnboarding, paginaController.trilha);
router.get(
  '/trilha/:id',
  requireOnboarding,
  param('id').isInt({ min: 1 }),
  validateEnderecoDePagina,
  paginaController.favo,
);
router.get(
  '/trilha/:idFavo/celula/:idCelula',
  requireOnboarding,
  param('idFavo').isInt({ min: 1 }),
  param('idCelula').isInt({ min: 1 }),
  validateEnderecoDePagina,
  paginaController.celula,
);
router.get('/manutencao', paginaController.manutencao);

router.use('/admin', adminRouter);
router.use('/users', usersRouter);
router.use('/perfil', perfilRouter);
router.use('/sessao', sessaoRouter);
router.use('/loja', lojaRouter);
router.use('/cofre', cofreRouter);
router.use('/metas', metasRouter);
router.use('/partidas', partidasRouter);
router.use('/tarefas', tarefasRouter);

export default router;
