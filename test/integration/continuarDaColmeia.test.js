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
 * O botão "Continuar" (RF-HOM-07).
 *
 * O que estes testes protegem: o botão leva direto à célula que o jogador tem
 * para jogar, e o destino responde de verdade. Botão que promete o que o
 * servidor recusa já aconteceu neste projeto (T-07.5), e é o pior tipo de
 * promessa quebrada para quem tem 8 anos.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('botão Continuar', opcoes, () => {
  let banco;
  let app;
  let agente;
  let proximaCelula;

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
        apelido: 'continuadora',
        email: 'continuadora@beever.dev',
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
        apelido: 'continuadora',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['0', '1', '2', '3', '4', '5', '6'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    const resposta = await agente.get('/painel').set('Accept', 'application/json').expect(200);
    proximaCelula = resposta.body.proximaCelula;
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a Colmeia oferece o Continuar apontando para a célula, e não para a lista do favo', async () => {
    assert.ok(proximaCelula, 'jogador novo sempre tem por onde começar');

    const html = await pagina('/painel');
    const endereco = `/trilha/${proximaCelula.idFavo}/celula/${proximaCelula.id}`;

    assert.match(html, new RegExp(`Continuar: ${proximaCelula.titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.ok(html.includes(`href="${endereco}"`), 'o botão leva direto ao jogo');
  });

  it('o destino do botão responde de verdade, e não só existe no HTML', async () => {
    const html = await pagina(`/trilha/${proximaCelula.idFavo}/celula/${proximaCelula.id}`);

    assert.match(html, new RegExp(proximaCelula.titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  it('a trilha usa o mesmo botão, com o mesmo destino', async () => {
    const html = await pagina('/trilha');

    assert.ok(html.includes(`href="/trilha/${proximaCelula.idFavo}/celula/${proximaCelula.id}"`));
  });

  it('sem célula pendente o botão troca de texto em vez de sumir', async () => {
    // Sem conteúdo visível não há próxima célula, que é o caso de quem fechou
    // tudo o que estava aberto — a tela não pode ficar sem ação principal.
    await banco.conexao.query('UPDATE cells SET is_active = 0');

    const html = await pagina('/painel');

    assert.match(html, /Ver minha trilha/);
    assert.ok(html.includes('href="/trilha"'));
  });

  it('a Colmeia continua sem escrever estilo na marcação', async () => {
    const html = await pagina('/painel');

    assert.doesNotMatch(html, /style="/, 'a CSP descarta estilo na marcação (RNF-11)');
  });
});
