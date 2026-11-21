import { criarBeenieInterativa } from './beenie-interativo.js';

// Beenie interativa do painel: camadas de expressão + mãos, progressão por
// cliques e balão de fala. A API fica em beenie-interativo.js para ser
// reutilizada pelo futuro modo tutorial.
const botao = document.getElementById('beenie-clicavel');
const imagem = document.getElementById('beenie-imagem');
const maoEsquerda = document.getElementById('beenie-mao-esquerda');
const maoDireita = document.getElementById('beenie-mao-direita');
const balaoFala = document.getElementById('beenie-fala');

const beenie = criarBeenieInterativa({
  botao,
  imagemBase: imagem,
  imagemMaoEsquerda: maoEsquerda,
  imagemMaoDireita: maoDireita,
  balaoFala,
});

// Exposto para integração futura (ex.: tutorial guiado) sem acoplamento.
if (beenie) window.beeniePainel = beenie;

// Confirmação de saída: o botão da lateral abre o `dialog` em vez de enviar o
// POST na hora. O formulário de dentro do diálogo é quem envia o logout.
// Sem `showModal` (ou sem JavaScript), o botão da lateral segue enviando
// direto, que é o comportamento antigo — nunca fica sem como sair.
const dialogoSair = document.getElementById('dialogo-sair');
const abrirDialogoSair = document.getElementById('abrir-dialogo-sair');
const fecharDialogoSair = dialogoSair?.querySelector('[data-fechar-dialogo-sair]');

if (dialogoSair && abrirDialogoSair && typeof dialogoSair.showModal === 'function') {
  abrirDialogoSair.addEventListener('click', (evento) => {
    evento.preventDefault();
    dialogoSair.showModal();
  });

  fecharDialogoSair?.addEventListener('click', () => dialogoSair.close());

  // Clicar no véu (fora do cartão) também cancela.
  dialogoSair.addEventListener('click', (evento) => {
    if (evento.target === dialogoSair) dialogoSair.close();
  });
}
