const etapas = [
  {
    id: 'apelido',
    pergunta: 'Como você quer ser chamado?',
    subtitulo: 'Seu apelido na colmeia.',
    tipo: 'texto',
    placeholder: 'Ex: beeverzinho',
    mascote: 'acolhendo',
  },
  {
    id: 'dias',
    pergunta: 'Em que dias você vai jogar?',
    subtitulo: 'A colmeia só cobra presença nos dias que você escolher.',
    tipo: 'multipla',
    opcoes: [
      { valor: '1', rotulo: 'Segunda' },
      { valor: '2', rotulo: 'Terça' },
      { valor: '3', rotulo: 'Quarta' },
      { valor: '4', rotulo: 'Quinta' },
      { valor: '5', rotulo: 'Sexta' },
      { valor: '6', rotulo: 'Sábado' },
      { valor: '0', rotulo: 'Domingo' },
    ],
    mascote: 'calendario',
  },
  {
    id: 'tempo',
    pergunta: 'Quanto tempo você quer jogar por vez?',
    subtitulo: 'Dá para mudar depois, no perfil.',
    tipo: 'radio',
    mascote: 'tempo',
  },
  {
    id: 'objetivo',
    pergunta: 'O que você quer conseguir?',
    subtitulo: 'Isso ajuda a escolher suas primeiras metas.',
    tipo: 'select',
    mascote: 'um_real',
    moeda: true,
  },
  {
    id: 'avatar',
    pergunta: 'Escolha seu Beenie e a cor de fundo',
    subtitulo: 'Veja a prévia e escolha como seu perfil vai aparecer.',
    tipo: 'avatar',
  },
  {
    id: 'preferencias',
    pergunta: 'Como você prefere jogar?',
    subtitulo: 'Marque o que quiser. Pode deixar tudo desmarcado.',
    tipo: 'multipla',
    // Nada marcado é resposta válida aqui: quer dizer sem som e com a animação
    // normal. Por isso este é o único passo que avança sem preencher nada.
    permiteVazio: true,
    mascote: 'musica',
  },
  {
    id: 'nivel',
    pergunta: 'Quanto você já sabe sobre dinheiro?',
    subtitulo: 'Seja sincero, não vamos julgar!',
    tipo: 'radio',
    opcoes: [
      { valor: 'beginner', rotulo: 'Recém chegado na colmeia (zero)' },
      { valor: 'intermediate', rotulo: 'Já sei voar um pouco (básico)' },
      { valor: 'advanced', rotulo: 'Mestre do mel (avançado)' },
    ],
    mascote: 'entrando',
    secundario: 'bebe',
  },
];

const CLASSES_DA_BARRA = 'h-full bg-mel transition-all duration-500 ease-out';
const CLASSE_CAMPO =
  'w-full rounded-lg border border-linha px-4 py-3 text-lg focus:border-mel focus:outline-[3px] focus:outline-ambar focus:outline-offset-2 focus:ring-2 focus:ring-tinta';
const CLASSE_OPCAO = 'flex cursor-pointer items-center gap-3 rounded-favo border-2 p-4 hover:border-ambar';

const corpo = document.body;
const perfilId = corpo.dataset.perfilId;
const csrfToken = corpo.dataset.csrfToken;
const moeda = corpo.dataset.moeda;

const mascotes = (() => {
  try {
    return JSON.parse(corpo.dataset.mascotes || '{}');
  } catch {
    return {};
  }
})();

const conteudo = document.getElementById('etapa-conteudo');
const formulario = document.getElementById('form-onboarding');
const botaoAvancar = document.getElementById('btn-avancar');
const botaoVoltar = document.getElementById('btn-voltar');
const barraProgresso = document.getElementById('progress-bar');
const textoProgresso = document.getElementById('progress-text');
const erroEl = document.getElementById('erro-onboarding');
const mascoteEl = document.getElementById('mascote-onboarding');
const mainEl = formulario?.closest('main');

function lerRascunho() {
  try {
    return JSON.parse(corpo.dataset.onboarding || '{}');
  } catch {
    return {};
  }
}

const rascunho = lerRascunho();
const catalogo = rascunho.catalogo ?? {};
const respostas = { ...(rascunho.respostas ?? {}) };

const avatarPadrao = catalogo.avatar?.[0]?.valor;
if (!respostas.avatar && avatarPadrao) respostas.avatar = avatarPadrao;
if (!respostas.avatar_cor_fundo) respostas.avatar_cor_fundo = catalogo.coresDeFundo?.[0]?.valor || 'creme';

const passosDoServidor = Array.isArray(rascunho.passos) ? rascunho.passos : [];

function indiceDaEtapa(passoDoServidor) {
  const passo = Number(passoDoServidor) || 0;
  const id = passosDoServidor[passo];
  const idx = etapas.findIndex((etapa) => etapa.id === id);
  return idx >= 0 ? idx : Math.min(passo, etapas.length - 1);
}

let etapaAtual = Math.min(Math.max(indiceDaEtapa(rascunho.passoAtual), 0), etapas.length - 1);

function opcoesDaEtapa(etapa) {
  return etapa.opcoes ?? catalogo[etapa.id] ?? [];
}

function elemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function opcaoMarcavel(tipo, opcao, marcada) {
  const rotulo = elemento('label', `${CLASSE_OPCAO} ${marcada ? 'border-mel bg-cera' : 'border-linha'}`);

  const campo = document.createElement('input');
  campo.type = tipo;
  campo.name = 'campo-etapa';
  campo.value = opcao.valor;
  campo.checked = marcada;
  campo.className = 'h-4 w-4';

  rotulo.append(campo);

  if (opcao.imagem) {
    const figura = document.createElement('img');
    figura.src = opcao.imagem;
    figura.alt = '';
    figura.className = 'h-10 w-10 object-contain';
    rotulo.append(figura);
  }

  rotulo.append(elemento('span', 'font-medium', opcao.rotulo));
  return rotulo;
}

function classeFundoAvatar(valor) {
  const cor = (catalogo.coresDeFundo || []).find((item) => item.valor === valor);
  return cor?.classe || 'avatar-fundo-creme';
}

function montarCampoAvatar() {
  const avatarAtual = respostas.avatar || catalogo.avatar?.[0]?.valor || '';
  const corAtual = respostas.avatar_cor_fundo || catalogo.coresDeFundo?.[0]?.valor || 'creme';

  const wrap = elemento('div', 'grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] sm:items-start');

  const previewCol = elemento('div', 'flex flex-col gap-1.5 rounded-favo bg-cera p-2');
  previewCol.append(elemento('p', 'text-[11px] font-semibold uppercase tracking-wide text-tinta-suave', 'Prévia'));
  const preview = elemento('span', `relative mx-auto flex aspect-square w-full max-w-[13rem] items-center justify-center overflow-hidden rounded-favo ring-2 ring-linha ${classeFundoAvatar(corAtual)}`);
  preview.id = 'avatar-onboarding-preview';
  const img = document.createElement('img');
  img.id = 'avatar-onboarding-img';
  img.alt = 'Prévia do Beenie';
  img.width = 208;
  img.height = 208;
  img.className = 'relative z-10 h-full w-full object-contain';
  const avatarSelecionado = (catalogo.avatar || []).find((a) => a.valor === avatarAtual);
  if (avatarSelecionado?.imagem) img.src = avatarSelecionado.imagem;
  else img.classList.add('hidden');
  preview.append(img);
  previewCol.append(preview);

  const opcoesCol = elemento('div', 'sm:py-1');

  const fsAvatar = document.createElement('fieldset');
  fsAvatar.append(elemento('legend', 'text-sm font-semibold text-tinta', 'Beenie'));
  const gridAvatar = elemento('div', 'mt-1.5 grid grid-cols-2 gap-1.5');
  for (const opcao of catalogo.avatar || []) {
    const label = elemento('label', 'cursor-pointer');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'avatar_onboarding';
    input.value = opcao.valor;
    input.dataset.imagem = opcao.imagem || '';
    input.className = 'peer sr-only';
    input.checked = opcao.valor === avatarAtual;
    label.append(input);
    const span = elemento('span', 'flex min-h-9 items-center justify-center rounded-favo border-2 border-linha bg-cera px-2 py-1 text-center transition hover:border-ambar peer-checked:border-mel peer-checked:bg-mel/20 peer-focus-visible:outline-[3px] peer-focus-visible:outline-ambar peer-focus-visible:outline-offset-2');
    span.append(elemento('span', 'text-xs font-semibold leading-tight text-tinta', opcao.rotulo));
    label.append(span);
    gridAvatar.append(label);
  }
  fsAvatar.append(gridAvatar);

  const fsCor = document.createElement('fieldset');
  fsCor.className = 'mt-3';
  fsCor.append(elemento('legend', 'text-sm font-semibold text-tinta', 'Cor de fundo'));
  const gridCor = elemento('div', 'mt-1.5 grid grid-cols-6 gap-1.5');
  for (const cor of catalogo.coresDeFundo || []) {
    const label = elemento('label', 'cursor-pointer');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'avatar_cor_fundo_onboarding';
    input.value = cor.valor;
    input.dataset.classe = cor.classe || '';
    input.setAttribute('aria-label', cor.rotulo);
    input.className = 'peer sr-only';
    input.checked = cor.valor === corAtual;
    label.append(input);
    const outer = elemento('span', 'flex items-center justify-center rounded-favo border-2 border-linha bg-white p-1 transition hover:border-ambar peer-checked:border-mel peer-focus-visible:outline-[3px] peer-focus-visible:outline-ambar peer-focus-visible:outline-offset-2');
    const swatch = elemento('span', `h-7 w-7 rounded-pilula border-2 border-tinta/15 ring-1 ring-linha ${cor.classe || ''}`);
    swatch.setAttribute('aria-hidden', 'true');
    outer.append(swatch);
    label.append(outer);
    gridCor.append(label);
  }
  fsCor.append(gridCor);

  opcoesCol.append(fsAvatar, fsCor);
  wrap.append(previewCol, opcoesCol);
  return wrap;
}

function montarCampo(etapa, valorAtual) {
  if (etapa.tipo === 'avatar') return montarCampoAvatar();
  if (etapa.tipo === 'texto') {
    const campo = document.createElement('input');
    campo.type = 'text';
    campo.id = 'campo-etapa';
    campo.required = true;
    campo.maxLength = 100;
    campo.className = CLASSE_CAMPO;
    campo.placeholder = etapa.placeholder;
    campo.value = typeof valorAtual === 'string' ? valorAtual : '';
    return campo;
  }

  const opcoes = opcoesDaEtapa(etapa);

  if (etapa.tipo === 'select') {
    const campo = document.createElement('select');
    campo.id = 'campo-etapa';
    campo.required = true;
    campo.className = CLASSE_CAMPO;

    const vazia = elemento('option', null, 'Selecione uma opção...');
    vazia.value = '';
    vazia.disabled = true;
    vazia.selected = !valorAtual;
    campo.append(vazia);

    for (const opcao of opcoes) {
      const item = elemento('option', null, opcao.rotulo);
      item.value = opcao.valor;
      item.selected = valorAtual === opcao.valor;
      campo.append(item);
    }
    return campo;
  }

  const multipla = etapa.tipo === 'multipla';
  const marcados = multipla ? [].concat(valorAtual ?? []).map(String) : [];
  const caixa = elemento('div', multipla ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3');

  for (const opcao of opcoes) {
    const marcada = multipla ? marcados.includes(opcao.valor) : valorAtual === opcao.valor;
    caixa.append(opcaoMarcavel(multipla ? 'checkbox' : 'radio', opcao, marcada));
  }
  return caixa;
}

function rotuloDoBotao() {
  return etapaAtual === etapas.length - 1 ? 'Finalizar' : 'Continuar';
}

function aplicarProgresso(percentual) {
  const limitado = Math.min(100, Math.max(0, Math.round(percentual)));
  barraProgresso.className = `barra-${Math.round(limitado / 5) * 5} ${CLASSES_DA_BARRA}`;
  barraProgresso.setAttribute('aria-valuenow', String(limitado));
  textoProgresso.textContent = `${limitado}%`;
}

function montarMascote(etapa) {
  const arte = mascotes[etapa.mascote];
  if (!arte) {
    mascoteEl.hidden = true;
    mascoteEl.replaceChildren();
    return;
  }

  mascoteEl.hidden = false;

  // Cada etapa tem uma posição própria no CSS. A classe fica no casco fixo do
  // formulário, não no passo: assim o desenho continua ancorado no rodapé do
  // cartão, como no onboarding antigo, mesmo quando o conteúdo muda de altura.
  mascoteEl.className = `onboarding-mascote onboarding-mascote--${etapa.id}`;

  const imagem = document.createElement('img');
  imagem.src = arte;
  imagem.alt = '';
  imagem.className = 'onboarding-mascote__imagem mascote-stroke beenie-chega';

  const filhos = [imagem];

  if (etapa.moeda && moeda) {
    const moedaEl = document.createElement('img');
    moedaEl.src = moeda;
    moedaEl.alt = '';
    moedaEl.className = 'onboarding-mascote__moeda';
    filhos.push(moedaEl);
  }

  const secundario = mascotes[etapa.secundario];
  if (secundario) {
    const bebe = document.createElement('img');
    bebe.src = secundario;
    bebe.alt = '';
    bebe.className = 'onboarding-mascote__bebe mascote-stroke beenie-chega';
    filhos.push(bebe);
  }

  mascoteEl.replaceChildren(...filhos);
}

function atualizarPreviewAvatarOnboarding() {
  const preview = document.getElementById('avatar-onboarding-preview');
  const img = document.getElementById('avatar-onboarding-img');
  if (!preview || !img) return;
  const avatar = conteudo.querySelector('input[name="avatar_onboarding"]:checked')?.value;
  const cor = conteudo.querySelector('input[name="avatar_cor_fundo_onboarding"]:checked')?.value || 'creme';
  const opcao = (catalogo.avatar || []).find((a) => a.valor === avatar);
  preview.className = `relative mx-auto flex aspect-square w-full max-w-[13rem] items-center justify-center overflow-hidden rounded-favo ring-2 ring-linha ${classeFundoAvatar(cor)}`;
  if (opcao?.imagem) {
    img.src = opcao.imagem;
    img.classList.remove('hidden');
  } else {
    img.removeAttribute('src');
    img.classList.add('hidden');
  }
}

function renderizarEtapa() {
  const etapa = etapas[etapaAtual];
  botaoVoltar.classList.toggle('hidden', etapaAtual === 0);
  botaoAvancar.textContent = rotuloDoBotao();
  aplicarProgresso((etapaAtual / etapas.length) * 100);

  const ehAvatar = etapa.tipo === 'avatar';
  mainEl?.classList.toggle('max-w-md', !ehAvatar);
  mainEl?.classList.toggle('max-w-3xl', ehAvatar);
  formulario?.classList.toggle('p-8', !ehAvatar);
  formulario?.classList.toggle('p-4', ehAvatar);
  formulario?.classList.toggle('sm:p-5', ehAvatar);
  formulario?.classList.toggle('mt-8', !ehAvatar);
  formulario?.classList.toggle('mt-4', ehAvatar);
  const linhaBotoes = formulario?.querySelector('[data-onboarding-acoes]');
  linhaBotoes?.classList.toggle('mt-8', !ehAvatar);
  linhaBotoes?.classList.toggle('mt-4', ehAvatar);
  const progresso = document.querySelector('[data-onboarding-progresso]');
  progresso?.classList.toggle('mb-8', !ehAvatar);
  progresso?.classList.toggle('mb-4', ehAvatar);

  if (ehAvatar) {
    mascoteEl.hidden = true;
    mascoteEl.replaceChildren();
  } else {
    montarMascote(etapa);
  }

  const passo = elemento('div', 'onboarding-etapa');
  passo.append(
    elemento('h2', ehAvatar ? 'text-xl font-bold' : 'text-2xl font-bold', etapa.pergunta),
    elemento('p', `mt-1 ${ehAvatar ? 'mb-3 text-sm' : 'mb-6'} text-tinta-suave`, etapa.subtitulo),
  );

  const campoContainer = elemento('div');
  campoContainer.id = 'campo-container';
  passo.append(campoContainer);

  conteudo.replaceChildren(passo);
  campoContainer.append(montarCampo(etapa, respostas[etapa.id]));
  if (ehAvatar) atualizarPreviewAvatarOnboarding();
}

function lerValorEtapa() {
  const etapa = etapas[etapaAtual];
  if (etapa.tipo === 'avatar') {
    const avatar = conteudo.querySelector('input[name="avatar_onboarding"]:checked')?.value ?? '';
    const avatar_cor_fundo =
      conteudo.querySelector('input[name="avatar_cor_fundo_onboarding"]:checked')?.value ?? 'creme';
    return { avatar, avatar_cor_fundo };
  }
  if (etapa.tipo === 'multipla') {
    return [...conteudo.querySelectorAll('input[name="campo-etapa"]:checked')].map((campo) => campo.value);
  }
  if (etapa.tipo === 'radio') {
    return conteudo.querySelector('input[name="campo-etapa"]:checked')?.value ?? '';
  }
  return document.getElementById('campo-etapa').value.trim();
}

function mostrarErro(mensagem) {
  erroEl.textContent = mensagem;
  erroEl.classList.remove('hidden');
}

function esconderErro() {
  erroEl.classList.add('hidden');
}

function ocupado(estado) {
  botaoAvancar.disabled = estado;
  botaoAvancar.textContent = estado ? 'Salvando...' : rotuloDoBotao();
}

async function enviar(caminho, dados) {
  const resposta = await fetch(caminho, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-csrf-token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify(dados),
  });

  const corpoDaResposta = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(corpoDaResposta.erro || 'Não foi possível salvar suas respostas.');
  }
  return corpoDaResposta;
}

async function finalizar() {
  await enviar(`/perfil/${perfilId}/onboarding`, respostas);
  aplicarProgresso(100);
  window.location.href = '/painel';
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  esconderErro();

  const etapa = etapas[etapaAtual];
  const valor = lerValorEtapa();
  const respondeu =
    etapa.tipo === 'avatar'
      ? Boolean(valor?.avatar)
      : Array.isArray(valor)
        ? valor.length > 0
        : Boolean(valor);
  if (!respondeu && !etapa.permiteVazio) {
    mostrarErro('Responda para continuar.');
    return;
  }

  if (etapa.id === 'avatar' && valor && typeof valor === 'object') {
    respostas.avatar = valor.avatar;
    respostas.avatar_cor_fundo = valor.avatar_cor_fundo;
  } else {
    respostas[etapa.id] = valor;
  }
  ocupado(true);

  try {
    if (etapaAtual === etapas.length - 1) {
      await finalizar();
      return;
    }

    const atualizado = await enviar(`/perfil/${perfilId}/onboarding/passo`, {
      passo: etapa.id,
      resposta: valor,
    });

    const proximaEtapa = Number.isFinite(Number(atualizado.passoAtual))
      ? indiceDaEtapa(atualizado.passoAtual)
      : etapaAtual + 1;
    etapaAtual = Math.min(proximaEtapa, etapas.length - 1);
    renderizarEtapa();
  } catch (erro) {
    mostrarErro(erro.message);
  } finally {
    ocupado(false);
  }
});

botaoVoltar.addEventListener('click', () => {
  if (etapaAtual > 0) {
    etapaAtual -= 1;
    esconderErro();
    renderizarEtapa();
  }
});

formulario.addEventListener('change', (evento) => {
  if (
    evento.target?.name === 'avatar_onboarding' ||
    evento.target?.name === 'avatar_cor_fundo_onboarding'
  ) {
    atualizarPreviewAvatarOnboarding();
  }
});

renderizarEtapa();
