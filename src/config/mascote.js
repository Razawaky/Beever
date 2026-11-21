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
  howdy: {
    arquivo: '/img/onboarding/beenie_howdy.webp',
    alt: 'Beenie acenando',
    largura: 612,
    altura: 812,
  },
  sentado: {
    arquivo: '/img/beenie_sentado_sexy.webp',
    alt: 'Beenie sentado',
    largura: 482,
    altura: 746,
  },
  andando: {
    arquivo: '/img/onboarding/beenie_vem.webp',
    alt: 'Beenie andando',
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
    alt: 'Beenie mostrando',
    largura: 501,
    altura: 541,
  },
  um_real: {
    arquivo: '/img/onboarding/beenie_1real.webp',
    alt: 'Beenie segurando uma moeda de 1 real',
    largura: 458,
    altura: 806,
  },
  bebe: {
    arquivo: '/img/onboarding/babybee.webp',
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
  click_normal: {
    arquivo: '/img/clicks/beenie/beenie_click_default.webp',
    alt: 'Beenie parado',
    largura: 456,
    altura: 572,
  },
  click_eita: {
    arquivo: '/img/clicks/beenie/beenie_click_eita.webp',
    alt: 'Beenie eita',
    largura: 456,
    altura: 572,
  },
  click_oops: {
    arquivo: '/img/clicks/beenie/beenie_click_ops.webp',
    alt: 'Beenie fazendo oops',
    largura: 456,
    altura: 572,
  },
  click_smirk: {
    arquivo: '/img/clicks/beenie/beenie_click_smirk.webp',
    alt: 'Beenie sorrindo de canto',
    largura: 456,
    altura: 572,
  },
  click_falando: {
    arquivo: '/img/clicks/beenie/beenie_click_default_speak.webp',
    alt: 'Beenie falando',
    largura: 456,
    altura: 572,
  },
  click_amazed: {
    arquivo: '/img/clicks/beenie/beenie_click_amazed.webp',
    alt: 'Beenie encantado',
    largura: 456,
    altura: 572,
  },
  click_uhh: {
    arquivo: '/img/clicks/beenie/beenie_click_uhhh.webp',
    alt: 'Beenie uhhh',
    largura: 456,
    altura: 572,
  },
  click_rindo: {
    arquivo: '/img/clicks/beenie/beenie_click_rindo.webp',
    alt: 'Beenie rindo',
    largura: 456,
    altura: 572,
  },
  musica: {
    arquivo: '/img/onboarding/beenie_music.webp',
    alt: 'Beenie escutando música',
    largura: 395,
    altura: 463,
  },
  tempo: {
    arquivo: '/img/onboarding/beenie_time.webp',
    alt: 'Beenie mostrando o tempo',
    largura: 410,
    altura: 544,
  },
  calendario: {
    arquivo: '/img/onboarding/beenie_calendario.webp',
    alt: 'Beenie mostrando o calendário',
    largura: 570,
    altura: 739,
  },
};

/**
 * As poses que a Beenie do painel reveza a cada clique. A ordem aqui não
 * importa — o script sorteia —, mas a lista é a fonte única: a view serializa
 * estes caminhos e o `/js/painel.js` só troca o `src`. Acrescentar uma reação
 * nova é acrescentar a pose acima e o nome aqui.
 */
export const POSES_DO_CLIQUE = [
  'click_normal',
  'click_eita',
  'click_oops',
  'click_smirk',
  'click_falando',
  'click_amazed',
  'click_uhh',
  'click_rindo',
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
