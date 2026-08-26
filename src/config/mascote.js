/**
 * Catálogo da arte da Beenie: o único lugar do projeto que sabe qual arquivo é
 * cada pose. A arte é provisória, então trocar o desenho é mexer só aqui.
 *
 * A animação nunca entra neste mapa: ela vive na classe do tema
 * (`animate-float`), para que um desenho novo entre sem reescrever tela.
 */
export const MASCOTES = {
  acolhendo: { arquivo: '/img/beenie_howdy.png', alt: 'Beenie acenando' },
  chamando: { arquivo: '/img/beenie_vem.png', alt: 'Beenie chamando para começar' },
  entrando: { arquivo: '/img/beenie_login_render.png', alt: 'Beenie na porta do Beever' },
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
