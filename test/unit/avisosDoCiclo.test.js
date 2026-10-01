import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { avisoDosCiclos } from '../../src/services/economicCycleService.js';

/**
 * O resumo do ciclo virando frase (RF-HOM-09).
 *
 * O que estes testes protegem: ciclo silencioso não vira aviso, vários ciclos
 * viram um aviso só com os números somados, e a venda forçada é explicada com o
 * motivo e o valor — a regra é dura, o texto não precisa ser.
 */

function ciclo(numero, campos = {}) {
  return {
    numero,
    valorizacao: 0,
    depreciacao: 0,
    renda: 0,
    custo: 0,
    inadimplentes: [],
    vendidos: [],
    rendimentoDoCofre: 0,
    metaDoCofre: null,
    ...campos,
  };
}

describe('aviso do ciclo', () => {
  it('sem ciclo nenhum não há aviso', () => {
    assert.equal(avisoDosCiclos([]), null);
    assert.equal(avisoDosCiclos(null), null);
  });

  it('ciclo em que nada aconteceu não vira aviso', () => {
    assert.equal(avisoDosCiclos([ciclo(1)]), null);
  });

  it('ciclo pulado pelo teto não conta como semana vivida', () => {
    assert.equal(avisoDosCiclos([{ numero: 1, pulado: true }]), null);
  });

  it('conta a renda, o custo e o rendimento do cofre', () => {
    const aviso = avisoDosCiclos([ciclo(1, { renda: 40, custo: 15, rendimentoDoCofre: 20 })]);

    assert.equal(aviso.semanas, 1);
    assert.deepEqual(aviso.frases, [
      'Seus negócios renderam 40 de mel.',
      'Seu cofre rendeu 20 de mel.',
      'As contas dos seus itens custaram 15 de mel.',
    ]);
  });

  it('seis ciclos viram um aviso só, com os números somados', () => {
    const ciclos = Array.from({ length: 6 }, (_, indice) => ciclo(indice + 1, { renda: 40, custo: 10 }));

    const aviso = avisoDosCiclos(ciclos);

    assert.equal(aviso.semanas, 6);
    assert.ok(aviso.frases.includes('Seus negócios renderam 240 de mel.'));
    assert.ok(aviso.frases.includes('As contas dos seus itens custaram 60 de mel.'));
  });

  it('a valorização e a depreciação aparecem separadas', () => {
    const aviso = avisoDosCiclos([ciclo(1, { valorizacao: 30, depreciacao: 12 })]);

    assert.ok(aviso.frases.includes('Seus bens ganharam 30 de valor.'));
    assert.ok(aviso.frases.includes('Seus bens perderam 12 de valor.'));
  });

  it('o item que ficou devendo é avisado uma vez só, com o que acontece depois', () => {
    const aviso = avisoDosCiclos([
      ciclo(1, { inadimplentes: ['Moto'] }),
      ciclo(2, { inadimplentes: ['Moto'] }),
    ]);

    const sobreAMoto = aviso.frases.filter((frase) => frase.includes('Moto'));
    assert.equal(sobreAMoto.length, 1, 'repetir o mesmo item duas vezes vira parede de texto');
    assert.match(sobreAMoto[0], /Duas semanas sem pagar e o item é vendido/);
  });

  it('a venda forçada diz o motivo e o valor', () => {
    const aviso = avisoDosCiclos([ciclo(3, { vendidos: [{ item: 'Moto', valor: 1200 }] })]);

    assert.equal(
      aviso.frases[0],
      'Moto foi vendido por 1200 de mel porque as contas dele ficaram duas semanas sem pagar.',
    );
  });

  it('bater a meta do cofre entra no aviso', () => {
    const aviso = avisoDosCiclos([ciclo(1, { metaDoCofre: { alvo: 1000, bonus: 50 } })]);

    assert.deepEqual(aviso.frases, ['Você bateu a meta do cofre e ganhou 50 de mel.']);
  });
});
