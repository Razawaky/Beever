import { consultar } from '../config/database.js';

/** Acesso a dados de `perfil`. Perfil é 1:1 com usuário — sem listagem, sem login próprio. */

export async function buscarPorUsuario(idUsuario) {
  const linhas = await consultar(
    'SELECT id, id_usuario, apelido, avatar_img, moedas, pontos, data_criacao FROM perfil WHERE id_usuario = ?',
    [idUsuario]
  );
  return linhas[0] ?? null;
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    'SELECT id, id_usuario, apelido, avatar_img, moedas, pontos FROM perfil WHERE id = ?',
    [id]
  );
  return linhas[0] ?? null;
}

export async function criar({ idUsuario, apelido, avatarImg = null }) {
  const resultado = await consultar('INSERT INTO perfil (id_usuario, apelido, avatar_img) VALUES (?, ?, ?)', [
    idUsuario,
    apelido,
    avatarImg,
  ]);
  return resultado.insertId;
}

export async function atualizar(id, { apelido = null, avatarImg = null }) {
  const resultado = await consultar(
    `UPDATE perfil
        SET apelido    = COALESCE(?, apelido),
            avatar_img = COALESCE(?, avatar_img)
      WHERE id = ?`,
    [apelido, avatarImg, id]
  );
  return resultado.affectedRows;
}

export async function remover(id) {
  const resultado = await consultar('DELETE FROM perfil WHERE id = ?', [id]);
  return resultado.affectedRows;
}
