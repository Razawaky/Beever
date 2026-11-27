/**
 * Opções visuais do avatar de perfil.
 *
 * A cor de fundo da bolinha/imagem do perfil é escolhida no modal do perfil.
 * `valor` é o identificador gravado no banco (`profiles.avatar_background`) e
 * `classe` é a classe CSS que aplica a cor (CSP não permite `style` inline).
 *
 * Para alterar as cores (máx. 12):
 * 1. Edite `CORES_DE_FUNDO_DO_AVATAR` abaixo (valor, rótulo, classe e cor).
 * 2. Atualize as classes `.avatar-fundo-*` em `src/styles/tema.css` para bater
 *    com as mesmas cores e rode o build do CSS (`src/public/css/app.css`).
 */
export const CORES_DE_FUNDO_DO_AVATAR = Object.freeze([
  { valor: 'cera', rotulo: 'Cera', classe: 'avatar-fundo-cera', cor: '#FFFDF7' },
  { valor: 'mel', rotulo: 'Mel', classe: 'avatar-fundo-mel', cor: '#FFC200' },
  { valor: 'polen', rotulo: 'Pólen', classe: 'avatar-fundo-polen', cor: '#FFD966' },
  { valor: 'ambar', rotulo: 'Âmbar', classe: 'avatar-fundo-ambar', cor: '#FFB703' },
  { valor: 'laranja', rotulo: 'Laranja suave', classe: 'avatar-fundo-laranja', cor: '#F4A261' },
  { valor: 'verde-claro', rotulo: 'Verde claro', classe: 'avatar-fundo-verde-claro', cor: '#A7D8A0' },
  { valor: 'verde', rotulo: 'Verde', classe: 'avatar-fundo-verde', cor: '#7BC96F' },
  { valor: 'azul-claro', rotulo: 'Azul claro', classe: 'avatar-fundo-azul-claro', cor: '#8ECAE6' },
  { valor: 'ceu', rotulo: 'Céu', classe: 'avatar-fundo-ceu', cor: '#90DBF4' },
  { valor: 'lavanda', rotulo: 'Lavanda', classe: 'avatar-fundo-lavanda', cor: '#CDB4DB' },
  { valor: 'rosa', rotulo: 'Rosa claro', classe: 'avatar-fundo-rosa', cor: '#FFAFCC' },
  { valor: 'areia', rotulo: 'Areia', classe: 'avatar-fundo-areia', cor: '#E6E0C8' },
]);

export const VALORES_DE_COR_DE_FUNDO_DO_AVATAR = new Set(
  CORES_DE_FUNDO_DO_AVATAR.map((cor) => cor.valor),
);

const CLASSE_POR_COR_DE_FUNDO = new Map(
  CORES_DE_FUNDO_DO_AVATAR.map((cor) => [cor.valor, cor.classe]),
);

export function corDeFundoDoAvatarValida(valor) {
  if (valor === null || valor === undefined || valor === '') return true;
  return VALORES_DE_COR_DE_FUNDO_DO_AVATAR.has(String(valor));
}

export function normalizarCorDeFundoDoAvatar(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const texto = String(valor);
  return VALORES_DE_COR_DE_FUNDO_DO_AVATAR.has(texto) ? texto : null;
}

export function classeDeCorDeFundoDoAvatar(valor) {
  return CLASSE_POR_COR_DE_FUNDO.get(normalizarCorDeFundoDoAvatar(valor)) ?? 'avatar-fundo-padrao';
}

