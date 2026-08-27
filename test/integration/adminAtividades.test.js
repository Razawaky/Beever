import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { after, before, describe, it } from 'node:test';

import sharp from 'sharp';
import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { fecharPool } from '../../src/config/database.js';
import { env } from '../../src/config/env.js';
import { fecharSessionStore } from '../../src/config/session.js';

/**
 * O cadastro de atividade pelo formulário (T-12.4), com os oito tipos de jogo e
 * a mídia da atividade.
 *
 * Cada tipo é cadastrado pela tela, e o que prova que deu certo não é a linha no
 * banco: é a partida abrindo para a conta demo com o conteúdo montado — e sem o
 * gabarito junto, que é a RN-007.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const ADMIN = { email: 'admin@beever.dev', senha: 'admin1234' };
const JOGADORA = { email: 'ana@beever.dev', senha: 'beever123' };

/** Os campos que cada tipo de jogo manda, já como o formulário os manda: texto. */
const FORMULARIOS = {
  'quiz-do-favo': {
    perguntaEnunciado: ['Para que serve o mel?', ''],
    perguntaAlternativas: ['Comprar na loja\nNada', ''],
    perguntaCorreta: ['1', '1'],
  },
  'arraste-e-classifique': {
    enunciado: 'Separe o que é necessidade',
    categoriaNome: ['Preciso', 'Quero', ''],
    cartaTexto: ['Comida', 'Videogame', ''],
    cartaCaixa: ['1', '2', '1'],
  },
  'monte-o-orcamento': {
    enunciado: 'Reparta a mesada',
    total: '100',
    passo: '5',
    categoriaNome: ['Comida', 'Diversão', ''],
    categoriaMinimo: ['40', '0', '0'],
    categoriaMaximo: ['100', '30', '100'],
    categoriaDica: ['Precisa de pelo menos 40', 'No máximo 30', ''],
  },
  'cofre-do-tempo': {
    enunciado: 'Quanto guardar por semana?',
    nomeDoCiclo: 'semana',
    entradaPorCiclo: '10',
    minimoPorCiclo: '0',
    taxaPorCiclo: '10',
    ciclos: '6',
    meta: '60',
  },
  'mercado-esperto': {
    rodadaEnunciado: ['Qual leva mais suco por moeda?', ''],
    rodadaUnidade: ['litro', ''],
    rodadaOpcoes: ['garrafa pequena | 6 | 1\ngarrafa grande | 10 | 2', ''],
  },
  'ordene-a-prioridade': {
    enunciado: 'O que vem primeiro?',
    itemTexto: ['Comida', 'Aluguel', 'Cinema', ''],
    itemOrdem: ['2', '1', '3', '4'],
  },
  'listas-suspensas': {
    enunciado: 'Complete a frase sobre o mel',
    lacunaTexto: ['O mel serve para...', ''],
    lacunaOpcoes: ['comprar na loja\nnada', ''],
    lacunaCorreta: ['1', '1'],
  },
  'quadrinho-interativo': {
    painelTexto: ['É sábado de manhã.', 'O que você faz com o mel?', ''],
    painelEscolhas: ['', 'Guardo um pouco\nGasto tudo', ''],
    painelCorreta: ['1', '1', '1'],
  },
};

describe('cadastro de atividade pelo formulário', opcoes, () => {
  let banco;
  let app;
  let admin;
  let jogadora;
  let csrfDoAdmin;
  let csrfDaJogadora;
  let idDoFavoDemo;
  let idDaFaixaA;
  let tiposPorSlug;
  let pngDeTeste;

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

  /** Cria a célula do tipo pedido dentro do favo da conta demo. */
  async function criarCelula(slugDoTipo, titulo) {
    const resposta = await admin
      .post(`/admin/favos/${idDoFavoDemo}/celulas`)
      .set('Accept', 'application/json')
      .send({
        titulo,
        idTipoDeJogo: tiposPorSlug.get(slugDoTipo),
        idFaixa: idDaFaixaA,
        segundosEstimados: 180,
        _csrf: csrfDoAdmin,
      })
      .expect(201);

    return resposta.body.id;
  }

  /** Publica o conteúdo pelo formulário, como a tela faz: multipart. */
  function publicar(idCelula, campos, arquivo = null) {
    const requisicao = admin
      .post(`/admin/celulas/${idCelula}/conteudo`)
      .set('Accept', 'application/json')
      .field('_csrf', csrfDoAdmin)
      .field('modo', 'formulario');

    for (const [chave, valor] of Object.entries(campos)) {
      for (const item of [].concat(valor)) requisicao.field(chave, item);
    }
    if (arquivo) requisicao.attach('ilustracao', arquivo, 'arte.png');
    return requisicao;
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();

    admin = await entrar(ADMIN, '/admin/login', '/admin/login');
    csrfDoAdmin = await tokenDe(admin, '/admin/favos');
    jogadora = await entrar(JOGADORA, '/login', '/sessao/login');
    csrfDaJogadora = await tokenDe(jogadora, '/painel');

    const [[favo]] = await banco.conexao.query('SELECT id FROM hives WHERE slug = ?', ['primeiros-passos']);
    idDoFavoDemo = Number(favo.id);

    const [[faixa]] = await banco.conexao.query('SELECT id FROM age_bands WHERE code = ?', ['A']);
    idDaFaixaA = Number(faixa.id);

    const [tipos] = await banco.conexao.query('SELECT id, slug FROM game_types');
    tiposPorSlug = new Map(tipos.map((tipo) => [tipo.slug, Number(tipo.id)]));

    pngDeTeste = await sharp({
      create: { width: 60, height: 40, channels: 3, background: { r: 250, g: 200, b: 60 } },
    })
      .png()
      .toBuffer();
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
    await rm(env.uploads.diretorio, { recursive: true, force: true });
  });

  it('o seed traz os dois formatos novos com conteúdo jogável', async () => {
    const [linhas] = await banco.conexao.query(
      `SELECT tipo.slug, COUNT(conteudo.id) AS versoes
         FROM cells celula
         JOIN game_types tipo ON tipo.id = celula.game_type_id
         LEFT JOIN contents conteudo ON conteudo.cell_id = celula.id
        WHERE tipo.slug IN ('listas-suspensas', 'quadrinho-interativo')
        GROUP BY tipo.slug ORDER BY tipo.slug`,
    );

    assert.deepEqual(
      linhas.map((linha) => [linha.slug, Number(linha.versoes)]),
      [
        ['listas-suspensas', 1],
        ['quadrinho-interativo', 1],
      ],
    );
  });

  for (const [slug, campos] of Object.entries(FORMULARIOS)) {
    it(`${slug}: cadastrado pelo formulário, a partida abre para a jogadora`, async () => {
      const idCelula = await criarCelula(slug, `Atividade de ${slug}`);
      await publicar(idCelula, campos).expect(201);

      const partida = await jogadora
        .post('/partidas')
        .set('Accept', 'application/json')
        .send({ idCelula, _csrf: csrfDaJogadora })
        .expect(201);

      assert.equal(partida.body.celula.tipoDeJogo, slug);
      assert.doesNotMatch(
        JSON.stringify(partida.body.conteudo),
        /"correta"/,
        'o gabarito nunca vai para a tela (RN-007)',
      );

      // Fecha a partida para a célula seguinte destravar (RN-026): as células
      // nascem em sequência no mesmo favo, e a próxima só abre com uma estrela.
      await jogadora
        .post(`/partidas/${partida.body.token}/resultado`)
        .set('Accept', 'application/json')
        .set('x-csrf-token', csrfDaJogadora)
        .send({ respostas: [] })
        .expect(200);
    });
  }

  it('a imagem da atividade é convertida e chega ao conteúdo da partida', async () => {
    const idCelula = await criarCelula('quiz-do-favo', 'Atividade com imagem');
    await publicar(idCelula, FORMULARIOS['quiz-do-favo'], pngDeTeste).expect(201);

    const partida = await jogadora
      .post('/partidas')
      .set('Accept', 'application/json')
      .send({ idCelula, _csrf: csrfDaJogadora })
      .expect(201);

    assert.match(partida.body.conteudo.imagem, /^\/uploads\/[\w-]+\.webp$/);
  });

  it('publicar de novo sem arquivo mantém a imagem que já estava no ar', async () => {
    const idCelula = await criarCelula('quiz-do-favo', 'Atividade que troca de texto');
    await publicar(idCelula, FORMULARIOS['quiz-do-favo'], pngDeTeste).expect(201);
    await publicar(idCelula, FORMULARIOS['quiz-do-favo']).expect(201);

    const [versoes] = await banco.conexao.query(
      'SELECT version, body FROM contents WHERE cell_id = ? ORDER BY version',
      [idCelula],
    );
    assert.equal(versoes.length, 2);
    assert.equal(versoes[1].body.imagem, versoes[0].body.imagem, 'a arte atravessa a versão nova');
  });

  it('o formulário não escapa do validador: quiz com uma alternativa é recusado', async () => {
    const idCelula = await criarCelula('quiz-do-favo', 'Atividade torta');
    const resposta = await publicar(idCelula, {
      perguntaEnunciado: ['Pergunta sem escolha'],
      perguntaAlternativas: ['única'],
      perguntaCorreta: ['1'],
    }).expect(422);

    assert.match(resposta.body.erro, /alternativas/);

    const [linhas] = await banco.conexao.query('SELECT id FROM contents WHERE cell_id = ?', [idCelula]);
    assert.equal(linhas.length, 0, 'conteúdo recusado não deixa versão no banco');
  });

  it('o modo avançado continua aceitando JSON colado', async () => {
    const idCelula = await criarCelula('quiz-do-favo', 'Atividade colada');
    const corpo = {
      tipo: 'quiz-do-favo',
      perguntas: [{ enunciado: 'Colada?', alternativas: ['Sim', 'Não'], correta: 0 }],
    };

    await admin
      .post(`/admin/celulas/${idCelula}/conteudo`)
      .set('Accept', 'application/json')
      .field('_csrf', csrfDoAdmin)
      .field('modo', 'avancado')
      .field('corpo', JSON.stringify(corpo))
      .expect(201);

    const [[versao]] = await banco.conexao.query('SELECT body FROM contents WHERE cell_id = ?', [idCelula]);
    assert.equal(versao.body.perguntas[0].enunciado, 'Colada?');
  });
});
