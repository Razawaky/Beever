// Painel de acessibilidade e preferências de jogo, em toda tela.
//
// Contraste, texto e distração são ajustes do aparelho e ficam no navegador. Som
// e animação reduzida pertencem à conta logada: o servidor renderiza as classes
// no `<body>`, e este script manda o clique para ele em vez de usar o localStorage.
// A preferência de movimento do sistema continua valendo por conta própria.
import { svgIcone } from './icones.js';

const AJUSTES = {
  movimento: 'a11y-movimento-reduzido',
  contraste: 'a11y-contraste',
  texto: 'a11y-texto-maior',
  distracao: 'a11y-sem-distracao',
  silenciar: 'a11y-sem-som',
};

const AJUSTES_DO_PAINEL = ['movimento', 'contraste', 'texto', 'distracao'];

const CHAVE_GUARDADA = 'beever-acessibilidade';

/** Chaves do `<body>` que o servidor renderiza para a conta logada. */
const CHAVES_DO_PERFIL = {
  movimento: 'animacao-reduzida',
  silenciar: 'sem-som',
};

const gerenciadasPeloPerfil = new Set(
  (document.body?.dataset.preferenciasPerfil ?? '').split(' ').filter(Boolean),
);
const token = document.body?.dataset.csrfToken;

const caixa = document.getElementById('acessibilidade');
const botaoAbrir = document.getElementById('acessibilidade-abrir');
const painel = document.getElementById('acessibilidade-painel');
const chaves = Array.from(document.querySelectorAll('[data-ajuste]'));
const avisos = Array.from(document.querySelectorAll('.acessibilidade-aviso'));

function eDoPerfil(nome) {
  return gerenciadasPeloPerfil.has(CHAVES_DO_PERFIL[nome]);
}

/** Estado efetivo: classe do perfil quando gerida pelo servidor, senão local. */
function ligado(nome, escolha) {
  return eDoPerfil(nome) ? document.body.classList.contains(AJUSTES[nome]) : Boolean(escolha[nome]);
}

/** O que estava ligado na última visita, ou nada. */
function lerEscolha() {
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE_GUARDADA) ?? '{}');
  } catch {
    // Janela anônima ou armazenamento bloqueado: a escolha vale só esta visita.
    return {};
  }
}

function guardarEscolha(escolha) {
  try {
    window.localStorage.setItem(CHAVE_GUARDADA, JSON.stringify(escolha));
  } catch {
    /* sem memória do navegador, e está tudo bem */
  }
}

async function salvarNoPerfil(nome, valor) {
  const corpo = nome === 'movimento' ? { animacao_reduzida: valor } : { som_ativo: !valor };

  try {
    const resposta = await fetch('/painel/configuracoes/preferencias', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRF-Token': token ?? '',
      },
      body: JSON.stringify(corpo),
    });
    if (resposta.ok) window.location.reload();
  } catch {
    // Sem rede, vale o estado que o servidor mandou.
  }
}

/** Aplica a escolha no documento e nas chaves, de uma vez só. */
function aplicar(escolha) {
  // O `<body>` é a fonte da conta: o localStorage antigo não pode ligar a classe por cima.
  for (const [nome, classe] of Object.entries(AJUSTES)) {
    if (!eDoPerfil(nome)) document.documentElement.classList.toggle(classe, Boolean(escolha[nome]));
  }

  chaves.forEach((chave) => {
    const ativo = ligado(chave.dataset.ajuste, escolha);
    chave.setAttribute('aria-pressed', String(ativo));
    // Marca em forma, e não só em cor.
    const marca = chave.querySelector('.acessibilidade-marca');
    if (marca) marca.innerHTML = svgIcone(ativo ? 'marcado' : 'desmarcado', 'h-5 w-5');
  });

  // O CSS dá conta de animação e transição, mas rolagem suave é JavaScript: o
  // `landing.js` escuta este aviso para pausar ou retomar o Lenis.
  document.dispatchEvent(
    new CustomEvent('beever:movimento', { detail: { reduzido: ligado('movimento', escolha) } }),
  );

  const onde = gerenciadasPeloPerfil.size > 0 ? 'nesta conta' : 'neste navegador';
  avisos.forEach((aviso) => {
    const nomes = aviso.id === 'acessibilidade-aviso' ? AJUSTES_DO_PAINEL : Object.keys(AJUSTES);
    const ligados = nomes.filter((nome) => ligado(nome, escolha)).length;

    aviso.textContent =
      ligados === 0
        ? 'Modo normal.'
        : `${ligados} ${ligados === 1 ? 'ajuste ligado' : 'ajustes ligados'}. A escolha fica guardada ${onde}.`;
  });
}

function trocar(escolha) {
  aplicar(escolha);
  guardarEscolha(escolha);
}

/** Liga ou desliga um ajuste, na conta quando ela é a dona da preferência. */
function definir(nome, valor) {
  if (eDoPerfil(nome)) return salvarNoPerfil(nome, valor);

  const escolha = lerEscolha();
  escolha[nome] = valor;
  trocar(escolha);
}

/** Liga ou desliga só os quatro ajustes do painel. */
function ajustarPainel(valor) {
  for (const nome of AJUSTES_DO_PAINEL) definir(nome, valor);
}

if (chaves.length > 0) {
  const temPainel = Boolean(caixa && botaoAbrir && painel);

  if (temPainel) {
    // A classe libera o painel no CSS: sem script ele não aparece, porque não
    // teria onde guardar a escolha.
    document.documentElement.classList.add('a11y-pronto');

    botaoAbrir.addEventListener('click', () => {
      const aberto = botaoAbrir.getAttribute('aria-expanded') === 'true';
      botaoAbrir.setAttribute('aria-expanded', String(!aberto));
      painel.classList.toggle('hidden', aberto);
      if (!aberto) painel.querySelector('[data-ajuste]')?.focus();
    });

    // Esc fecha e devolve o foco ao botão, que é o que se espera de um painel.
    painel.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Escape') return;
      painel.classList.add('hidden');
      botaoAbrir.setAttribute('aria-expanded', 'false');
      botaoAbrir.focus();
    });
  }

  chaves.forEach((chave) => {
    chave.addEventListener('click', () => {
      const nome = chave.dataset.ajuste;
      definir(nome, !ligado(nome, lerEscolha()));
    });
  });

  if (temPainel) {
    document.getElementById('acessibilidade-tudo')?.addEventListener('click', () => {
      ajustarPainel(true);
    });

    document.getElementById('acessibilidade-normal')?.addEventListener('click', () => {
      ajustarPainel(false);
    });
  }

  aplicar(lerEscolha());
}
