// A tela de resultado, igual para os quatro jogos (RF-CON-05).
//
// Nada é calculado aqui: estrelas, XP, pólen, mel, subida de nível e a próxima
// célula chegam prontos do servidor (RN-007). Este arquivo só apresenta.
import { elementoIcone } from './icones.js';

const secao = document.getElementById('jogo-resultado');
const mascote = document.getElementById('jogo-mascote');
const titulo = document.getElementById('jogo-resultado-titulo');
const painelDeEstrelas = document.getElementById('jogo-estrelas');
const avisoDeNivel = document.getElementById('jogo-nivel');
const avisoDeRepeticao = document.getElementById('jogo-repeticao-aviso');
const painelDeConquistas = document.getElementById('jogo-conquistas');
const tituloDasConquistas = document.getElementById('jogo-conquistas-titulo');
const listaDeConquistas = document.getElementById('jogo-conquistas-lista');
const botaoContinuar = document.getElementById('jogo-continuar');
const linkDoFavo = document.getElementById('jogo-voltar-ao-favo');

/**
 * Imagem e mensagem do desfecho conforme a nota (estrelas) recebida.
 * As artes ficam em `img/score`: ótimo, bom, médio e ruim.
 */
const SCORES = {
  3: {
    imagem: '/img/score/beenie_score_verygood.webp',
    alt: 'Beenie comemorando com nota ótima',
    titulo: 'Muito bem!',
  },
  2: {
    imagem: '/img/score/beenie_score_good.webp',
    alt: 'Beenie feliz com nota boa',
    titulo: 'Bom trabalho!',
  },
  1: {
    imagem: '/img/score/beenie_score_meh.webp',
    alt: 'Beenie pensativa com nota média',
    titulo: 'Quase lá!',
  },
  0: {
    imagem: '/img/score/beenie_score_bad.webp',
    alt: 'Beenie desanimada com nota ruim',
    titulo: 'Continue tentando!',
  },
};

function scorePorEstrelas(estrelas) {
  const quantidade = Math.max(0, Math.min(3, Number(estrelas) || 0));
  return SCORES[quantidade] ?? SCORES[0];
}

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

/**
 * O que a partida destravou (RF-GAM-01). O mel da conquista fica fora do bloco
 * de ganhos de propósito: junto, a mesma célula pareceria pagar diferente.
 */
function mostrarConquistas(conquistas = []) {
  if (conquistas.length === 0) return;

  tituloDasConquistas.replaceChildren(
    elementoIcone('comemoracao', 'h-5 w-5'),
    document.createTextNode(
      conquistas.length === 1
        ? ' Conquista desbloqueada!'
        : ` ${conquistas.length} conquistas desbloqueadas!`,
    ),
  );

  listaDeConquistas.replaceChildren();
  for (const conquista of conquistas) {
    const item = document.createElement('li');
    const nome = document.createElement('strong');
    const bonus = document.createElement('span');

    nome.textContent = conquista.nome;
    bonus.className = 'inline-flex items-center gap-1.5';
    bonus.append(
      document.createTextNode(' — '),
      elementoIcone('mel', 'h-4 w-4'),
      document.createTextNode(` ${conquista.melCreditado} de bônus`),
    );
    item.append(nome, bonus);
    listaDeConquistas.append(item);
  }

  painelDeConquistas.classList.remove('hidden');
}

/** O fim da partida empurra para o próximo jogo; sem próximo, volta ao favo. */
function mostrarCaminho(proximaCelula) {
  if (!proximaCelula) return;

  botaoContinuar.href = `/trilha/${proximaCelula.idFavo}/celula/${proximaCelula.id}`;
  botaoContinuar.textContent = `Continuar: ${proximaCelula.titulo}`;
  linkDoFavo.classList.remove('hidden');
}

export function mostrarResultado(dados) {
  // O Quarto do Beenie não monta esta seção: o módulo ainda é importado pela
  // casca comum, mas não há painel para preencher nessa atividade.
  if (!secao) return;

  const score = scorePorEstrelas(dados.estrelas);

  mascote.src = score.imagem;
  mascote.alt = score.alt;
  titulo.textContent = score.titulo;

  mostrarEstrelas(dados.estrelas);
  mostrarGanhos(dados);
  mostrarConquistas(dados.conquistas);
  mostrarCaminho(dados.proximaCelula);

  secao.classList.remove('hidden');
  titulo.focus?.();
}
