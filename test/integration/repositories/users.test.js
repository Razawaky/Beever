import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, idDoUsuario, motivoParaPular } from '../../helpers/banco.js';
import { fecharPool } from '../../../src/config/database.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';

/**
 * `usersRepository` contra banco real — a conta e o papel de admin.
 *
 * Dois bugs do código antigo têm teste nominal aqui, para não voltarem: o
 * expurgo que apagava conta ativa por falta de parênteses no `WHERE`, e o
 * login que devolvia mensagens diferentes para e-mail inexistente e senha
 * errada. O segundo é decisão do service, mas depende deste repository
 * devolver o mesmo formato nos dois casos.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('usersRepository', opcoes, () => {
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

  async function criarDescartavel(sufixo) {
    return usersRepository.criar({
      email: `teste-${sufixo}@beever.dev`,
      apelido: `teste-${sufixo}`,
      dataNasc: '2015-05-10',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
  }

  it('cria a conta e devolve o id gerado', async () => {
    const id = await criarDescartavel('criar');

    assert.ok(Number(id) > 0);
    const usuario = await usersRepository.buscarPorId(id);
    assert.equal(usuario.email, 'teste-criar@beever.dev');
    assert.equal(usuario.nickname, 'teste-criar');
    assert.equal(usuario.is_active, 1);
  });

  it('não expõe o hash da senha na leitura pública', async () => {
    const id = await criarDescartavel('sem-hash');
    const usuario = await usersRepository.buscarPorId(id);

    assert.equal(usuario.password_hash, undefined, 'buscarPorId não pode vazar o hash');
  });

  it('devolve o hash e o papel de admin só na busca de login', async () => {
    const demo = await usersRepository.buscarPorEmailComSenha('ana@beever.dev');

    assert.ok(demo.password_hash, 'o login precisa do hash para comparar');
    assert.equal(Number(demo.eh_admin), 0, 'a conta demo não é admin');

    const [admins] = await conexao.query(
      'SELECT u.email FROM admins a JOIN users u ON u.id = a.user_id LIMIT 1',
    );
    if (admins.length > 0) {
      const admin = await usersRepository.buscarPorEmailComSenha(admins[0].email);
      assert.equal(Number(admin.eh_admin), 1, 'o papel de admin vem do join, não de coluna');
    }
  });

  it('devolve nulo para e-mail inexistente, sem distinguir do erro de senha', async () => {
    assert.equal(await usersRepository.buscarPorEmailComSenha('ninguem@beever.dev'), null);
  });

  it('acusa e-mail já usado', async () => {
    await criarDescartavel('duplicado');

    assert.equal(await usersRepository.emailJaUsado('teste-duplicado@beever.dev'), true);
    assert.equal(await usersRepository.emailJaUsado('livre@beever.dev'), false);
  });

  it('atualiza só o que foi enviado', async () => {
    const id = await criarDescartavel('atualizar');
    const antes = await usersRepository.buscarPorId(id);

    await usersRepository.atualizar(id, { apelido: 'apelido-novo' });
    const depois = await usersRepository.buscarPorId(id);

    assert.equal(depois.nickname, 'apelido-novo');
    assert.equal(depois.email, antes.email, 'campo não enviado não pode ser sobrescrito');
  });

  it('marca o onboarding uma vez só', async () => {
    const id = await criarDescartavel('onboarding');

    assert.equal(await usersRepository.marcarOnboardingConcluido(id), 1);
    assert.equal(await usersRepository.marcarOnboardingConcluido(id), 0, 'a segunda chamada não pode regravar');

    const usuario = await usersRepository.buscarPorId(id);
    assert.ok(usuario.onboarding_completed_at instanceof Date);
  });

  it('registra o último login', async () => {
    const id = await criarDescartavel('login');
    await usersRepository.atualizarUltimoLogin(id);

    const usuario = await usersRepository.buscarPorId(id);
    const [linhas] = await conexao.query('SELECT last_login_at FROM users WHERE id = ?', [id]);
    assert.ok(linhas[0].last_login_at, 'o login deveria ter gravado a data');
    assert.ok(usuario.id);
  });

  it('inativa em vez de apagar', async () => {
    const id = await criarDescartavel('inativar');

    assert.equal(await usersRepository.inativar(id), 1);
    const usuario = await usersRepository.buscarPorId(id);
    assert.equal(usuario.is_active, 0, 'a conta continua existindo, só desativada');
  });

  it('o expurgo não alcança conta ativa recém-criada (bug dos parênteses)', async () => {
    const ativo = await criarDescartavel('expurgo-ativo');
    const inativo = await criarDescartavel('expurgo-inativo');
    await usersRepository.inativar(inativo);
    await conexao.query('UPDATE users SET last_login_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 400 DAY) WHERE id = ?', [
      inativo,
    ]);

    const alvos = await usersRepository.listarInativosParaExpurgo(365);
    const ids = alvos.map((linha) => Number(linha.id));

    assert.ok(ids.includes(Number(inativo)), 'o inativo antigo deveria entrar no expurgo');
    assert.ok(!ids.includes(Number(ativo)), 'conta ativa sem login nunca pode entrar no expurgo');
  });

  it('remove em lote e ignora lista vazia', async () => {
    const id = await criarDescartavel('remover');

    assert.equal(await usersRepository.removerPorIds([]), 0);
    assert.equal(await usersRepository.removerPorIds([id]), 1);
    assert.equal(await usersRepository.buscarPorId(id), null);
  });

  it('lista as contas semeadas', async () => {
    const demo = await idDoUsuario(conexao, 'ana@beever.dev');
    const todos = await usersRepository.listar();

    assert.ok(todos.some((usuario) => Number(usuario.id) === Number(demo)));
  });
});
