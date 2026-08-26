// A tela de resultado, igual para os quatro jogos (RF-CON-05).
//
// Nada é calculado aqui: estrelas, XP, pólen, mel, subida de nível e a próxima
// célula chegam prontos do servidor (RN-007). Este arquivo só apresenta.
const secao = document.getElementById('jogo-resultado');
const mascote = document.getElementById('jogo-mascote');
const titulo = document.getElementById('jogo-resultado-titulo');
const painelDeEstrelas = document.getElementById('jogo-estrelas');
const avisoDeNivel = document.getElementById('jogo-nivel');
const avisoDeRepeticao = document.getElementById('jogo-repeticao-aviso');
const botaoContinuar = document.getElementById('jogo-continuar');
const linkDoFavo = document.getElementById('jogo-voltar-ao-favo');

/**
 * Os dois desfechos. A arte vem do catálogo do servidor, que desce nos atributos
 * da seção, e este arquivo só escolhe qual dos dois usar.
 */
const MASCOTES = {
  comemorando: {
    imagem: secao.dataset.mascoteVitoria,
    alt: secao.dataset.mascoteVitoriaAlt,
    titulo: 'Muito bem!',
  },
  animando: {
    imagem: secao.dataset.mascoteTentativa,
    alt: secao.dataset.mascoteTentativaAlt,
    titulo: 'Boa tentativa!',
  },
};

const ESPACO_SVG = 'http://www.w3.org/2000/svg';
const CONTORNO_DA_ESTRELA =
  'M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.35 6.2 20.4l1.1-6.45-4.7-4.6 6.5-.95L12 2.5z';

/**
 * As três estrelas, desenhadas.
 *
 * Desenho em vez do caractere ★ porque amarelo não pode ser cor de texto sobre
 * fundo claro (RNF-21): a mesma cor que reprova em contraste como letra passa
 * como preenchimento de forma. A tela do favo já fazia assim.
 */
function mostrarEstrelas(estrelas) {
  painelDeEstrelas.replaceChildren();
  painelDeEstrelas.setAttribute('aria-label', `${estrelas} de 3 estrelas`);

  for (let posicao = 1; posicao <= 3; posicao += 1) {
    const ganha = posicao <= estrelas;
    const desenho = document.createElementNS(ESPACO_SVG, 'svg');
    const contorno = document.createElementNS(ESPACO_SVG, 'path');

    contorno.setAttribute('d', CONTORNO_DA_ESTRELA);
    contorno.setAttribute('fill', 'currentColor');
    // A animação é escalonada por classe, porque a CSP não permite `style`.
    desenho.setAttribute(
      'class',
      ganha ? `estrela estrela-ganha estrela-${posicao} h-10 w-10 text-mel` : 'estrela h-10 w-10 text-linha',
    );
    desenho.setAttribute('viewBox', '0 0 24 24');
    desenho.setAttribute('aria-hidden', 'true');
    desenho.setAttribute('focusable', 'false');
    desenho.append(contorno);
    painelDeEstrelas.append(desenho);
  }
}

function mostrarGanhos(dados) {
  document.getElementById('jogo-xp').textContent = `+${dados.xp}`;
  document.getElementById('jogo-polen').textContent = `+${dados.polen}`;
  document.getElementById('jogo-mel').textContent = `+${dados.mel + dados.bonusDeMelPorNivel}`;

  if (dados.subiuDeNivel) {
    avisoDeNivel.textContent = `Você chegou ao nível ${dados.nivel}! Bônus de ${dados.bonusDeMelPorNivel} de mel.`;
    avisoDeNivel.classList.remove('hidden');
  }
  if (dados.ehRepeticao) avisoDeRepeticao.classList.remove('hidden');
}

/** O fim da partida empurra para o próximo jogo; sem próximo, volta ao favo. */
function mostrarCaminho(proximaCelula) {
  if (!proximaCelula) return;

  botaoContinuar.href = `/trilha/${proximaCelula.idFavo}/celula/${proximaCelula.id}`;
  botaoContinuar.textContent = `Continuar: ${proximaCelula.titulo}`;
  linkDoFavo.classList.remove('hidden');
}

export function mostrarResultado(dados) {
  const mascoteEscolhido = dados.estrelas === 3 ? MASCOTES.comemorando : MASCOTES.animando;

  mascote.src = mascoteEscolhido.imagem;
  mascote.alt = mascoteEscolhido.alt;
  titulo.textContent = mascoteEscolhido.titulo;

  mostrarEstrelas(dados.estrelas);
  mostrarGanhos(dados);
  mostrarCaminho(dados.proximaCelula);

  secao.classList.remove('hidden');
  titulo.focus?.();
}
