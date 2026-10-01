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
 * O cadastro de conteúdo pelo painel (T-12.2), e o que ele promete no aceite da
 * etapa: **o que o administrador publica aparece para o jogador sem `db:seed`**.
 *
 * Por isso o caminho é percorrido inteiro num teste só, com dois agentes — o
 * administrador cadastra, e a conta demo abre a trilha e encontra a célula
 * nova, jogável. Testar só o `INSERT` provaria que a linha entrou no banco, que
 * é a metade fácil.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const ADMIN = { email: 'admin@beever.dev', senha: 'admin1234' };
const JOGADORA = { email: 'ana@beever.dev', senha: 'beever123' };

const QUIZ_VALIDO = {
  tipo: 'quiz-do-favo',
  perguntas: [
    { enunciado: 'O que é guardar dinheiro?', alternativas: ['Gastar tudo', 'Deixar para depois'], correta: 1 },
    { enunciado: 'Onde o mel fica guardado?', alternativas: ['No cofre', 'No chão'], correta: 0 },
  ],
};

describe('cadastro de conteúdo pelo painel', opcoes, () => {
  let banco;
  let app;
  let admin;
  let jogadora;
  let csrfDoAdmin;
  let idDoFavoDemo;
  let idDoTipoQuiz;
  let idDaFaixaA;

  async function tokenDe(agente, caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').redirects(2);
    // O token vem em campo escondido nos formulários e no `dataset` do body nas
    // telas que só falam por JavaScript, como a do favo.
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

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();

    admin = await entrar(ADMIN, '/admin/login', '/admin/login');
    csrfDoAdmin = await tokenDe(admin, '/admin/favos');
    jogadora = await entrar(JOGADORA, '/login', '/sessao/login');

    const [[favo]] = await banco.conexao.query('SELECT id FROM hives WHERE slug = ?', ['primeiros-passos']);
    idDoFavoDemo = Number(favo.id);

    const [[tipo]] = await banco.conexao.query('SELECT id FROM game_types WHERE slug = ?', ['quiz-do-favo']);
    idDoTipoQuiz = Number(tipo.id);

    const [[faixa]] = await banco.conexao.query('SELECT id FROM age_bands WHERE code = ?', ['A']);
    idDaFaixaA = Number(faixa.id);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a jogadora comum não chega a nenhuma rota de conteúdo', async () => {
    await jogadora.get('/admin/favos').set('Accept', 'application/json').expect(403);
    await jogadora
      .post('/admin/favos')
      .set('Accept', 'application/json')
      .send({ titulo: 'Favo pirata', idFaixa: idDaFaixaA, percentualDeDesbloqueio: 80 })
      .expect(403);
  });

  it('cria um favo, gerando o endereço a partir do título', async () => {
    const resposta = await admin
      .post('/admin/favos')
      .set('Accept', 'application/json')
      .send({
        titulo: 'Juros São Amigos?',
        descricao: 'Favo criado pelo painel',
        idFaixa: idDaFaixaA,
        percentualDeDesbloqueio: 80,
        _csrf: csrfDoAdmin,
      })
      .expect(201);

    const [[favo]] = await banco.conexao.query('SELECT slug, order_index FROM hives WHERE id = ?', [
      resposta.body.id,
    ]);
    assert.equal(favo.slug, 'juros-sao-amigos');
    assert.ok(favo.order_index > 0, 'o favo novo entra no fim da trilha da faixa');
  });

  it('recusa o segundo favo com o mesmo endereço', async () => {
    const resposta = await admin
      .post('/admin/favos')
      .set('Accept', 'application/json')
      .send({
        titulo: 'Juros São Amigos?',
        idFaixa: idDaFaixaA,
        percentualDeDesbloqueio: 80,
        _csrf: csrfDoAdmin,
      })
      .expect(422);

    assert.match(resposta.body.erro, /endereço/);
  });

  it('recusa conteúdo torto antes de ele chegar à criança', async () => {
    const celula = await admin
      .post(`/admin/favos/${idDoFavoDemo}/celulas`)
      .set('Accept', 'application/json')
      .send({
        titulo: 'Célula de teste do validador',
        idTipoDeJogo: idDoTipoQuiz,
        idFaixa: idDaFaixaA,
        segundosEstimados: 120,
        _csrf: csrfDoAdmin,
      })
      .expect(201);

    const semAlternativa = await admin
      .post(`/admin/celulas/${celula.body.id}/conteudo`)
      .set('Accept', 'application/json')
      .send({ corpo: JSON.stringify({ tipo: 'quiz-do-favo', perguntas: [{ enunciado: 'e?', alternativas: [], correta: 0 }] }), _csrf: csrfDoAdmin })
      .expect(422);
    assert.match(semAlternativa.body.erro, /alternativas/);

    const jsonQuebrado = await admin
      .post(`/admin/celulas/${celula.body.id}/conteudo`)
      .set('Accept', 'application/json')
      .send({ corpo: '{ isto não é json', _csrf: csrfDoAdmin })
      .expect(422);
    assert.match(jsonQuebrado.body.erro, /JSON válido/);

    const [linhas] = await banco.conexao.query('SELECT id FROM contents WHERE cell_id = ?', [celula.body.id]);
    assert.equal(linhas.length, 0, 'conteúdo recusado não pode deixar linha no banco');

    // Esta célula fica sem conteúdo de propósito; desativa para não estorvar os
    // testes seguintes, que contam com a trilha da conta demo intacta.
    await admin
      .post(`/admin/celulas/${celula.body.id}/ativo`)
      .set('Accept', 'application/json')
      .send({ ativa: 'false', idFavo: idDoFavoDemo, _csrf: csrfDoAdmin })
      .expect(200);
  });

  it('a célula publicada pelo painel aparece jogável para a jogadora, sem seed', async () => {
    const celula = await admin
      .post(`/admin/favos/${idDoFavoDemo}/celulas`)
      .set('Accept', 'application/json')
      .send({
        titulo: 'O mel que rende sozinho',
        idTipoDeJogo: idDoTipoQuiz,
        idFaixa: idDaFaixaA,
        segundosEstimados: 180,
        _csrf: csrfDoAdmin,
      })
      .expect(201);

    await admin
      .post(`/admin/celulas/${celula.body.id}/conteudo`)
      .set('Accept', 'application/json')
      .send({ corpo: JSON.stringify(QUIZ_VALIDO), _csrf: csrfDoAdmin })
      .expect(201);

    const favo = await jogadora.get(`/trilha/${idDoFavoDemo}`).set('Accept', 'text/html').expect(200);
    assert.match(favo.text, /O mel que rende sozinho/, 'a célula nova está na tela do favo');

    // E é jogável de verdade: a partida abre e devolve as perguntas sem gabarito.
    // O token sai da Colmeia, que tem formulário; a tela do favo não tem nenhum.
    const csrfDaJogadora = await tokenDe(jogadora, '/painel');
    const partida = await jogadora
      .post('/partidas')
      .set('Accept', 'application/json')
      .send({ idCelula: celula.body.id, _csrf: csrfDaJogadora })
      .expect(201);

    assert.equal(partida.body.conteudo.perguntas.length, 2);
    assert.equal(partida.body.conteudo.perguntas[0].correta, undefined, 'o gabarito não vai para a tela');
  });

  it('editar o conteúdo publica uma versão nova e aposenta a anterior', async () => {
    const celula = await admin
      .post(`/admin/favos/${idDoFavoDemo}/celulas`)
      .set('Accept', 'application/json')
      .send({
        titulo: 'Célula com duas versões',
        idTipoDeJogo: idDoTipoQuiz,
        idFaixa: idDaFaixaA,
        segundosEstimados: 120,
        _csrf: csrfDoAdmin,
      })
      .expect(201);

    for (const corpo of [QUIZ_VALIDO, { ...QUIZ_VALIDO, perguntas: [QUIZ_VALIDO.perguntas[0]] }]) {
      await admin
        .post(`/admin/celulas/${celula.body.id}/conteudo`)
        .set('Accept', 'application/json')
        .send({ corpo: JSON.stringify(corpo), _csrf: csrfDoAdmin })
        .expect(201);
    }

    const [versoes] = await banco.conexao.query(
      'SELECT version, is_active FROM contents WHERE cell_id = ? ORDER BY version',
      [celula.body.id],
    );
    assert.deepEqual(
      versoes.map((linha) => [Number(linha.version), Number(linha.is_active)]),
      [
        [1, 0],
        [2, 1],
      ],
      'a versão antiga fica guardada, desativada',
    );

    await admin
      .post(`/admin/celulas/${celula.body.id}/ativo`)
      .set('Accept', 'application/json')
      .send({ ativa: 'false', idFavo: idDoFavoDemo, _csrf: csrfDoAdmin })
      .expect(200);
  });

  it('mover a célula troca a ordem com a vizinha, respeitando a UNIQUE do favo', async () => {
    const antes = await admin.get(`/admin/favos/${idDoFavoDemo}`).set('Accept', 'application/json').expect(200);
    const ativas = antes.body.celulas.filter((celula) => celula.is_active);
    const [primeira, segunda] = ativas;

    await admin
      .post(`/admin/celulas/${segunda.id}/mover`)
      .set('Accept', 'application/json')
      .send({ direcao: 'cima', idFavo: idDoFavoDemo, _csrf: csrfDoAdmin })
      .expect(200);

    const depois = await admin.get(`/admin/favos/${idDoFavoDemo}`).set('Accept', 'application/json').expect(200);
    const porId = new Map(depois.body.celulas.map((celula) => [celula.id, celula.order_index]));
    assert.equal(porId.get(segunda.id), primeira.order_index);
    assert.equal(porId.get(primeira.id), segunda.order_index);

    // Devolve a ordem original, porque as outras suítes contam com a trilha do seed.
    await admin
      .post(`/admin/celulas/${segunda.id}/mover`)
      .set('Accept', 'application/json')
      .send({ direcao: 'baixo', idFavo: idDoFavoDemo, _csrf: csrfDoAdmin })
      .expect(200);
  });

  it('desativar a célula tira ela da trilha sem apagar o progresso já pago', async () => {
    const lista = await admin.get(`/admin/favos/${idDoFavoDemo}`).set('Accept', 'application/json').expect(200);
    const jogada = lista.body.celulas.find((celula) => celula.jogadores > 0 && celula.is_active);
    assert.ok(jogada, 'o seed deixa células já jogadas neste favo');

    await admin
      .post(`/admin/celulas/${jogada.id}/ativo`)
      .set('Accept', 'application/json')
      .send({ ativa: 'false', idFavo: idDoFavoDemo, _csrf: csrfDoAdmin })
      .expect(200);

    const favo = await jogadora.get(`/trilha/${idDoFavoDemo}`).set('Accept', 'text/html').expect(200);
    assert.doesNotMatch(favo.text, new RegExp(jogada.title), 'a célula desativada some da trilha');

    const [progresso] = await banco.conexao.query('SELECT stars FROM cell_progress WHERE cell_id = ?', [
      jogada.id,
    ]);
    assert.ok(progresso.length > 0, 'o progresso e as estrelas continuam onde estavam');

    await admin
      .post(`/admin/celulas/${jogada.id}/ativo`)
      .set('Accept', 'application/json')
      .send({ ativa: 'true', idFavo: idDoFavoDemo, _csrf: csrfDoAdmin })
      .expect(200);
  });

  it('toda ação de cadastro deixa linha na auditoria, com ator admin', async () => {
    const [linhas] = await banco.conexao.query(
      `SELECT DISTINCT log.action, tipo.slug AS actor_type
         FROM audit_logs log
         JOIN audit_actor_types tipo ON tipo.id = log.actor_type_id
        WHERE log.action IN ('favo.criado', 'celula.criada', 'conteudo.publicado', 'celula.desativada', 'celula.reordenada')`,
    );

    assert.deepEqual(
      linhas.map((linha) => linha.action).sort(),
      ['celula.criada', 'celula.desativada', 'celula.reordenada', 'conteudo.publicado', 'favo.criado'],
    );
    assert.deepEqual([...new Set(linhas.map((linha) => linha.actor_type))], ['admin']);
  });
});
