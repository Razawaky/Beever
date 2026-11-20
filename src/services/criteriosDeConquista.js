import { erroValidacao } from '../utils/erros.js';

/**
 * Os tipos de critério que uma conquista pode ter (RF-GAM-01).
 *
 * Mora sozinho e não toca em banco porque é vocabulário: o service de conquista
 * lê daqui para saber o que existe, o seed escreve os mesmos nomes, e o teste
 * consegue exercitar a regra sem subir MySQL.
 *
 * Cada tipo é uma pergunta que o sistema já sabe responder em algum lugar — dias
 * de sequência, favos concluídos, células concluídas, patrimônio, saldo do cofre
 * —, e a conquista só declara qual delas e a partir de que número.
 */

export const CRITERIOS = {
  'sequencia-dias': 'Dias seguidos de sequência',
  'favos-concluidos': 'Favos concluídos',
  'celulas-concluidas': 'Células concluídas',
  'patrimonio-total': 'Patrimônio alcançado',
  'cofre-guardado': 'Mel guardado no cofre',
};

export function ehCriterioConhecido(tipo) {
  return Object.hasOwn(CRITERIOS, tipo);
}

export function exigirCriterioConhecido(tipo) {
  if (!ehCriterioConhecido(tipo)) {
    throw erroValidacao(`Critério de conquista desconhecido: "${tipo}"`);
  }
}

/**
 * Quais conquistas daquele critério um número alcança.
 *
 * Devolve **todas** as que ficaram para trás, e não só a maior: quem passa de
 * zero para sessenta células concluídas de uma vez merece os degraus que pulou,
 * e a UNIQUE do banco é quem impede pagar duas vezes.
 *
 * A comparação é "alcançou ou passou", nunca "é exatamente igual". O marco de
 * sequência de hoje compara igualdade, e por isso quem pula de 6 para 8 dias com
 * uma virada de fuso perde o marco de 7 sem nunca mais recuperá-lo.
 */
export function conquistasAlcancadas(catalogo, valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return [];

  return catalogo.filter((conquista) => numero >= Number(conquista.criterion_target));
}

/**
 * O quanto falta para a próxima conquista daquele critério, para a tela dizer
 * "faltam 3 células" em vez de só mostrar o que já foi.
 *
 * `null` quando não há próxima: a criança chegou ao fim da escada daquela
 * família, e inventar um degrau seria mentir sobre o catálogo.
 */
export function proximaConquista(catalogo, valor) {
  const numero = Number(valor);
  const pendentes = catalogo
    .filter((conquista) => Number(conquista.criterion_target) > numero)
    .sort((uma, outra) => Number(uma.criterion_target) - Number(outra.criterion_target));

  if (pendentes.length === 0) return null;

  const proxima = pendentes[0];
  return { conquista: proxima, falta: Number(proxima.criterion_target) - numero };
}
