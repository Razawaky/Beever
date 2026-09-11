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
 * A trilha na Colmeia (RF-HOM-06).
 *
 * O que estes testes protegem: a home mostra os favos em hexágonos com o estado
 * de cada um, dá tamanho ao que está em andamento e ao seguinte, e continua
 * mostrando os travados com o motivo escrito — sem virar uma segunda /trilha.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('trilha na Colmeia', opcoes, () => {
  let banco;
  let app;
  let agente;
  let html;
  let trilha;

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

    let csrf = await lerToken('/login');
    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'trilheira',
        email: 'trilheira@beever.dev',
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
        apelido: 'trilheira',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['0', '1', '2', '3', '4', '5', '6'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    html = (await agente.get('/painel').set('Accept', 'text/html').expect(200)).text;
    trilha = (await agente.get('/painel').set('Accept', 'application/json').expect(200)).body.trilha;
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a Colmeia desenha os favos em hexágonos, e não um cartão com link', async () => {
    assert.ok(trilha.length > 0, 'o jogador enxerga a faixa dele e as anteriores (RN-029)');

    const hexagonos = html.match(/favo-hexagono/g) ?? [];
    assert.equal(hexagonos.length, trilha.length, 'um hexágono por favo visível');
    assert.match(html, /href="\/trilha"/, 'a trilha inteira continua a um clique');
  });

  it('o favo em andamento e o seguinte ficam em foco', async () => {
    const emFoco = trilha.filter((favo) => favo.emFoco);

    assert.ok(emFoco.length >= 1 && emFoco.length <= 2, 'no máximo dois favos disputam a atenção');
    for (const favo of emFoco) {
      assert.match(html, new RegExp(favo.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });

  it('só o favo em foco desenha a barra de progresso', async () => {
    const abertosEmFoco = trilha.filter((favo) => favo.emFoco && favo.estado === 'disponivel');
    const barrasDeFavo = html.match(/aria-label="Progresso do favo/g) ?? [];

    assert.equal(barrasDeFavo.length, abertosEmFoco.length, 'favo fora do foco vai só com o número');
  });

  it('o favo travado aparece na Colmeia, sem link e com o motivo escrito', async () => {
    const travado = trilha.find((favo) => favo.estado !== 'disponivel' && !favo.concluido);
    if (!travado) return;

    assert.match(html, new RegExp(`Favo ${travado.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} bloqueado`));
    assert.match(html, new RegExp(travado.motivo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.ok(!html.includes(`href="/trilha/${travado.id}"`), 'favo travado não oferece porta');
  });

  it('a Colmeia continua sem escrever estilo na marcação', async () => {
    assert.doesNotMatch(html, /style="/, 'a CSP descarta estilo na marcação (RNF-11)');
  });
});
