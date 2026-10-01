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

/**
 * Converte para WebP e grava. O `sharp` é também a validação de verdade: um
 * arquivo que ele não abre não é imagem, não importa o que o navegador declarou.
 */
export async function guardarIlustracao(bytes) {
  let convertida;
  try {
    convertida = await sharp(bytes)
      .resize({ width: LARGURA_MAXIMA, withoutEnlargement: true })
      .webp({ quality: QUALIDADE_WEBP })
      .toBuffer();
  } catch {
    throw erroValidacao('O arquivo enviado não é uma imagem que consigamos abrir');
  }

  const nome = `${randomUUID()}.webp`;
  await mkdir(env.uploads.diretorio, { recursive: true });
  await writeFile(path.join(env.uploads.diretorio, nome), convertida);

  // O caminho público, que é o que vai para o banco e para a tela.
  return `/uploads/${nome}`;
}
