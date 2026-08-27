import { Router } from 'express';
import { body, param } from 'express-validator';

import * as adminContentController from '../controllers/adminContentController.js';
import * as adminController from '../controllers/adminController.js';
import { limiteAutenticacao } from '../middlewares/rateLimiters.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import { validate } from '../middlewares/validate.js';

/**
 * Rotas da área administrativa, todas sob `/admin`.
 *
 * O `requireAdmin` é montado uma vez, logo depois do login: tudo declarado
 * abaixo dele já nasce protegido, e nenhuma rota nova da E12 depende de alguém
 * lembrar de repetir o middleware.
 */
const router = Router();

const regrasLogin = [
  body('email').trim().isEmail().withMessage('E-mail inválido').normalizeEmail(),
  body('senha').notEmpty().withMessage('Informe a senha'),
];

router.get('/login', adminController.paginaDeLogin);
router.post('/login', limiteAutenticacao, regrasLogin, validate, adminController.login);

router.use(requireAdmin);

router.get('/', adminController.painel);
router.get('/usuarios', adminController.usuarios);

/**
 * Cadastro de conteúdo (RF-ADM-02). O corpo da atividade não é validado aqui:
 * quem diz se ele é jogável é o validador do tipo de jogo, no service, e
 * express-validator não conhece o formato de seis jogos diferentes.
 */
const regrasDeFavo = [
  body('titulo').trim().notEmpty().withMessage('Informe o título do favo').isLength({ max: 120 }),
  body('slug').optional({ values: 'falsy' }).trim().matches(/^[a-z0-9-]+$/).withMessage('Endereço inválido').isLength({ max: 60 }),
  body('descricao').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('idFaixa').isInt({ min: 1 }).withMessage('Escolha a faixa etária'),
  body('percentualDeDesbloqueio').isInt({ min: 1, max: 100 }).withMessage('O percentual vai de 1 a 100'),
];

const regrasDeCelula = [
  body('titulo').trim().notEmpty().withMessage('Informe o título da célula').isLength({ max: 120 }),
  body('idTipoDeJogo').isInt({ min: 1 }).withMessage('Escolha o tipo de jogo'),
  body('idFaixa').isInt({ min: 1 }).withMessage('Escolha a faixa etária'),
  body('segundosEstimados').isInt({ min: 30, max: 3600 }).withMessage('A duração vai de 30 a 3600 segundos'),
];

const idNaUrl = param('id').isInt({ min: 1 });
const idDaCelulaNaUrl = param('idCelula').isInt({ min: 1 });

router.get('/favos', adminContentController.listarFavos);
router.get('/favos/novo', adminContentController.formularioDeFavo);
router.post('/favos', regrasDeFavo, validate, adminContentController.criarFavo);
router.get('/favos/:id', idNaUrl, validate, adminContentController.detalharFavo);
router.get('/favos/:id/editar', idNaUrl, validate, adminContentController.formularioDeFavo);
router.post('/favos/:id', idNaUrl, regrasDeFavo, validate, adminContentController.atualizarFavo);
router.post(
  '/favos/:id/ativo',
  idNaUrl,
  body('ativo').isIn(['true', 'false']),
  validate,
  adminContentController.alternarFavo,
);

router.get('/favos/:id/celulas/nova', idNaUrl, validate, adminContentController.formularioDeCelula);
router.post('/favos/:id/celulas', idNaUrl, regrasDeCelula, validate, adminContentController.criarCelula);
router.get(
  '/favos/:id/celulas/:idCelula/editar',
  idNaUrl,
  idDaCelulaNaUrl,
  validate,
  adminContentController.formularioDeCelula,
);
router.post(
  '/celulas/:idCelula',
  idDaCelulaNaUrl,
  regrasDeCelula,
  validate,
  adminContentController.atualizarCelula,
);
router.post(
  '/celulas/:idCelula/ativo',
  idDaCelulaNaUrl,
  body('ativa').isIn(['true', 'false']),
  body('idFavo').isInt({ min: 1 }),
  validate,
  adminContentController.alternarCelula,
);
router.post(
  '/celulas/:idCelula/mover',
  idDaCelulaNaUrl,
  body('direcao').isIn(['cima', 'baixo']),
  body('idFavo').isInt({ min: 1 }),
  validate,
  adminContentController.moverCelula,
);

router.get('/celulas/:idCelula/conteudo', idDaCelulaNaUrl, validate, adminContentController.formularioDeConteudo);
router.post(
  '/celulas/:idCelula/conteudo',
  idDaCelulaNaUrl,
  body('corpo').notEmpty().withMessage('Cole o conteúdo da atividade'),
  validate,
  adminContentController.salvarConteudo,
);

export default router;
