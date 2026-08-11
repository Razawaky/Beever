import { consultar } from '../config/database.js';

/**
 * Acesso a dados de `sessao_jogo` — uma partida jogada por um perfil.
 * Não confundir com a sessão de login: essa vive no express-session e na
 * tabela `sessions`; aqui é só o domínio do jogo (pontos, moedas, XP).
 */

export async function iniciar({ idPerfil, idJogo }) {
  const resultado = await consultar('INSERT INTO sessao_jogo (id_perfil, id_jogo) VALUES (?, ?)', [
    idPerfil,
    idJogo,
  ]);
  return resultado.insertId;
}

export async function finalizar(id, { pontos = 0, moedas = 0, xp = 0 }) {
  const resultado = await consultar(
    `UPDATE sessao_jogo
        SET data_fim       = NOW(),
            duracao_seg    = TIMESTAMPDIFF(SECOND, data_inicio, NOW()),
            pontos_obtidos = ?,
            moedas_ganhas  = ?,
            xp_obtido      = ?
      WHERE id = ? AND data_fim IS NULL`,
    [pontos, moedas, xp, id]
  );
  return resultado.affectedRows;
}

export async function listarPorPerfil(idPerfil, limite = 20) {
  return consultar(
    `SELECT id, id_jogo, data_inicio, data_fim, duracao_seg, pontos_obtidos, moedas_ganhas, xp_obtido
       FROM sessao_jogo
      WHERE id_perfil = ?
      ORDER BY data_inicio DESC
      LIMIT ?`,
    [idPerfil, limite]
  );
}
