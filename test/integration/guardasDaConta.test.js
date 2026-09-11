import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { fecharPool } from '../../src/config/database.js';
import * as usersService from '../../src/services/usersService.js';

/**
 * Troca de senha e inativação de conta (RNF-10, RNF-28).
 *
 * A auditoria da E14 achou os dois caminhos sem teste nenhum: a senha nova
 * passava pela regra de 8 caracteres só na rota, e a inativação — que é o que a
 * política de privacidade oferece hoje — nunca tinha sido exercida. Aqui os dois
 * são chamados pelo service, que é onde a regra mora.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('guardas da conta', opcoes, () => {
  let banco;
  let idUsuario;
  let dona;

  before(async () => {
    banco = await criarBancoDeTeste();
    const [[usuaria]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', ['ana@beever.dev']);
    idUsuario = Number(usuaria.id);
    dona = { id: idUsuario, ehAdmin: false };
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a senha nova passa pela mesma regra do cadastro', async () => {
    for (const fraca of ['curta1', 'somenteletras', '1234567890']) {
      await assert.rejects(() => usersService.atualizar(idUsuario, { senha: fraca }, dona), {
        codigo: 'VALIDACAO',
      });
    }
  });

  it('senha válida é gravada como hash, e nunca em texto', async () => {
    await usersService.atualizar(idUsuario, { senha: 'beever456' }, dona);

    const [[usuaria]] = await banco.conexao.query('SELECT password_hash FROM users WHERE id = ?', [idUsuario]);
    assert.notEqual(usuaria.password_hash, 'beever456');
    assert.match(usuaria.password_hash, /^\$2[aby]\$/, 'o hash é bcrypt');
  });

  it('a troca de senha é auditada sem a senha aparecer no registro', async () => {
    const [[linha]] = await banco.conexao.query(
      'SELECT before_state, after_state FROM audit_logs WHERE action = ? ORDER BY id DESC LIMIT 1',
      ['conta.atualizada'],
    );

    assert.ok(linha, 'a atualização gravou linha de auditoria');
    assert.doesNotMatch(JSON.stringify(linha), /beever456/);
  });

  it('inativar desliga a conta e grava o antes e o depois', async () => {
    await usersService.inativar(idUsuario, dona);

    const [[usuaria]] = await banco.conexao.query('SELECT is_active FROM users WHERE id = ?', [idUsuario]);
    assert.equal(Number(usuaria.is_active), 0);

    const [[linha]] = await banco.conexao.query(
      'SELECT before_state, after_state FROM audit_logs WHERE action = ? ORDER BY id DESC LIMIT 1',
      ['conta.inativada'],
    );
    assert.ok(linha, 'a inativação gravou linha de auditoria');
    assert.match(JSON.stringify(linha.before_state), /true/);
    assert.match(JSON.stringify(linha.after_state), /false/);
  });

  it('ninguém inativa nem altera a conta de outra pessoa', async () => {
    const invasor = { id: idUsuario + 1000, ehAdmin: false };

    await assert.rejects(() => usersService.inativar(idUsuario, invasor), { codigo: 'ACESSO_NEGADO' });
    await assert.rejects(() => usersService.atualizar(idUsuario, { apelido: 'invadida' }, invasor), {
      codigo: 'ACESSO_NEGADO',
    });
  });
});
