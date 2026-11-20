// Edição do perfil: disponibilidade semanal (RF-ONB-09) e imagem/cor do avatar.
// JS puro na página. O corpo vai em JSON, então o token de CSRF viaja no
// cabeçalho, e nada recarrega: quem trocou uma coisa quer ver a outra parada.
const formulario = document.getElementById('form-disponibilidade');
const aviso = document.getElementById('aviso-disponibilidade');
const botao = document.getElementById('btn-salvar-dias');
const perfilId = formulario?.dataset.perfilId;
const csrfToken = document.body.dataset.csrfToken;

const formAvatar = document.getElementById('form-avatar');
const dialogoAvatar = document.getElementById('dialogo-avatar');
const botaoAbrirAvatar = document.getElementById('btn-abrir-avatar');
const botaoCancelarAvatar = document.getElementById('btn-cancelar-avatar');
const avisoAvatar = document.getElementById('aviso-avatar');
const avisoAvatarDialogo = document.getElementById('aviso-avatar-dialogo');
const botaoSalvarAvatar = document.getElementById('btn-salvar-avatar');

let avatarAnterior = formAvatar?.querySelector('input[name="avatar"]:checked')?.value ?? '';
let corAnterior =
  formAvatar?.querySelector('input[name="avatar_cor_fundo"]:checked')?.value ??
  document.getElementById('avatar-atual')?.dataset.avatarCor ??
  '';
let salvandoAvatar = false;

function mostrarMensagem(elemento, mensagem, erro = false) {
  if (!elemento) return;
  elemento.textContent = mensagem;
  elemento.classList.remove('hidden');
  elemento.classList.toggle('text-perigo', erro);
}

function esconderMensagem(elemento) {
  if (!elemento) return;
  elemento.textContent = '';
  elemento.classList.add('hidden');
  elemento.classList.remove('text-perigo');
}

function mostrar(mensagem, erro = false) {
  mostrarMensagem(aviso, mensagem, erro);
}

async function enviarAoPerfil(url, corpo, mensagemDeErro) {
  const resposta = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-csrf-token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify(corpo),
  });

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || mensagemDeErro);
  return dados;
}

/**
 * O texto que o jogador lê depois de salvar os dias: quantos dias ficaram,
 * quantas metas nasceram e que as excedentes continuam valendo até vencer.
 */
function resumir(resultado) {
  const partes = [`Agora você joga ${resultado.dias.length} dia(s) por semana.`];

  if (resultado.metasGeradas > 0) {
    partes.push(`${resultado.metasGeradas} meta(s) nova(s) entraram no seu plano.`);
  }
  if (resultado.metasExcedentes > 0) {
    partes.push(
      `Você tem ${resultado.metasExcedentes} meta(s) além do que este ritmo pede: elas continuam valendo até o prazo acabar, e o que você já fez nelas não se perde.`,
    );
  }
  if (resultado.metasGeradas === 0 && resultado.metasExcedentes === 0) {
    partes.push('Seu plano de metas continua o mesmo.');
  }

  return partes.join(' ');
}

formulario?.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const dias = [...formulario.querySelectorAll('input[name="dias"]:checked')].map((campo) => campo.value);
  if (dias.length === 0) {
    mostrar('Escolha pelo menos um dia da semana para jogar.', true);
    return;
  }

  botao.disabled = true;
  botao.textContent = 'Salvando...';

  try {
    const resultado = await enviarAoPerfil(
      `/perfil/${perfilId}/disponibilidade`,
      { dias },
      'Não foi possível salvar seus dias.',
    );
    mostrar(resumir(resultado));
  } catch (erro) {
    mostrar(erro.message, true);
  } finally {
    botao.disabled = false;
    botao.textContent = 'Salvar meus dias';
  }
});

function marcarRadio(nome, valor) {
  const campo = [...(formAvatar?.querySelectorAll(`input[name="${nome}"]`) ?? [])].find(
    (opcao) => opcao.value === valor,
  );
  if (campo) campo.checked = true;
}

function valorRadio(nome) {
  return formAvatar?.querySelector(`input[name="${nome}"]:checked`)?.value ?? '';
}

function classeDaCorSelecionada(valor) {
  const campo = [...(formAvatar?.querySelectorAll('input[name="avatar_cor_fundo"]') ?? [])].find(
    (opcao) => opcao.value === valor,
  );
  return campo?.dataset.classe || 'avatar-fundo-padrao';
}

function aplicarFundoNoAvatar(valorCor) {
  const atual = document.getElementById('avatar-atual') ?? document.querySelector('[data-avatar-atual]');
  if (!atual) return;
  const classeNova = classeDaCorSelecionada(valorCor);
  [...atual.classList].forEach((classe) => {
    if (classe.startsWith('avatar-fundo-')) atual.classList.remove(classe);
  });
  atual.classList.add(classeNova);
  atual.dataset.avatarCor = valorCor || '';
}

function atualizarImagemDoAvatar(caminho) {
  const atual = document.getElementById('avatar-atual') ?? document.querySelector('[data-avatar-atual]');
  if (!atual) return;

  if (caminho) {
    let imagem = atual.querySelector('img');
    if (!imagem) {
      atual.replaceChildren();
      imagem = document.createElement('img');
      imagem.alt = '';
      imagem.width = 64;
      imagem.height = 64;
      imagem.className = 'h-14 w-14 object-contain';
      atual.append(imagem);
    }
    imagem.src = caminho;
    return;
  }

  atual.replaceChildren();
  const inicial = document.createElement('span');
  inicial.className = 'text-2xl font-bold text-tinta';
  inicial.setAttribute('aria-hidden', 'true');
  const titulo = document.querySelector('h1, h2');
  inicial.textContent = (titulo?.textContent || '?').trim().charAt(0).toUpperCase() || '?';
  atual.append(inicial);
}

function abrirDialogoAvatar() {
  if (!dialogoAvatar || typeof dialogoAvatar.showModal !== 'function') return;
  marcarRadio('avatar', avatarAnterior);
  marcarRadio('avatar_cor_fundo', corAnterior);
  esconderMensagem(avisoAvatarDialogo);
  dialogoAvatar.showModal();
}

function fecharDialogoAvatar() {
  if (dialogoAvatar?.open) dialogoAvatar.close();
}

botaoAbrirAvatar?.addEventListener('click', abrirDialogoAvatar);
botaoCancelarAvatar?.addEventListener('click', () => {
  marcarRadio('avatar', avatarAnterior);
  marcarRadio('avatar_cor_fundo', corAnterior);
  fecharDialogoAvatar();
});

dialogoAvatar?.addEventListener('cancel', () => {
  marcarRadio('avatar', avatarAnterior);
  marcarRadio('avatar_cor_fundo', corAnterior);
});

formAvatar?.addEventListener('submit', async (evento) => {
  if (!dialogoAvatar) return;
  evento.preventDefault();
  if (salvandoAvatar) return;

  const avatar = valorRadio('avatar');
  const corFundo = valorRadio('avatar_cor_fundo');
  if (!avatar) {
    mostrarMensagem(avisoAvatarDialogo, 'Escolha um Beenie.', true);
    return;
  }

  const grupo = formAvatar.querySelectorAll('fieldset, button');
  salvandoAvatar = true;
  grupo.forEach((el) => {
    el.disabled = true;
  });
  if (botaoSalvarAvatar) botaoSalvarAvatar.textContent = 'Salvando...';
  mostrarMensagem(avisoAvatarDialogo, 'Salvando sua imagem...');

  try {
    const perfil = await enviarAoPerfil(
      `/perfil/${formAvatar.dataset.perfilId}`,
      { avatar, avatar_cor_fundo: corFundo },
      'Não foi possível salvar sua imagem.',
    );

    const avatarEscolhido = formAvatar.querySelector('input[name="avatar"]:checked');
    atualizarImagemDoAvatar(perfil.avatar_imagem ?? avatarEscolhido?.dataset.imagem ?? '');
    const corSalva = perfil.avatar_cor_fundo ?? perfil.avatar_background ?? corFundo;
    aplicarFundoNoAvatar(corSalva);
    avatarAnterior = perfil.avatar ?? avatar;
    corAnterior = corSalva || '';

    esconderMensagem(avisoAvatarDialogo);
    mostrarMensagem(avisoAvatar, 'Imagem e cor atualizadas!');
    fecharDialogoAvatar();
  } catch (erro) {
    mostrarMensagem(avisoAvatarDialogo, erro.message, true);
  } finally {
    salvandoAvatar = false;
    grupo.forEach((el) => {
      el.disabled = false;
    });
    if (botaoSalvarAvatar) botaoSalvarAvatar.textContent = 'Salvar';
  }
});
