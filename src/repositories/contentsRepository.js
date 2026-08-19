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
