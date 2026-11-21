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
 * Troca de imagem na tela de perfil (RF-PER-01).
 *
 * O avatar não é upload: é um slug do mesmo catálogo do onboarding. O teste
 * protege os três pontos que podem quebrar sem ninguém perceber — a tela oferece
 * só as opções do banco, a escolha persiste e o cabeçalho passa a mostrar o
 * arquivo novo — e a recusa de um slug inventado.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('troca de avatar no perfil', opcoes, () => {
  let banco;
  let agente;
  let csrf;
  let perfilId;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    agente = request.agent(criarApp());

    csrf = await lerToken('/login');
    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'avatares',
        email: 'avatares@beever.dev',
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
        apelido: 'avatares',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['1', '2', '3', '4', '5'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    csrf = await lerToken('/perfil');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('oferece dez imagens do catálogo, sem campo de upload', async () => {
    const resposta = await agente.get('/perfil').set('Accept', 'text/html').expect(200);
    const opcoesNaTela = resposta.text.match(/type="radio"\s+name="avatar"/g) ?? [];

    assert.equal(opcoesNaTela.length, 10);
    assert.doesNotMatch(resposta.text, /type="file"|enctype="multipart\/form-data"/);
    assert.match(resposta.text, /data-imagem="\/img\/beenie_music\.webp"/);
    assert.match(resposta.text, /id="avatar-atual"/);
    assert.doesNotMatch(resposta.text, /beenie_howdy\.png|beenie_vem\.png|beenie_1real\.png|babybee\.png/);
  });

  it('salva a escolha e troca a imagem exibida no cabeçalho', async () => {
    const resposta = await agente
      .put(`/perfil/${perfilId}`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ avatar: 'beenie-musica' })
      .expect(200);

    assert.equal(resposta.body.avatar, 'beenie-musica');
    assert.equal(resposta.body.avatar_imagem, '/img/onboarding/beenie_music.webp');

    const pagina = await agente.get('/perfil').set('Accept', 'text/html').expect(200);
    assert.match(pagina.text, /id="avatar-atual"\s+data-avatar-atual\s+src="\/img\/beenie_music\.webp"/);

    const [[linha]] = await banco.conexao.query(
      `SELECT a.slug FROM profiles p JOIN avatars a ON a.id = p.avatar_id WHERE p.id = ?`,
      [perfilId],
    );
    assert.equal(linha.slug, 'beenie-musica');
  });

  it('mostra a mesma escolha dentro da casca da Colmeia', async () => {
    const resposta = await agente.get('/painel/perfil').set('Accept', 'text/html').expect(200);
    assert.match(resposta.text, /value="beenie-musica"\s+data-imagem="\/img\/beenie_music\.webp"\s+class="peer sr-only"\s+checked/);
  });

  it('recusa um slug fora do catálogo sem mudar o perfil', async () => {
    await agente
      .put(`/perfil/${perfilId}`)
      .set('Accept', 'application/json')
      .set('x-csrf-token', csrf)
      .send({ avatar: 'beenie-inventado' })
      .expect(422);

    const pagina = await agente.get('/perfil').set('Accept', 'text/html').expect(200);
    assert.match(pagina.text, /src="\/img\/beenie_music\.webp"/);
  });
});
