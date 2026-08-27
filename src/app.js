import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { mascote } from './config/mascote.js';
import { sessaoMiddleware } from './config/session.js';
import { receberIlustracao } from './config/uploads.js';
import { csrf } from './middlewares/csrf.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { limiteGlobal } from './middlewares/rateLimiters.js';
import { requireAdmin } from './middlewares/requireAdmin.js';
import { requestId } from './middlewares/requestId.js';
import rotas from './routes/index.js';

const diretorioAtual = path.dirname(fileURLToPath(import.meta.url));

/**
 * Monta o Express sem chamar `listen`, para que os testes de integração possam
 * usar o app direto com supertest. Quem sobe o servidor é `server.js`.
 */
export function criarApp() {
  const app = express();

  // Atrás de nginx/Caddy em produção: usa o IP e protocolo reais do cliente,
  // repassados pelo proxy, em vez dos do proxy.
  if (env.producao) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          // As fontes são auto-hospedadas em /fonts: nenhum CDN externo.
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    })
  );

  // Antes do logger: é ele quem cria o id que o `pino-http` vai reaproveitar e
  // que todo log da requisição vai carregar.
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      // Sem isto o pino-http inventaria um contador próprio por processo, e o
      // log teria dois identificadores diferentes para a mesma requisição.
      genReqId: (req) => req.id,
      autoLogging: { ignore: (req) => req.url === '/health' },
    }),
  );

  app.set('view engine', 'ejs');
  app.set('views', path.join(diretorioAtual, 'views'));

  // O catálogo do mascote fica disponível em toda view: nenhuma tela escreve o
  // caminho da imagem, todas pedem a pose pelo nome.
  app.locals.mascote = mascote;
  app.use(express.static(path.join(diretorioAtual, 'public'), { maxAge: env.producao ? '7d' : 0 }));

  // As ilustrações enviadas pelo painel. Ficam fora de `src/public` porque são
  // conteúdo e não código — a pasta é volume em produção, e o que sai daqui é
  // sempre WebP gravado pelo servidor, nunca o arquivo cru de quem enviou.
  app.use('/uploads', express.static(env.uploads.diretorio, { maxAge: env.producao ? '7d' : 0 }));

  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(express.json({ limit: '100kb' }));

  app.use(sessaoMiddleware);

  // O envio da ilustração é multipart, e o token de CSRF vem no corpo junto dos
  // campos. Sem o multer antes, o corpo chega vazio ao middleware de CSRF e o
  // formulário legítimo seria recusado. Fica depois do `requireAdmin` de
  // propósito: só administrador logado faz o servidor ler um arquivo.
  app.use(['/admin/itens', '/admin/celulas'], requireAdmin, receberIlustracao);

  app.use(csrf);
  app.use(limiteGlobal);

  app.use(rotas);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
