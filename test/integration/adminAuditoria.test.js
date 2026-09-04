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

/**
 * A consulta da trilha de auditoria (T-12.6).
 *
 * A trilha do teste é produzida pelo próprio teste: o administrador cria um
 * favo e um item, e a jogadora entra e joga. Filtrar sobre linhas plantadas à
 * mão provaria o SQL; filtrar sobre o rastro de ações reais prova a tela.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const ADMIN = { email: 'admin@beever.dev', senha: 'admin1234' };
const JOGADORA = { email: 'ana@beever.dev', senha: 'beever123' };

const HOJE = new Date().toISOString().slice(0, 10);

describe('consulta da trilha de auditoria', opcoes, () => {
  let banco;
  let app;
  let admin;
  let jogadora;
  let csrfDoAdmin;
  let idDoAdmin;

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

  function consultar(filtros = {}) {
    return admin
      .get('/admin/auditoria')
      .query(filtros)
      .set('Accept', 'application/json');
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();

    admin = await entrar(ADMIN, '/admin/login', '/admin/login');
    csrfDoAdmin = await tokenDe(admin, '/admin/favos');
    jogadora = await entrar(JOGADORA, '/login', '/sessao/login');

    const [[conta]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', [ADMIN.email]);
    idDoAdmin = Number(conta.id);

    const [[faixa]] = await banco.conexao.query('SELECT id FROM age_bands WHERE code = ?', ['A']);
    const [[categoria]] = await banco.conexao.query('SELECT id FROM item_categories LIMIT 1');

    // Duas ações administrativas de tipos diferentes, para os filtros terem o
    // que separar.
    await admin
      .post('/admin/favos')
      .set('Accept', 'application/json')
      .send({
        titulo: 'Favo da auditoria',
        idFaixa: faixa.id,
        percentualDeDesbloqueio: 80,
        _csrf: csrfDoAdmin,
      })
      .expect(201);

    await admin
      .post('/admin/itens')
      .set('Accept', 'application/json')
      .field('_csrf', csrfDoAdmin)
      .field('nome', 'Item da auditoria')
      .field('descricaoInfantil', 'Serve para o teste da trilha')
      .field('idCategoria', String(categoria.id))
      .field('preco', '50')
      .field('taxaDeValorizacao', '0')
      .field('pisoPercentual', '0')
      .field('tetoPercentual', '100')
      .field('custoFixo', '0')
      .field('rendaPorCiclo', '0')
      .expect(201);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a jogadora comum não consulta a trilha', async () => {
    await jogadora.get('/admin/auditoria').set('Accept', 'application/json').expect(403);
    await jogadora.get('/admin/auditoria/csv').set('Accept', 'application/json').expect(403);
  });

  it('sem filtro nenhum, devolve a trilha inteira paginada', async () => {
    const resposta = await consultar().expect(200);

    assert.ok(resposta.body.pagina.total > 0);
    assert.equal(resposta.body.pagina.atual, 1);
    assert.ok(resposta.body.linhas.length <= resposta.body.pagina.porPagina);
    assert.ok(resposta.body.acoes.includes('favo.criado'), 'a lista de ações vem do que já aconteceu');
  });

  it('filtra por ação, e nada de outra ação entra', async () => {
    const resposta = await consultar({ acao: 'item.criado' }).expect(200);

    assert.ok(resposta.body.linhas.length > 0);
    assert.deepEqual([...new Set(resposta.body.linhas.map((linha) => linha.action))], ['item.criado']);
  });

  it('filtra por quem agiu', async () => {
    const admins = await consultar({ atorTipo: 'admin' }).expect(200);
    assert.ok(admins.body.linhas.length > 0);
    assert.deepEqual([...new Set(admins.body.linhas.map((linha) => linha.ator_tipo))], ['admin']);

    const porId = await consultar({ atorTipo: 'admin', atorId: idDoAdmin }).expect(200);
    assert.deepEqual([...new Set(porId.body.linhas.map((linha) => Number(linha.actor_id)))], [idDoAdmin]);
  });

  it('filtra por entidade e por id da entidade', async () => {
    const porEntidade = await consultar({ entidade: 'item' }).expect(200);
    assert.deepEqual([...new Set(porEntidade.body.linhas.map((linha) => linha.entity_type))], ['item']);

    const idDoItem = Number(porEntidade.body.linhas[0].entity_id);
    const porId = await consultar({ entidade: 'item', entidadeId: idDoItem }).expect(200);
    assert.deepEqual([...new Set(porId.body.linhas.map((linha) => Number(linha.entity_id)))], [idDoItem]);
  });

  it('filtra por período, e o dia de hoje entra inteiro', async () => {
    const deHoje = await consultar({ de: HOJE, ate: HOJE }).expect(200);
    assert.ok(deHoje.body.pagina.total > 0, 'tudo o que este teste fez aconteceu hoje');

    const depoisDeHoje = await consultar({ de: '2099-01-01' }).expect(200);
    assert.equal(depoisDeHoje.body.pagina.total, 0);
  });

  it('dois filtros juntos valem ao mesmo tempo', async () => {
    const resposta = await consultar({ atorTipo: 'admin', acao: 'favo.criado', de: HOJE }).expect(200);

    assert.ok(resposta.body.linhas.length > 0);
    for (const linha of resposta.body.linhas) {
      assert.equal(linha.ator_tipo, 'admin');
      assert.equal(linha.action, 'favo.criado');
    }
  });

  it('o id da requisição liga a linha à requisição que a produziu', async () => {
    const [[linha]] = await banco.conexao.query(
      "SELECT request_id FROM audit_logs WHERE action = 'item.criado' AND request_id IS NOT NULL LIMIT 1",
    );
    const resposta = await consultar({ requestId: linha.request_id }).expect(200);

    assert.ok(resposta.body.linhas.length > 0);
    assert.deepEqual([...new Set(resposta.body.linhas.map((l) => l.request_id))], [linha.request_id]);
  });

  it('filtro inválido é recusado antes de virar consulta', async () => {
    await consultar({ atorTipo: 'invasor' }).expect(422);
    await consultar({ de: 'ontem' }).expect(422);
    await consultar({ atorId: '-1' }).expect(422);
  });

  it('a paginação leva os filtros junto e não repete linha', async () => {
    const primeira = await consultar({ pagina: 1 }).expect(200);

    if (primeira.body.pagina.paginas > 1) {
      const segunda = await consultar({ pagina: 2 }).expect(200);
      const idsDaPrimeira = new Set(primeira.body.linhas.map((linha) => linha.id));
      const repetidas = segunda.body.linhas.filter((linha) => idsDaPrimeira.has(linha.id));
      assert.equal(repetidas.length, 0);
    }

    // Página muito além do fim volta para a última, em vez de responder vazio.
    const longe = await consultar({ pagina: 999 }).expect(200);
    assert.equal(longe.body.pagina.atual, longe.body.pagina.paginas);
  });

  it('o CSV sai com cabeçalho e respeita o mesmo filtro', async () => {
    const resposta = await admin.get('/admin/auditoria/csv').query({ acao: 'item.criado' }).expect(200);

    assert.match(resposta.headers['content-type'], /text\/csv/);
    assert.match(resposta.headers['content-disposition'], /auditoria-beever\.csv/);

    const linhas = resposta.text.trim().split('\n');
    assert.equal(linhas[0], 'id,quando,ator_tipo,ator_id,acao,entidade,entidade_id,request_id');
    assert.ok(linhas.length > 1);
    for (const linha of linhas.slice(1)) assert.match(linha, /item\.criado/);
  });

  it('a tela não oferece caminho de escrita: a trilha é append-only (RNF-17)', async () => {
    const pagina = await admin.get('/admin/auditoria').set('Accept', 'text/html').expect(200);

    // O único POST da página é o "Sair", que vem da casca administrativa. O que
    // não pode existir é formulário apontando para a própria auditoria.
    assert.doesNotMatch(
      pagina.text,
      /action="\/admin\/auditoria[^"]*"[^>]*method="POST"|method="POST"[^>]*action="\/admin\/auditoria/i,
      'nenhum formulário escreve na trilha',
    );
    await admin.post('/admin/auditoria').set('Accept', 'application/json').send({ _csrf: csrfDoAdmin }).expect(404);
  });
});
