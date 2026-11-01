/**
 * Catálogo da arte da Beenie: o único lugar do projeto que sabe qual arquivo é
 * cada pose. A arte é provisória e vai ser substituída por ilustração própria em
 * SVG ou WebP, então trocar o desenho é mexer só aqui — a extensão não importa
 * para quem consome.
 *
 * Os PNG originais continuam em `src/public/img`: o WebP é gerado deles por
 * `npm run img:webp`, e é ele que vai para a tela.
 *
 * `largura` e `altura` são as do arquivo e existem para o navegador reservar o
 * espaço antes de baixar a imagem, o que evita salto de layout (RNF-03).
 *
 * A animação nunca entra neste mapa: ela vive na classe do tema
 * (`animate-float`), para que um desenho novo entre sem reescrever tela.
 */
export const MASCOTES = {
  acolhendo: {
    arquivo: '/img/beenie_howdy.webp',
    alt: 'Beenie acenando',
    largura: 612,
    altura: 812,
  },
  chamando: {
    arquivo: '/img/beenie_sentado_sexy.webp',
    alt: 'Beenie chamando para começar',
    largura: 482,
    altura: 746,
  },
  entrando: {
    arquivo: '/img/beenie_vem.webp',
    alt: 'Beenie na porta do Beever',
    largura: 1000,
    altura: 1017,
  },
  ensinando: {
    arquivo: '/img/beenie_ensinando.webp',
    alt: 'Beenie ensinando',
    largura: 474,
    altura: 571,
  },
  mostrando: {
    arquivo: '/img/beenie_show.webp',
    alt: 'Beenie apresentando a colmeia',
    largura: 501,
    altura: 541,
  },
  um_real: {
    arquivo: '/img/beenie_1real.webp',
    alt: 'Beenie segurando uma moeda de 1 real',
    largura: 458,
    altura: 806,
  },
  bebe: {
    arquivo: '/img/babybee.webp',
    alt: 'Bebê abelha',
    largura: 255,
    altura: 338,
  },
  come_here: {
    arquivo: '/img/beenie_login_render.webp',
    alt: 'Beenie na grama',
    largura: 1000,
    altura: 1017,
  },
  coolpose: {
    arquivo: '/img/beenie_coolpose.webp',
    alt: 'Beenie com pose daora',
    largura: 1000,
    altura: 1017,
  },
  clicavel: {
    arquivo: '/img/beenie_click_default.webp',
    alt: 'Beenie pronta para brincar',
    largura: 275,
    altura: 412,
  },
  curiosa: {
    arquivo: '/img/beenie_click_a.webp',
    alt: 'Beenie curiosa',
    largura: 275,
    altura: 412,
  },
  oops: {
    arquivo: '/img/beenie_click_oopsy.webp',
    alt: 'Beenie fazendo oops',
    largura: 275,
    altura: 412,
  },
  sorrindo: {
    arquivo: '/img/beenie_click_smiley.webp',
    alt: 'Beenie sorrindo',
    largura: 275,
    altura: 412,
  },
  falando: {
    arquivo: '/img/beenie_click_speak.webp',
    alt: 'Beenie falando',
    largura: 275,
    altura: 412,
  },
  estrelas: {
    arquivo: '/img/beenie_click_stars.webp',
    alt: 'Beenie encantada com estrelas',
    largura: 275,
    altura: 412,
  },
  pensando: {
    arquivo: '/img/beenie_click_uhhhhh.webp',
    alt: 'Beenie pensativa',
    largura: 275,
    altura: 412,
  },
  comemorando: {
    arquivo: '/img/beenie_click_yeah.webp',
    alt: 'Beenie comemorando',
    largura: 275,
    altura: 412,
  },
};

/**
 * As poses que a Beenie do painel reveza a cada clique. A ordem aqui não
 * importa — o script sorteia —, mas a lista é a fonte única: a view serializa
 * estes caminhos e o `/js/painel.js` só troca o `src`. Acrescentar uma reação
 * nova é acrescentar a pose acima e o nome aqui.
 */
export const POSES_DO_CLIQUE = [
  'clicavel',
  'curiosa',
  'oops',
  'sorrindo',
  'falando',
  'estrelas',
  'pensando',
  'comemorando',
];

/**
 * A pose pedida, ou erro se o nome não existe. Errar o nome numa view daria
 * imagem quebrada em silêncio; aqui a falha aparece na hora.
 */
export function mascote(pose) {
  const escolhido = MASCOTES[pose];
  if (!escolhido) throw new Error(`Pose de mascote desconhecida: ${pose}`);
  return escolhido;
}
