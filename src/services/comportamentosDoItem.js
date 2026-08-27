/**
 * Os comportamentos econômicos que os números de um item implicam (RN-034 e
 * RN-035).
 *
 * Mora sozinho, sem tocar em banco, porque tem dois consumidores: o painel
 * administrativo, ao salvar um item, e o `scripts/seed.js`, ao montar o catálogo
 * de exemplo. A derivação já foi um `INSERT ... SELECT` dentro do seed, e com
 * duas cópias da regra elas divergiriam na primeira mudança.
 */

/** Um item pode ter mais de um; `neutro` só vale quando nenhum dos outros vale. */
export function comportamentosDosNumeros({ taxaDeValorizacao, custoFixo, rendaPorCiclo }) {
  const comportamentos = [];
  if (taxaDeValorizacao > 0) comportamentos.push('valoriza');
  if (taxaDeValorizacao < 0) comportamentos.push('deprecia');
  if (custoFixo > 0) comportamentos.push('custo_fixo');
  if (rendaPorCiclo > 0) comportamentos.push('gera_renda');
  return comportamentos.length > 0 ? comportamentos : ['neutro'];
}
