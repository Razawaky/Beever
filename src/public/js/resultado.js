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
 * O mascote de cada desfecho — e o único lugar do projeto onde ele é escolhido.
 *
 * A arte é provisória: quando o desenho próprio chegar, é aqui que ele entra, e
 * em nenhum outro arquivo. A animação vive na classe do tema, não na imagem.
 */
const MASCOTES = {
  comemorando: { imagem: '/img/beenie_howdy.png', alt: 'Beenie comemorando', titulo: 'Muito bem!' },
  animando: { imagem: '/img/beenie_vem.png', alt: 'Beenie chamando para tentar de novo', titulo: 'Boa tentativa!' },
};

function mostrarEstrelas(estrelas) {
  painelDeEstrelas.replaceChildren();
  painelDeEstrelas.setAttribute('aria-label', `${estrelas} de 3 estrelas`);

  for (let posicao = 1; posicao <= 3; posicao += 1) {
    const estrela = document.createElement('span');
    const ganha = posicao <= estrelas;

    estrela.textContent = ganha ? '★' : '☆';
    // A animação é escalonada por classe, porque a CSP não permite `style`.
    estrela.className = ganha ? `estrela estrela-ganha estrela-${posicao}` : 'estrela';
    estrela.setAttribute('aria-hidden', 'true');
    painelDeEstrelas.append(estrela);
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
