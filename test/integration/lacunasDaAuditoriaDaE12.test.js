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
import * as limpezaService from '../../src/services/limpezaService.js';

/**
 * As lacunas que a auditoria da E12 apontou, cada uma com o teste que faltava.
 *
 * Está num arquivo só porque são correções de uma revisão, e não de uma tarefa:
 * espalhá-las pelos arquivos das tarefas esconderia que elas vieram do laudo.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const ADMIN = { email: 'admin@beever.dev', senha: 'admin1234' };
const JOGADORA = { email: 'ana@beever.dev', senha: 'beever123' };

describe('lacunas do laudo da E12', opcoes, () => {
  let banco;
  let app;
  let admin;
  let jogadora;
  let csrfDoAdmin;
  let idDoAdmin;
  let idDaJogadora;
  let idDaFaixaA;
  let idDaFaixaB;

  async function tokenDe(agente, caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').redirects(2);
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function entrar(conta, caminhoDoLogin, endereco) {
    const agente = request.agent(app);
    const csrf = await tokenDe(agente, caminhoDoLogin);
    await agente
      .post(endereco)
      .set('Accept', 'application/json')
      .send({ ...conta, _csrf: csrf })
      .expect(200);
    return agente;
  }

  async function acoesGravadas(acoes) {
    const marcadores = acoes.map(() => '?').join(', ');
    const [linhas] = await banco.conexao.query(
      `SELECT DISTINCT log.action, tipo.slug AS ator
         FROM audit_logs log
         JOIN audit_actor_types tipo ON tipo.id = log.actor_type_id
        WHERE log.action IN (${marcadores})`,
      acoes,
    );
    return linhas;
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();

    admin = await entrar(ADMIN, '/admin/login', '/admin/login');
    csrfDoAdmin = await tokenDe(admin, '/admin/favos');
    jogadora = await entrar(JOGADORA, '/login', '/sessao/login');

    const [[contaAdmin]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', [ADMIN.email]);
    idDoAdmin = Number(contaAdmin.id);

    const [[contaJogadora]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', [
      JOGADORA.email,
    ]);
    idDaJogadora = Number(contaJogadora.id);

    const [faixas] = await banco.conexao.query("SELECT id, code FROM age_bands WHERE code IN ('A', 'B')");
    idDaFaixaA = Number(faixas.find((faixa) => faixa.code === 'A').id);
    idDaFaixaB = Number(faixas.find((faixa) => faixa.code === 'B').id);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  // L-1
  it('o expurgo apaga a conta e não deixa dado pessoal na trilha (RN-053)', async () => {
    const [criacao] = await banco.conexao.query(
      `INSERT INTO users (email, nickname, password_hash, birth_date, is_active, last_login_at)
       VALUES ('expurgo@beever.dev', 'ParaExpurgar', 'hash', '2015-01-01', 0,
               DATE_SUB(UTC_TIMESTAMP(), INTERVAL 400 DAY))`,
    );
    const idExpurgado = Number(criacao.insertId);

    const { removidos } = await limpezaService.expurgarContasInativas(365);
    assert.ok(removidos >= 1);

    const [contas] = await banco.conexao.query('SELECT id FROM users WHERE id = ?', [idExpurgado]);
    assert.equal(contas.length, 0, 'a conta some de verdade');

    const [linhas] = await banco.conexao.query(
      "SELECT before_state FROM audit_logs WHERE action = 'conta.expurgada' AND entity_id = ?",
      [idExpurgado],
    );
    assert.equal(linhas.length, 1, 'o rastro de que a conta existiu fica');

    const gravado = JSON.stringify(linhas[0].before_state);
    assert.doesNotMatch(gravado, /expurgo@beever\.dev/, 'o e-mail não pode sobreviver à exclusão');
    assert.doesNotMatch(gravado, /ParaExpurgar/, 'o apelido não pode sobreviver à exclusão');
  });

  // L-2
  it('a linha de evolução do item é cadastrável e editável pelo painel (RF-LOJ-07)', async () => {
    const [[categoria]] = await banco.conexao.query('SELECT id FROM item_categories LIMIT 1');

    const campos = (nome, extras = {}) => ({
      nome,
      descricaoInfantil: 'Item para o teste da linha de evolução',
      idCategoria: String(categoria.id),
      preco: '100',
      taxaDeValorizacao: '0',
      pisoPercentual: '0',
      tetoPercentual: '100',
      custoFixo: '0',
      rendaPorCiclo: '0',
      ...extras,
    });

    function enviar(endereco, dados) {
      const requisicao = admin.post(endereco).set('Accept', 'application/json').field('_csrf', csrfDoAdmin);
      Object.entries(dados).forEach(([chave, valor]) => requisicao.field(chave, valor));
      return requisicao;
    }

    const base = await enviar('/admin/itens', campos('Casinha simples')).expect(201);
    const melhoria = await enviar(
      '/admin/itens',
      campos('Casinha melhorada', { idItemDeOrigem: String(base.body.id) }),
    ).expect(201);

    const [[gravado]] = await banco.conexao.query('SELECT upgrade_of_item_id FROM items WHERE id = ?', [
      melhoria.body.id,
    ]);
    assert.equal(Number(gravado.upgrade_of_item_id), Number(base.body.id));

    // Editar sem o campo desfaz a ligação, em vez de mantê-la escondida.
    await enviar(`/admin/itens/${melhoria.body.id}`, campos('Casinha melhorada', { slug: 'casinha-melhorada' })).expect(200);
    const [[semLinha]] = await banco.conexao.query('SELECT upgrade_of_item_id FROM items WHERE id = ?', [
      melhoria.body.id,
    ]);
    assert.equal(semLinha.upgrade_of_item_id, null);

    // E o item não pode ser melhoria de si mesmo.
    const recusa = await enviar(
      `/admin/itens/${melhoria.body.id}`,
      campos('Casinha melhorada', { slug: 'casinha-melhorada', idItemDeOrigem: String(melhoria.body.id) }),
    ).expect(422);
    assert.match(recusa.body.erro, /melhoria dele mesmo/);
  });

  // L-3
  it('trocar a faixa do favo recoloca ele no fim da fila da faixa nova (RN-027)', async () => {
    const criacao = await admin
      .post('/admin/favos')
      .set('Accept', 'application/json')
      .send({ titulo: 'Favo que muda de faixa', idFaixa: idDaFaixaA, percentualDeDesbloqueio: 80, _csrf: csrfDoAdmin })
      .expect(201);

    await admin
      .post(`/admin/favos/${criacao.body.id}`)
      .set('Accept', 'application/json')
      .send({
        titulo: 'Favo que muda de faixa',
        idFaixa: idDaFaixaB,
        percentualDeDesbloqueio: 80,
        _csrf: csrfDoAdmin,
      })
      .expect(200);

    const [linhas] = await banco.conexao.query(
      'SELECT id, order_index FROM hives WHERE age_band_id = ? AND deleted_at IS NULL ORDER BY order_index',
      [idDaFaixaB],
    );
    const ordens = linhas.map((linha) => Number(linha.order_index));
    assert.equal(new Set(ordens).size, ordens.length, 'duas posições iguais na mesma faixa quebram a RN-027');

    const mudado = linhas.find((linha) => Number(linha.id) === Number(criacao.body.id));
    assert.equal(Number(mudado.order_index), Math.max(...ordens), 'o favo entra no fim da faixa nova');
  });

  // L-4
  it('a célula herda a faixa do favo, mesmo se o pedido disser outra (RN-029)', async () => {
    const [[favo]] = await banco.conexao.query('SELECT id FROM hives WHERE slug = ?', ['primeiros-passos']);
    const [[tipo]] = await banco.conexao.query('SELECT id FROM game_types WHERE slug = ?', ['quiz-do-favo']);

    const criacao = await admin
      .post(`/admin/favos/${favo.id}/celulas`)
      .set('Accept', 'application/json')
      .send({
        titulo: 'Célula que tentou outra faixa',
        idTipoDeJogo: tipo.id,
        idFaixa: idDaFaixaB,
        segundosEstimados: 120,
        _csrf: csrfDoAdmin,
      })
      .expect(201);

    const [[gravada]] = await banco.conexao.query('SELECT age_band_id FROM cells WHERE id = ?', [
      criacao.body.id,
    ]);
    assert.equal(Number(gravada.age_band_id), idDaFaixaA, 'a faixa vem do favo, não do pedido');
  });

  // L-6
  it('as ações administrativas que faltavam também deixam rastro', async () => {
    const criacao = await admin
      .post('/admin/favos')
      .set('Accept', 'application/json')
      .send({ titulo: 'Favo do rastro', idFaixa: idDaFaixaA, percentualDeDesbloqueio: 80, _csrf: csrfDoAdmin })
      .expect(201);

    await admin
      .post(`/admin/favos/${criacao.body.id}`)
      .set('Accept', 'application/json')
      .send({ titulo: 'Favo do rastro, editado', idFaixa: idDaFaixaA, percentualDeDesbloqueio: 90, _csrf: csrfDoAdmin })
      .expect(200);

    await admin
      .post(`/admin/favos/${criacao.body.id}/ativo`)
      .set('Accept', 'application/json')
      .send({ ativo: 'false', _csrf: csrfDoAdmin })
      .expect(200);

    await admin
      .post(`/admin/favos/${criacao.body.id}/ativo`)
      .set('Accept', 'application/json')
      .send({ ativo: 'true', _csrf: csrfDoAdmin })
      .expect(200);

    const linhas = await acoesGravadas(['favo.editado', 'favo.desativado', 'favo.reativado']);
    assert.deepEqual(
      linhas.map((linha) => linha.action).sort(),
      ['favo.desativado', 'favo.editado', 'favo.reativado'],
    );
    assert.deepEqual([...new Set(linhas.map((linha) => linha.ator))], ['admin']);
  });

  it('editar célula e tirar do acervo também deixam rastro', async () => {
    const [[favo]] = await banco.conexao.query('SELECT id FROM hives WHERE slug = ?', ['guardar-e-gastar']);
    const [[tipo]] = await banco.conexao.query('SELECT id FROM game_types WHERE slug = ?', ['quiz-do-favo']);

    const celula = await admin
      .post(`/admin/favos/${favo.id}/celulas`)
      .set('Accept', 'application/json')
      .send({ titulo: 'Célula do rastro', idTipoDeJogo: tipo.id, segundosEstimados: 120, _csrf: csrfDoAdmin })
      .expect(201);

    await admin
      .post(`/admin/celulas/${celula.body.id}`)
      .set('Accept', 'application/json')
      .send({ titulo: 'Célula do rastro, editada', idTipoDeJogo: tipo.id, segundosEstimados: 150, _csrf: csrfDoAdmin })
      .expect(200);

    const quiz = (marca) => ({
      tipo: 'quiz-do-favo',
      perguntas: [{ enunciado: `Pergunta ${marca}`, alternativas: ['Sim', 'Não'], correta: 0 }],
    });

    for (const [marca, publicacao] of [['A', 'substituir'], ['B', 'acrescentar']]) {
      await admin
        .post(`/admin/celulas/${celula.body.id}/conteudo`)
        .set('Accept', 'application/json')
        .send({ modo: 'avancado', corpo: JSON.stringify(quiz(marca)), publicacao, _csrf: csrfDoAdmin })
        .expect(201);
    }

    await admin
      .post(`/admin/celulas/${celula.body.id}/acervo/remover`)
      .set('Accept', 'application/json')
      .send({ versao: 1, _csrf: csrfDoAdmin })
      .expect(200);

    const linhas = await acoesGravadas(['celula.editada', 'conteudo.removido-do-acervo']);
    assert.deepEqual(
      linhas.map((linha) => linha.action).sort(),
      ['celula.editada', 'conteudo.removido-do-acervo'],
    );
  });

  // L-9
  it('o administrador promove e rebaixa outra conta, com rastro', async () => {
    await admin
      .post(`/admin/usuarios/${idDaJogadora}/admin`)
      .set('Accept', 'application/json')
      .send({ ehAdmin: 'true', _csrf: csrfDoAdmin })
      .expect(200);

    const [promovida] = await banco.conexao.query('SELECT 1 FROM admins WHERE user_id = ?', [idDaJogadora]);
    assert.equal(promovida.length, 1);

    await admin
      .post(`/admin/usuarios/${idDaJogadora}/admin`)
      .set('Accept', 'application/json')
      .send({ ehAdmin: 'false', _csrf: csrfDoAdmin })
      .expect(200);

    const [rebaixada] = await banco.conexao.query('SELECT 1 FROM admins WHERE user_id = ?', [idDaJogadora]);
    assert.equal(rebaixada.length, 0);

    const linhas = await acoesGravadas(['admin.promovido', 'admin.rebaixado']);
    assert.deepEqual(linhas.map((linha) => linha.action).sort(), ['admin.promovido', 'admin.rebaixado']);
  });

  it('ninguém tira o próprio acesso de administrador', async () => {
    const recusa = await admin
      .post(`/admin/usuarios/${idDoAdmin}/admin`)
      .set('Accept', 'application/json')
      .send({ ehAdmin: 'false', _csrf: csrfDoAdmin })
      .expect(422);

    assert.match(recusa.body.erro, /seu próprio acesso/);

    const [continua] = await banco.conexao.query('SELECT 1 FROM admins WHERE user_id = ?', [idDoAdmin]);
    assert.equal(continua.length, 1);
  });

  it('a jogadora comum não promove ninguém', async () => {
    await jogadora
      .post(`/admin/usuarios/${idDaJogadora}/admin`)
      .set('Accept', 'application/json')
      .send({ ehAdmin: 'true' })
      .expect(403);
  });

  // L-8
  it('a tela de auditoria mascara dado pessoal do antes e depois', async () => {
    const resposta = await admin
      .get('/admin/auditoria')
      .query({ acao: 'admin.promovido' })
      .set('Accept', 'application/json')
      .expect(200);

    assert.ok(resposta.body.linhas.length > 0);

    // O e-mail do administrador está na trilha de `sessao.login`; nenhuma linha
    // devolvida pela tela pode trazê-lo por inteiro.
    const tudo = await admin.get('/admin/auditoria').set('Accept', 'application/json').expect(200);
    const comEstado = tudo.body.linhas.filter((linha) => linha.before_state || linha.after_state);
    for (const linha of comEstado) {
      const texto = JSON.stringify({ a: linha.before_state, d: linha.after_state });
      assert.doesNotMatch(texto, /@beever\.dev/, 'e-mail não aparece cru na tela de auditoria');
    }
  });

  // L-10
  it('o detalhe do item leva o navegador ao formulário, e responde JSON a quem pede JSON', async () => {
    const [[item]] = await banco.conexao.query('SELECT id FROM items LIMIT 1');

    const html = await admin.get(`/admin/itens/${item.id}`).set('Accept', 'text/html').expect(302);
    assert.equal(html.headers.location, `/admin/itens/${item.id}/editar`);

    const json = await admin.get(`/admin/itens/${item.id}`).set('Accept', 'application/json').expect(200);
    assert.equal(Number(json.body.item.id), Number(item.id));
  });
});
