import * as authService from '../services/authService.js';
import * as homeService from '../services/homeService.js';
import * as profilesService from '../services/profilesService.js';
import * as usersService from '../services/usersService.js';
import { ErroAplicacao, assincrono } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';
import { encerrarSessao } from '../utils/sessaoLogin.js';

/**
 * A aba de configurações.
 *
 * A conta autenticou com `contaUsuarioId`; `usuarioId` é a persona ativa, que
 * pode ser um perfil adicional. E-mail, senha e exclusão pertencem à conta, não
 * à persona, e é por isso que todas as ações usam o primeiro id. O segundo só
 * serve para dizer qual perfil está em uso na tela.
 */
const FUNDO_COLMEIA = 'min-h-screen bg-cera pb-28 text-tinta antialiased sm:pb-10';

function idDaConta(req) {
  return Number(req.session.contaUsuarioId ?? req.session.usuarioId);
}

function atorDaRequisicao(req) {
  return { id: idDaConta(req), ehAdmin: Boolean(req.session.ehAdmin) };
}

async function carregarDados(req) {
  const contaId = idDaConta(req);
  const [colmeia, perfil, conta] = await Promise.all([
    homeService.obterColmeia(req.session.usuarioId),
    profilesService.obterDoUsuario(req.session.usuarioId),
    usersService.obter(contaId),
  ]);

  return {
    colmeia,
    perfil,
    conta,
    ehPerfilAdicional: Number(req.session.usuarioId) !== contaId,
  };
}

/**
 * Renderiza a tela com os dados que já foram carregados. O `renderizarPagina`
 * é síncrono; por isso a leitura do banco fica em `carregarDados`, chamada uma
 * vez só por requisição.
 */
function montarPagina(req, res, dados, { status = 200, alterado = null, erro = null } = {}) {
  res.status(status);
  return renderizarPagina(res, 'painel', {
    titulo: 'Configurações — Beever',
    classeBody: FUNDO_COLMEIA,
    ...dados,
    secao: 'configuracoes',
    alterado,
    erro,
    mostrarAtalhoAdmin: Boolean(req.session.ehAdmin),
    // `painel.js` cuida do diálogo de saída que continua na lateral.
    scripts: ['/js/painel.js'],
  });
}

export const mostrar = assincrono(async (req, res) => {
  const dados = await carregarDados(req);
  return montarPagina(req, res, dados, { alterado: req.query.alterado ?? null });
});

async function responderComErro(req, res, erro) {
  // Erro inesperado continua para o handler global, com 500 e id de
  // requisição. Só os erros de domínio voltam para o formulário.
  if (!(erro instanceof ErroAplicacao)) throw erro;

  const dados = await carregarDados(req);
  return montarPagina(req, res, dados, { status: erro.status, erro: erro.message });
}

export const alterarEmail = assincrono(async (req, res) => {
  try {
    const contaId = idDaConta(req);
    const atualizado = await usersService.atualizar(contaId, { email: req.body.email }, atorDaRequisicao(req));

    // A sessão guarda o e-mail para a tela de perfis mostrar a conta sem ir ao
    // banco. Trocar o endereço sem atualizar aqui deixaria o valor antigo até o
    // próximo login.
    req.session.email = atualizado.email;
    return res.redirect('/painel/configuracoes?alterado=email');
  } catch (erro) {
    return responderComErro(req, res, erro);
  }
});

export const alterarSenha = assincrono(async (req, res) => {
  try {
    await usersService.atualizar(idDaConta(req), { senha: req.body.senha }, atorDaRequisicao(req));
    return res.redirect('/painel/configuracoes?alterado=senha');
  } catch (erro) {
    return responderComErro(req, res, erro);
  }
});

export const excluirConta = assincrono(async (req, res) => {
  try {
    const contaId = idDaConta(req);
    await usersService.inativar(contaId, atorDaRequisicao(req));
  } catch (erro) {
    return responderComErro(req, res, erro);
  }

  // Depois de desativar a conta, a sessão atual deixa de ser útil. O logout
  // também registra a saída na trilha e limpa o cookie, como qualquer saída.
  await authService.registrarLogout(req.session.usuarioId, req.session.ehAdmin);
  await encerrarSessao(req);
  res.clearCookie('beever.sid');

  return res.redirect('/login?conta=excluida');
});
