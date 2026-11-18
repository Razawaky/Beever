// Edição do perfil: disponibilidade semanal (RF-ONB-09) e imagem do mascote.
// JS puro na página. O corpo vai em JSON, então o token de CSRF viaja no
// cabeçalho, e nada recarrega: quem trocou uma coisa quer ver a outra parada.
const formulario = document.getElementById('form-disponibilidade');
const aviso = document.getElementById('aviso-disponibilidade');
const botao = document.getElementById('btn-salvar-dias');
const perfilId = formulario?.dataset.perfilId;
const csrfToken = document.body.dataset.csrfToken;

const formAvatar = document.getElementById('form-avatar');
const avisoAvatar = document.getElementById('aviso-avatar');
let avatarAnterior = formAvatar?.querySelector('input[name="avatar"]:checked')?.value ?? '';
let salvandoAvatar = false;

function mostrarMensagem(elemento, mensagem, erro = false) {
  if (!elemento) return;
  elemento.textContent = mensagem;
  elemento.classList.remove('hidden');
  elemento.classList.toggle('text-perigo', erro);
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

/** Troca a imagem do cabeçalho, inclusive quando hoje é só a letra do apelido. */
function atualizarImagem(caminho) {
  const atual = document.getElementById('avatar-atual') ?? document.querySelector('[data-avatar-atual]');
  if (!atual || !caminho) return;

  const imagem = document.createElement('img');
  imagem.id = 'avatar-atual';
  imagem.dataset.avatarAtual = '';
  imagem.src = caminho;
  imagem.alt = '';
  imagem.width = 64;
  imagem.height = 64;
  imagem.className = 'h-16 w-16 object-contain';
  atual.replaceWith(imagem);
}

function marcarAvatar(valor) {
  const campo = [...(formAvatar?.querySelectorAll('input[name="avatar"]') ?? [])].find(
    (opcao) => opcao.value === valor,
  );
  if (campo) campo.checked = true;
}

// A escolha salva sozinha: um toque na abelha já troca a imagem, sem um segundo
// botão primário competindo com "Salvar meus dias" na mesma tela.
formAvatar?.addEventListener('change', async (evento) => {
  if (evento.target.name !== 'avatar' || salvandoAvatar) return;

  const escolhido = evento.target;
  const proximo = escolhido.value;
  if (proximo === avatarAnterior) return;

  const grupo = formAvatar.querySelector('fieldset');
  salvandoAvatar = true;
  if (grupo) grupo.disabled = true;
  mostrarMensagem(avisoAvatar, 'Salvando sua imagem...');

  try {
    const perfil = await enviarAoPerfil(
      `/perfil/${formAvatar.dataset.perfilId}`,
      { avatar: proximo },
      'Não foi possível salvar sua imagem.',
    );
    atualizarImagem(perfil.avatar_imagem ?? escolhido.dataset.imagem);
    avatarAnterior = proximo;
    mostrarMensagem(avisoAvatar, 'Imagem atualizada!');
  } catch (erro) {
    marcarAvatar(avatarAnterior);
    mostrarMensagem(avisoAvatar, erro.message, true);
  } finally {
    salvandoAvatar = false;
    if (grupo) grupo.disabled = false;
  }
});
