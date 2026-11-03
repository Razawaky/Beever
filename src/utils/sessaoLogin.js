/**
 * Estabelece a sessão de login (usada tanto no login quanto no auto-login
 * logo após o cadastro). Regenera o id da sessão sempre: sem isso, um id
 * plantado antes da autenticação continuaria válido depois dela.
 *
 * `usuarioId` é a persona que está jogando; `contaUsuarioId` é quem
 * autenticou e é dono de todos os perfis. No login os dois são iguais — a
 * conta principal também é o primeiro perfil. A seleção em `/perfis` troca só
 * `usuarioId`/`perfilId`, mantendo `contaUsuarioId` para a lista continuar
 * mostrando todos os irmãos.
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
      resolve();
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
