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
import * as hivesRepository from '../../src/repositories/hivesRepository.js';
import * as contentService from '../../src/services/contentService.js';
import * as progressService from '../../src/services/progressService.js';

/**
 * Aceite da E05: *"trilha navegável com estados corretos e impossível burlar
 * pré-requisito via URL"*.
 *
 * Os testes das tarefas cobrem o detalhe de cada peça. Este percorre o caminho
 * inteiro, de uma vez, e cobre o limite que escapava: os favos semeados têm
 * quatro células, então o percentual salta de 75% para 100% e **os 80% exatos da
 * RN-027 nunca eram exercidos com dado real**. Aqui o favo recebe uma quinta
 * célula, e 4 de 5 dá exatamente 80%.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('aceite da trilha (E05)', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let idUsuario;
  let primeiroFavo;
  let segundoFavo;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);

    csrf = await lerToken('/login');
    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'aceite',
        email: 'aceite-trilha@beever.dev',
        data_nasc: '2018-04-02',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: csrf,
      })
      .expect(201);

    csrf = await lerToken('/onboarding');
    await agente
      .put(`/perfil/${cadastro.body.idPerfil}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: 'aceite',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['2', '4'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    const [[perfil]] = await banco.conexao.query('SELECT user_id FROM profiles WHERE id = ?', [
      cadastro.body.idPerfil,
    ]);
    idUsuario = Number(perfil.user_id);

    primeiroFavo = await hivesRepository.buscarPorSlug('primeiros-passos');
    segundoFavo = await hivesRepository.buscarPorSlug('guardar-e-gastar');

    // A quinta célula existe para o limite da RN-027 cair em número redondo:
    // 4 de 5 é exatamente 80%, e 3 de 5 é 60%.
    await banco.conexao.query(
      `INSERT INTO cells (hive_id, game_type_id, age_band_id, order_index, title, estimated_seconds)
       SELECT ?, c.game_type_id, c.age_band_id, 5, 'Revisando o que aprendi', 240
         FROM cells c WHERE c.hive_id = ? AND c.order_index = 1`,
      [primeiroFavo.id, primeiroFavo.id],
    );
    await banco.conexao.query(
      `INSERT INTO contents (cell_id, version, body)
       SELECT c.id, 1, JSON_OBJECT('tipo', 'placeholder', 'texto', 'Conteúdo em produção.')
         FROM cells c WHERE c.hive_id = ? AND c.order_index = 5`,
      [primeiroFavo.id],
    );
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  /** Conclui a célula de posição `ordem` do primeiro favo, com três estrelas. */
  async function concluir(ordem) {
    const { celulas } = await contentService.listarCelulasDoFavo(idUsuario, primeiroFavo.id);
    const celula = celulas.find((linha) => Number(linha.order_index) === ordem);
    assert.ok(celula, `célula ${ordem} precisa existir`);

    return progressService.registrarTentativa(idUsuario, celula.id, { erros: 0, pontuacao: 100, concluiu: true });
  }

  it('a trilha nasce navegável: um favo aberto, o seguinte travado com motivo', async () => {
    const pagina = await agente.get('/trilha').set('Accept', 'text/html').expect(200);

    assert.match(pagina.text, /Primeiros passos/);
    assert.match(pagina.text, /Conclua 80% do favo anterior/);

    const trilha = await contentService.listarTrilha(idUsuario);
    assert.equal(trilha[0].estado, 'disponivel');
    assert.equal(trilha[1].estado, 'travado-por-percentual');
  });

  /** Critério 1: célula travada não abre — pelas três portas que existem hoje. */
  it('célula travada não abre por porta nenhuma', async () => {
    const { celulas } = await contentService.listarCelulasDoFavo(idUsuario, primeiroFavo.id);
    const terceira = celulas.find((linha) => Number(linha.order_index) === 3);

    await assert.rejects(
      () => contentService.abrirCelula(idUsuario, terceira.id),
      /Conclua a célula anterior/,
      'ler o conteúdo direto pelo service',
    );

    await assert.rejects(
      () => progressService.registrarTentativa(idUsuario, terceira.id, { erros: 0, concluiu: true }),
      /Conclua a célula anterior/,
      'mandar um resultado sem ter jogado',
    );

    const pagina = await agente.get(`/trilha/${primeiroFavo.id}`).set('Accept', 'text/html').expect(200);
    assert.doesNotMatch(
      pagina.text,
      new RegExp(`/celula/${terceira.id}`),
      'e a tela não oferece caminho para a célula travada',
    );
  });

  /** Critério 1, a outra metade: o favo travado não se abre pelo endereço. */
  it('favo travado não se abre digitando a URL', async () => {
    const resposta = await agente.get(`/trilha/${segundoFavo.id}`).set('Accept', 'text/html').expect(403);
    assert.doesNotMatch(resposta.text, /Por que guardar\?/, 'nem o nome das células vaza');
  });

  /** Critério 2: o limite da RN-027, nos dois lados. */
  it('60% não libera o favo seguinte; 80% libera', async () => {
    await concluir(1);
    await concluir(2);
    await concluir(3);

    const emSessenta = await contentService.listarTrilha(idUsuario);
    assert.equal(emSessenta[0].percentual, 60, 'três de cinco células');
    assert.equal(emSessenta[1].estado, 'travado-por-percentual', '60% não é 80%');

    const quarta = await concluir(4);
    assert.equal(Number(quarta.favo.percent), 80, 'quatro de cinco é o limite exato da regra');

    const emOitenta = await contentService.listarTrilha(idUsuario);
    assert.equal(emOitenta[1].estado, 'disponivel', 'nos 80% exatos o favo seguinte abre');
    assert.equal(emOitenta[0].concluido, false, 'e o favo atual ainda não está fechado — falta uma célula');

    const pagina = await agente.get(`/trilha/${segundoFavo.id}`).set('Accept', 'text/html').expect(200);
    assert.match(pagina.text, /Por que guardar\?/, 'e agora as células dele aparecem');
  });

  /** Critério 3: o requisito de patrimônio da RN-028. */
  it('requisito de patrimônio é respeitado, e some quando cumprido', async () => {
    await banco.conexao.query('UPDATE hives SET required_patrimony = 300 WHERE id = ?', [segundoFavo.id]);

    const travado = await contentService.listarTrilha(idUsuario);
    assert.equal(travado[1].estado, 'travado-por-patrimonio');
    assert.match(travado[1].motivo, /300 de patrimônio/);

    await agente.get(`/trilha/${segundoFavo.id}`).set('Accept', 'text/html').expect(403);

    // Item que conta patrimônio, com valor suficiente: é assim que a RN-045
    // liga o cofre e a loja ao desbloqueio de conteúdo.
    await banco.conexao.query(
      `INSERT INTO inventory (user_id, item_id, status_id, current_value)
       SELECT ?, i.id, (SELECT id FROM inventory_statuses WHERE slug = 'ativo'), 300
         FROM items i WHERE i.counts_in_patrimony = 1 ORDER BY i.id LIMIT 1`,
      [idUsuario],
    );

    const liberado = await contentService.listarTrilha(idUsuario);
    assert.equal(liberado[1].estado, 'disponivel', 'com patrimônio suficiente o favo abre');
    await agente.get(`/trilha/${segundoFavo.id}`).set('Accept', 'text/html').expect(200);

    await banco.conexao.query('UPDATE hives SET required_patrimony = 0 WHERE id = ?', [segundoFavo.id]);
  });

  it('fechar todas as células fecha o favo, e a trilha registra', async () => {
    await concluir(5);

    const trilha = await contentService.listarTrilha(idUsuario);
    assert.equal(trilha[0].percentual, 100);
    assert.ok(trilha[0].concluido);

    const pagina = await agente.get('/trilha').set('Accept', 'text/html').expect(200);
    assert.match(pagina.text, /100%/);
  });
});
