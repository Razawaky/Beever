import * as metricsRepository from '../repositories/metricsRepository.js';

/**
 * As métricas agregadas do painel (RF-ADM-04).
 *
 * Quatro perguntas: quantos jogadores apareceram, quanto foi concluído, o que
 * mais vendeu, e — a que interessa ao produto — dos dias que a criança marcou na
 * agenda, quantos ela cumpriu.
 *
 * Nenhum número identifica ninguém. Item mais comprado é agregado por item, e a
 * retenção é percentual: o painel mostra o que aconteceu, nunca quem fez.
 */

/** Os recortes que a tela oferece. Trinta dias é o padrão: um mês de uso. */
export const PERIODOS_EM_DIAS = [7, 14, 30, 90, 180];
const PERIODO_PADRAO = 30;

/** A altura do desenho, em unidades do `viewBox`. Largura vem da contagem de dias. */
const ALTURA_DO_GRAFICO = 100;

/** Recorte pedido, ou o padrão quando veio vazio ou fora da lista. */
export function periodoEmDias(pedido) {
  const dias = Number.parseInt(pedido, 10);
  return PERIODOS_EM_DIAS.includes(dias) ? dias : PERIODO_PADRAO;
}

/** O intervalo fechado que as consultas recebem, do primeiro ao último segundo. */
export function intervaloDoPeriodo(dias, agora = new Date()) {
  const ate = new Date(agora);
  const de = new Date(agora);
  de.setDate(de.getDate() - (dias - 1));

  const paraSql = (data, hora) => `${data.toISOString().slice(0, 10)} ${hora}`;
  return { de: paraSql(de, '00:00:00'), ate: paraSql(ate, '23:59:59') };
}

/**
 * Percentual inteiro, com zero denominador virando `null` em vez de zero.
 *
 * A diferença importa na tela: zero por cento diz "ninguém cumpriu", e `null`
 * diz "ainda não houve dia marcado para cumprir".
 */
export function percentual(parte, total) {
  if (!total) return null;
  return Math.round((parte / total) * 100);
}

/**
 * A retenção da RN-019 lida de trás para frente: dos dias que já foram
 * avaliados, quantos por cento a criança cumpriu.
 *
 * O dia protegido pelo escudo conta como não cumprido: o escudo salva a
 * sequência dela, e não muda o fato de que aquele dia não teve célula.
 */
export function retencaoDosDiasMarcados(desfechos = {}) {
  const cumpridos = desfechos.cumprido ?? 0;
  const perdidos = desfechos.perdido ?? 0;
  const protegidos = desfechos.protegido ?? 0;
  const avaliados = cumpridos + perdidos + protegidos;

  return { cumpridos, perdidos, protegidos, avaliados, percentual: percentual(cumpridos, avaliados) };
}

export async function metricasDoPeriodo(diasPedidos, agora = new Date()) {
  const dias = periodoEmDias(diasPedidos);
  const { de, ate } = intervaloDoPeriodo(dias, agora);

  // Em paralelo porque nenhuma depende da outra: quatro consultas agregadas
  // esperando uma pela outra somariam o tempo de todas no teto da RNF-01.
  const [jogadoresAtivos, conclusoes, porDia, itens, desfechos] = await Promise.all([
    metricsRepository.contarJogadoresAtivos(de, ate),
    metricsRepository.contarConclusoes(de, ate),
    metricsRepository.conclusoesPorDia(de, ate),
    metricsRepository.itensMaisComprados(de, ate),
    metricsRepository.desfechosDosDiasMarcados(de, ate),
  ]);

  return {
    dias,
    periodos: PERIODOS_EM_DIAS,
    jogadoresAtivos,
    conclusoes: conclusoes.conclusoes,
    celulasTocadas: conclusoes.celulas,
    itensMaisComprados: itens,
    retencao: retencaoDosDiasMarcados(desfechos),
    grafico: barrasDoGrafico(porDia),
    alturaDoGrafico: ALTURA_DO_GRAFICO,
  };
}

/**
 * As barras do gráfico, em altura proporcional à maior do período.
 *
 * O gráfico é SVG, e altura de `<rect>` é atributo de geometria, não estilo —
 * por isso ela pode vir pronta daqui sem esbarrar na CSP, que é o motivo de a
 * barra de progresso usar classe em vez de número. Mesma escolha do Cofre do
 * Tempo, desde a E07.
 *
 * Dia com conclusão nunca desenha barra de altura zero: um traço mínimo é a
 * diferença entre "ninguém jogou" e "quase ninguém jogou".
 */
export function barrasDoGrafico(porDia = []) {
  if (porDia.length === 0) return [];

  const maior = Math.max(...porDia.map((linha) => Number(linha.total)));

  return porDia.map((linha) => {
    const total = Number(linha.total);
    const altura = Math.max(2, Math.round((total / maior) * ALTURA_DO_GRAFICO));

    return { dia: linha.dia, total, altura, topo: ALTURA_DO_GRAFICO - altura };
  });
}
