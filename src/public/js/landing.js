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

  lenis.on('scroll', ({ scroll }) => moverCamadas(scroll));

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

if (!querMenosMovimento) {
  // A classe avisa o CSS que o movimento agora é feito aqui: as camadas param
  // de usar a linha do tempo de rolagem, para não andarem duas vezes.
  document.documentElement.classList.add('landing-com-movimento');
  ligarRevelacao();
  ligarMovimento();
}
