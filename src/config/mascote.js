/**
 * Catálogo da arte da Beenie: o único lugar do projeto que sabe qual arquivo é
 * cada pose. A arte é provisória e vai ser substituída por ilustração própria em
 * SVG ou WebP, então trocar o desenho é mexer só aqui — a extensão não importa
 * para quem consome.
 *
 * `largura` e `altura` são as do arquivo e existem para o navegador reservar o
 * espaço antes de baixar a imagem, o que evita salto de layout (RNF-03).
 *
 * A animação nunca entra neste mapa: ela vive na classe do tema
 * (`animate-float`), para que um desenho novo entre sem reescrever tela.
 */
export const MASCOTES = {
  acolhendo: {
    arquivo: '/img/beenie_howdy.png',
    alt: 'Beenie acenando',
    largura: 612,
    altura: 812,
  },
  chamando: {
    arquivo: '/img/beenie_vem.png',
    alt: 'Beenie chamando para começar',
    largura: 482,
    altura: 746,
  },
  entrando: {
    arquivo: '/img/beenie_login_render.png',
    alt: 'Beenie na porta do Beever',
    largura: 1000,
    altura: 1017,
  },
};

/**
 * A pose pedida, ou erro se o nome não existe. Errar o nome numa view daria
 * imagem quebrada em silêncio; aqui a falha aparece na hora.
 */
export function mascote(pose) {
  const escolhido = MASCOTES[pose];
  if (!escolhido) throw new Error(`Pose de mascote desconhecida: ${pose}`);
  return escolhido;
}
