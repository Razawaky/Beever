// Movimento da landing: rolagem suave com Lenis, parallax por camada e
// revelação das seções ao entrar na tela.
//
// O Lenis é auto-hospedado em `/js/vendor/lenis.min.js` e se publica em
// `globalThis.Lenis` — a CSP só aceita `script-src 'self'`, então CDN está fora.
//
// Regra que vale para tudo aqui: quem pede menos movimento não recebe nada
// disto (RNF-26). Sem Lenis, sem parallax, sem revelação — a página fica
// completa e parada, e a rolagem volta a ser a do navegador.

const querMenosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const camadas = Array.from(document.querySelectorAll('[data-parallax]'));
const aparecem = Array.from(document.querySelectorAll('.revela'));
const contadores = Array.from(document.querySelectorAll('[data-contador]'));
const favosQueAcendem = Array.from(document.querySelectorAll('.favo-acende'));
const colunaDeMel = document.querySelector('.coluna-de-mel-preenchimento');
const barraDeProgresso = document.getElementById('progresso-da-landing');

/**
 * Revelação por `IntersectionObserver`: um observer para todos os alvos, e cada
 * elemento é esquecido depois que aparece — o que já foi visto não precisa mais
 * ser observado.
 */
function ligarRevelacao() {
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        entrada.target.classList.add('revelado');
        observador.unobserve(entrada.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
  );

  aparecem.forEach((alvo) => observador.observe(alvo));
}

/**
 * Move as camadas de parallax. `data-parallax` é a velocidade: 0.2 anda a um
 * quinto da rolagem, 1 andaria junto com ela.
 *
 * A posição chega pronta do Lenis, uma vez por quadro. Só `transform` é tocado,
 * porque qualquer outra propriedade derruba o frame rate.
 */
function moverCamadas(posicao) {
  for (const camada of camadas) {
    const velocidade = Number(camada.dataset.parallax) || 0;
    camada.style.transform = `translate3d(0, ${(posicao * velocidade).toFixed(2)}px, 0)`;
  }
}

/**
 * A coluna de mel e a barra escondida dizem a mesma coisa: quanto da página já
 * passou. Uma é para quem vê, a outra para quem ouve.
 *
 * O preenchimento cresce por `--mel`, que o CSS usa num `scaleY` — nenhuma
 * altura é recalculada, então o quadro não cai.
 */
function marcarProgresso(posicao) {
  const rolagemTotal = document.documentElement.scrollHeight - window.innerHeight;
  const andamento = rolagemTotal > 0 ? Math.min(posicao / rolagemTotal, 1) : 0;

  if (colunaDeMel) colunaDeMel.style.setProperty('--mel', andamento.toFixed(3));
  if (barraDeProgresso) barraDeProgresso.setAttribute('aria-valuenow', Math.round(andamento * 100));
}

/**
 * Os favos da trilha acendem um a um quando a seção entra, e não todos juntos:
 * é a trilha se construindo, que é exatamente o que o produto faz.
 */
function ligarFavosDaTrilha() {
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;

        const favos = Array.from(entrada.target.querySelectorAll('.favo-acende'));
        favos.forEach((favo, posicao) => {
          setTimeout(() => favo.classList.add('aceso'), posicao * 160);
        });

        observador.unobserve(entrada.target);
      }
    },
    { threshold: 0.35 },
  );

  const secoes = new Set(favosQueAcendem.map((favo) => favo.closest('section')).filter(Boolean));
  secoes.forEach((secao) => observador.observe(secao));
}

/**
 * Faz o número subir de zero até o valor final quando ele entra na tela.
 *
 * O número já vem escrito do servidor: isto só refaz a contagem por cima. Se o
 * script não rodar, a página continua dizendo a mesma coisa.
 */
function contar(elemento) {
  const alvo = Number(elemento.dataset.contador);
  const sufixo = elemento.dataset.contadorSufixo || '';
  const casas = String(alvo).includes('.') ? 1 : 0;
  const inicio = performance.now();
  const duracao = 1400;

  function quadro(agora) {
    const andamento = Math.min((agora - inicio) / duracao, 1);
    // Desacelera no fim: número que chega frenando parece contagem, e não salto.
    const suavizado = 1 - (1 - andamento) ** 3;
    const valor = alvo * suavizado;

    elemento.textContent =
      valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + sufixo;

    if (andamento < 1) requestAnimationFrame(quadro);
  }

  requestAnimationFrame(quadro);
}

function ligarContadores() {
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        contar(entrada.target);
        observador.unobserve(entrada.target);
      }
    },
    { threshold: 0.6 },
  );

  contadores.forEach((numero) => observador.observe(numero));
}

/**
 * O mini quiz da seção dos jogos: uma pergunta, resposta na hora, nada enviado a
 * servidor nenhum. Errar não fecha a pergunta — a resposta explica e as opções
 * continuam disponíveis, que é a regra de erro do design system.
 */
function ligarMiniQuiz() {
  const resposta = document.getElementById('mini-quiz-resposta');
  const opcoes = Array.from(document.querySelectorAll('.mini-quiz-opcao'));
  if (!resposta || opcoes.length === 0) return;

  const EXPLICACOES = {
    certa: 'Isso mesmo. O mel gasto no patinete sai da conta da casa — e é essa escolha que o jogo ensina a enxergar.',
    errada: 'Ainda não. Comprar agora tira mel da meta maior: a casa continua custando 300, e você volta a zero.',
  };

  opcoes.forEach((opcao) => {
    opcao.addEventListener('click', () => {
      const acertou = opcao.dataset.certa === 'true';

      opcoes.forEach((outra) => outra.classList.remove('border-mel', 'border-erro'));
      opcao.classList.add(acertou ? 'border-mel' : 'border-erro');

      resposta.textContent = acertou ? EXPLICACOES.certa : EXPLICACOES.errada;
      resposta.classList.remove('hidden');
    });
  });
}

// Guardada porque o controle de movimento do rodapé precisa pausá-la.
let rolagemSuave = null;

function ligarMovimento() {
  const lenis = new globalThis.Lenis({
    // Um pouco mais longa que o padrão: a página é vitrine, e a rolagem
    // arrastada é justamente o efeito que se quer sentir.
    duration: 1.2,
    smoothWheel: true,
    // No celular a rolagem nativa é melhor: o dedo já dá a inércia, e mexer
    // nela atrapalha mais do que ajuda.
    syncTouch: false,
    // O próprio Lenis mantém o laço de quadros; um laço nosso seria um segundo
    // `requestAnimationFrame` fazendo a mesma coisa.
    autoRaf: true,
  });

  rolagemSuave = lenis;

  lenis.on('scroll', ({ scroll }) => {
    moverCamadas(scroll);
    marcarProgresso(scroll);
  });

  // A primeira marcação não espera a rolagem: quem chega no meio da página, por
  // uma âncora, já vê a coluna no ponto certo.
  marcarProgresso(window.scrollY);

  // Âncora com rolagem suave, e sem perder o teclado: o destino recebe foco
  // depois da viagem, senão quem navega por Tab volta para o começo da página.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (evento) => {
      const destino = document.querySelector(link.getAttribute('href'));
      if (!destino) return;

      evento.preventDefault();
      lenis.scrollTo(destino, {
        offset: -80,
        onComplete: () => {
          destino.setAttribute('tabindex', '-1');
          destino.focus({ preventScroll: true });
        },
      });
    });
  });
}

/**
 * O controle de movimento da própria página.
 *
 * A preferência do sistema manda, mas nem todo mundo que precisa dela a tem
 * ligada: criança costuma usar o aparelho de outra pessoa. Este botão desliga o
 * movimento na hora e lembra da escolha no navegador, o que atende quem se
 * distrai ou se incomoda com animação — a régua de TDAH e autismo do projeto.
 */
function ligarControleDeMovimento() {
  const caixa = document.getElementById('controle-de-movimento');
  const botao = document.getElementById('botao-reduzir-movimento');
  if (!caixa || !botao) return;

  caixa.classList.remove('hidden');

  function aplicar(reduzido) {
    document.documentElement.classList.toggle('landing-com-movimento', !reduzido);
    botao.setAttribute('aria-pressed', String(reduzido));
    botao.textContent = reduzido ? 'Ligar o movimento desta página' : 'Reduzir movimento desta página';

    // A rolagem suave também é movimento: pausá-la devolve a rolagem do
    // navegador, que é o comportamento previsível que se espera aqui.
    if (reduzido) rolagemSuave?.stop();
    else rolagemSuave?.start();
  }

  // Quem já pediu menos movimento no sistema encontra o botão no estado certo.
  if (querMenosMovimento) aplicar(true);

  botao.addEventListener('click', () => {
    const reduzido = botao.getAttribute('aria-pressed') === 'true';
    aplicar(!reduzido);
    // `localStorage` pode falhar em janela anônima; a escolha vale a visita.
    try {
      window.localStorage.setItem('beever-movimento', reduzido ? 'ligado' : 'reduzido');
    } catch {
      /* sem memória do navegador, a escolha vale só enquanto a página estiver aberta */
    }
  });

  let guardado = null;
  try {
    guardado = window.localStorage.getItem('beever-movimento');
  } catch {
    /* idem */
  }

  if (guardado === 'reduzido') aplicar(true);
}

// O mini quiz é conteúdo interativo, não enfeite: ele vale mesmo para quem pediu
// menos movimento.
ligarMiniQuiz();
ligarControleDeMovimento();

if (!querMenosMovimento) {
  // A classe avisa o CSS que o movimento agora é feito aqui: as camadas param
  // de usar a linha do tempo de rolagem, para não andarem duas vezes.
  document.documentElement.classList.add('landing-com-movimento');
  ligarRevelacao();
  ligarContadores();
  ligarFavosDaTrilha();
  ligarMovimento();
}
