import { consultar, consultarEm } from '../config/database.js';

/**
 * `contents` — o corpo da atividade de cada célula, em JSON.
 *
 * O banco garante duas coisas: que o JSON é sintaticamente válido e que ele
 * pertence a uma célula. Se o conteúdo faz sentido para o jogo, quem diz é o
 * validador da aplicação (E07), escolhido por `cells.game_type_id`.
 *
 * `version` existe para o formato poder mudar sem quebrar o que já foi
 * respondido: a busca traz sempre a maior versão ativa.
 */

const CAMPOS = 'ct.id, ct.cell_id, ct.version, ct.body, ct.created_at';

const ATIVO = 'ct.is_active = 1 AND ct.deleted_at IS NULL';

/**
 * O acervo da célula: todas as atividades ativas dela, da mais nova para a mais
 * velha (T-12.5).
 *
 * Publicar substituindo aposenta as anteriores e deixa uma só; publicar somando
 * ao acervo mantém as outras ativas, e é este conjunto que a partida sorteia.
 */
export async function listarAcervoDaCelula(idCelula) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM contents ct
      WHERE ct.cell_id = ? AND ${ATIVO}
      ORDER BY ct.version DESC`,
    [idCelula],
  );
}

/** Uma atividade específica, mesmo desativada: é o que a partida jogada usou. */
export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM contents ct
      WHERE ct.id = ?`,
    [id],
  );
  return linhas[0] ?? null;
}

/** Tira uma atividade do acervo sem apagar: a partida antiga ainda aponta para ela. */
export async function desativarVersao(idCelula, versao) {
  const resultado = await consultar('UPDATE contents SET is_active = 0 WHERE cell_id = ? AND version = ?', [
    idCelula,
    versao,
  ]);
  return resultado.affectedRows;
}

/** A versão mais recente do conteúdo da célula. `null` se ela ainda não tem. */
export async function buscarAtualDaCelula(idCelula) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM contents ct
      WHERE ct.cell_id = ? AND ${ATIVO}
      ORDER BY ct.version DESC
      LIMIT 1`,
    [idCelula],
  );
  return linhas[0] ?? null;
}

export async function listarVersoesDaCelula(idCelula) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM contents ct
      WHERE ct.cell_id = ? AND ${ATIVO}
      ORDER BY ct.version DESC`,
    [idCelula],
  );
}

/**
 * O conteúdo atual de várias células de uma vez.
 *
 * A trilha usa para dois fins: saber se a célula tem conteúdo e perguntar ao
 * validador se esse conteúdo dá para jogar. Antes só os ids voltavam, e a
 * consequência foi um botão "Jogar" em célula com conteúdo de demonstração.
 */
export async function listarConteudoAtualDasCelulas(idsDeCelula = []) {
  if (idsDeCelula.length === 0) return [];

  const marcadores = Array(idsDeCelula.length).fill('?').join(', ');
  return consultar(
    `SELECT ct.cell_id, ct.body
       FROM contents ct
      WHERE ct.cell_id IN (${marcadores}) AND ${ATIVO}
        AND ct.version = (
              SELECT MAX(recente.version)
                FROM contents recente
               WHERE recente.cell_id = ct.cell_id AND recente.is_active = 1 AND recente.deleted_at IS NULL
            )`,
    idsDeCelula,
  );
}

/** A maior versão já gravada da célula, ativa ou não. Zero quando não há nenhuma. */
export async function ultimaVersaoDaCelula(idCelula) {
  const linhas = await consultar(
    'SELECT COALESCE(MAX(version), 0) AS ultima FROM contents WHERE cell_id = ?',
    [idCelula],
  );
  return Number(linhas[0]?.ultima ?? 0);
}

export async function criarVersao(idCelula, versao, corpo, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    'INSERT INTO contents (cell_id, version, body) VALUES (?, ?, CAST(? AS JSON))',
    [idCelula, versao, JSON.stringify(corpo)],
  );
  return resultado.insertId;
}

/**
 * Desativa o que veio antes da versão nova.
 *
 * A versão antiga continua na tabela em vez de ser apagada: é ela que explica o
 * que a criança respondeu numa partida de ontem.
 */
export async function desativarVersoesAnteriores(idCelula, versaoNova, conexao = null) {
  await consultarEm(conexao, 'UPDATE contents SET is_active = 0 WHERE cell_id = ? AND version < ?', [
    idCelula,
    versaoNova,
  ]);
}
