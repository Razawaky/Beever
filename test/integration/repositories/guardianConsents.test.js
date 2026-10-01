import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, idDoUsuario, motivoParaPular } from '../../helpers/banco.js';
import { emTransacao, fecharPool } from '../../../src/config/database.js';
import * as guardianConsentsRepository from '../../../src/repositories/guardianConsentsRepository.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';

/**
 * `guardianConsentsRepository` contra banco real — a prova de autorização do
 * responsável (RNF-34, LGPD Art. 14).
 *
 * O que estes testes protegem é a natureza do dado: consentimento é fato
 * datado, não preferência. Ele se acumula em vez de ser sobrescrito, e some
 * junto com a conta — guardar autorização de uma conta que não existe mais
 * seria guardar dado pessoal sem finalidade, que é exatamente o que a lei
 * proíbe.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('guardianConsentsRepository', opcoes, () => {
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

  async function criancaNova(sufixo) {
    return usersRepository.criar({
      email: `consentimento-${sufixo}@beever.dev`,
      apelido: `crianca-${sufixo}`,
      dataNasc: '2016-04-01',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
  }

  it('grava o consentimento com e-mail e origem', async () => {
    const idUsuario = await criancaNova('registro');

    await emTransacao((c) =>
      guardianConsentsRepository.registrar(c, {
        idUsuario,
        emailResponsavel: 'responsavel@exemplo.com',
        ipHash: 'a'.repeat(64),
      }),
    );

    const consentimento = await guardianConsentsRepository.buscarPorUsuario(idUsuario);
    assert.equal(consentimento.guardian_email, 'responsavel@exemplo.com');
    assert.equal(consentimento.ip_hash, 'a'.repeat(64));
    assert.ok(consentimento.consented_at instanceof Date, 'consentimento é fato datado');
  });

  it('aceita consentimento sem origem conhecida', async () => {
    // Conta criada por script ou migração de dados não tem requisição por trás.
    const idUsuario = await criancaNova('sem-ip');

    await emTransacao((c) =>
      guardianConsentsRepository.registrar(c, { idUsuario, emailResponsavel: 'r@exemplo.com' }),
    );

    assert.equal((await guardianConsentsRepository.buscarPorUsuario(idUsuario)).ip_hash, null);
  });

  it('acumula em vez de sobrescrever, e a leitura traz o mais recente', async () => {
    const idUsuario = await criancaNova('historico');

    await emTransacao((c) =>
      guardianConsentsRepository.registrar(c, { idUsuario, emailResponsavel: 'antigo@exemplo.com' }),
    );
    await emTransacao((c) =>
      guardianConsentsRepository.registrar(c, { idUsuario, emailResponsavel: 'novo@exemplo.com' }),
    );

    const todos = await guardianConsentsRepository.listarPorUsuario(idUsuario);
    assert.equal(todos.length, 2, 'o histórico continua contando o que valia antes');
    assert.equal((await guardianConsentsRepository.buscarPorUsuario(idUsuario)).guardian_email, 'novo@exemplo.com');
  });

  it('devolve nulo para quem nunca teve consentimento', async () => {
    const idUsuario = await criancaNova('sem-consentimento');
    assert.equal(await guardianConsentsRepository.buscarPorUsuario(idUsuario), null);
  });

  it('a conta demo do seed já nasce com o consentimento registrado', async () => {
    const demo = await idDoUsuario(conexao, 'ana@beever.dev');
    const consentimento = await guardianConsentsRepository.buscarPorUsuario(demo);

    assert.ok(consentimento, 'o seed precisa refletir a regra que o código passou a exigir');
  });

  it('o consentimento some junto com a conta', async () => {
    const idUsuario = await criancaNova('cascata');
    await emTransacao((c) =>
      guardianConsentsRepository.registrar(c, { idUsuario, emailResponsavel: 'r@exemplo.com' }),
    );

    await usersRepository.removerPorIds([idUsuario]);

    assert.equal(await guardianConsentsRepository.buscarPorUsuario(idUsuario), null);
  });
});
