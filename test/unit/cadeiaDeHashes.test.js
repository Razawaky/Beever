import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HASH_GENESIS, calcularHash, verificarCadeia } from '../../src/utils/cadeiaDeHashes.js';

function montarCadeia() {
  const dados = [
    ['2026-11-09T10:00:00.000Z', '1', 'CRIACAO_USUARIO'],
    ['2026-11-09T10:05:00.000Z', '1', 'LICAO_CONCLUIDA'],
    ['2026-11-09T10:10:00.000Z', '2', 'COMPRA_ITEM'],
  ];
  let anterior = HASH_GENESIS;
  return dados.map(([data_hora, usuario, acao], i) => {
    const hash_atual = calcularHash(data_hora, usuario, acao, anterior);
    const bloco = { id: i + 1, data_hora, usuario, acao, hash_anterior: anterior, hash_atual };
    anterior = hash_atual;
    return bloco;
  });
}

test('cadeia íntegra é considerada válida', () => {
  assert.deepEqual(verificarCadeia(montarCadeia()), { valido: true, totalBlocos: 3 });
});

test('cadeia vazia é válida', () => {
  assert.equal(verificarCadeia([]).valido, true);
});

test('alterar o conteúdo de um bloco é detectado', () => {
  const cadeia = montarCadeia();
  cadeia[0].acao = 'ALTERADO_PELO_HACKER';
  const r = verificarCadeia(cadeia);
  assert.equal(r.valido, false);
  assert.equal(r.blocoInvalido, 1);
});

test('alterar o bloco e recalcular só o hash dele quebra o elo seguinte', () => {
  const cadeia = montarCadeia();
  cadeia[0].acao = 'ALTERADO_PELO_HACKER';
  cadeia[0].hash_atual = calcularHash(cadeia[0].data_hora, cadeia[0].usuario, cadeia[0].acao, cadeia[0].hash_anterior);
  const r = verificarCadeia(cadeia);
  assert.equal(r.valido, false);
  assert.equal(r.blocoInvalido, 2);
});

test('remover um bloco do meio é detectado', () => {
  const cadeia = montarCadeia();
  cadeia.splice(1, 1);
  assert.equal(verificarCadeia(cadeia).valido, false);
});