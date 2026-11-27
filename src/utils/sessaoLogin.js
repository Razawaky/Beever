/**
 * Estabelece a sessão de login (usada tanto no login quanto no auto-login
 * logo após o cadastro). Regenera o id da sessão sempre: sem isso, um id
 * plantado antes da autenticação continuaria válido depois dela.
 *
 * `contaUsuarioId` é quem autenticou (o responsável, dono de todos os perfis);
 * `usuarioId` é a persona jogando e `perfilId` o registro dela. No cadastro do
 * responsável não há persona ainda, e `perfilId` fica vazio até a escolha em
 * `/perfis` (até lá, `usuarioId` só mantém a sessão autenticada). Nas contas
 * antigas, que já nasceram com perfil, o login enche os três — o guard de jogo
 * distingue um caso do outro por `perfilId`.
 */
export function iniciarSessaoLogin(
  req,
  { usuarioId, contaUsuarioId = usuarioId, email, ehAdmin, perfilId, onboardingConcluido },
) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((erro) => {
      if (erro) return reject(erro);
      req.session.usuarioId = usuarioId;
      req.session.contaUsuarioId = contaUsuarioId;
      req.session.email = email;
      req.session.ehAdmin = ehAdmin;
      req.session.perfilId = perfilId;
      // Cacheado na sessão pelo mesmo motivo do ehAdmin: evita reconsultar o
      // banco a cada requisição só para decidir entre /painel e /onboarding.
      req.session.onboardingConcluido = onboardingConcluido;

      // O save tem que acontecer aqui, antes da resposta. Com middleware
      // assíncrono na rota (os limites de login), o save automático do
      // express-session no fim da resposta não basta para a sessão regenerada:
      // o cookie novo ia para o navegador sem linha nenhuma no store, o login
      // parecia ter dado certo e a página seguinte devolvia para /login.
      req.session.save((erroAoSalvar) => (erroAoSalvar ? reject(erroAoSalvar) : resolve()));
    });
  });
}

/**
 * Encerra a sessão de login. Promissificado de propósito: um throw dentro do
 * callback do `destroy` ficaria fora da cadeia de promises e nunca chegaria ao
 * handler global de erros.
 *
 * Mora aqui, e não no controller de login, porque a exclusão de conta também
 * precisa encerrar a sessão depois de desativar a conta.
 */
export function encerrarSessao(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((erro) => (erro ? reject(erro) : resolve()));
  });
}
