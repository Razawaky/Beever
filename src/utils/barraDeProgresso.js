/**
 * Traduz um percentual na classe de largura da barra de progresso.
 *
 * A largura não pode sair como atributo `style`: a CSP declara
 * `style-src 'self'` sem `'unsafe-inline'` (RNF-11), e o navegador descarta
 * estilo escrito direto na marcação. As classes `.barra-0` a `.barra-100`, em
 * passos de 5%, moram em `src/styles/tema.css`.
 *
 * O arredondamento é só visual — o número exato continua indo para o texto ao
 * lado da barra e para o `aria-valuenow`, que é o que o leitor de tela anuncia.
 */
export function classeDaBarra(percentual) {
  const numero = Number(percentual);
  if (!Number.isFinite(numero)) return 'barra-0';

  const limitado = Math.min(100, Math.max(0, numero));
  return `barra-${Math.round(limitado / 5) * 5}`;
}
