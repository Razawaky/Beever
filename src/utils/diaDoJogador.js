/**
 * O dia do jogador, no fuso dele (RN-024, dívida DT-23).
 *
 * A virada do dia usava o relógio do servidor: quem joga em outro fuso recebia
 * as tarefas e perdia a sequência na hora errada. Aqui o dia sai sempre de
 * `profiles.timezone`.
 *
 * A data anda como texto `AAAA-MM-DD` porque é assim que o banco guarda
 * `streak_events.event_date`, e comparar texto de data é comparar dia — sem
 * horário no meio para atrapalhar.
 */

export const FUSO_PADRAO = 'America/Sao_Paulo';

const MILISSEGUNDOS_POR_DIA = 86400000;

/** Fuso inválido no perfil não pode derrubar a página; cai no padrão. */
export function fusoValido(fuso) {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: fuso });
    return fuso;
  } catch {
    return FUSO_PADRAO;
  }
}

function partesNoFuso(instante, fuso) {
  const formatador = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoValido(fuso),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const partes = {};
  for (const parte of formatador.formatToParts(instante)) {
    if (parte.type !== 'literal') partes[parte.type] = Number(parte.value);
  }
  return partes;
}

function comDoisDigitos(numero) {
  return String(numero).padStart(2, '0');
}

/** A data do jogador naquele instante, como `AAAA-MM-DD`. */
export function dataDoDia(instante = new Date(), fuso = FUSO_PADRAO) {
  const { year, month, day } = partesNoFuso(instante, fuso);
  return `${year}-${comDoisDigitos(month)}-${comDoisDigitos(day)}`;
}

/** Quanto o fuso está adiantado em relação ao UTC naquele instante, em milissegundos. */
function deslocamento(instante, fuso) {
  const { year, month, day, hour, minute, second } = partesNoFuso(instante, fuso);
  const semMilissegundos = Math.floor(instante.getTime() / 1000) * 1000;
  return Date.UTC(year, month - 1, day, hour, minute, second) - semMilissegundos;
}

/**
 * O instante em que aquele dia começa para o jogador.
 *
 * São duas passagens porque o deslocamento pode mudar dentro do próprio dia: no
 * dia em que entra o horário de verão, o do meio-dia não serve para a
 * meia-noite. A primeira passagem chuta, a segunda confere no instante certo.
 */
export function inicioDoDia(dataISO, fuso = FUSO_PADRAO) {
  const meiaNoiteUtc = Date.parse(`${dataISO}T00:00:00Z`);
  const chute = new Date(meiaNoiteUtc - deslocamento(new Date(meiaNoiteUtc), fuso));
  return new Date(meiaNoiteUtc - deslocamento(chute, fuso));
}

/** O instante em que aquele dia acaba — que é o começo do dia seguinte. */
export function fimDoDia(dataISO, fuso = FUSO_PADRAO) {
  return inicioDoDia(somarDias(dataISO, 1), fuso);
}

export function inicioDaSemana(dataISO, fuso = FUSO_PADRAO) {
  return inicioDoDia(somarDias(dataISO, -diaDaSemana(dataISO)), fuso);
}

export function fimDaSemana(dataISO, fuso = FUSO_PADRAO) {
  return inicioDoDia(somarDias(dataISO, 7 - diaDaSemana(dataISO)), fuso);
}

/** 0 é domingo, 6 é sábado — a mesma convenção do `schedulesService`. */
export function diaDaSemana(dataISO) {
  return new Date(`${dataISO}T00:00:00Z`).getUTCDay();
}

export function somarDias(dataISO, dias) {
  const movida = new Date(Date.parse(`${dataISO}T00:00:00Z`) + dias * MILISSEGUNDOS_POR_DIA);
  return movida.toISOString().slice(0, 10);
}

export function diferencaEmDias(dataInicial, dataFinal) {
  return Math.round((Date.parse(`${dataFinal}T00:00:00Z`) - Date.parse(`${dataInicial}T00:00:00Z`)) / MILISSEGUNDOS_POR_DIA);
}

/** Usado pela rotação de tarefas, que gira a lista pelo dia do ano. */
export function diaDoAno(dataISO) {
  return diferencaEmDias(`${dataISO.slice(0, 4)}-01-01`, dataISO) + 1;
}
