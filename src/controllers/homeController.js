import { renderizarPagina } from '../utils/pagina.js';

/** Landing page pública. Quem já está logado não precisa vê-la de novo. */
export function mostrar(req, res) {
  if (req.session?.usuarioId) {
    return res.redirect(req.session.onboardingConcluido ? '/painel' : '/onboarding');
  }

  // A landing tem cabeçalho e rodapé próprios, escuros: os do app são claros e
  // brigariam com a superfície da página.
  renderizarPagina(res, 'home', {
    titulo: 'Beever — educação financeira para crianças e adolescentes',
    classeBody: 'min-h-screen bg-breu text-cera antialiased',
    // O Lenis vem antes porque o `landing.js` usa o que ele publica. Os dois são
    // servidos pelo projeto: a CSP não aceita script de fora.
    scripts: ['/js/vendor/lenis.min.js', '/js/landing.js'],
  });
}
