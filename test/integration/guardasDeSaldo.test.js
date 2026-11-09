import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import * as walletsRepository from '../../src/repositories/walletsRepository.js';
import * as achievementsService from '../../src/services/achievementsService.js';
import * as coinsService from '../../src/services/coinsService.js';
import * as levelsService from '../../src/services/levelsService.js';
import * as pointsService from '../../src/services/pointsService.js';
import * as vaultService from '../../src/services/vaultService.js';

/**
 * As guardas dos services que mexem em saldo (T-14.2, RNF-28).
 *
 * Toda função que credita ou debita começa recusando o que não é inteiro
 * positivo, e nenhuma dessas recusas era exercitada: a suíte só passava pelo
 * caminho feliz. São elas que impedem meio mel, mel negativo e crédito de `NaN`
 * de chegarem ao livro — onde não haveria como desfazer sem estornar à mão.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const INVALIDOS = [0, -1, 1.5, Number.NaN, '10'];

describe('guardas dos services de saldo', opcoes, () => {
  let banco;
  let idUsuario;

  before(async () => {
    banco = await criarBancoDeTeste();
    const [[usuaria]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', ['ana@beever.dev']);
    idUsuario = Number(usuaria.id);
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('mel: creditar e debitar recusam o que não é inteiro positivo', async () => {
    for (const quantidade of INVALIDOS) {
      await assert.rejects(
        () => emTransacao((conexao) => coinsService.creditar(conexao, idUsuario, quantidade, { motivo: 'ajuste-administrativo' })),
        /inteiro positivo/,
        `creditar aceitou ${String(quantidade)}`,
      );
      await assert.rejects(
        () => emTransacao((conexao) => coinsService.debitar(conexao, idUsuario, quantidade, { motivo: 'ajuste-administrativo' })),
        /inteiro positivo/,
        `debitar aceitou ${String(quantidade)}`,
      );
    }
  });

  it('pólen: creditar recusa o que não é inteiro positivo', async () => {
    for (const quantidade of INVALIDOS) {
      await assert.rejects(
        () => emTransacao((conexao) => pointsService.creditar(conexao, idUsuario, quantidade, { motivo: 'conclusao-celula' })),
        /inteiro positivo/,
        `creditar aceitou ${String(quantidade)}`,
      );
    }
  });

  it('XP: creditar recusa o que não é inteiro positivo', async () => {
    for (const quantidade of INVALIDOS) {
      await assert.rejects(
        () => emTransacao((conexao) => levelsService.creditarXp(conexao, idUsuario, quantidade, { motivo: 'conclusao-celula' })),
        /inteiro positivo/,
        `creditarXp aceitou ${String(quantidade)}`,
      );
    }
  });

  it('cofre: depositar e sacar recusam o que não é inteiro positivo', async () => {
    for (const valor of INVALIDOS) {
      await assert.rejects(() => vaultService.depositar(idUsuario, valor), /inteiro maior que zero/);
      await assert.rejects(() => vaultService.sacar(idUsuario, valor), /inteiro maior que zero/);
    }
  });

  /**
   * As duas listas fechadas que a T-14.1 criou. Nome de coluna e nome de tabela
   * não podem virar `?`, então são os únicos pedaços de SQL montados por
   * interpolação — e o teste prova que a lista recusa qualquer outro valor.
   */
  it('o livro e a coluna de saldo recusam nome que não está na lista', async () => {
    await assert.rejects(
      () =>
        emTransacao((conexao) =>
          walletsRepository.debitarMel(conexao, {
            idUsuario,
            quantidade: 1,
            motivo: 'motivo-que-nao-existe',
          }),
        ),
      /Motivo de recompensa desconhecido/,
    );
  });

  it('desbloquear conquista que não existe não paga nem quebra', async () => {
    const resultado = await achievementsService.desbloquear(idUsuario, 'conquista-que-nao-existe');

    assert.deepEqual(resultado, { desbloqueou: false, melCreditado: 0 });
  });
});
