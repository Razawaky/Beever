import { consultar } from '../config/database.js';

/**
 * Camada de repositório: a única que fala com o banco. Sem regra de negócio
 * aqui, apenas acesso a dados com prepared statements.
 */

/** Verifica se o banco responde. Lança se a conexão estiver fora. */
export async function ping() {
  const linhas = await consultar('SELECT 1 AS ok');
  return linhas[0]?.ok === 1;
}

/** Quantas migrations já foram aplicadas, para expor no /health. */
export async function contarMigrationsAplicadas() {
  const linhas = await consultar('SELECT COUNT(*) AS total FROM schema_migrations');
  return Number(linhas[0]?.total ?? 0);
}
