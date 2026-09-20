// Painel de acessibilidade, em toda tela.
//
// O modo normal é o padrão: enquanto nada é ligado aqui, nenhuma classe entra no
// `<html>` e a página é exatamente a desenhada. Cada ajuste é uma escolha, fica
// guardada no navegador e volta na próxima visita.
//
// A preferência de movimento do sistema continua valendo por conta própria: este
// painel a complementa, para quem não tem como mexer na configuração do aparelho.

const AJUSTES = {
  movimento: 'a11y-movimento-reduzido',
  contraste: 'a11y-contraste',
  texto: 'a11y-texto-maior',
  distracao: 'a11y-sem-distracao',
};

const CHAVE_GUARDADA = 'beever-acessibilidade';

const caixa = document.getElementById('acessibilidade');
const botaoAbrir = document.getElementById('acessibilidade-abrir');
const painel = document.getElementById('acessibilidade-painel');
const chaves = Array.from(document.querySelectorAll('.acessibilidade-chave'));
const aviso = document.getElementById('acessibilidade-aviso');

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

/** Aplica a escolha no documento e nas chaves do painel, de uma vez só. */
function aplicar(escolha) {
  for (const [nome, classe] of Object.entries(AJUSTES)) {
    document.documentElement.classList.toggle(classe, Boolean(escolha[nome]));
  }

  chaves.forEach((chave) => {
    const ligado = Boolean(escolha[chave.dataset.ajuste]);
    chave.setAttribute('aria-pressed', String(ligado));
    // Marca em forma, e não só em cor: quem não distingue as duas precisa ver
    // a diferença do mesmo jeito.
    chave.querySelector('.acessibilidade-marca').textContent = ligado ? '☑' : '☐';
  });

  // O CSS dá conta de animação e transição, mas rolagem suave é JavaScript: o
  // `landing.js` escuta este aviso para pausar ou retomar o Lenis.
  document.dispatchEvent(
    new CustomEvent('beever:movimento', { detail: { reduzido: Boolean(escolha.movimento) } }),
  );

  const ligados = Object.keys(AJUSTES).filter((nome) => escolha[nome]).length;
  aviso.textContent =
    ligados === 0
      ? 'Modo normal.'
      : `${ligados} ${ligados === 1 ? 'ajuste ligado' : 'ajustes ligados'}. A escolha fica guardada neste navegador.`;
}

function trocar(escolha) {
  aplicar(escolha);
  guardarEscolha(escolha);
}

if (caixa && botaoAbrir && painel && chaves.length > 0) {
  // A classe libera o painel no CSS: sem script ele não aparece, porque não
  // teria onde guardar a escolha.
  document.documentElement.classList.add('a11y-pronto');

  botaoAbrir.addEventListener('click', () => {
    const aberto = botaoAbrir.getAttribute('aria-expanded') === 'true';
    botaoAbrir.setAttribute('aria-expanded', String(!aberto));
    painel.classList.toggle('hidden', aberto);
    if (!aberto) chaves[0].focus();
  });

  // Esc fecha e devolve o foco ao botão, que é o que se espera de um painel.
  painel.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape') return;
    painel.classList.add('hidden');
    botaoAbrir.setAttribute('aria-expanded', 'false');
    botaoAbrir.focus();
  });

  chaves.forEach((chave) => {
    chave.addEventListener('click', () => {
      const escolha = lerEscolha();
      escolha[chave.dataset.ajuste] = chave.getAttribute('aria-pressed') !== 'true';
      trocar(escolha);
    });
  });

  document.getElementById('acessibilidade-tudo').addEventListener('click', () => {
    trocar(Object.fromEntries(Object.keys(AJUSTES).map((nome) => [nome, true])));
  });

  document.getElementById('acessibilidade-normal').addEventListener('click', () => {
    trocar({});
  });

  aplicar(lerEscolha());
}
