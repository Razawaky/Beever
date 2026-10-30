// Controla o diálogo de criação de perfil.
//
// O formulário é uma submissão normal para `/perfis`: sem JavaScript, o botão
// que abre o `<dialog>` não funciona, mas não há gravação escondida. Depois de
// criar, o servidor seleciona o perfil novo e leva para o onboarding.
const dialogoCriarPerfil = document.getElementById('dialogo-criar-perfil');
const abrirCriarPerfil = document.getElementById('btn-criar-perfil');
const cancelarCriarPerfil = document.getElementById('btn-cancelar-criar-perfil');
const campoApelido = document.getElementById('perfil-apelido');

if (dialogoCriarPerfil && abrirCriarPerfil && typeof dialogoCriarPerfil.showModal === 'function') {
  abrirCriarPerfil.addEventListener('click', () => {
    dialogoCriarPerfil.showModal();
    campoApelido?.focus();
  });

  cancelarCriarPerfil?.addEventListener('click', () => dialogoCriarPerfil.close());

  // Clicar no véu (fora do cartão) fecha, como no diálogo de saída do painel.
  dialogoCriarPerfil.addEventListener('click', (evento) => {
    if (evento.target === dialogoCriarPerfil) dialogoCriarPerfil.close();
  });
}
