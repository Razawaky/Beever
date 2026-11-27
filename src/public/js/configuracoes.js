(() => {
  const detalhes = document.getElementById('detalhes-conta');
  const resumo = document.getElementById('resumo-conta');
  const dialogo = document.getElementById('dialogo-senha-conta');
  const form = document.getElementById('form-senha-conta');
  const inputSenha = document.getElementById('senha-confirmacao-conta');
  const erro = document.getElementById('erro-senha-conta');
  const btnCancelar = document.getElementById('btn-cancelar-senha-conta');
  const btnConfirmar = document.getElementById('btn-confirmar-senha-conta');
  const csrfToken = document.body.dataset.csrfToken;

  if (!detalhes || !resumo || !dialogo || !form || !inputSenha) return;

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

  function abrirDialogo() {
    limparErro();
    form.reset();
    if (typeof dialogo.showModal === 'function') dialogo.showModal();
    else dialogo.setAttribute('open', '');
    inputSenha.focus();
  }

  function fecharDialogo() {
    if (dialogo.open) dialogo.close();
  }

  resumo.addEventListener('click', (evento) => {
    // Toda abertura da conta exige senha; fechar continua normal.
    if (detalhes.open) return;
    evento.preventDefault();
    abrirDialogo();
  });

  btnCancelar?.addEventListener('click', () => {
    fecharDialogo();
  });

  dialogo.addEventListener('cancel', () => {
    limparErro();
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

    if (btnConfirmar) {
      btnConfirmar.disabled = true;
      btnConfirmar.textContent = 'Confirmando...';
    }
    inputSenha.disabled = true;

    try {
      const resposta = await fetch('/painel/configuracoes/verificar-senha', {
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
        throw new Error(dados.erro || 'Não foi possível confirmar a senha.');
      }

      fecharDialogo();
      detalhes.open = true;
      const primeiroCampo = detalhes.querySelector('input, button, a, select, textarea');
      if (primeiroCampo && typeof primeiroCampo.focus === 'function') {
        // Move foco para o conteúdo revelado, sem forçar scroll brusco.
        primeiroCampo.focus({ preventScroll: true });
      }
    } catch (err) {
      mostrarErro(err.message || 'Senha incorreta. Tente novamente.');
      inputSenha.focus();
      inputSenha.select?.();
    } finally {
      if (btnConfirmar) {
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Abrir';
      }
      inputSenha.disabled = false;
    }
  });
})();
