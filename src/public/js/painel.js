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
