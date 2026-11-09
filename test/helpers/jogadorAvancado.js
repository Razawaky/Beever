/**
 * Monta o jogador avançado do aceite da E10: trilha grande, muita célula
 * concluída, inventário cheio e cofre com saldo.
 *
 * O cenário é montado aqui, e não num seed de desenvolvimento, porque o banco de
 * teste nasce do zero a cada arquivo e o cenário fica legível ao lado do que ele
 * afirma. Cada tabela leva um `INSERT` só: preparo lento dominaria a medição de
 * tempo que o arquivo existe para fazer.
 */

const FAVOS = 5;
const CELULAS_POR_FAVO = 12;
const CELULAS_CONCLUIDAS = 50;
const UNIDADES_NO_INVENTARIO = 12;

/** Um quiz válido, para as células oferecerem jogo de verdade. */
const QUIZ = {
  tipo: 'quiz',
  perguntas: [
    {
      enunciado: 'Guardar mel no cofre faz o quê?',
      alternativas: ['Rende juros toda semana', 'Some com o mel', 'Nada'],
      correta: 0,
    },
  ],
};

/**
 * Cria a trilha extra e o progresso do jogador. Devolve os números do cenário,
 * para o teste afirmar em cima deles em vez de repetir constantes.
 */
export async function montarJogadorAvancado(conexao, idUsuario, { codigoDaFaixa = 'C' } = {}) {
  const [[faixa]] = await conexao.query('SELECT id FROM age_bands WHERE code = ?', [codigoDaFaixa]);
  const [[jogo]] = await conexao.query("SELECT id FROM game_types WHERE slug = 'quiz-do-favo'");
  const [[ultimo]] = await conexao.query(
    'SELECT COALESCE(MAX(order_index), 0) AS ultimo FROM hives WHERE age_band_id = ?',
    [faixa.id],
  );

  const favos = [];
  for (let numero = 1; numero <= FAVOS; numero += 1) {
    favos.push([
      `aceite-favo-${numero}`,
      `Favo do aceite ${numero}`,
      'Favo criado pelo teste de aceite da Colmeia.',
      Number(ultimo.ultimo) + numero,
      faixa.id,
    ]);
  }

  await conexao.query(
    'INSERT INTO hives (slug, title, description, order_index, age_band_id) VALUES ?',
    [favos],
  );

  const [criados] = await conexao.query(
    "SELECT id FROM hives WHERE slug LIKE 'aceite-favo-%' ORDER BY order_index",
  );

  const celulas = [];
  for (const favo of criados) {
    for (let ordem = 1; ordem <= CELULAS_POR_FAVO; ordem += 1) {
      celulas.push([favo.id, jogo.id, faixa.id, ordem, `Célula ${ordem} do favo ${favo.id}`]);
    }
  }

  await conexao.query(
    'INSERT INTO cells (hive_id, game_type_id, age_band_id, order_index, title) VALUES ?',
    [celulas],
  );

  const [celulasCriadas] = await conexao.query(
    `SELECT c.id, c.hive_id
       FROM cells c
       JOIN hives h ON h.id = c.hive_id
      WHERE h.slug LIKE 'aceite-favo-%'
      ORDER BY h.order_index, c.order_index`,
  );

  await conexao.query('INSERT INTO contents (cell_id, version, body) VALUES ?', [
    celulasCriadas.map((celula) => [celula.id, 1, JSON.stringify(QUIZ)]),
  ]);

  // As primeiras 50 células ficam concluídas, na ordem da trilha: é assim que o
  // jogador avançado chega ao meio do quinto favo.
  const concluidas = celulasCriadas.slice(0, CELULAS_CONCLUIDAS);
  await conexao.query(
    `INSERT INTO cell_progress (user_id, cell_id, stars, attempts, errors, best_score, first_completed_at, last_completed_at)
     VALUES ?`,
    [concluidas.map((celula) => [idUsuario, celula.id, 3, 1, 0, 100, new Date(), new Date()])],
  );

  await conexao.query(
    `INSERT INTO hive_progress (user_id, hive_id, completed_cells, total_cells, percent, completed_at)
     SELECT ?, c.hive_id, COUNT(p.id), ?, ROUND(COUNT(p.id) * 100 / ?),
            IF(COUNT(p.id) = ?, NOW(), NULL)
       FROM cells c
       LEFT JOIN cell_progress p ON p.cell_id = c.id AND p.user_id = ?
       JOIN hives h ON h.id = c.hive_id
      WHERE h.slug LIKE 'aceite-favo-%'
      GROUP BY c.hive_id`,
    [idUsuario, CELULAS_POR_FAVO, CELULAS_POR_FAVO, CELULAS_POR_FAVO, idUsuario],
  );

  const [itens] = await conexao.query(
    'SELECT id, price FROM items WHERE is_active = 1 ORDER BY price LIMIT ?',
    [UNIDADES_NO_INVENTARIO],
  );

  const [[ativo]] = await conexao.query("SELECT id FROM inventory_statuses WHERE slug = 'ativo'");
  await conexao.query('INSERT INTO inventory (user_id, item_id, status_id, current_value) VALUES ?', [
    itens.map((item) => [idUsuario, item.id, ativo.id, Number(item.price)]),
  ]);

  return {
    favos: FAVOS,
    celulas: celulasCriadas.length,
    celulasConcluidas: CELULAS_CONCLUIDAS,
    unidades: itens.length,
  };
}
