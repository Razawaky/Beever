import { consultar, consultarEm } from '../config/database.js';
import { limiteSeguro } from '../utils/limite.js';

/**
 * `economic_cycles` — o registro de cada ciclo semanal já processado.
 *
 * A tabela existe para a RN-036 poder ser preguiçosa sem risco: o jogador que
 * some seis semanas volta e recebe seis ciclos de uma vez, e a
 * `UNIQUE (user_id, cycle_number)` é o que garante que nenhum deles seja
 * aplicado duas vezes, mesmo se ele abrir duas abas ao voltar.
 *
 * `summary` guarda em JSON o que aconteceu naquele ciclo — quanto valorizou,
 * quanto foi cobrado, o que virou inadimplente. É dele que sai o extrato da
 * Colmeia (RF-HOM-09), e é ele que explica para a criança o que mudou enquanto
 * ela estava fora.
 */

/**
 * Marca o ciclo como processado. Devolve `true` só na primeira vez.
 *
 * O `INSERT IGNORE` é a trava: quem chegar depois recebe `false` e não deve
 * aplicar efeito nenhum. Exige conexão porque a marca e os efeitos do ciclo
 * pertencem à mesma transação — ciclo marcado sem efeito aplicado seria um
 * ciclo perdido para sempre.
 */
export async function registrar(conexao, { idUsuario, numeroDoCiclo, resumo = null }) {
  const resultado = await consultarEm(
    conexao,
    `INSERT IGNORE INTO economic_cycles (user_id, cycle_number, summary)
     VALUES (?, ?, ?)`,
    [idUsuario, numeroDoCiclo, resumo === null ? null : JSON.stringify(resumo)],
  );
  return (resultado.affectedRows ?? 0) === 1;
}

/** O número do último ciclo processado, ou zero para quem nunca teve nenhum. */
export async function ultimoNumeroProcessado(idUsuario, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    'SELECT COALESCE(MAX(cycle_number), 0) AS ultimo FROM economic_cycles WHERE user_id = ?',
    [idUsuario],
  );
  return Number(linhas[0]?.ultimo ?? 0);
}

export async function buscarPorNumero(idUsuario, numeroDoCiclo, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    `SELECT id, user_id, cycle_number, processed_at, summary
       FROM economic_cycles
      WHERE user_id = ? AND cycle_number = ?`,
    [idUsuario, numeroDoCiclo],
  );
  return linhas[0] ?? null;
}

/** Os ciclos mais recentes, do último para o primeiro. É o extrato da Colmeia. */
export async function listarUltimos(idUsuario, limite = 10) {
  return consultar(
    `SELECT id, cycle_number, processed_at, summary
       FROM economic_cycles
      WHERE user_id = ?
      ORDER BY cycle_number DESC
      LIMIT ${limiteSeguro(limite)}`,
    [idUsuario],
  );
}
