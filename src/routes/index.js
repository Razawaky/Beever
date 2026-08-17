import { Router } from 'express';

import * as healthController from '../controllers/healthController.js';
import * as homeController from '../controllers/homeController.js';
import * as paginaController from '../controllers/paginaController.js';
import lojaRouter from './loja.js';
import metasRouter from './metas.js';
import perfilRouter from './perfil.js';
import sessaoRouter from './sessao.js';
import tarefasRouter from './tarefas.js';
import usersRouter from './users.js';

/** Router raiz: cada domínio tem seu próprio arquivo, montado aqui. */
const router = Router();

router.get('/', homeController.mostrar);
router.get('/health', healthController.mostrar);

// Sem sessão, uma página protegida manda para o login em vez do 401 de API —
// diferente do requireAuth usado nas rotas JSON.
function exigirLoginPagina(req, res, next) {
  if (req.session?.usuarioId) return next();
  res.redirect('/login');
}

// Páginas EJS. Login e cadastro em si (POST) moram em sessao.js e users.js —
// aqui é só a tela em branco (GET).
router.get('/login', paginaController.login);
router.get('/cadastro', paginaController.cadastro);
router.get('/onboarding', exigirLoginPagina, paginaController.onboarding);
router.get('/painel', exigirLoginPagina, paginaController.painel);
router.get('/loja', exigirLoginPagina, paginaController.loja);
router.get('/manutencao', paginaController.manutencao);

router.use('/users', usersRouter);
router.use('/perfil', perfilRouter);
router.use('/sessao', sessaoRouter);
router.use('/loja', lojaRouter);
router.use('/metas', metasRouter);
router.use('/tarefas', tarefasRouter);

export default router;
