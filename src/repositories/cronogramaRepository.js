import { consultar } from '../config/database.js';

/**
 * Acesso a dados de `cronograma`. Não tem tela própria: é o "balde" que a
 * meta precisa por causa da foreign key. Cada perfil tem no máximo um,
 * criado sob demanda na primeira meta.
 */

export async function buscarAtivoDoPerfil(idPerfil) {
  const linhas = await consultar(
    `SELECT id, id_perfil, descricao, data_inicio, data_fim
       FROM cronograma
      WHERE id_perfil = ?
      ORDER BY id
      LIMIT 1`,
    [idPerfil]
  );
  return linhas[0] ?? null;
}

export async function criarPadrao(idPerfil) {
  const resultado = await consultar(
    `INSERT INTO cronograma (id_perfil, descricao, data_inicio, data_fim)
     VALUES (?, 'Cronograma pessoal', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))`,
    [idPerfil]
  );
  return resultado.insertId;
}
