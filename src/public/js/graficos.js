// Os dois gráficos da economia: a rosca da composição do patrimônio e a linha
// da projeção do cofre. Os dados vêm em `data-*`, já calculados pelo servidor.
//
// Todo gráfico tem o mesmo dado escrito ao lado em texto, e um `aria-label` que
// diz o total: quem usa leitor de tela e quem abre a página com o script
// bloqueado não perdem nada — o desenho é reforço, nunca a única fonte.

/** A cor sai do tema, e não de um hexadecimal repetido aqui. */
function corDoTema(nome) {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || '#111111';
}

/**
 * Ajusta o canvas à densidade da tela.
 *
 * Sem isso o desenho fica borrado em celular, onde um pixel do CSS vale dois ou
 * três do aparelho.
 */
function prepararContexto(canvas) {
  const densidade = window.devicePixelRatio || 1;
  const largura = canvas.width;
  const altura = canvas.height;

  canvas.width = largura * densidade;
  canvas.height = altura * densidade;

  const contexto = canvas.getContext('2d');
  contexto.scale(densidade, densidade);
  return { contexto, largura, altura };
}

/** A composição do patrimônio (RF-INV-04): carteira, cofre e bens. */
function desenharComposicao(canvas) {
  const { contexto, largura, altura } = prepararContexto(canvas);
  const fatias = [
    { valor: Number(canvas.dataset.carteira), cor: corDoTema('--color-breu') },
    { valor: Number(canvas.dataset.cofre), cor: corDoTema('--color-ambar') },
    { valor: Number(canvas.dataset.bens), cor: corDoTema('--color-nectar') },
  ];

  const total = fatias.reduce((soma, fatia) => soma + fatia.valor, 0);
  const centroX = largura / 2;
  const centroY = altura / 2;
  const raio = Math.min(largura, altura) / 2 - 4;
  const espessura = raio * 0.45;

  // Patrimônio zero ainda desenha o anel vazio: um buraco na tela faria a
  // criança achar que a página quebrou.
  if (total <= 0) {
    contexto.beginPath();
    contexto.arc(centroX, centroY, raio - espessura / 2, 0, Math.PI * 2);
    contexto.lineWidth = espessura;
    contexto.strokeStyle = corDoTema('--color-cera');
    contexto.stroke();
    return;
  }

  let inicio = -Math.PI / 2;
  fatias.forEach((fatia) => {
    if (fatia.valor <= 0) return;

    const fim = inicio + (fatia.valor / total) * Math.PI * 2;
    contexto.beginPath();
    contexto.arc(centroX, centroY, raio - espessura / 2, inicio, fim);
    contexto.lineWidth = espessura;
    contexto.strokeStyle = fatia.cor;
    contexto.stroke();
    inicio = fim;
  });
}

/** A projeção do cofre (RF-COF-04): o saldo de hoje e uma marca por semana. */
function desenharProjecao(canvas) {
  const { contexto, largura, altura } = prepararContexto(canvas);
  const totais = (canvas.dataset.totais || '')
    .split(',')
    .filter((pedaco) => pedaco !== '')
    .map(Number);

  const pontos = [Number(canvas.dataset.saldo), ...totais];
  if (pontos.length < 2) return;

  const margem = 16;
  const maior = Math.max(...pontos, 1);
  const passo = (largura - margem * 2) / (pontos.length - 1);
  const posicaoY = (valor) => altura - margem - (valor / maior) * (altura - margem * 2);

  contexto.beginPath();
  pontos.forEach((valor, indice) => {
    const x = margem + passo * indice;
    const y = posicaoY(valor);
    if (indice === 0) contexto.moveTo(x, y);
    else contexto.lineTo(x, y);
  });
  contexto.lineWidth = 3;
  contexto.strokeStyle = corDoTema('--color-breu');
  contexto.stroke();

  contexto.fillStyle = corDoTema('--color-mel');
  pontos.forEach((valor, indice) => {
    contexto.beginPath();
    contexto.arc(margem + passo * indice, posicaoY(valor), 4, 0, Math.PI * 2);
    contexto.fill();
  });
}

document.querySelectorAll('canvas[data-grafico]').forEach((canvas) => {
  if (canvas.dataset.grafico === 'composicao') desenharComposicao(canvas);
  if (canvas.dataset.grafico === 'projecao') desenharProjecao(canvas);
});
