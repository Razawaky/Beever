import { consultar, consultarEm } from '../config/database.js';
import { limiteSeguro } from '../utils/limite.js';

/**
 * `patrimony_snapshots` — a foto diária do patrimônio do jogador.
 *
 * A tabela **não é a fonte** do patrimônio. Quem responde "quanto o jogador tem
 * hoje" é o `PatrimonyService`, somando carteira, cofre e bens na hora (RN-039),
 * porque saldo em cache é a mentira mais cara de depurar. Estas linhas existem
 * para o gráfico de evolução: uma por dia, para a criança ver a curva subir.
 *
 * A `UNIQUE (user_id, snapshot_date)` é o que deixa gravar quantas vezes o dia
 * pedir — a última leitura do dia sobrescreve a anterior.
 */

export async function gravar(conexao, { idUsuario, data, carteira, cofre, itens, total }) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO patrimony_snapshots (user_id, snapshot_date, wallet_coins, vault_balance, items_value, total_value)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE wallet_coins  = VALUES(wallet_coins),
                             vault_balance = VALUES(vault_balance),
                             items_value   = VALUES(items_value),
                             total_value   = VALUES(total_value)`,
    [idUsuario, data, carteira, cofre, itens, total],
  );
  return resultado.affectedRows;
}

export async function buscarDoDia(idUsuario, data, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    `SELECT id, user_id, DATE_FORMAT(snapshot_date, '%Y-%m-%d') AS data,
            wallet_coins, vault_balance, items_value, total_value
       FROM patrimony_snapshots
      WHERE user_id = ? AND snapshot_date = ?`,
    [idUsuario, data],
  );
  return linhas[0] ?? null;
}

/** As fotos mais recentes, da mais nova para a mais velha. Alimenta o gráfico. */
export async function listarUltimas(idUsuario, limite = 30) {
  return consultar(
    `SELECT DATE_FORMAT(snapshot_date, '%Y-%m-%d') AS data,
            wallet_coins, vault_balance, items_value, total_value
       FROM patrimony_snapshots
      WHERE user_id = ?
      ORDER BY snapshot_date DESC
      LIMIT ${limiteSeguro(limite)}`,
    [idUsuario],
  );
}
