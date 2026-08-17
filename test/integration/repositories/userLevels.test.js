import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../../helpers/banco.js';
import { emTransacao, fecharPool } from '../../../src/config/database.js';
import * as userLevelsRepository from '../../../src/repositories/userLevelsRepository.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';

/**
 * `userLevelsRepository` contra banco real — nível e XP.
 *
 * A RN-003 proíbe calcular nível por fórmula: a curva mora em `levels`, uma
 * linha por nível, e o service tem que ler dela. O teste da curva existe para
 * que ninguém volte a inventar um `XP_POR_NIVEL = 1000` em constante — é a
 * dívida DT-04, ainda aberta no `nivelService`.
 *
 * `user_levels` é cache do `xp_ledger`, então vale a mesma regra da carteira:
 * atualizar o cache sem lançar no livro é divergência esperando para acontecer.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('userLevelsRepository', opcoes, () => {
  let banco;
  let conexao;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function jogadorComNivel(sufixo) {
    const idUsuario = await usersRepository.criar({
      email: `nivel-${sufixo}@beever.dev`,
      apelido: `nivel-${sufixo}`,
      dataNasc: '2012-11-30',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
    await userLevelsRepository.criar(idUsuario);
    return idUsuario;
  }

  it('todo jogador começa no nível 1 com XP zerado', async () => {
    const idUsuario = await jogadorComNivel('novo');
    const nivel = await userLevelsRepository.buscarPorUsuario(idUsuario);

    assert.equal(Number(nivel.level), 1);
    assert.equal(Number(nivel.xp_total), 0);
  });

  it('a curva de níveis vem da tabela, ordenada e crescente (RN-003)', async () => {
    const curva = await userLevelsRepository.buscarCurva();

    assert.ok(curva.length >= 20, 'o seed declara 20 níveis');
    for (let i = 1; i < curva.length; i += 1) {
      assert.equal(Number(curva[i].level), Number(curva[i - 1].level) + 1, 'a curva não pode ter buraco');
      assert.ok(
        Number(curva[i].required_xp) > Number(curva[i - 1].required_xp),
        'cada nível tem que exigir mais XP que o anterior',
      );
    }
  });

  it('atualiza nível e XP dentro e fora de transação', async () => {
    const idUsuario = await jogadorComNivel('atualizar');

    assert.equal(await userLevelsRepository.atualizar(null, idUsuario, { nivel: 2, xpTotal: 120, xpProximoNivel: 300 }), 1);
    let nivel = await userLevelsRepository.buscarPorUsuario(idUsuario);
    assert.equal(Number(nivel.level), 2);
    assert.equal(Number(nivel.xp_total), 120);

    await emTransacao((c) =>
      userLevelsRepository.atualizar(c, idUsuario, { nivel: 3, xpTotal: 320, xpProximoNivel: 600 }),
    );
    nivel = await userLevelsRepository.buscarPorUsuario(idUsuario);
    assert.equal(Number(nivel.level), 3);
    assert.equal(Number(nivel.xp_next_level), 600);
  });

  it('lança XP no livro com o saldo depois', async () => {
    const idUsuario = await jogadorComNivel('livro');

    await emTransacao(async (c) => {
      await userLevelsRepository.lancarXp(c, {
        idUsuario,
        quantidade: 40,
        motivo: 'conclusao-celula',
        saldoDepois: 40,
      });
      await userLevelsRepository.atualizar(c, idUsuario, { nivel: 1, xpTotal: 40, xpProximoNivel: 100 });
    });

    const [linhas] = await conexao.query('SELECT amount, balance_after FROM xp_ledger WHERE user_id = ?', [idUsuario]);
    assert.equal(linhas.length, 1);
    assert.equal(Number(linhas[0].amount), 40);
    assert.equal(Number(linhas[0].balance_after), 40);

    const nivel = await userLevelsRepository.buscarPorUsuario(idUsuario);
    assert.equal(Number(nivel.xp_total), 40, 'cache e livro têm que contar a mesma história');
  });

  it('XP negativo é recusado pelo banco (RN-002: XP nunca sai)', async () => {
    const idUsuario = await jogadorComNivel('negativo');

    await assert.rejects(
      emTransacao((c) =>
        userLevelsRepository.lancarXp(c, {
          idUsuario,
          quantidade: -10,
          motivo: 'ajuste-administrativo',
          saldoDepois: 0,
        }),
      ),
    );
  });

  it('motivo desconhecido falha em vez de perder o lançamento', async () => {
    const idUsuario = await jogadorComNivel('motivo-ruim');

    await assert.rejects(
      emTransacao((c) =>
        userLevelsRepository.lancarXp(c, {
          idUsuario,
          quantidade: 10,
          motivo: 'motivo-que-nao-existe',
          saldoDepois: 10,
        }),
      ),
      /Motivo de recompensa desconhecido/,
    );

    const [linhas] = await conexao.query('SELECT id FROM xp_ledger WHERE user_id = ?', [idUsuario]);
    assert.equal(linhas.length, 0);
  });

  it('recusa duas linhas de nível para o mesmo jogador', async () => {
    const idUsuario = await jogadorComNivel('duplicado');

    await assert.rejects(userLevelsRepository.criar(idUsuario), /Duplicate|uq_user_levels/);
  });
});
