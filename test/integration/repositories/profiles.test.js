import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, idDoUsuario, motivoParaPular } from '../../helpers/banco.js';
import { fecharPool } from '../../../src/config/database.js';
import * as profilesRepository from '../../../src/repositories/profilesRepository.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';

/**
 * `profilesRepository` contra banco real — o perfil 1:1 com a conta.
 *
 * O ponto que mais importa aqui: faixa etária, avatar e objetivo inicial
 * chegam como slug e são resolvidos dentro do SQL. Slug inexistente não pode
 * gravar nulo por cima do valor bom — o `COALESCE` existe justamente para
 * isso, e sem teste ninguém percebe quando ele se perde numa edição.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('profilesRepository', opcoes, () => {
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

  async function usuarioNovo(sufixo) {
    return usersRepository.criar({
      email: `perfil-${sufixo}@beever.dev`,
      apelido: `perfil-${sufixo}`,
      dataNasc: '2014-03-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
  }

  it('cria o perfil ligado à conta', async () => {
    const idUsuario = await usuarioNovo('criar');
    const idPerfil = await profilesRepository.criar({ idUsuario });

    const perfil = await profilesRepository.buscarPorUsuario(idUsuario);
    assert.equal(Number(perfil.id), Number(idPerfil));
    assert.equal(Number(perfil.user_id), Number(idUsuario));
  });

  it('recusa dois perfis para a mesma conta (1:1)', async () => {
    const idUsuario = await usuarioNovo('duplicado');
    await profilesRepository.criar({ idUsuario });

    await assert.rejects(profilesRepository.criar({ idUsuario }), /Duplicate|uq_profiles/);
  });

  it('resolve faixa etária, avatar e objetivo a partir do slug', async () => {
    const idUsuario = await usuarioNovo('slugs');
    const idPerfil = await profilesRepository.criar({ idUsuario });

    await profilesRepository.atualizar(idPerfil, {
      faixaEtaria: 'A',
      avatar: 'beenie-classico',
      objetivoInicial: 'comprar-algo',
      fuso: 'America/Sao_Paulo',
      minutosPorSessao: 10,
    });

    const perfil = await profilesRepository.buscarDetalhadoPorUsuario(idUsuario);
    assert.equal(perfil.faixa_etaria, 'A');
    assert.equal(perfil.avatar, 'beenie-classico');
    assert.equal(perfil.objetivo_inicial, 'comprar-algo');
    assert.equal(perfil.timezone, 'America/Sao_Paulo');
    assert.equal(Number(perfil.session_minutes), 10);
  });

  it('slug inexistente não apaga o valor que já estava lá', async () => {
    const idUsuario = await usuarioNovo('slug-ruim');
    const idPerfil = await profilesRepository.criar({ idUsuario });
    await profilesRepository.atualizar(idPerfil, { avatar: 'beenie-dourado' });

    await profilesRepository.atualizar(idPerfil, { avatar: 'avatar-que-nao-existe' });

    const perfil = await profilesRepository.buscarDetalhadoPorUsuario(idUsuario);
    assert.equal(perfil.avatar, 'beenie-dourado', 'slug inválido não pode zerar o avatar escolhido');
  });

  it('lê o perfil detalhado da conta demo, com os rótulos das tabelas de domínio', async () => {
    const perfil = await profilesRepository.buscarDetalhadoPorUsuario(demo);

    assert.ok(perfil, 'a conta demo nasce com perfil');
    assert.ok(perfil.faixa_etaria_nome, 'a faixa etária deveria vir com o nome legível');
  });

  it('busca por id e devolve nulo quando não existe', async () => {
    const perfil = await profilesRepository.buscarPorUsuario(demo);
    const porId = await profilesRepository.buscarPorId(perfil.id);

    assert.equal(Number(porId.user_id), Number(demo));
    assert.equal(await profilesRepository.buscarPorUsuario(9999999), null);
  });

  it('remove o perfil sem levar a conta junto', async () => {
    const idUsuario = await usuarioNovo('remover');
    const idPerfil = await profilesRepository.criar({ idUsuario });

    assert.equal(await profilesRepository.remover(idPerfil), 1);
    assert.equal(await profilesRepository.buscarPorUsuario(idUsuario), null);
    assert.ok(await usersRepository.buscarPorId(idUsuario), 'a conta continua existindo');
  });
});
