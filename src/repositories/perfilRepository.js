import { consultar } from '../config/database.js';

/** Acesso a dados de `perfil`. Perfil é 1:1 com usuário — sem listagem, sem login próprio. */

export async function buscarPorUsuario(idUsuario) {
  const linhas = await consultar(
    'SELECT id, id_usuario, apelido, avatar_img, moedas, pontos, onboarding_concluido, data_criacao FROM perfil WHERE id_usuario = ?',
    [idUsuario]
  );
  return linhas[0] ?? null;
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    'SELECT id, id_usuario, apelido, avatar_img, moedas, pontos, onboarding_concluido FROM perfil WHERE id = ?',
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

export async function marcarOnboardingConcluido(id) {
  const resultado = await consultar('UPDATE perfil SET onboarding_concluido = 1 WHERE id = ?', [id]);
  return resultado.affectedRows;
}

/**
 * Debita moedas só se houver saldo — o `WHERE moedas >= ?` faz a checagem e o
 * desconto na mesma instrução, então duas compras simultâneas do mesmo perfil
 * nunca deixam o saldo negativo (a CHECK da tabela é a rede de segurança
 * final, esta consulta evita depender só dela). `affectedRows === 0` quer
 * dizer saldo insuficiente.
 */
export async function debitarMoedas(conexao, id, quantidade) {
  const [resultado] = await conexao.execute('UPDATE perfil SET moedas = moedas - ? WHERE id = ? AND moedas >= ?', [
    quantidade,
    id,
    quantidade,
  ]);
  return resultado.affectedRows;
}

export async function creditarPontos(conexao, id, quantidade) {
  const [resultado] = await conexao.execute('UPDATE perfil SET pontos = pontos + ? WHERE id = ?', [quantidade, id]);
  return resultado.affectedRows;
}
