import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';
import * as streaksRepository from '../../src/repositories/streaksRepository.js';
import * as schedulesService from '../../src/services/schedulesService.js';
import * as streakService from '../../src/services/streakService.js';

/**
 * A semana da sequência na tela (RF-SEQ-02).
 * O que estes testes protegem: o resumo entrega os sete dias com o desfecho de
 * cada um, o dia que ainda não fechou vem sem desfecho, e o calendário chega
 * renderizado no painel e na tela de metas.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('tela da sequência', opcoes, () => {
  let banco;
  let app;
  let agente;
  let idUsuario;

  // Quinta-feira, 15h em São Paulo. A semana vai de 08/03 (domingo) a 14/03.
  const AGORA = new Date('2026-03-12T18:00:00Z');
  const DOMINGO = '2026-03-08';
  const HOJE = '2026-03-12';

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  /** Quantos dias o calendário desenhou. Cada dia é um `role="img"` com data no rótulo. */
  function diasNoCalendario(html) {
    return (html.match(/aria-label="[^"]*, \d\d\/\d\d —/g) ?? []).length;
  }

  async function limparSemana() {
    await banco.conexao.query('DELETE FROM streak_events WHERE user_id = ?', [idUsuario]);
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);

    let csrf = await lerToken('/login');
    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'semaneira',
        email: 'semana@beever.dev',
        data_nasc: '2014-05-01',
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
        apelido: 'semaneira',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['0', '1', '2', '3', '4', '5', '6'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    const [[perfil]] = await banco.conexao.query('SELECT user_id FROM profiles WHERE id = ?', [
      cadastro.body.idPerfil,
    ]);
    idUsuario = Number(perfil.user_id);

    await emTransacao((conexao) => schedulesService.definirSemana(conexao, idUsuario, [0, 1, 2, 3, 4, 5, 6]));
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('devolve os sete dias da semana, de domingo a sábado, com hoje marcado', async () => {
    await limparSemana();

    const semana = await streakService.resumoDaSemana(idUsuario, AGORA);

    assert.equal(semana.dias.length, 7);
    assert.equal(semana.dias[0].data, DOMINGO);
    assert.equal(semana.dias[0].nome, 'domingo');
    assert.equal(semana.dias[6].data, '2026-03-14');
    assert.deepEqual(
      semana.dias.filter((dia) => dia.ehHoje).map((dia) => dia.data),
      [HOJE],
    );
  });

  it('cada dia mostra o desfecho que a sequência gravou', async () => {
    await limparSemana();
    await streaksRepository.registrarEvento({ idUsuario, data: DOMINGO, tipo: 'cumprido' });
    await streaksRepository.registrarEvento({ idUsuario, data: '2026-03-09', tipo: 'perdido' });
    await streaksRepository.registrarEvento({ idUsuario, data: '2026-03-10', tipo: 'protegido' });
    await streaksRepository.registrarEvento({ idUsuario, data: '2026-03-11', tipo: 'neutro' });

    const semana = await streakService.resumoDaSemana(idUsuario, AGORA);

    assert.deepEqual(
      semana.dias.map((dia) => dia.desfecho),
      ['cumprido', 'perdido', 'protegido', 'neutro', null, null, null],
    );
  });

  it('hoje e os dias que ainda vêm não têm desfecho', async () => {
    await limparSemana();

    const semana = await streakService.resumoDaSemana(idUsuario, AGORA);
    const hoje = semana.dias.find((dia) => dia.data === HOJE);

    assert.equal(hoje.desfecho, null);
    assert.equal(hoje.futuro, false, 'o dia de hoje está em aberto, não no futuro');
    assert.deepEqual(
      semana.dias.filter((dia) => dia.futuro).map((dia) => dia.data),
      ['2026-03-13', '2026-03-14'],
    );
  });

  it('dia fora da agenda vem como dia de folga', async () => {
    await limparSemana();
    await emTransacao((conexao) => schedulesService.definirSemana(conexao, idUsuario, [1, 3, 5]));

    const semana = await streakService.resumoDaSemana(idUsuario, AGORA);

    assert.deepEqual(
      semana.dias.map((dia) => dia.marcado),
      [false, true, false, true, false, true, false],
    );

    await emTransacao((conexao) => schedulesService.definirSemana(conexao, idUsuario, [0, 1, 2, 3, 4, 5, 6]));
  });

  it('a tela de metas mostra a sequência e o calendário da semana', async () => {
    const resposta = await agente.get('/metas').set('Accept', 'text/html').expect(200);

    assert.match(resposta.text, /Minha sequência/);
    assert.match(resposta.text, /dias? seguidos?/);
    assert.match(resposta.text, /salvo pelo escudo/, 'a legenda escreve o desfecho, não confia só na cor');
    assert.equal(diasNoCalendario(resposta.text), 7);
  });

  it('o painel mostra a mesma semana em faixa compacta', async () => {
    const resposta = await agente.get('/painel').set('Accept', 'text/html').expect(200);

    assert.match(resposta.text, /dias? seguidos?/);
    assert.equal(diasNoCalendario(resposta.text), 7);
  });
});
