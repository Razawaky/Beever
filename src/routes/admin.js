import { Router } from 'express';
import { body, param, query } from 'express-validator';

import * as adminContentController from '../controllers/adminContentController.js';
import * as adminAuditController from '../controllers/adminAuditController.js';
import * as adminController from '../controllers/adminController.js';
import * as adminItemsController from '../controllers/adminItemsController.js';
import { limiteAdministrativo, limiteAutenticacao } from '../middlewares/rateLimiters.js';
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

// Tudo que escreve passa pelo limitador, montado uma vez como o `requireAdmin`:
// rota nova da área nasce protegida sem ninguém lembrar de repeti-lo. Vai como
// middleware condicional, e não como rota `*`, porque o Express 5 não aceita
// mais curinga solto no caminho.
router.use((req, res, proximo) =>
  req.method === 'POST' ? limiteAdministrativo(req, res, proximo) : proximo(),
);

router.get('/', adminController.painel);
router.get('/usuarios', adminController.usuarios);
router.post(
  '/usuarios/:id/admin',
  param('id').isInt({ min: 1 }),
  body('ehAdmin').isIn(['true', 'false']),
  validate,
  adminController.definirAdministrador,
);

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

// A faixa não entra: a célula herda a do favo (RN-029), decidido no service.
const regrasDeCelula = [
  body('titulo').trim().notEmpty().withMessage('Informe o título da célula').isLength({ max: 120 }),
  body('idTipoDeJogo').isInt({ min: 1 }).withMessage('Escolha o tipo de jogo'),
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

/**
 * Catálogo da loja (RF-ADM-03). O comportamento econômico não é campo: ele sai
 * dos números no service, para o painel não conseguir dizer "valoriza" num item
 * com taxa negativa. O arquivo da ilustração é lido em `app.js`, antes do CSRF.
 */
const regrasDeItem = [
  body('nome').trim().notEmpty().withMessage('Informe o nome do item').isLength({ max: 120 }),
  body('slug').optional({ values: 'falsy' }).trim().matches(/^[a-z0-9-]+$/).withMessage('Endereço inválido').isLength({ max: 60 }),
  body('descricaoInfantil').trim().notEmpty().withMessage('Explique o item para a criança').isLength({ max: 500 }),
  body('idCategoria').isInt({ min: 1 }).withMessage('Escolha a categoria'),
  body('preco').isInt({ min: 0 }).withMessage('O preço não pode ser negativo'),
  body('taxaDeValorizacao').isFloat({ min: -1, max: 1 }).withMessage('A taxa vai de -1 a 1'),
  body('pisoPercentual').isInt({ min: 0, max: 100 }).withMessage('O valor mínimo vai de 0 a 100'),
  body('tetoPercentual').isInt({ min: 0, max: 1000 }).withMessage('O valor máximo vai de 0 a 1000'),
  body('custoFixo').isInt({ min: 0 }).withMessage('O custo por ciclo não pode ser negativo'),
  body('rendaPorCiclo').isInt({ min: 0 }).withMessage('A renda por ciclo não pode ser negativa'),
  body('idItemDeOrigem').optional({ values: 'falsy' }).isInt({ min: 1 }),
];

/**
 * Limitador das rotas administrativas que escrevem. O limite global de 600 por
 * quinze minutos é rede de segurança de aplicação inteira, e não segura upload:
 * são até 8 MB por requisição, gravados em disco.
 */

router.get('/itens', adminItemsController.listar);
router.get('/itens/novo', adminItemsController.formulario);
router.post('/itens', regrasDeItem, validate, adminItemsController.criar);
router.get('/itens/:id', idNaUrl, validate, adminItemsController.detalhar);

router.get('/itens/:id/editar', idNaUrl, validate, adminItemsController.formulario);
router.post('/itens/:id', idNaUrl, regrasDeItem, validate, adminItemsController.atualizar);
router.post(
  '/itens/:id/ativo',
  idNaUrl,
  body('ativo').isIn(['true', 'false']),
  validate,
  adminItemsController.alternar,
);

router.get('/celulas/:idCelula/conteudo', idDaCelulaNaUrl, validate, adminContentController.formularioDeConteudo);
router.post(
  '/celulas/:idCelula/conteudo',
  idDaCelulaNaUrl,
  body('corpo').if(body('modo').equals('avancado')).notEmpty().withMessage('Cole o conteúdo da atividade'),
  body('publicacao').optional({ values: 'falsy' }).isIn(['substituir', 'acrescentar']),
  validate,
  adminContentController.salvarConteudo,
);
router.post(
  '/celulas/:idCelula/acervo/remover',
  idDaCelulaNaUrl,
  body('versao').isInt({ min: 1 }),
  validate,
  adminContentController.removerDoAcervo,
);

/**
 * Auditoria (RF-ADM-05). Filtro vazio é o normal — quem abre a tela quer ver
 * tudo —, então a validação confere formato e não obriga campo nenhum.
 */
const regrasDeFiltro = [
  query('atorTipo').optional({ values: 'falsy' }).isIn(['usuario', 'admin', 'sistema']),
  query('atorId').optional({ values: 'falsy' }).isInt({ min: 1 }),
  query('acao').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  query('entidade').optional({ values: 'falsy' }).trim().isLength({ max: 60 }),
  query('entidadeId').optional({ values: 'falsy' }).isInt({ min: 1 }),
  query('requestId').optional({ values: 'falsy' }).trim().isLength({ max: 36 }),
  query('de').optional({ values: 'falsy' }).isISO8601().withMessage('Data inicial inválida'),
  query('ate').optional({ values: 'falsy' }).isISO8601().withMessage('Data final inválida'),
  query('pagina').optional({ values: 'falsy' }).isInt({ min: 1 }),
];

router.get('/auditoria', regrasDeFiltro, validate, adminAuditController.consultar);
router.get('/auditoria/csv', regrasDeFiltro, validate, adminAuditController.exportar);

export default router;
