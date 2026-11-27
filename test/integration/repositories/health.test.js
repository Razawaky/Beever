import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../../helpers/banco.js';
import { fecharPool } from '../../../src/config/database.js';
import * as healthRepository from '../../../src/repositories/healthRepository.js';

/**
 * `healthRepository` contra banco real.
 *
 * É o repository mais simples e o mais importante para esta bateria: se ele
 * passa, o pool da aplicação está mesmo falando com o banco de teste, e todo o
 * resto da suíte de repositories tem chão. Se ele falha, o problema é de
 * arnês, não de SQL.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('healthRepository', opcoes, () => {
  let banco;

  before(async () => {
    banco = await criarBancoDeTeste();
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('responde ao ping pelo pool da aplicação', async () => {
    assert.equal(await healthRepository.ping(), true);
  });

  it('conta as migrations que o runner aplicou', async () => {
    const total = await healthRepository.contarMigrationsAplicadas();
    const [linhas] = await banco.conexao.query('SELECT COUNT(*) AS total FROM schema_migrations');

    assert.equal(total, Number(linhas[0].total));
    assert.ok(total > 0, 'o banco de teste deveria ter migrations aplicadas');
  });
});
