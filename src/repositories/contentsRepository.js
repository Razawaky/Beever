import { consultar } from '../config/database.js';

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

/** Quais das células recebidas já têm conteúdo. A trilha usa para não abrir célula vazia. */
export async function listarCelulasComConteudo(idsDeCelula = []) {
  if (idsDeCelula.length === 0) return [];

  const marcadores = Array(idsDeCelula.length).fill('?').join(', ');
  const linhas = await consultar(
    `SELECT DISTINCT ct.cell_id
       FROM contents ct
      WHERE ct.cell_id IN (${marcadores}) AND ${ATIVO}`,
    idsDeCelula,
  );
  return linhas.map((linha) => Number(linha.cell_id));
}
