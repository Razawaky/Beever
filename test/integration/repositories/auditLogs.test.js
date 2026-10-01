import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, idDoUsuario, motivoParaPular } from '../../helpers/banco.js';
import { fecharPool } from '../../../src/config/database.js';
import * as auditLogsRepository from '../../../src/repositories/auditLogsRepository.js';

/**
 * `auditLogsRepository` contra banco real — a trilha de auditoria (RN-010).
 *
 * Duas garantias que só um banco de verdade consegue dar: que o estado antes e
 * depois volta como JSON utilizável, e que a tabela recusa alteração. O gatilho
 * da migration `008` é quem recusa; aqui a prova é que o repository convive com
 * isso e nunca tenta atualizar linha.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('auditLogsRepository', opcoes, () => {
  let banco;
  let conexao;
  let demo;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;
    demo = await idDoUsuario(conexao, 'ana@beever.dev');
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('registra a ação com estado antes e depois', async () => {
    await auditLogsRepository.registrar({
      atorTipo: 'usuario',
      atorId: demo,
      acao: 'compra.realizada',
      entidade: 'purchase',
      entidadeId: 4242,
      estadoAnterior: { mel: 100 },
      estadoNovo: { mel: 60 },
      ipHash: 'hash-de-teste',
    });

    const linhas = await auditLogsRepository.listarPorEntidade('purchase', 4242);
    assert.equal(linhas.length, 1);

    const registro = linhas[0];
    assert.equal(registro.ator_tipo, 'usuario');
    assert.equal(Number(registro.actor_id), Number(demo));
    assert.equal(registro.action, 'compra.realizada');

    const antes = typeof registro.before_state === 'string' ? JSON.parse(registro.before_state) : registro.before_state;
    const depois = typeof registro.after_state === 'string' ? JSON.parse(registro.after_state) : registro.after_state;
    assert.equal(antes.mel, 100);
    assert.equal(depois.mel, 60);
  });

  it('aceita ação do sistema, sem ator humano', async () => {
    await auditLogsRepository.registrar({
      atorTipo: 'sistema',
      acao: 'ciclo.processado',
      entidade: 'economic_cycle',
      entidadeId: 7,
    });

    const [registro] = await auditLogsRepository.listarPorEntidade('economic_cycle', 7);
    assert.equal(registro.ator_tipo, 'sistema');
    assert.equal(registro.actor_id, null);
  });

  it('tipo de ator desconhecido falha alto, em vez de perder o rastro', async () => {
    await assert.rejects(
      auditLogsRepository.registrar({
        atorTipo: 'gato',
        acao: 'acao.suspeita',
        entidade: 'user',
        entidadeId: demo,
      }),
      /Tipo de ator desconhecido/,
    );

    assert.equal((await auditLogsRepository.listarPorEntidade('user', demo)).length, 0);
  });

  it('devolve a entidade em ordem decrescente de data', async () => {
    for (const acao of ['xp.creditado', 'mel.creditado', 'nivel.subiu']) {
      await auditLogsRepository.registrar({ atorId: demo, acao, entidade: 'level', entidadeId: 99 });
    }

    const linhas = await auditLogsRepository.listarPorEntidade('level', 99);
    assert.equal(linhas.length, 3);

    const datas = linhas.map((linha) => new Date(linha.created_at).getTime());
    assert.deepEqual(datas, [...datas].sort((a, b) => b - a), 'o mais recente vem primeiro');
  });

  it('a linha gravada não pode ser alterada nem apagada (RNF-17)', async () => {
    await auditLogsRepository.registrar({ atorId: demo, acao: 'teste.imutavel', entidade: 'user', entidadeId: 1234 });
    const [registro] = await auditLogsRepository.listarPorEntidade('user', 1234);

    await assert.rejects(conexao.query('UPDATE audit_logs SET action = ? WHERE id = ?', ['adulterada', registro.id]));
    await assert.rejects(conexao.query('DELETE FROM audit_logs WHERE id = ?', [registro.id]));

    const aindaLa = await auditLogsRepository.listarPorEntidade('user', 1234);
    assert.equal(aindaLa.length, 1);
    assert.equal(aindaLa[0].action, 'teste.imutavel');
  });
});
