// Controla os diálogos e o menu de opções da seleção de perfis.
//
// O formulário de criação é uma submissão normal para `/perfis`: sem
// JavaScript, o botão que abre o `<dialog>` não funciona, mas não há gravação
// escondida. Depois de criar, o servidor seleciona o perfil novo e leva para o
// onboarding. A exclusão é a única ação que só existe no cliente, porque usa
// `DELETE` com o token no cabeçalho; o perfil em uso fica bloqueado no menu e a
// conta principal nem ganha menu.
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

const dialogoExcluirPerfil = document.getElementById('dialogo-excluir-perfil');
const nomePerfilExcluir = document.getElementById('nome-perfil-excluir');
const erroExcluirPerfil = document.getElementById('erro-excluir-perfil');
const cancelarExcluirPerfil = document.getElementById('btn-cancelar-excluir-perfil');
const confirmarExcluirPerfil = document.getElementById('btn-confirmar-excluir-perfil');
const csrfToken = document.body.dataset.csrfToken;

let menuAberto = null;
let perfilParaExcluir = null;
let gatilhoDoPerfil = null;

function fecharMenu({ devolverFoco = false } = {}) {
  if (!menuAberto) return;

  const { gatilho, menu } = menuAberto;
  menu.classList.add('hidden');
  gatilho.setAttribute('aria-expanded', 'false');
  menuAberto = null;

  if (devolverFoco) gatilho.focus();
}

function abrirMenu(gatilho, menu) {
  fecharMenu();
  menu.classList.remove('hidden');
  gatilho.setAttribute('aria-expanded', 'true');
  menuAberto = { gatilho, menu };
}

function itensDoMenu(menu) {
  return [...menu.querySelectorAll('[role="menuitem"]:not([disabled])')];
}

for (const gatilho of document.querySelectorAll('[data-menu-perfil]')) {
  const menu = document.getElementById(gatilho.getAttribute('aria-controls'));
  if (!menu) continue;

  gatilho.addEventListener('click', (evento) => {
    evento.stopPropagation();

    if (menuAberto?.menu === menu) {
      fecharMenu({ devolverFoco: true });
      return;
    }

    abrirMenu(gatilho, menu);
  });

  gatilho.addEventListener('keydown', (evento) => {
    if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return;

    evento.preventDefault();
    abrirMenu(gatilho, menu);
    const itens = itensDoMenu(menu);
    const item = evento.key === 'ArrowUp' ? itens.at(-1) : itens[0];
    item?.focus();
  });

  menu.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      fecharMenu({ devolverFoco: true });
      return;
    }

    if (evento.key === 'Tab') {
      fecharMenu();
      return;
    }

    const itens = itensDoMenu(menu);
    if (itens.length === 0) return;

    const atual = itens.indexOf(document.activeElement);
    let proximo = null;

    if (evento.key === 'ArrowDown') proximo = itens[(atual + 1) % itens.length];
    if (evento.key === 'ArrowUp') proximo = itens[(atual - 1 + itens.length) % itens.length];
    if (evento.key === 'Home') proximo = itens[0];
    if (evento.key === 'End') proximo = itens.at(-1);

    if (!proximo) return;
    evento.preventDefault();
    proximo.focus();
  });
}

document.addEventListener('click', (evento) => {
  if (!menuAberto) return;
  if (menuAberto.gatilho.contains(evento.target) || menuAberto.menu.contains(evento.target)) return;
  fecharMenu();
});

document.addEventListener('keydown', (evento) => {
  if (evento.key !== 'Escape' || !menuAberto) return;
  evento.preventDefault();
  fecharMenu({ devolverFoco: true });
});

function limparErroExclusao() {
  if (!erroExcluirPerfil) return;
  erroExcluirPerfil.textContent = '';
  erroExcluirPerfil.classList.add('hidden');
}

function mostrarErroExclusao(mensagem) {
  if (!erroExcluirPerfil) return;
  erroExcluirPerfil.textContent = mensagem;
  erroExcluirPerfil.classList.remove('hidden');
}

function abrirDialogoExclusao(item) {
  if (!dialogoExcluirPerfil || typeof dialogoExcluirPerfil.showModal !== 'function') return;

  perfilParaExcluir = item.dataset.excluirPerfil;
  gatilhoDoPerfil = document.getElementById(
    item.closest('[role="menu"]')?.getAttribute('aria-labelledby') ?? '',
  );
  if (nomePerfilExcluir) nomePerfilExcluir.textContent = item.dataset.perfilNome ?? '';

  fecharMenu();
  limparErroExclusao();
  dialogoExcluirPerfil.showModal();
  // A ação destrutiva não recebe o foco inicial: quem abriu o menu precisa
  // poder cancelar sem apertar Enter duas vezes.
  cancelarExcluirPerfil?.focus();
}

for (const item of document.querySelectorAll('[data-excluir-perfil]')) {
  item.addEventListener('click', () => abrirDialogoExclusao(item));
}

cancelarExcluirPerfil?.addEventListener('click', () => dialogoExcluirPerfil?.close());

// Clicar no véu também cancela, seguindo o padrão dos outros diálogos da tela.
dialogoExcluirPerfil?.addEventListener('click', (evento) => {
  if (evento.target === dialogoExcluirPerfil) dialogoExcluirPerfil.close();
});

dialogoExcluirPerfil?.addEventListener('close', () => {
  perfilParaExcluir = null;
  limparErroExclusao();
  gatilhoDoPerfil?.focus();
  gatilhoDoPerfil = null;
});

confirmarExcluirPerfil?.addEventListener('click', async () => {
  if (!perfilParaExcluir || !confirmarExcluirPerfil) return;

  const textoOriginal = confirmarExcluirPerfil.textContent;
  confirmarExcluirPerfil.disabled = true;
  confirmarExcluirPerfil.textContent = 'Excluindo...';
  limparErroExclusao();

  try {
    const resposta = await fetch(`/perfil/${perfilParaExcluir}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'x-csrf-token': csrfToken ?? '',
      },
      credentials: 'include',
    });

    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(corpo.erro || 'Não foi possível excluir o perfil agora.');

    // Recarregar mantém o texto do topo coerente com a quantidade de perfis que
    // sobrou e evita manter na tela uma linha que já não existe no banco.
    window.location.reload();
  } catch (erro) {
    mostrarErroExclusao(erro.message);
    confirmarExcluirPerfil.disabled = false;
    confirmarExcluirPerfil.textContent = textoOriginal;
  }
});
