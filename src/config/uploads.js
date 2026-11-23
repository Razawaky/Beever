import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import multer from 'multer';
import sharp from 'sharp';

import { ErroAplicacao, erroValidacao } from '../utils/erros.js';
import { env } from './env.js';

/**
 * Recebimento de ilustração do painel administrativo.
 *
 * O arquivo chega em qualquer formato de imagem e é gravado sempre em WebP: o
 * administrador não precisa converter nada, e o acervo não engorda a aplicação.
 * O original nunca toca o disco — fica em memória, é convertido e só a versão
 * WebP é escrita, então nada que veio do navegador vira arquivo servível.
 */

// Mesma qualidade do `npm run img:webp`, para a arte cadastrada pesar como a
// que já está no repositório. A largura é o dobro do card da vitrine.
const QUALIDADE_WEBP = 82;
const LARGURA_MAXIMA = 800;

const receber = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.uploads.limiteEmBytes, files: 1 },
}).single('ilustracao');

/**
 * Middleware do upload. Traduz a recusa do multer em erro de validação: sem
 * isto, arquivo grande demais viraria 500 sem explicação para quem enviou.
 */
export function receberIlustracao(req, res, next) {
  receber(req, res, (erro) => {
    if (!erro) return next();
    if (erro.code === 'LIMIT_FILE_SIZE') {
      return next(erroValidacao(`A imagem passa do limite de ${env.uploads.limiteEmBytes / 1024 / 1024} MB`));
    }
    next(new ErroAplicacao('Não foi possível ler o arquivo enviado', { status: 422, codigo: 'UPLOAD_INVALIDO' }));
  });
}

const MARGEM_RECORTE_TRANSPARENTE = 2;

async function recortarTransparencia(bytes) {
  const { data, info } = await sharp(bytes, { failOn: 'none' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let topo = height;
  let esquerda = width;
  let baixo = -1;
  let direita = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * channels + channels - 1];
      if (alpha > 0) {
        if (x < esquerda) esquerda = x;
        if (x > direita) direita = x;
        if (y < topo) topo = y;
        if (y > baixo) baixo = y;
      }
    }
  }

  // Imagem totalmente transparente: mantém como veio para não gerar saída vazia.
  if (baixo < topo || direita < esquerda) return sharp(bytes, { failOn: 'none' });

  const margem = MARGEM_RECORTE_TRANSPARENTE;
  const left = Math.max(0, esquerda - margem);
  const top = Math.max(0, topo - margem);
  const extractWidth = Math.min(width, direita + margem + 1) - left;
  const extractHeight = Math.min(height, baixo + margem + 1) - top;

  if (left === 0 && top === 0 && extractWidth === width && extractHeight === height) {
    return sharp(bytes, { failOn: 'none' });
  }

  return sharp(bytes, { failOn: 'none' }).extract({ left, top, width: extractWidth, height: extractHeight });
}

async function converterImagem(bytes, { recortar = true } = {}) {
  const orientado = await sharp(bytes, { failOn: 'none' }).rotate().toBuffer();
  const base = recortar ? await recortarTransparencia(orientado) : sharp(orientado, { failOn: 'none' });
  return base
    .resize({ width: LARGURA_MAXIMA, withoutEnlargement: true })
    .webp({ quality: QUALIDADE_WEBP })
    .toBuffer();
}

async function salvarBuffer(convertida) {
  const nome = `${randomUUID()}.webp`;
  await mkdir(env.uploads.diretorio, { recursive: true });
  await writeFile(path.join(env.uploads.diretorio, nome), convertida);
  return `/uploads/${nome}`;
}

/**
 * Converte para WebP e grava. O `sharp` é também a validação de verdade: um
 * arquivo que ele não abre não é imagem, não importa o que o navegador declarou.
 */
export async function guardarIlustracao(bytes, { recortar = true } = {}) {
  let convertida;
  try {
    convertida = await converterImagem(bytes, { recortar });
  } catch {
    throw erroValidacao('O arquivo enviado não é uma imagem que consigamos abrir');
  }
  return salvarBuffer(convertida);
}

/**
 * Para cosméticos: salva versão recortada (loja) e versão original/canvas (avatar).
 */
export async function guardarIlustracaoCosmetico(bytes) {
  let recortada;
  let original;
  try {
    [recortada, original] = await Promise.all([
      converterImagem(bytes, { recortar: true }),
      converterImagem(bytes, { recortar: false }),
    ]);
  } catch {
    throw erroValidacao('O arquivo enviado não é uma imagem que consigamos abrir');
  }
  const [caminhoLoja, caminhoAvatar] = await Promise.all([
    salvarBuffer(recortada),
    salvarBuffer(original),
  ]);
  return { caminhoLoja, caminhoAvatar };
}
