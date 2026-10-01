/**
 * Qual atividade do acervo da célula a partida vai usar (T-12.5).
 *
 * Mora sozinho e não toca em banco porque é a regra que precisa de teste sem
 * sorte envolvida: o sorteador entra como parâmetro, e o teste passa um que não
 * sorteia nada.
 *
 * "Adaptativo" aqui é o que a RN-029 já diz — o acervo é o da célula, e a célula
 * tem faixa etária. O que esta função acrescenta é não repetir a atividade da
 * partida anterior, que é a única coisa que a criança percebe.
 */
export function sortearAtividade(acervo, idDaUltimaJogada = null, sorteador = Math.random) {
  if (acervo.length === 0) return null;

  const outras = acervo.filter((atividade) => Number(atividade.id) !== Number(idDaUltimaJogada));
  // Acervo de uma atividade só cai aqui: repetir é melhor do que não ter jogo.
  const candidatas = outras.length > 0 ? outras : acervo;

  return candidatas[Math.floor(sorteador() * candidatas.length)];
}
