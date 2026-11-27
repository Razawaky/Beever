// Exclusão da conta: mesma confirmação em duas etapas nas configurações e na
// seleção de perfis. O "tem certeza?" vem primeiro; a senha só aparece depois,
// e o servidor a confere de novo antes de desativar a conta.
(() => {
  const botaoAbrir = document.getElementById('btn-excluir-conta');
  const dialogo = document.getElementById('dialogo-excluir-conta');
  const etapaConfirmar = document.getElementById('etapa-confirmar-exclusao');
  const form = document.getElementById('form-excluir-conta');
  const inputSenha = document.getElementById('senha-exclusao');
  const erro = document.getElementById('erro-exclusao');
  const btnCancelar = document.getElementById('btn-cancelar-exclusao');
  const btnContinuar = document.getElementById('btn-confirmar-exclusao');
  const btnVoltar = document.getElementById('btn-voltar-exclusao');
  const btnExcluir = document.getElementById('btn-excluir-confirmado');
  const csrfToken = document.body.dataset.csrfToken;

  if (!botaoAbrir || !dialogo || !form || !inputSenha) return;

  function mostrarErro(mensagem) {
    if (!erro) return;
    erro.textContent = mensagem;
    erro.classList.remove('hidden');
  }

  function limparErro() {
    if (!erro) return;
    erro.textContent = '';
    erro.classList.add('hidden');
  }

  function abrir() {
    limparErro();
    form.reset();
    etapaConfirmar?.classList.remove('hidden');
    form.classList.add('hidden');
    if (typeof dialogo.showModal === 'function') dialogo.showModal();
    else dialogo.setAttribute('open', '');
    // A ação destrutiva não recebe o foco inicial: dá para cancelar sem dar
    // Enter duas vezes.
    btnCancelar?.focus();
  }

  function fechar() {
    if (dialogo.open) dialogo.close();
  }

  botaoAbrir.addEventListener('click', abrir);
  btnCancelar?.addEventListener('click', fechar);

  btnContinuar?.addEventListener('click', () => {
    etapaConfirmar?.classList.add('hidden');
    form.classList.remove('hidden');
    inputSenha.focus();
  });

  btnVoltar?.addEventListener('click', () => {
    limparErro();
    form.classList.add('hidden');
    etapaConfirmar?.classList.remove('hidden');
    btnContinuar?.focus();
  });

  dialogo.addEventListener('cancel', limparErro);
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) fechar();
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErro();

    const senha = inputSenha.value;
    if (!senha) {
      mostrarErro('Digite a senha da conta.');
      inputSenha.focus();
      return;
    }

    if (btnExcluir) {
      btnExcluir.disabled = true;
      btnExcluir.textContent = 'Excluindo...';
    }
    inputSenha.disabled = true;

    try {
      const resposta = await fetch('/painel/configuracoes/conta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ senha }),
      });

      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível excluir a conta.');
      }

      window.location.assign(dados.redirect || '/login?conta=excluida');
    } catch (err) {
      mostrarErro(err.message || 'Não foi possível excluir a conta.');
      inputSenha.focus();
      inputSenha.select?.();
    } finally {
      if (btnExcluir) {
        btnExcluir.disabled = false;
        btnExcluir.textContent = 'Excluir conta';
      }
      inputSenha.disabled = false;
    }
  });
})();
