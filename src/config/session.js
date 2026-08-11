import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import { v4 as uuidv4 } from 'uuid';

import { env } from './env.js';
import { pool } from './database.js';

const MySQLStore = MySQLStoreFactory(session);

/**
 * Store de sessão de login, persistido no MySQL reaproveitando o pool da
 * aplicação. A tabela `sessions` é criada pela migration (não pela biblioteca),
 * para o schema continuar reproduzível.
 *
 * Atenção: esta é a sessão de autenticação. A sessão de jogo é outra coisa —
 * mora na tabela `sessao_jogo` e é domínio, não infraestrutura.
 */
export const sessionStore = new MySQLStore(
  {
    createDatabaseTable: false,
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
    schema: {
      tableName: 'sessions',
      columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' },
    },
  },
  pool
);

export const sessaoMiddleware = session({
  name: 'beever.sid',
  // Herdado do middleware antigo: id de sessão como UUID v4, em vez do gerador
  // padrão. Sem o console.log que o original disparava a cada sessão criada.
  genid: () => uuidv4(),
  secret: env.sessao.segredo,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.producao,
    maxAge: env.sessao.duracaoMs,
  },
});

/** Encerra o store no desligamento da aplicação. */
export function fecharSessionStore() {
  return new Promise((resolve) => sessionStore.close(resolve));
}
