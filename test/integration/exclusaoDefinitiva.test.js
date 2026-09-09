import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';
import * as usersService from '../../src/services/usersService.js';

/**
 * Apagamento definitivo de conta (T-16.2, RN-053).
 *
 * A RN-053 promete que excluir a conta remove o dado pessoal e deixa a
 * auditoria como agregado anônimo. Aqui o peso está nos dois lados: que a
 * conta realmente suma (perfil, carteira, consentimento), e que nada disso
 * vaze para a trilha imutável — um e-mail encontrado num `conta.criada`
 * sobreviveria à exclusão para sempre, porque a RNF-17 bloqueia até UPDATE.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const ADMIN = { email: 'admin@beever.dev', senha: 'admin1234' };

function apelidoUnico() {
  return `apagavel-${Date.now()}`;
}

function emailUnico() {
  return `apagavel-${Date.now()}@teste.dev`;
}

describe('apagamento definitivo de conta', opcoes, () => {
  let banco;
  let app;

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function criarContaDescartavel() {
    const conta = await usersService.criar({
      email: emailUnico(),
      dataNasc: '2015-08-20',
      senha: 'beever456',
      apelido: apelidoUnico(),
      consentimentoResponsavel: true,
    });
    return { ...conta, ator: { id: conta.id, ehAdmin: false } };
  }

  async function contar(tabela, coluna, id) {
    const [[linha]] = await banco.conexao.query(
      `SELECT COUNT(*) AS total FROM \`${tabela}\` WHERE \`${coluna}\` = ?`,
      [id],
    );
    return Number(linha.total);
  }

  it('apagar remove a conta e tudo o que ela possui', async () => {
    const conta = await criarContaDescartavel();

    const tabelas = [
      ['users', 'id'],
      ['profiles', 'user_id'],
      ['wallets', 'user_id'],
      ['user_levels', 'user_id'],
      ['guardian_consents', 'user_id'],
    ];
    for (const [tabela, coluna] of tabelas) {
      assert.equal(await contar(tabela, coluna, conta.id), 1, `${tabela} deveria ter linha da conta`);
    }

    await usersService.apagarDefinitivamente(conta.id, conta.ator);

    for (const [tabela, coluna] of tabelas) {
      assert.equal(await contar(tabela, coluna, conta.id), 0, `${tabela} deveria ter sido levada pela cascata`);
    }

    // O contador geral também cai: a linha não ficou como usuário "inativo".
    const [restantes] = await banco.conexao.query('SELECT COUNT(*) AS total FROM users');
    assert.equal(Number(restantes[0].total), 2, 'sobram só as duas contas do seed');
  });

  it('a trilha sobrevive inteira, sem nenhum dado pessoal (RN-053)', async () => {
    const conta = await criarContaDescartavel();
    const apelido = conta.apelido;

    await usersService.apagarDefinitivamente(conta.id, conta.ator);

    const [linhas] = await banco.conexao.query(
      `SELECT l.action, l.before_state, l.after_state
         FROM audit_logs l
        WHERE l.entity_type = 'user' AND l.entity_id = ?
        ORDER BY l.id`,
      [conta.id],
    );

    const acoes = linhas.map((linha) => linha.action);
    assert.ok(acoes.includes('conta.criada'), 'a criação continua rastreada');
    assert.ok(acoes.includes('consentimento.registrado'), 'o consentimento continua rastreado');
    assert.ok(acoes.includes('conta.apagada'), 'a exclusão deixou rastro');

    const texto = JSON.stringify(linhas);
    assert.doesNotMatch(texto, /emailResponsavel/, 'e-mail do responsável não pode morar na trilha');
    assert.doesNotMatch(texto, new RegExp(conta.email), 'o e-mail da conta não pode morar na trilha');
    assert.doesNotMatch(texto, new RegExp(apelido), 'o apelido não pode morar na trilha');
  });

  it('a atualização auditada registra o fato, nunca o valor novo', async () => {
    const conta = await criarContaDescartavel();

    await usersService.atualizar(
      conta.id,
      { apelido: 'nome-novo-que-nao-pode-vazar', email: 'novo-nao-pode-vazar@teste.dev' },
      conta.ator,
    );

    const [[linha]] = await banco.conexao.query(
      'SELECT before_state, after_state FROM audit_logs WHERE action = ? AND entity_id = ?',
      ['conta.atualizada', conta.id],
    );

    const depois = typeof linha.after_state === 'string' ? JSON.parse(linha.after_state) : linha.after_state;
    assert.equal(depois.apelidoAlterado, true);
    assert.equal(depois.emailAlterado, true);
    assert.doesNotMatch(JSON.stringify(linha), /novo-nao-pode-vazar/, 'o valor novo não entra na trilha');
  });

  it('ninguém apaga a conta de outra pessoa', async () => {
    const conta = await criarContaDescartavel();
    const invasor = { id: conta.id + 1000, ehAdmin: false };

    await assert.rejects(() => usersService.apagarDefinitivamente(conta.id, invasor), {
      codigo: 'ACESSO_NEGADO',
    });

    assert.equal(await contar('users', 'id', conta.id), 1, 'a conta continua existindo');
  });

  it('apagar conta inexistente é erro de não encontrado', async () => {
    const conta = await criarContaDescartavel();

    const [[contaAdmin]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', [ADMIN.email]);
    await assert.rejects(
      () => usersService.apagarDefinitivamente(conta.id + 5000, { id: Number(contaAdmin.id), ehAdmin: true }),
      { codigo: 'NAO_ENCONTRADO' },
    );
  });

  it('administrador executa o apagamento que a pessoa pediu', async () => {
    const conta = await criarContaDescartavel();

    const [[contaAdmin]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', [ADMIN.email]);
    await usersService.apagarDefinitivamente(conta.id, { id: Number(contaAdmin.id), ehAdmin: true });

    assert.equal(await contar('users', 'id', conta.id), 0);

    const [[linha]] = await banco.conexao.query(
      `SELECT t.slug AS ator FROM audit_logs l
         JOIN audit_actor_types t ON t.id = l.actor_type_id
        WHERE l.action = ? AND l.entity_id = ?`,
      ['conta.apagada', conta.id],
    );
    assert.equal(linha.ator, 'admin', 'quem apagou vai para a auditoria');
  });

  it('a rota administrativa apaga de verdade (RN-053)', async () => {
    const conta = await criarContaDescartavel();

    const agente = request.agent(app);
    const paginaLogin = await agente.get('/admin/login').set('Accept', 'text/html').redirects(2);
    const csrfLogin = /name="_csrf" value="([^"]+)"/.exec(paginaLogin.text)[1];
    await agente
      .post('/admin/login')
      .set('Accept', 'application/json')
      .send({ email: ADMIN.email, senha: ADMIN.senha, _csrf: csrfLogin })
      .expect(200);

    const paginaDeUsuarios = await agente.get('/admin/usuarios').set('Accept', 'text/html');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(paginaDeUsuarios.text)[1];

    await agente
      .post(`/admin/usuarios/${conta.id}/definitivo`)
      .set('Accept', 'application/json')
      .send({ _csrf: csrf })
      .expect(200);

    assert.equal(await contar('users', 'id', conta.id), 0, 'a rota removeu a conta');
  });
});