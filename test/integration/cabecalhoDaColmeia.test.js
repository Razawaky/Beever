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
import * as coinsService from '../../src/services/coinsService.js';

/**
 * O cabeçalho da Colmeia (RF-HOM-01 a 03).
 *
 * O que estes testes protegem: os quatro números do topo aparecem com ícone e
 * palavra, a barra de XP desenha a largura por classe, e o cabeçalho continua
 * fora do cartão com `overflow-hidden` — que é o detalhe silencioso capaz de
 * desligar o topo grudado sem quebrar nada visível no teste.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('cabeçalho da Colmeia', opcoes, () => {
  let banco;
  let app;
  let agente;
  let html;

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
        apelido: 'topo',
        email: 'topo@beever.dev',
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
        apelido: 'topo',
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
    await emTransacao((conexao) =>
      coinsService.creditar(conexao, Number(perfil.user_id), 700, { motivo: 'ajuste-administrativo' }),
    );

    html = (await agente.get('/painel').set('Accept', 'text/html').expect(200)).text;
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('mostra os quatro números do topo com ícone e palavra', async () => {
    assert.match(html, /Nível 1/, 'o nível (RF-HOM-01)');
    assert.match(html, /Seu mel[\s\S]*?🍯 700/, 'o saldo de mel (RF-HOM-02)');
    assert.match(html, /Seu patrimônio[\s\S]*?🏠 700/, 'o patrimônio (RF-HOM-02)');
    assert.match(html, /🔥 0 dias seguidos/, 'a sequência (RF-HOM-03)');
    assert.match(html, /🌼 0 de pólen/);
  });

  it('a barra de XP anuncia o valor e desenha a largura por classe', async () => {
    assert.match(html, /aria-label="Progresso até o próximo nível"/);
    assert.match(html, /role="progressbar"[\s\S]*?aria-valuenow="\d+"/);
    assert.match(html, /class="[^"]*barra-\d+/);
    assert.doesNotMatch(html, /style="/, 'a CSP descarta estilo na marcação (RNF-11)');
  });

  it('o topo fica grudado e fora do cartão que corta a rolagem', async () => {
    // `overflow-hidden` em qualquer ancestral desliga o `position: sticky`, e o
    // cartão branco da Colmeia tem um. O cabeçalho precisa vir antes dele.
    assert.match(html, /<header class="sticky top-0/);
    assert.ok(
      html.indexOf('<header class="sticky top-0') < html.indexOf('overflow-hidden rounded-favo'),
      'o cabeçalho grudado não pode morar dentro do cartão',
    );
  });

  it('a semana da sequência é desenhada uma vez só', async () => {
    // O calendário do topo é o mesmo partial de /metas: dois desenhos do mesmo
    // dado divergem no primeiro ajuste.
    const calendarios = html.match(/grid grid-cols-7/g) ?? [];

    assert.equal(calendarios.length, 1);
  });

  it('o patrimônio abre a composição no topo, sem a criança precisar somar', async () => {
    assert.match(html, /carteira 700 · cofre 0 · bens 0/);
  });
});
