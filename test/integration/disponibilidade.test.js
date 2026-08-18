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
 * Editar a semana depois do onboarding (RF-ONB-09, RN-013, RN-017).
 *
 * A regra que este arquivo protege é uma frase: **mudar os dias não pode custar
 * progresso**. Reduzir a disponibilidade deixa o jogador com mais metas do que a
 * faixa nova pede, e a decisão de produto é não cancelar nenhuma — elas ficam
 * ativas até vencer, com o progresso intacto, e quem não concluir no prazo
 * apenas não é recompensado. Aumentar a disponibilidade completa o plano na hora.
 *
 * A expiração também é testada aqui porque ela é a outra metade da mesma
 * decisão: sem ela, a meta excedente ficaria ativa para sempre.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const SEMANA_CHEIA = ['1', '2', '3', '4', '5'];
const DOIS_DIAS = ['2', '4'];

describe('edição da disponibilidade', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let perfilId;
  let idUsuario;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  function salvarDias(dias) {
    return agente
      .put(`/perfil/${perfilId}/disponibilidade`)
      .set('Accept', 'application/json')
      .send({ dias, _csrf: csrf });
  }

  async function metasAtivas() {
    const [linhas] = await banco.conexao.query(
      `SELECT g.id, g.title, g.target_value, g.current_value, g.due_at, s.slug AS status
         FROM goals g
         JOIN goal_statuses s ON s.id = g.status_id
        WHERE g.user_id = ? AND s.slug = 'ativa'
        ORDER BY g.id`,
      [idUsuario],
    );
    return linhas;
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
        apelido: 'disponivel',
        email: 'disponibilidade@beever.dev',
        data_nasc: '2013-09-09',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: csrf,
      })
      .expect(201);

    perfilId = cadastro.body.idPerfil;
    csrf = await lerToken('/onboarding');

    await agente
      .put(`/perfil/${perfilId}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: 'disponivel',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: SEMANA_CHEIA,
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    const [[perfil]] = await banco.conexao.query('SELECT user_id FROM profiles WHERE id = ?', [perfilId]);
    idUsuario = Number(perfil.user_id);
    csrf = await lerToken('/painel');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a tela de perfil mostra a semana marcada e as metas de agora', async () => {
    const pagina = await agente.get('/perfil').set('Accept', 'text/html').expect(200);

    assert.match(pagina.text, /Meus dias de jogo/);
    // Cinco dias marcados no onboarding: cinco caixas vêm marcadas.
    assert.equal((pagina.text.match(/name="dias"[^>]*checked/g) ?? []).length, 5);
    assert.match(pagina.text, /Chegue a/);
  });

  /**
   * O coração da RN-013. Cinco dias pedem três metas; dois dias pedem uma. As
   * duas que sobram não são canceladas nem perdem o que já andaram.
   */
  it('reduzir de 5 para 2 dias mantém as metas em andamento, com o progresso intacto', async () => {
    const antes = await metasAtivas();
    assert.equal(antes.length, 3);

    // Uma delas já tem caminho andado: é o que a regra promete não perder.
    await banco.conexao.query('UPDATE goals SET current_value = 40 WHERE id = ?', [antes[0].id]);

    const resposta = await salvarDias(DOIS_DIAS).expect(200);
    assert.deepEqual(resposta.body.dias.map(String), DOIS_DIAS);
    assert.equal(resposta.body.metasGeradas, 0, 'menos dias não geram meta nova');
    assert.equal(resposta.body.metasPedidas, 1, 'a faixa de 2 dias pede uma meta');
    assert.equal(resposta.body.metasExcedentes, 2, 'as outras duas sobram, e continuam valendo');

    const depois = await metasAtivas();
    assert.deepEqual(
      depois.map((meta) => Number(meta.id)),
      antes.map((meta) => Number(meta.id)),
      'nenhuma meta foi cancelada ou trocada',
    );
    assert.equal(
      Number(depois.find((meta) => Number(meta.id) === Number(antes[0].id)).current_value),
      40,
      'o progresso já feito continua lá',
    );
  });

  it('recusa deixar a semana vazia', async () => {
    await salvarDias([]).expect(422);
    await salvarDias(['9']).expect(422);

    const semana = await agente.get('/perfil').set('Accept', 'text/html').expect(200);
    assert.equal((semana.text.match(/name="dias"[^>]*checked/g) ?? []).length, 2, 'a recusa não mexeu na semana');
  });

  /**
   * RN-017: vencer não é punição. A meta sai das ativas, o jogador não perde
   * nada e nenhuma recompensa é paga — e é só depois disso que o planejador
   * volta a completar o plano.
   */
  it('meta vencida expira sem pagar, e o plano volta a ser completado', async () => {
    const antes = await metasAtivas();
    const melAntes = await agente.get('/perfil/meu').set('Accept', 'application/json').expect(200);

    // Vence as três de uma vez, como o tempo faria. O início precisa recuar
    // junto: `ck_goals_dates` exige prazo depois do começo, então nem o teste
    // consegue criar uma meta que nasce vencida.
    await banco.conexao.query(
      'UPDATE goals SET starts_at = NOW() - INTERVAL 10 DAY, due_at = NOW() - INTERVAL 1 DAY WHERE user_id = ?',
      [idUsuario],
    );

    await agente.get('/painel').set('Accept', 'text/html').expect(200);

    const [expiradas] = await banco.conexao.query(
      `SELECT COUNT(*) AS total
         FROM goals g JOIN goal_statuses s ON s.id = g.status_id
        WHERE g.user_id = ? AND s.slug = 'expirada'`,
      [idUsuario],
    );
    assert.equal(Number(expiradas[0].total), antes.length, 'todas as vencidas viraram expiradas');

    const melDepois = await agente.get('/perfil/meu').set('Accept', 'application/json').expect(200);
    assert.equal(melDepois.body.mel, melAntes.body.mel, 'meta vencida não paga nada — e também não cobra');

    const depois = await metasAtivas();
    assert.equal(depois.length, 1, 'a faixa de 2 dias pede uma meta, e o planejador a repôs (RN-018)');
    assert.ok(
      !antes.some((meta) => Number(meta.id) === Number(depois[0].id)),
      'a meta ativa agora é nova, não uma das que venceram',
    );
  });

  it('voltar a marcar mais dias completa o plano na hora', async () => {
    csrf = await lerToken('/painel');
    const resposta = await salvarDias(SEMANA_CHEIA).expect(200);

    assert.equal(resposta.body.metasPedidas, 3);
    assert.equal(resposta.body.metasGeradas, 2, 'tinha uma ativa, a faixa pede três');
    assert.equal(resposta.body.metasExcedentes, 0);
    assert.equal((await metasAtivas()).length, 3);
  });
});
