// A Beenie clicável do painel: a cada clique ela troca de expressão, sorteando
// uma reação nova e nunca repetindo a que já está na tela.
//
// A lista de imagens desce no atributo `data-beenie-imagens` do botão, montada
// no servidor a partir do catálogo do mascote — este arquivo não conhece
// caminho de arte. Sem lista (ou com um item só) o clique não faz nada, e a
// reação fica só na animação do CSS.
const botao = document.getElementById('beenie-clicavel');
const imagem = document.getElementById('beenie-imagem');

if (botao && imagem) {
  const imagens = (botao.dataset.beenieImagens ?? '').split('|').filter(Boolean);

  // Pré-carrega as outras reações: sem isto o primeiro clique pisca em branco
  // enquanto o navegador busca o arquivo.
  for (const caminho of imagens) {
    if (caminho !== imagem.getAttribute('src')) new Image().src = caminho;
  }

  botao.addEventListener('click', () => {
    // Sorteia entre todas menos a que já está na tela — é o "sem repetir duas
    // vezes seguidas". Com duas imagens, o sorteio é sempre a outra.
    const atual = imagem.getAttribute('src');
    const outras = imagens.filter((caminho) => caminho !== atual);
    const sorteada = outras[Math.floor(Math.random() * outras.length)];

    if (sorteada) imagem.src = sorteada;
  });
}

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
