import { consultar } from '../config/database.js';

/** Acesso a dados de `nivel` (XP e nível do jogador), chaveado por perfil. */

export async function buscarPorPerfil(idPerfil) {
  const linhas = await consultar(
    'SELECT id, id_perfil, nivel, xp_atual, xp_proximo_nivel FROM nivel WHERE id_perfil = ?',
    [idPerfil]
  );
  return linhas[0] ?? null;
}

export async function criar({ idPerfil, nivel = 1, xpAtual = 0, xpProximoNivel = 1000 }) {
  const resultado = await consultar(
    'INSERT INTO nivel (id_perfil, nivel, xp_atual, xp_proximo_nivel) VALUES (?, ?, ?, ?)',
    [idPerfil, nivel, xpAtual, xpProximoNivel]
  );
  return resultado.insertId;
}

export async function atualizar(idPerfil, { nivel, xpAtual, xpProximoNivel }) {
  const resultado = await consultar(
    'UPDATE nivel SET nivel = ?, xp_atual = ?, xp_proximo_nivel = ? WHERE id_perfil = ?',
    [nivel, xpAtual, xpProximoNivel, idPerfil]
  );
  return resultado.affectedRows;
}
