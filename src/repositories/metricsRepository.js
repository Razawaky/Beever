import { consultar } from '../config/database.js';
import { limiteSeguro } from '../utils/limite.js';

/**
 * As consultas agregadas do painel administrativo (RF-ADM-04).
 *
 * Todas recebem o mesmo par de instantes e respondem um número ou uma lista
 * curta — nenhuma devolve linha de jogador. O painel mostra o que aconteceu, não
 * quem fez, e agregado é o que a RN-053 chama de registro que pode sobreviver.
 *
 * Os índices que sustentam estas quatro consultas são da migration 021: sem
 * eles, cada uma varre a tabela que mais cresce no sistema.
 */

/** Quantos jogadores diferentes concluíram ao menos uma partida no período. */
export async function contarJogadoresAtivos(de, ate) {
  const linhas = await consultar(
    `SELECT COUNT(DISTINCT gs.user_id) AS total
       FROM game_sessions gs
       JOIN game_session_statuses st ON st.id = gs.status_id
      WHERE st.slug = 'concluida' AND gs.finished_at BETWEEN ? AND ?`,
    [de, ate],
  );
  return Number(linhas[0]?.total ?? 0);
}

/**
 * Conclusões de célula no período, e quantas células distintas foram tocadas.
 *
 * Os dois números respondem coisas diferentes: repetir a mesma célula cinco
 * vezes conta cinco conclusões e uma célula, e a diferença entre eles é o quanto
 * o acervo está sendo revisitado.
 */
export async function contarConclusoes(de, ate) {
  const linhas = await consultar(
    `SELECT COUNT(*) AS conclusoes, COUNT(DISTINCT gs.cell_id) AS celulas
       FROM game_sessions gs
       JOIN game_session_statuses st ON st.id = gs.status_id
      WHERE st.slug = 'concluida' AND gs.finished_at BETWEEN ? AND ?`,
    [de, ate],
  );
  return {
    conclusoes: Number(linhas[0]?.conclusoes ?? 0),
    celulas: Number(linhas[0]?.celulas ?? 0),
  };
}

/** Conclusões por dia, na ordem do calendário. É o que o gráfico desenha. */
export async function conclusoesPorDia(de, ate) {
  return consultar(
    `SELECT DATE(gs.finished_at) AS dia, COUNT(*) AS total
       FROM game_sessions gs
       JOIN game_session_statuses st ON st.id = gs.status_id
      WHERE st.slug = 'concluida' AND gs.finished_at BETWEEN ? AND ?
      GROUP BY DATE(gs.finished_at)
      ORDER BY dia`,
    [de, ate],
  );
}

/** Os itens que mais venderam no período, com quanto de mel saiu em cada um. */
export async function itensMaisComprados(de, ate, limite = 5) {
  return consultar(
    `SELECT i.id, i.name, i.image_path,
            SUM(p.quantity) AS unidades,
            SUM(p.total_price) AS mel
       FROM purchases p
       JOIN items i ON i.id = p.item_id
      WHERE p.purchased_at BETWEEN ? AND ?
      GROUP BY i.id, i.name, i.image_path
      ORDER BY unidades DESC, mel DESC
      LIMIT ${limiteSeguro(limite, { padrao: 5, maximo: 20 })}`,
    [de, ate],
  );
}

/**
 * Os dias marcados que já foram avaliados no período, por desfecho.
 *
 * Dia neutro fica de fora: ele é dia que a criança não marcou na agenda, e
 * contá-lo diluiria a retenção com dias em que ninguém prometeu aparecer.
 */
export async function desfechosDosDiasMarcados(de, ate) {
  const linhas = await consultar(
    `SELECT tipo.slug, COUNT(*) AS total
       FROM streak_events evento
       JOIN streak_event_types tipo ON tipo.id = evento.event_type_id
      WHERE evento.event_date BETWEEN ? AND ? AND tipo.slug <> 'neutro'
      GROUP BY tipo.slug`,
    [de, ate],
  );

  return Object.fromEntries(linhas.map((linha) => [linha.slug, Number(linha.total)]));
}
