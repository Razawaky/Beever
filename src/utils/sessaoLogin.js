/**
 * Estabelece a sessão de login (usada tanto no login quanto no auto-login
 * logo após o cadastro). Regenera o id da sessão sempre: sem isso, um id
 * plantado antes da autenticação continuaria válido depois dela.
 */
export function iniciarSessaoLogin(req, { usuarioId, email, ehAdmin, perfilId, onboardingConcluido }) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((erro) => {
      if (erro) return reject(erro);
      req.session.usuarioId = usuarioId;
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
