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
import * as itemsRepository from '../../src/repositories/itemsRepository.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as coinsService from '../../src/services/coinsService.js';

/**
 * As telas da economia (RF-LOJ-01 a 07, RF-INV-01 a 04, RF-COF-01 a 04).
 *
 * O que estes testes protegem: o que os services já calculavam chega à
 * marcação. Patrimônio no topo da loja, o impacto escrito antes de a criança
 * gastar, bens separados de enfeites com a frase da RN-041, e o cofre inteiro
 * numa página que funciona sem JavaScript.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('telas da economia', opcoes, () => {
  let banco;
  let app;
  let agente;
  let idUsuario;
  let patinete;
  let cosmetico;

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
        apelido: 'lojista',
        email: 'lojista@beever.dev',
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
        apelido: 'lojista',
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

    await profilesRepository.atualizar(cadastro.body.idPerfil, { faixaEtaria: 'C' });
    await emTransacao((conexao) =>
      coinsService.creditar(conexao, idUsuario, 5000, { motivo: 'ajuste-administrativo' }),
    );

    patinete = await itemsRepository.buscarPorSlug('patinete');
    cosmetico = (await itemsRepository.listarAtivos()).find((item) => item.counts_in_patrimony === 0);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a loja mostra mel e patrimônio no topo, com a composição desenhada', async () => {
    const html = await pagina('/loja');

    assert.match(html, /Seu patrimônio/);
    assert.match(html, /data-grafico="composicao"/);
    assert.match(html, /aria-label="Composição do patrimônio/);
    assert.match(html, /Na carteira agora: 5000 de mel/);
  });

  it('a loja agrupa por categoria e explica o comportamento de cada item', async () => {
    const html = await pagina('/loja');

    assert.match(html, /Moradia/);
    assert.match(html, /Transporte/);
    assert.match(html, /Perde valor toda semana/);
    assert.match(html, /Rende \d+ de mel por semana/);
    assert.match(html, /isso não aumenta seu patrimônio/);
  });

  it('o item que o jogador não pode comprar mostra o que falta, sem botão de compra', async () => {
    const html = await pagina('/loja');
    const cardBloqueado = html.split('<article').find((pedaco) => pedaco.includes('🔒'));

    assert.ok(cardBloqueado, 'algum item do catálogo exige nível ou item anterior');
    assert.match(cardBloqueado, /Ainda não/);
    assert.ok(!cardBloqueado.includes('Quero este'), 'item bloqueado não oferece compra');
  });

  it('a confirmação explica o impacto antes de a criança gastar', async () => {
    const html = await pagina(`/loja/itens/${patinete.id}/confirmar`);

    assert.match(html, /Você vai pagar/);
    assert.match(html, /Seu patrimônio vai para/);
    assert.match(html, /Seu mel depois da compra/);
    assert.match(html, /name="chaveDeIdempotencia"/);
    assert.match(html, /Comprar agora/);
  });

  it('comprar pela confirmação leva de volta à loja com o item no inventário', async () => {
    const html = await pagina(`/loja/itens/${patinete.id}/confirmar`);
    const csrf = /name="_csrf" value="([^"]+)"/.exec(html)[1];
    const chave = /name="chaveDeIdempotencia" value="([^"]+)"/.exec(html)[1];

    await agente
      .post('/loja/compras')
      .set('Accept', 'text/html')
      .type('form')
      .send({ idItem: patinete.id, chaveDeIdempotencia: chave, _csrf: csrf })
      .expect(302)
      .expect('Location', '/loja');

    const inventario = await pagina('/inventario');
    assert.match(inventario, new RegExp(patinete.name));
  });

  it('o inventário separa bens de enfeites e diz que enfeite não vira patrimônio', async () => {
    const html = await pagina(`/loja/itens/${cosmetico.id}/confirmar`);
    const csrf = /name="_csrf" value="([^"]+)"/.exec(html)[1];
    const chave = /name="chaveDeIdempotencia" value="([^"]+)"/.exec(html)[1];
    await agente
      .post('/loja/compras')
      .set('Accept', 'text/html')
      .type('form')
      .send({ idItem: cosmetico.id, chaveDeIdempotencia: chave, _csrf: csrf })
      .expect(302);

    const inventario = await pagina('/inventario');
    const bens = inventario.split('Enfeites')[0];
    const enfeites = inventario.split('Enfeites')[1];

    assert.match(bens, new RegExp(patinete.name), 'o bem fica no bloco de bens');
    assert.match(enfeites, new RegExp(cosmetico.name), 'o enfeite fica no bloco de enfeites');
    assert.match(inventario, /não aumentam seu patrimônio/);
    assert.match(inventario, /Você pagou/);
    assert.match(inventario, /Vale hoje/);
  });

  it('o cofre guarda mel pelo formulário e volta para a página com o saldo novo', async () => {
    const html = await pagina('/cofre');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(html)[1];

    await agente
      .post('/cofre/depositos')
      .set('Accept', 'text/html')
      .type('form')
      .send({ valor: 300, _csrf: csrf })
      .expect(302)
      .expect('Location', '/cofre');

    const depois = await pagina('/cofre');
    assert.match(depois, /Guardado no cofre[\s\S]*?🍯 300/);
    assert.match(depois, /Depósito/, 'o extrato mostra o movimento');
  });

  it('a projeção do cofre responde ao quanto o jogador diz que vai guardar', async () => {
    const html = await pagina('/cofre?porSemana=100');

    assert.match(html, /Guardando <strong>100<\/strong> de mel por semana/);
    assert.match(html, /data-grafico="projecao"/);
    assert.match(html, /aria-label="Projeção do cofre/);
    assert.match(html, /Semana 8/, 'a projeção padrão vai a oito semanas');
  });

  it('a meta do cofre é declarada pelo formulário da página', async () => {
    const html = await pagina('/cofre');
    const csrf = /name="_csrf" value="([^"]+)"/.exec(html)[1];

    await agente
      .post('/cofre/meta')
      .set('Accept', 'text/html')
      .type('form')
      .send({ valor: 1000, _csrf: csrf })
      .expect(302)
      .expect('Location', '/cofre');

    const depois = await pagina('/cofre');
    assert.match(depois, /Você quer juntar/);
    assert.match(depois, /1000/);
  });

  it('as páginas da economia continuam respondendo JSON para quem pede JSON', async () => {
    const vitrine = await agente.get('/loja/itens').set('Accept', 'application/json').expect(200);
    const cofre = await agente.get('/cofre').set('Accept', 'application/json').expect(200);

    assert.ok(Array.isArray(vitrine.body.itens));
    assert.ok(Object.hasOwn(cofre.body, 'saldo'));
  });
});
