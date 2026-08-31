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
 * As telas de conquista e de liga (RF-GAM-01 a 03, T-13.4).
 *
 * O que estes testes protegem: o que o desbloqueio e o ranque já calculavam
 * chega à marcação. A conquista aparece na Colmeia no mesmo acesso em que o mel
 * foi pago, o degrau travado mostra o alvo em vez de silhueta, e o ranque da
 * liga não expõe nada além do apelido.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('telas de conquista e de liga', opcoes, () => {
  let banco;
  let app;
  let agente;
  let idUsuario;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function pagina(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').expect(200);
    return resposta.text;
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
        apelido: 'ranqueada',
        email: 'ranqueada@beever.dev',
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
        apelido: 'ranqueada',
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

    // Três mil de patrimônio destravam os dois primeiros degraus da família e
    // deixam o terceiro (cinco mil) travado, que é o que a tela precisa mostrar.
    await emTransacao((conexao) =>
      coinsService.creditar(conexao, idUsuario, 3000, { motivo: 'ajuste-administrativo' }),
    );
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a Colmeia avisa o que a visita acabou de destravar', async () => {
    const html = await pagina('/painel');

    assert.match(html, /desbloqueou/);
    assert.match(html, /Primeiro patrimônio/);
    assert.match(html, /de bônus/);
    assert.match(html, /Ver todas as conquistas/);
  });

  it('a Colmeia mostra a posição na liga e diz que ninguém desce', async () => {
    const html = await pagina('/painel');

    assert.match(html, /Sua liga da semana/);
    assert.match(html, /1º lugar/);
    assert.match(html, /Ninguém desce de liga/);
  });

  it('a tela de conquistas mostra o desbloqueado e o alvo do que ainda falta', async () => {
    const html = await pagina('/conquistas');

    assert.match(html, /Minhas conquistas/);
    assert.match(html, /Patrimônio alcançado/);
    assert.match(html, /Dias seguidos de sequência/);
    assert.match(html, /Conquistada/);
    // O degrau travado aparece com o alvo, e não como silhueta.
    assert.match(html, /de 5000/);
    assert.match(html, /Faltam \d+ para o próximo degrau/);
  });

  it('a tela da liga mostra o ranque por apelido e nada de dado pessoal', async () => {
    const html = await pagina('/liga');

    assert.match(html, /Liga da semana/);
    assert.match(html, /Grupo 1/);
    assert.match(html, /ranqueada \(você\)/);
    assert.match(html, /Ninguém desce de liga aqui/);
    assert.ok(!html.includes('ranqueada@beever.dev'), 'a liga não mostra e-mail');
    assert.ok(!html.includes('2014-05-01'), 'a liga não mostra data de nascimento');
  });
});
