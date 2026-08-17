/** Landing page pública. Quem já está logado não precisa vê-la de novo. */
export function mostrar(req, res) {
  if (req.session?.usuarioId) {
    return res.redirect(req.session.onboardingConcluido ? '/painel' : '/onboarding');
  }
  res.render('pages/home', { titulo: 'Beever — educação financeira para crianças e adolescentes' });
}
