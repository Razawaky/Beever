import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import sharp from 'sharp';
import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { fecharPool } from '../../src/config/database.js';
import { env } from '../../src/config/env.js';
import { fecharSessionStore } from '../../src/config/session.js';

/**
 * O cadastro de itens pelo painel (T-12.3), com as três coisas que ele carrega:
 * a ilustração própria, o comportamento econômico derivado dos números e a
 * promessa do aceite da etapa — o item cadastrado aparece na loja sem `db:seed`.
 *
 * A ilustração entra em PNG e precisa sair em WebP: o administrador manda o
 * arquivo que tem, e quem converte é o servidor.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const ADMIN = { email: 'admin@beever.dev', senha: 'admin1234' };
const JOGADORA = { email: 'ana@beever.dev', senha: 'beever123' };

/** Os quatro primeiros bytes de um WebP são "RIFF", e os bytes 8 a 12, "WEBP". */
function ehWebp(bytes) {
  return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
}

describe('cadastro de itens pelo painel', opcoes, () => {
  let banco;
  let app;
  let admin;
  let jogadora;
  let csrfDoAdmin;
  let idDaCategoria;
  let pngDeTeste;

  async function tokenDe(agente, caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').redirects(2);
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function entrar(conta, caminhoDoLogin, endereco) {
    const agente = request.agent(app);
    const csrf = await tokenDe(agente, caminhoDoLogin);
    await agente
      .post(endereco)
      .set('Accept', 'application/json')
      .send({ ...conta, _csrf: csrf })
      .expect(200);
    return agente;
  }

  /** Os campos obrigatórios do formulário, para cada teste mudar só o que importa. */
  function camposDoItem(extras = {}) {
    return {
      nome: 'Bicicleta nova',
      descricaoInfantil: 'Uma bicicleta para passear no fim de semana',
      idCategoria: idDaCategoria,
      preco: 300,
      taxaDeValorizacao: -0.02,
      pisoPercentual: 30,
      tetoPercentual: 100,
      custoFixo: 4,
      rendaPorCiclo: 0,
      ...extras,
    };
  }

  /** Envia o formulário como multipart, que é o que a tela faz por ter arquivo. */
  function enviarItem(endereco, campos, arquivo = null) {
    const requisicao = admin.post(endereco).set('Accept', 'application/json').field('_csrf', csrfDoAdmin);

    Object.entries(campos).forEach(([chave, valor]) => requisicao.field(chave, String(valor)));
    if (arquivo) requisicao.attach('ilustracao', arquivo.bytes, arquivo.nome);
    return requisicao;
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();

    admin = await entrar(ADMIN, '/admin/login', '/admin/login');
    csrfDoAdmin = await tokenDe(admin, '/admin/itens');
    jogadora = await entrar(JOGADORA, '/login', '/sessao/login');

    const [[categoria]] = await banco.conexao.query('SELECT id FROM item_categories LIMIT 1');
    idDaCategoria = Number(categoria.id);

    // Uma imagem de verdade, gerada na hora: o teste precisa provar a conversão,
    // e um arquivo fixo no repositório seria mais um binário para manter.
    pngDeTeste = await sharp({
      create: { width: 60, height: 40, channels: 3, background: { r: 250, g: 200, b: 60 } },
    })
      .png()
      .toBuffer();
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
    await rm(env.uploads.diretorio, { recursive: true, force: true });
  });

  it('a jogadora comum não chega a nenhuma rota de item', async () => {
    await jogadora.get('/admin/itens').set('Accept', 'application/json').expect(403);
    await jogadora.post('/admin/itens').set('Accept', 'application/json').send(camposDoItem()).expect(403);
  });

  it('cria o item, converte a ilustração para WebP e deriva o comportamento', async () => {
    const resposta = await enviarItem('/admin/itens', camposDoItem(), {
      bytes: pngDeTeste,
      nome: 'bicicleta.png',
    }).expect(201);

    const [[item]] = await banco.conexao.query('SELECT slug, image_path FROM items WHERE id = ?', [
      resposta.body.id,
    ]);
    assert.equal(item.slug, 'bicicleta-nova');
    assert.match(item.image_path, /^\/uploads\/[\w-]+\.webp$/, 'o caminho gravado é o público, já em WebP');

    const gravado = await readFile(path.join(env.uploads.diretorio, path.basename(item.image_path)));
    assert.ok(ehWebp(gravado), 'o arquivo em disco é WebP, e não o PNG que foi enviado');

    // Taxa negativa e custo por ciclo: os dois comportamentos, sem ninguém marcar.
    const [comportamentos] = await banco.conexao.query(
      `SELECT b.slug FROM item_behaviors_map m
         JOIN item_behaviors b ON b.id = m.behavior_id
        WHERE m.item_id = ? ORDER BY b.slug`,
      [resposta.body.id],
    );
    assert.deepEqual(
      comportamentos.map((linha) => linha.slug),
      ['custo_fixo', 'deprecia'],
    );
  });

  it('o item novo aparece na loja da jogadora, sem seed', async () => {
    const loja = await jogadora.get('/loja').set('Accept', 'text/html').expect(200);
    assert.match(loja.text, /Bicicleta nova/);
    assert.match(loja.text, /\/uploads\/[\w-]+\.webp/, 'a ilustração cadastrada chega ao card');
  });

  it('recusa o segundo item com o mesmo endereço', async () => {
    const resposta = await enviarItem('/admin/itens', camposDoItem()).expect(422);
    assert.match(resposta.body.erro, /endereço/);
  });

  it('recusa arquivo que não é imagem, sem criar o item', async () => {
    const resposta = await enviarItem('/admin/itens', camposDoItem({ nome: 'Coisa torta' }), {
      bytes: Buffer.from('isto aqui é um texto, não uma imagem'),
      nome: 'arte.png',
    }).expect(422);

    assert.match(resposta.body.erro, /não é uma imagem/);

    const [linhas] = await banco.conexao.query('SELECT id FROM items WHERE slug = ?', ['coisa-torta']);
    assert.equal(linhas.length, 0, 'arquivo recusado não pode deixar item pela metade');
  });

  it('recusa o valor mínimo maior que o máximo', async () => {
    const resposta = await enviarItem(
      '/admin/itens',
      camposDoItem({ nome: 'Faixa invertida', pisoPercentual: 90, tetoPercentual: 50 }),
    ).expect(422);

    assert.match(resposta.body.erro, /valor mínimo/);
  });

  it('mudar o preço não mexe em compra já feita', async () => {
    const [[patinete]] = await banco.conexao.query('SELECT id, price FROM items WHERE slug = ?', ['patinete']);
    const [[compra]] = await banco.conexao.query(
      'SELECT price_at_purchase FROM purchases WHERE item_id = ? LIMIT 1',
      [patinete.id],
    );

    await enviarItem(
      `/admin/itens/${patinete.id}`,
      camposDoItem({ nome: 'Patinete', slug: 'patinete', preco: 999 }),
    ).expect(200);

    const [[depois]] = await banco.conexao.query('SELECT price FROM items WHERE id = ?', [patinete.id]);
    assert.equal(Number(depois.price), 999, 'o preço novo vale da próxima compra em diante');

    const [[compraDepois]] = await banco.conexao.query(
      'SELECT price_at_purchase FROM purchases WHERE item_id = ? LIMIT 1',
      [patinete.id],
    );
    assert.equal(
      Number(compraDepois.price_at_purchase),
      Number(compra.price_at_purchase),
      'a compra antiga continua valendo o que valeu no dia',
    );
  });

  it('desativar tira o item da loja sem sumir do inventário de quem comprou', async () => {
    const [[patinete]] = await banco.conexao.query('SELECT id, name FROM items WHERE slug = ?', ['patinete']);

    await admin
      .post(`/admin/itens/${patinete.id}/ativo`)
      .set('Accept', 'application/json')
      .send({ ativo: 'false', _csrf: csrfDoAdmin })
      .expect(200);

    const loja = await jogadora.get('/loja').set('Accept', 'text/html').expect(200);
    assert.doesNotMatch(loja.text, /Patinete/, 'item desativado sai da vitrine');

    const inventario = await jogadora.get('/inventario').set('Accept', 'text/html').expect(200);
    assert.match(inventario.text, /Patinete/, 'quem já comprou continua com o item');

    await admin
      .post(`/admin/itens/${patinete.id}/ativo`)
      .set('Accept', 'application/json')
      .send({ ativo: 'true', _csrf: csrfDoAdmin })
      .expect(200);
  });

  it('toda ação de catálogo deixa linha na auditoria, com ator admin', async () => {
    const [linhas] = await banco.conexao.query(
      `SELECT DISTINCT log.action, tipo.slug AS actor_type
         FROM audit_logs log
         JOIN audit_actor_types tipo ON tipo.id = log.actor_type_id
        WHERE log.action IN ('item.criado', 'item.editado', 'item.desativado', 'item.reativado')`,
    );

    assert.deepEqual(
      linhas.map((linha) => linha.action).sort(),
      ['item.criado', 'item.desativado', 'item.editado', 'item.reativado'],
    );
    assert.deepEqual([...new Set(linhas.map((linha) => linha.actor_type))], ['admin']);
  });
});
