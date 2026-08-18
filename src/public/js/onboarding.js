// Wizard de onboarding. Interatividade em JS puro na página, como o resto dos
// jogos — sem framework, sem localStorage: o estado da resposta some se a
// aba fechar antes de terminar, e tudo bem, é só um formulário de 3 passos.
// As opções não são inventadas aqui: `objetivo`, `avatar` e `nivel` viajam
// como slug e o servidor os resolve contra `initial_goals`, `avatars` e a curva
// de `levels`. Slug que não existe no banco é recusado lá, não escondido aqui.
const etapas = [
  {
    id: 'apelido',
    pergunta: 'Como você quer ser chamado?',
    subtitulo: 'Seu apelido na colmeia.',
    tipo: 'texto',
    placeholder: 'Ex: beeverzinho',
  },
  {
    id: 'avatar',
    pergunta: 'Escolha sua abelha',
    subtitulo: 'Dá para trocar depois, no perfil.',
    tipo: 'radio',
    opcoes: [
      { valor: 'beenie-classico', rotulo: 'Beenie clássico' },
      { valor: 'beenie-explorador', rotulo: 'Beenie explorador' },
      { valor: 'beenie-dourado', rotulo: 'Beenie dourado' },
      { valor: 'babybee', rotulo: 'Abelhinha' },
    ],
  },
  {
    id: 'objetivo',
    pergunta: 'O que você quer conseguir?',
    subtitulo: 'Isso ajuda a escolher suas primeiras metas.',
    tipo: 'select',
    opcoes: [
      { valor: 'comprar-algo', rotulo: 'Quero comprar algo' },
      { valor: 'aprender-a-guardar', rotulo: 'Quero aprender a guardar' },
      { valor: 'entender-juros', rotulo: 'Quero entender juros' },
    ],
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
  },
];

const respostas = {};
let etapaAtual = 0;

const conteudo = document.getElementById('etapa-conteudo');
const botaoAvancar = document.getElementById('btn-avancar');
const botaoVoltar = document.getElementById('btn-voltar');
const barraProgresso = document.getElementById('progress-bar');
const textoProgresso = document.getElementById('progress-text');
const erroEl = document.getElementById('erro-onboarding');

function renderizarEtapa() {
  const etapa = etapas[etapaAtual];
  botaoVoltar.classList.toggle('hidden', etapaAtual === 0);
  botaoAvancar.textContent = etapaAtual === etapas.length - 1 ? 'Finalizar' : 'Continuar';

  const progresso = Math.round((etapaAtual / etapas.length) * 100);
  barraProgresso.style.width = `${progresso}%`;
  textoProgresso.textContent = `${progresso}%`;

  const valorAtual = respostas[etapa.id] ?? '';
  let html = `<h2 class="text-2xl font-bold">${etapa.pergunta}</h2>
    <p class="mt-1 mb-6 text-tinta-suave">${etapa.subtitulo}</p>`;

  if (etapa.tipo === 'texto') {
    html += `<input type="text" id="campo-etapa" required maxlength="100" value="${valorAtual}"
      placeholder="${etapa.placeholder}"
      class="w-full rounded-lg border border-linha px-4 py-3 text-lg focus:border-mel focus:outline-[3px] focus:outline-ambar focus:outline-offset-2 focus:ring-2 focus:ring-tinta" />`;
  } else if (etapa.tipo === 'select') {
    html += `<select id="campo-etapa" required
      class="w-full rounded-lg border border-linha px-4 py-3 text-lg focus:border-mel focus:outline-[3px] focus:outline-ambar focus:outline-offset-2 focus:ring-2 focus:ring-tinta">
      <option value="" disabled ${valorAtual ? '' : 'selected'}>Selecione uma opção...</option>
      ${etapa.opcoes.map((o) => `<option value="${o.valor}" ${valorAtual === o.valor ? 'selected' : ''}>${o.rotulo}</option>`).join('')}
    </select>`;
  } else if (etapa.tipo === 'multipla') {
    const marcados = Array.isArray(valorAtual) ? valorAtual : [];
    html += `<div class="grid gap-3 sm:grid-cols-2">
      ${etapa.opcoes
        .map(
          (o) => `<label class="flex cursor-pointer items-center gap-3 rounded-favo border-2 p-4 ${
            marcados.includes(o.valor) ? 'border-mel bg-cera' : 'border-linha'
          } hover:border-ambar">
        <input type="checkbox" name="campo-etapa" value="${o.valor}" ${marcados.includes(o.valor) ? 'checked' : ''} class="h-4 w-4" />
        <span class="font-medium">${o.rotulo}</span>
      </label>`
        )
        .join('')}
    </div>`;
  } else if (etapa.tipo === 'radio') {
    html += `<div class="grid gap-3">
      ${etapa.opcoes
        .map(
          (o) => `<label class="flex cursor-pointer items-center gap-3 rounded-favo border-2 p-4 ${
            valorAtual === o.valor ? 'border-mel bg-cera' : 'border-linha'
          } hover:border-ambar">
        <input type="radio" name="campo-etapa" value="${o.valor}" ${valorAtual === o.valor ? 'checked' : ''} class="h-4 w-4" />
        <span class="font-medium">${o.rotulo}</span>
      </label>`
        )
        .join('')}
    </div>`;
  }

  conteudo.innerHTML = html;
}

function lerValorEtapa() {
  const etapa = etapas[etapaAtual];
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

async function finalizar() {
  const body = document.body;
  const perfilId = body.dataset.perfilId;
  const csrfToken = body.dataset.csrfToken;

  botaoAvancar.disabled = true;
  botaoAvancar.textContent = 'Salvando...';

  try {
    const resposta = await fetch(`/perfil/${perfilId}/onboarding`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-csrf-token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify(respostas),
    });

    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível salvar suas respostas.');

    barraProgresso.style.width = '100%';
    textoProgresso.textContent = '100%';
    window.location.href = '/painel';
  } catch (erro) {
    mostrarErro(erro.message);
    botaoAvancar.disabled = false;
    botaoAvancar.textContent = 'Finalizar';
  }
}

document.getElementById('form-onboarding').addEventListener('submit', (evento) => {
  evento.preventDefault();
  esconderErro();

  const valor = lerValorEtapa();
  // Lista vazia também conta como "não respondeu": os dias da semana chegam
  // como array, e `Boolean([])` é `true`.
  const respondeu = Array.isArray(valor) ? valor.length > 0 : Boolean(valor);
  if (!respondeu) {
    mostrarErro('Responda para continuar.');
    return;
  }
  respostas[etapas[etapaAtual].id] = valor;

  if (etapaAtual < etapas.length - 1) {
    etapaAtual += 1;
    renderizarEtapa();
  } else {
    finalizar();
  }
});

botaoVoltar.addEventListener('click', () => {
  if (etapaAtual > 0) {
    etapaAtual -= 1;
    esconderErro();
    renderizarEtapa();
  }
});

renderizarEtapa();
