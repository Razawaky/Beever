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
let cosmeticoAnterior =
  formAvatar?.querySelector('input[name="cosmetico_equipado_item_id"]:checked')?.value ??
  document.getElementById('avatar-atual')?.dataset.avatarCosmeticoId ??
  '';
let cosmeticoFundoAnterior =
  formAvatar?.querySelector('input[name="cosmetico_fundo_equipado_item_id"]:checked')?.value ??
  document.getElementById('avatar-atual')?.dataset.avatarCosmeticoFundoId ??
  '';
let cosmeticoPerfilAnterior =
  formAvatar?.querySelector('input[name="cosmetico_perfil_equipado_item_id"]:checked')?.value ??
  document.getElementById('avatar-atual')?.dataset.avatarCosmeticoPerfilId ??
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

function aplicarCosmeticoNoAvatar({ imagem = '', itemId = '', camada = 'frente', fundoImagem = '', fundoItemId = '' } = {}) {
  const atual = document.getElementById('avatar-atual') ?? document.querySelector('[data-avatar-atual]');
  if (!atual) return;
  atual.dataset.avatarCosmeticoId = itemId || '';
  atual.dataset.avatarCosmeticoImagem = imagem || '';
  atual.dataset.avatarCosmeticoCamada = camada || 'frente';
  atual.dataset.avatarCosmeticoFundoId = fundoItemId || '';
  atual.dataset.avatarCosmeticoFundoImagem = fundoImagem || '';

  const fundo = document.getElementById('avatar-atual-cosmetico-fundo');
  if (fundo) {
    if (fundoImagem) { fundo.src = fundoImagem; fundo.classList.remove('hidden'); }
    else fundo.classList.add('hidden');
  }

  const atras = document.getElementById('avatar-atual-cosmetico-atras');
  const frente = document.getElementById('avatar-atual-cosmetico-frente');
  const mostrarAtras = Boolean(imagem) && camada === 'atras';
  const mostrarFrente = Boolean(imagem) && camada !== 'atras';
  if (atras) {
    if (mostrarAtras) { atras.src = imagem; atras.classList.remove('hidden'); }
    else atras.classList.add('hidden');
  }
  if (frente) {
    if (mostrarFrente) { frente.src = imagem; frente.classList.remove('hidden'); }
    else frente.classList.add('hidden');
  }
}

function atualizarCosmeticoPreview() {
  const preview = document.getElementById('avatar-preview-modal');
  if (!preview) return;

  const cosmeticoSelecionado = formAvatar?.querySelector('input[name="cosmetico_equipado_item_id"]:checked');
  const imagemCosmetico = cosmeticoSelecionado?.dataset.imagem ?? '';
  const camada = cosmeticoSelecionado?.dataset.camada || 'frente';
  const fundoSelecionado = formAvatar?.querySelector('input[name="cosmetico_fundo_equipado_item_id"]:checked');
  const imagemFundo = fundoSelecionado?.dataset.imagem ?? '';

  const fundo = document.getElementById('avatar-preview-modal-cosmetico-fundo');
  if (fundo) {
    if (imagemFundo) { fundo.src = imagemFundo; fundo.classList.remove('hidden'); }
    else fundo.classList.add('hidden');
  }

  const atras = document.getElementById('avatar-preview-modal-cosmetico-atras');
  const frente = document.getElementById('avatar-preview-modal-cosmetico-frente');
  const mostrarAtras = Boolean(imagemCosmetico) && camada === 'atras';
  const mostrarFrente = Boolean(imagemCosmetico) && camada !== 'atras';
  if (atras) {
    if (mostrarAtras) { atras.src = imagemCosmetico; atras.classList.remove('hidden'); }
    else atras.classList.add('hidden');
  }
  if (frente) {
    if (mostrarFrente) { frente.src = imagemCosmetico; frente.classList.remove('hidden'); }
    else frente.classList.add('hidden');
  }
}

function atualizarPreviewModal() {
  const preview = document.getElementById('avatar-preview-modal');
  if (!preview) return;

  const cor = valorRadio('avatar_cor_fundo');
  const classeNova = classeDaCorSelecionada(cor);
  [...preview.classList].forEach((classe) => {
    if (classe.startsWith('avatar-fundo-')) preview.classList.remove(classe);
  });
  preview.classList.add(classeNova);

  const avatarSelecionado = formAvatar?.querySelector('input[name="avatar"]:checked');
  const perfilSelecionado = formAvatar?.querySelector('input[name="cosmetico_perfil_equipado_item_id"]:checked');
  const caminhoPerfil = perfilSelecionado?.dataset.imagem ?? '';
  const fallbackAvatar = document.getElementById('avatar-fallback')?.value || '';
  const radioFallback = fallbackAvatar
    ? formAvatar?.querySelector(`input[name="avatar"][value="${CSS.escape(fallbackAvatar)}"]`)
    : null;
  const caminho = caminhoPerfil || (avatarSelecionado?.dataset.imagem ?? radioFallback?.dataset.imagem ?? '');
  let imagem = document.getElementById('avatar-preview-modal-img');
  let fallback = document.getElementById('avatar-preview-modal-fallback');

  if (caminho) {
    if (!imagem) {
      imagem = document.createElement('img');
      imagem.id = 'avatar-preview-modal-img';
      imagem.alt = 'Prévia do Beenie';
      imagem.width = 320;
      imagem.height = 320;
      imagem.className = 'relative z-10 h-full w-full object-contain';
      const frente = document.getElementById('avatar-preview-modal-cosmetico-frente');
      if (frente) preview.insertBefore(imagem, frente);
      else preview.append(imagem);
    }
    imagem.src = caminho;
    imagem.classList.remove('hidden');
    if (fallback) fallback.classList.add('hidden');
  } else {
    if (imagem) imagem.classList.add('hidden');
    if (!fallback) {
      fallback = document.createElement('span');
      fallback.id = 'avatar-preview-modal-fallback';
      fallback.className = 'relative z-10 text-6xl font-bold text-tinta';
      fallback.setAttribute('aria-hidden', 'true');
      const titulo = document.querySelector('h1, h2');
      fallback.textContent = (titulo?.textContent || '?').trim().charAt(0).toUpperCase() || '?';
      const frente = document.getElementById('avatar-preview-modal-cosmetico-frente');
      if (frente) preview.insertBefore(fallback, frente);
      else preview.append(fallback);
    }
    fallback.classList.remove('hidden');
  }

  atualizarCosmeticoPreview();
}

function atualizarImagemDoAvatar(caminho) {
  const atual = document.getElementById('avatar-atual') ?? document.querySelector('[data-avatar-atual]');
  if (!atual) return;

  let imagem = document.getElementById('avatar-atual-img');
  let fallback = document.getElementById('avatar-atual-fallback');

  if (caminho) {
    if (!imagem) {
      imagem = document.createElement('img');
      imagem.id = 'avatar-atual-img';
      imagem.alt = '';
      imagem.width = 64;
      imagem.height = 64;
      imagem.className = 'relative z-10 h-full w-full object-contain';
      const frente = document.getElementById('avatar-atual-cosmetico-frente');
      if (frente) atual.insertBefore(imagem, frente);
      else atual.append(imagem);
    }
    imagem.src = caminho;
    imagem.classList.remove('hidden');
    if (fallback) fallback.classList.add('hidden');
    return;
  }

  if (imagem) imagem.classList.add('hidden');
  if (!fallback) {
    fallback = document.createElement('span');
    fallback.id = 'avatar-atual-fallback';
    fallback.className = 'relative z-10 text-2xl font-bold text-tinta';
    fallback.setAttribute('aria-hidden', 'true');
    const titulo = document.querySelector('h1, h2');
    fallback.textContent = (titulo?.textContent || '?').trim().charAt(0).toUpperCase() || '?';
    const frente = document.getElementById('avatar-atual-cosmetico-frente');
    if (frente) atual.insertBefore(fallback, frente);
    else atual.append(fallback);
  }
  fallback.classList.remove('hidden');
}

function selecionarAbaAvatar(aba) {
  const botoes = formAvatar?.querySelectorAll('[data-aba-avatar]') ?? [];
  const paineis = formAvatar?.querySelectorAll('[data-painel-avatar]') ?? [];
  botoes.forEach((botao) => {
    const ativa = botao.dataset.abaAvatar === aba;
    botao.setAttribute('aria-selected', ativa ? 'true' : 'false');
    botao.classList.toggle('border-mel', ativa);
    botao.classList.toggle('bg-mel/20', ativa);
    botao.classList.toggle('border-linha', !ativa);
    botao.classList.toggle('bg-white', !ativa);
  });
  paineis.forEach((painel) => {
    painel.classList.toggle('hidden', painel.dataset.painelAvatar !== aba);
  });
}

function restaurarSelecaoAvatar() {
  const fallback = document.getElementById('avatar-fallback');
  if (fallback) fallback.value = avatarAnterior || fallback.value || '';
  marcarRadio('avatar_cor_fundo', corAnterior);
  marcarRadio('cosmetico_equipado_item_id', cosmeticoAnterior);
  marcarRadio('cosmetico_fundo_equipado_item_id', cosmeticoFundoAnterior);

  if (cosmeticoPerfilAnterior) {
    limparRadios('avatar');
    marcarRadio('cosmetico_perfil_equipado_item_id', cosmeticoPerfilAnterior);
  } else {
    limparRadios('cosmetico_perfil_equipado_item_id');
    marcarRadio('avatar', avatarAnterior);
  }
  atualizarPreviewModal();
}

function abrirDialogoAvatar() {
  if (!dialogoAvatar || typeof dialogoAvatar.showModal !== 'function') return;
  restaurarSelecaoAvatar();
  selecionarAbaAvatar('beenie');
  esconderMensagem(avisoAvatarDialogo);
  dialogoAvatar.showModal();
}

function fecharDialogoAvatar() {
  if (dialogoAvatar?.open) dialogoAvatar.close();
}

botaoAbrirAvatar?.addEventListener('click', abrirDialogoAvatar);
botaoCancelarAvatar?.addEventListener('click', () => {
  restaurarSelecaoAvatar();
  fecharDialogoAvatar();
});

dialogoAvatar?.addEventListener('cancel', () => {
  restaurarSelecaoAvatar();
});

const chaveCosmeticosPerfilVistos = (formAvatar?.dataset.perfilId || perfilId)
  ? `beever:perfil:${formAvatar?.dataset.perfilId || perfilId}:cosmeticos-perfil-vistos`
  : null;

function lerCosmeticosPerfilVistos() {
  if (!chaveCosmeticosPerfilVistos) return new Set();
  try {
    const ids = JSON.parse(localStorage.getItem(chaveCosmeticosPerfilVistos) || '[]');
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  } catch {
    return new Set();
  }
}

function marcarCosmeticoPerfilVisto(itemId) {
  if (!chaveCosmeticosPerfilVistos || !itemId) return;
  const vistos = lerCosmeticosPerfilVistos();
  vistos.add(String(itemId));
  try {
    localStorage.setItem(chaveCosmeticosPerfilVistos, JSON.stringify([...vistos]));
  } catch {
    // Sem armazenamento disponível: a bolinha some só nesta tela.
  }
}

function aplicarCosmeticosPerfilVistos() {
  const vistos = lerCosmeticosPerfilVistos();
  formAvatar?.querySelectorAll('input[name="cosmetico_perfil_equipado_item_id"]').forEach((radio) => {
    if (!vistos.has(String(radio.value))) return;
    radio.closest('label')?.querySelectorAll('[data-novo-bolinha]').forEach((el) => {
      el.classList.add('hidden');
    });
  });
}

aplicarCosmeticosPerfilVistos();

formAvatar?.addEventListener('click', (evento) => {
  const aba = evento.target.closest('[data-aba-avatar]')?.dataset.abaAvatar;
  if (aba) selecionarAbaAvatar(aba);
});

function limparRadios(nome) {
  formAvatar?.querySelectorAll(`input[name="${nome}"]`).forEach((radio) => {
    radio.checked = false;
  });
}

formAvatar?.addEventListener('change', (evento) => {
  const nome = evento.target?.name;
  if (nome === 'avatar') {
    limparRadios('cosmetico_perfil_equipado_item_id');
    const fallback = document.getElementById('avatar-fallback');
    if (fallback) fallback.value = evento.target.value;
  }
  if (nome === 'cosmetico_perfil_equipado_item_id') {
    formAvatar?.querySelectorAll('input[name="avatar"]').forEach((radio) => {
      radio.checked = false;
    });
    if (evento.target.value) {
      marcarCosmeticoPerfilVisto(evento.target.value);
      evento.target.closest('label')?.querySelectorAll('[data-novo-bolinha]').forEach((el) => {
        el.classList.add('hidden');
      });
    }
  }
  if (
    nome === 'avatar' ||
    nome === 'avatar_cor_fundo' ||
    nome === 'cosmetico_equipado_item_id' ||
    nome === 'cosmetico_fundo_equipado_item_id' ||
    nome === 'cosmetico_perfil_equipado_item_id'
  ) {
    atualizarPreviewModal();
  }
});

formAvatar?.addEventListener('submit', async (evento) => {
  if (!dialogoAvatar) return;
  evento.preventDefault();
  if (salvandoAvatar) return;

  const avatarFallback = document.getElementById('avatar-fallback')?.value || avatarAnterior;
  const avatar = valorRadio('avatar') || avatarFallback;
  const corFundo = valorRadio('avatar_cor_fundo');
  const cosmeticoEquipadoItemId = valorRadio('cosmetico_equipado_item_id');
  const cosmeticoFundoEquipadoItemId = valorRadio('cosmetico_fundo_equipado_item_id');
  const cosmeticoPerfilEquipadoItemId = valorRadio('cosmetico_perfil_equipado_item_id');
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
      {
        avatar,
        avatar_cor_fundo: corFundo,
        cosmetico_equipado_item_id: cosmeticoEquipadoItemId || null,
        cosmetico_fundo_equipado_item_id: cosmeticoFundoEquipadoItemId || null,
        cosmetico_perfil_equipado_item_id: cosmeticoPerfilEquipadoItemId || null,
      },
      'Não foi possível salvar sua imagem.',
    );

    const avatarEscolhido = formAvatar.querySelector('input[name="avatar"]:checked');
    const perfilSelecionado = formAvatar.querySelector('input[name="cosmetico_perfil_equipado_item_id"]:checked');
    const imagemPerfil = perfil.avatar_cosmetico_perfil_imagem ?? perfilSelecionado?.dataset.imagem ?? '';
    atualizarImagemDoAvatar(imagemPerfil || perfil.avatar_imagem || (avatarEscolhido?.dataset.imagem ?? ''));
    const corSalva = perfil.avatar_cor_fundo ?? perfil.avatar_background ?? corFundo;
    aplicarFundoNoAvatar(corSalva);

    const cosmeticoSelecionado = formAvatar.querySelector('input[name="cosmetico_equipado_item_id"]:checked');
    const cosmeticoFundoSelecionado = formAvatar.querySelector('input[name="cosmetico_fundo_equipado_item_id"]:checked');
    const cosmeticoImagemSalva = perfil.avatar_cosmetico_imagem ?? cosmeticoSelecionado?.dataset.imagem ?? '';
    const cosmeticoIdSalvo = perfil.avatar_cosmetico_item_id ?? (cosmeticoEquipadoItemId || '');
    const cosmeticoCamadaSalva = perfil.avatar_cosmetico_camada ?? cosmeticoSelecionado?.dataset.camada ?? 'frente';
    const cosmeticoFundoImagemSalva = perfil.avatar_cosmetico_fundo_imagem ?? cosmeticoFundoSelecionado?.dataset.imagem ?? '';
    const cosmeticoFundoIdSalvo = perfil.avatar_cosmetico_fundo_item_id ?? (cosmeticoFundoEquipadoItemId || '');
    aplicarCosmeticoNoAvatar({
      imagem: cosmeticoImagemSalva,
      itemId: cosmeticoIdSalvo,
      camada: cosmeticoCamadaSalva,
      fundoImagem: cosmeticoFundoImagemSalva,
      fundoItemId: cosmeticoFundoIdSalvo,
    });

    avatarAnterior = perfil.avatar ?? avatar;
    const fallback = document.getElementById('avatar-fallback');
    if (fallback) fallback.value = avatarAnterior;
    corAnterior = corSalva || '';
    cosmeticoAnterior = cosmeticoIdSalvo ? String(cosmeticoIdSalvo) : '';
    cosmeticoFundoAnterior = cosmeticoFundoIdSalvo ? String(cosmeticoFundoIdSalvo) : '';
    const cosmeticoPerfilIdSalvo = perfil.avatar_cosmetico_perfil_item_id ?? (cosmeticoPerfilEquipadoItemId || '');
    cosmeticoPerfilAnterior = cosmeticoPerfilIdSalvo ? String(cosmeticoPerfilIdSalvo) : '';

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
