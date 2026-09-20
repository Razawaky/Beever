import { ErroAplicacao, erroNaoAutorizado } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';

/**
 * Exige que a conta tenha concluído o onboarding.
 *
 * A regra estava copiada dentro dos controllers de página — cada um com o seu
 * `if (!req.session.onboardingConcluido) return res.redirect('/onboarding')` —
 * e por isso valia só onde alguém lembrou de escrever: as rotas JSON de loja,
 * metas e tarefas nunca checaram nada. Como middleware, ela passa a valer por
 * declaração na rota, que é onde dá para conferir de relance quem exige o quê.
 *
 * A resposta depende do cliente: navegador precisa ser levado ao lugar certo,
 * cliente de API precisa de um código para tratar. Redirecionar uma chamada
 * JSON entregaria HTML para quem pediu dado.
 *
 * Estes dois guardas também absorveram o `exigirLoginPagina`, que existia só
 * para mandar a página sem sessão ao login — era a outra metade da dívida
 * DT-07, e virou código morto assim que toda página protegida passou a
 * declarar um destes. Se algum dia existir página que exija login mas não
 * onboarding, ela volta; hoje não existe.
 *
 * A fonte da verdade é `users.onboarding_completed_at`, lido no login e no
 * fim do onboarding e guardado na sessão. O middleware não vai ao banco: a
 * sessão já carrega a resposta, e o fluxo Controller → Service → Repository
 * continua sendo o único caminho até o MySQL.
 */
export function requireOnboarding(req, res, next) {
  if (!req.session?.usuarioId) {
    return querJson(req) ? next(erroNaoAutorizado()) : res.redirect('/login');
  }

  if (req.session.onboardingConcluido) return next();

  if (querJson(req)) {
    return next(
      new ErroAplicacao('Conclua a configuração do perfil antes de continuar', {
        status: 403,
        codigo: 'ONBOARDING_PENDENTE',
      }),
    );
  }

  res.redirect('/onboarding');
}

/**
 * O inverso: só deixa passar quem **ainda não** concluiu.
 *
 * Guarda a própria tela de onboarding. Sem isso, quem já configurou o perfil
 * consegue voltar ao formulário e refazer o ponto de partida do XP — que é
 * exatamente o tipo de porta que ninguém abre de propósito, mas todo mundo
 * encontra sem querer ao apertar "voltar" no navegador.
 */
export function requireOnboardingPendente(req, res, next) {
  if (!req.session?.usuarioId) {
    return querJson(req) ? next(erroNaoAutorizado()) : res.redirect('/login');
  }

  if (!req.session.onboardingConcluido) return next();

  if (querJson(req)) {
    return next(
      new ErroAplicacao('Este perfil já concluiu a configuração', {
        status: 409,
        codigo: 'ONBOARDING_JA_CONCLUIDO',
      }),
    );
  }

  res.redirect('/painel');
}
