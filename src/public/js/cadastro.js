// Confere a confirmação de senha no navegador antes de enviar. O servidor
// também valida (users.js): isto é só feedback mais rápido, não a defesa.
document.getElementById('form-cadastro')?.addEventListener('submit', (evento) => {
  const senha = document.getElementById('senha');
  const confirmarSenha = document.getElementById('confirmarSenha');

  if (senha.value !== confirmarSenha.value) {
    evento.preventDefault();
    confirmarSenha.setCustomValidity('As senhas não coincidem');
    confirmarSenha.reportValidity();
    return;
  }

  confirmarSenha.setCustomValidity('');
});
