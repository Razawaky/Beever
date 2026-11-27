import crypto from 'node:crypto';

export const HASH_GENESIS = '0'.repeat(64);

export function calcularHash(dataHora, usuario, acao, hashAnterior) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify([dataHora, usuario, acao, hashAnterior]))
    .digest('hex');
}

/** Recebe os blocos em ordem e aponta o primeiro que não confere. */
export function verificarCadeia(blocos) {
  let esperado = HASH_GENESIS;

  for (const b of blocos) {
    if (b.hash_anterior !== esperado) {
      return { valido: false, blocoInvalido: b.id, motivo: 'Elo quebrado: hash_anterior não bate com o bloco anterior' };
    }
    if (calcularHash(b.data_hora, b.usuario, b.acao, b.hash_anterior) !== b.hash_atual) {
      return { valido: false, blocoInvalido: b.id, motivo: 'Conteúdo alterado: o hash do bloco não confere' };
    }
    esperado = b.hash_atual;
  }
  return { valido: true, totalBlocos: blocos.length };
}