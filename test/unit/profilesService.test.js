import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as profilesService from '../../src/services/profilesService.js';

/**
 * As regras do perfil que valem antes de qualquer ida ao banco.
 *
 * Elas ficam no service, e não só no validador da rota, porque validador é a
 * primeira barreira e não a única: quem chamar o service por outro caminho — um
 * script, um cliente futuro — merece erro de validação, não uma violação de
 * CHECK chegando ao jogador como 500. Como todas estas recusas acontecem antes
 * da checagem de posse, dá para testá-las sem banco nenhum.
 */

describe('profilesService — recusas que não dependem do banco', () => {
  // 30 e 45 passaram a valer na T-04.3; 7 nunca esteve na lista da RN-011.
  it('recusa tempo de sessão fora das durações da RN-011', async () => {
    await assert.rejects(() => profilesService.atualizar(1, 1, { minutosPorSessao: 7 }), /Tempo por sessão inválido/);
  });

  it('recusa concluir o onboarding sem nenhum dia marcado (RF-ONB-03)', async () => {
    await assert.rejects(
      () => profilesService.salvarOnboarding(1, 1, { apelido: 'abelha', nivel: 'beginner', dias: [] }),
      /pelo menos um dia/,
    );
  });

  it('recusa gravar um passo que não está na lista do onboarding', async () => {
    await assert.rejects(
      () => profilesService.salvarPassoDoOnboarding(1, 1, { passo: 'salario', resposta: 'muito' }),
      /Passo de onboarding desconhecido/,
    );
  });

  /**
   * O nível é passo do wizard, mas não tem gravação por passo: ele lança XP no
   * livro, e um lançamento desses não pode acontecer num onboarding que talvez
   * nunca termine. Quem o grava é a transação da conclusão.
   */
  it('recusa gravar o nível fora da conclusão do onboarding', async () => {
    await assert.rejects(
      () => profilesService.salvarPassoDoOnboarding(1, 1, { passo: 'nivel', resposta: 'advanced' }),
      /gravado ao concluir/,
    );
  });

  it('mantém a ordem de passos da RN-011, sem faixa etária e com nível no fim', () => {
    assert.deepEqual(profilesService.PASSOS_DO_ONBOARDING, [
      'apelido',
      'dias',
      'tempo',
      'objetivo',
      'avatar',
      'preferencias',
      'nivel',
    ]);
  });
});
