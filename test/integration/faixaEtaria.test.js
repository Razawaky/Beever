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
 * O filtro da RN-029 com conteúdo real nas três faixas (RF-CON-06).
 *
 * A faixa não é escolhida pelo jogador: sai da data de nascimento no cadastro
 * (decisão D-1 do laudo do onboarding). Por isso o teste cadastra de verdade, em
 * vez de escrever a faixa direto no perfil — é o caminho que o jogador percorre.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

/** Idade de referência: hoje menos os anos, no formato que o cadastro aceita. */
function nascidoHa(anos) {
  const data = new Date();
  data.setFullYear(data.getFullYear() - anos);
  return data.toISOString().slice(0, 10);
}

describe('conteúdo por faixa etária', opcoes, () => {
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

  /** Cadastra e conclui o onboarding de um jogador com a idade pedida. */
  async function jogador(sufixo, idade) {
    const agente = request.agent(app);

    async function lerToken(caminho) {
      const resposta = await agente.get(caminho).set('Accept', 'text/html');
      const achado =
        /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
      assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
      return achado[1];
    }

    let csrf = await lerToken('/login');
    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: sufixo,
        email: `faixa-${sufixo}@beever.dev`,
        data_nasc: nascidoHa(idade),
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
        apelido: sufixo,
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['2', '4'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    const [[perfil]] = await banco.conexao.query(
      'SELECT p.user_id, f.code AS faixa FROM profiles p JOIN age_bands f ON f.id = p.age_band_id WHERE p.id = ?',
      [cadastro.body.idPerfil],
    );

    return { agente, idUsuario: Number(perfil.user_id), faixa: perfil.faixa };
  }

  it('cada faixa vê a sua trilha e as anteriores, nunca as de cima', async () => {
    const crianca = await jogador('crianca', 7);
    const preAdolescente = await jogador('pre', 10);
    const adolescente = await jogador('adolescente', 14);

    assert.equal(crianca.faixa, 'A', 'a faixa vem da data de nascimento, não de escolha');
    assert.equal(preAdolescente.faixa, 'B');
    assert.equal(adolescente.faixa, 'C');

    const trilhaA = await contentService.listarTrilha(crianca.idUsuario);
    const trilhaB = await contentService.listarTrilha(preAdolescente.idUsuario);
    const trilhaC = await contentService.listarTrilha(adolescente.idUsuario);

    assert.deepEqual(trilhaA.map((favo) => favo.age_band_code), ['A', 'A']);
    assert.deepEqual(trilhaB.map((favo) => favo.age_band_code), ['A', 'A', 'B', 'B']);
    assert.deepEqual(trilhaC.map((favo) => favo.age_band_code), ['A', 'A', 'B', 'B', 'C', 'C']);
  });

  it('o primeiro favo de cada faixa abre livre, sem esperar a faixa anterior', async () => {
    const adolescente = await jogador('adolescente-livre', 15);
    const trilha = await contentService.listarTrilha(adolescente.idUsuario);

    const primeirosDeFaixa = trilha.filter((favo) => Number(favo.order_index) === 1);
    assert.equal(primeirosDeFaixa.length, 3, 'um primeiro favo por faixa visível');
    assert.ok(
      primeirosDeFaixa.every((favo) => favo.estado === 'disponivel'),
      'quem tem 15 anos não precisa fechar a trilha de 6 anos antes de começar a sua',
    );

    const segundos = trilha.filter((favo) => Number(favo.order_index) === 2);
    assert.ok(
      segundos.every((favo) => favo.estado === 'travado-por-percentual'),
      'dentro da faixa a ordem continua valendo (RN-027)',
    );
  });

  it('a tela da trilha mostra os favos da faixa do jogador', async () => {
    const preAdolescente = await jogador('pre-tela', 11);
    const pagina = await preAdolescente.agente.get('/trilha').set('Accept', 'text/html').expect(200);

    assert.match(pagina.text, /Dinheiro no dia a dia/, 'o conteúdo da faixa dele aparece');
    assert.match(pagina.text, /Primeiros passos/, 'e o da faixa anterior também');
    assert.doesNotMatch(pagina.text, /O tempo e o juro/, 'o da faixa acima, não');
  });

  /**
   * A RN-029 fala de célula, não só de favo. O schema deixa a célula ter faixa
   * diferente da do favo, e sem filtro ela apareceria para quem é mais novo — e,
   * pior, entraria no denominador, deixando o favo impossível de fechar.
   */
  it('célula de faixa acima não aparece nem entra na conta do favo', async () => {
    const crianca = await jogador('crianca-celula', 8);
    const favo = await hivesRepository.buscarPorSlug('primeiros-passos');

    await banco.conexao.query(
      `UPDATE cells SET age_band_id = (SELECT id FROM age_bands WHERE code = 'C')
        WHERE hive_id = ? AND order_index = 4`,
      [favo.id],
    );

    const { celulas } = await contentService.listarCelulasDoFavo(crianca.idUsuario, favo.id);
    assert.equal(celulas.length, 3, 'a quarta célula é de faixa acima e some da lista');

    for (const celula of celulas) {
      await progressService.registrarTentativa(crianca.idUsuario, celula.id, {
        erros: 0,
        pontuacao: 100,
        concluiu: true,
      });
    }

    const resumo = await progressService.resumoDoFavo(crianca.idUsuario, favo.id);
    assert.equal(resumo.total, 3, 'o denominador é o que o jogador enxerga');
    assert.equal(resumo.percentual, 100, 'sem isso o favo nunca fecharia, e travaria o seguinte para sempre');

    const trilha = await contentService.listarTrilha(crianca.idUsuario);
    assert.equal(trilha[1].estado, 'disponivel', 'o favo seguinte abriu normalmente');

    await banco.conexao.query(
      `UPDATE cells SET age_band_id = (SELECT id FROM age_bands WHERE code = 'A')
        WHERE hive_id = ? AND order_index = 4`,
      [favo.id],
    );
  });
});
