import { consultar, consultarEm } from '../config/database.js';

/**
 * `schedules` — em que dias da semana o jogador diz que vai jogar.
 *
 * Este arquivo mudou de assunto, não só de nome. O `cronograma` antigo era um
 * container de metas criado sob demanda para satisfazer uma foreign key; a
 * meta agora aponta para o usuário direto. O que sobrou com o nome
 * `schedules` é a disponibilidade semanal escolhida no onboarding, que a
 * geração de tarefas e a sequência (streak) usam para saber que dia cobrar.
 *
 * `weekday` segue a convenção do JavaScript: 0 é domingo, 6 é sábado. O banco
 * garante o intervalo (`ck_schedules_weekday`) e um registro por dia
 * (`uq_schedules_user_weekday`).
 */

export async function listarPorUsuario(idUsuario) {
  return consultar(
    `SELECT id, user_id, weekday, is_available
       FROM schedules
      WHERE user_id = ?
      ORDER BY weekday`,
    [idUsuario],
  );
}

/** Só os dias marcados, no formato que a lógica de sequência espera: [1, 3, 5]. */
export async function diasDisponiveis(idUsuario) {
  const linhas = await consultar(
    'SELECT weekday FROM schedules WHERE user_id = ? AND is_available = 1 ORDER BY weekday',
    [idUsuario],
  );
  return linhas.map((linha) => Number(linha.weekday));
}

/**
 * Marca ou desmarca um dia. O `ON DUPLICATE KEY UPDATE` se apoia na UNIQUE
 * (user_id, weekday): a segunda gravação do mesmo dia corrige a linha em vez
 * de estourar, que é o que o onboarding precisa quando o jogador volta e muda
 * de ideia.
 */
export async function definirDia(conexao, { idUsuario, diaSemana, disponivel }) {
  await consultarEm(
    conexao,
    `INSERT INTO schedules (user_id, weekday, is_available)
     VALUES (?, ?, ?) AS novo
     ON DUPLICATE KEY UPDATE is_available = novo.is_available`,
    [idUsuario, diaSemana, disponivel ? 1 : 0],
  );
}

/**
 * Grava a semana inteira de uma vez, a partir da lista de dias escolhidos.
 * Sempre escreve os 7 dias: o que ficou de fora vira `is_available = 0`
 * explicitamente, em vez de ausência de linha. Ausência é ambígua — não dá
 * para distinguir "não joga na terça" de "ainda não respondeu".
 */
export async function definirSemana(conexao, idUsuario, diasEscolhidos = []) {
  const escolhidos = new Set(diasEscolhidos.map(Number));
  for (let dia = 0; dia <= 6; dia += 1) {
    await definirDia(conexao, { idUsuario, diaSemana: dia, disponivel: escolhidos.has(dia) });
  }
  return escolhidos.size;
}
