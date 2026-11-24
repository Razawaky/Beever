import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';
import * as tasksRepository from '../../src/repositories/tasksRepository.js';

/**
 * Cadastro do catálogo de tarefas pelo painel. O que importa aqui é que o tipo
 * criado pelo administrador entre na lista que o gerador lê, que a baixa seja
 * lógica e que nenhuma lista fechada aceite texto livre.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const ADMIN = { email: 'admin@beever.dev', senha: 'admin1234' };

describe('cadastro de tarefas pelo painel', opcoes, () => {
  let banco;
  let app;
  let admin;
  let csrf;
  let idCriado;

  const sufixo = randomUUID().slice(0, 8);

  function campos(extras = {}) {
    return {
      nome: `Tarefa de teste ${sufixo}`,
      slug: `tarefa-teste-${sufixo}`,
      escopo: 'diaria',
      fonte: 'cell_completed',
      alvo: 2,
      polen: 5,
      mel: 7,
      ...extras,
    };
  }

  async function tokenDe(caminho) {
    const resposta = await admin.get(caminho).set('Accept', 'text/html').redirects(2);
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    admin = request.agent(app);

    csrf = await tokenDe('/admin/login');
    await admin
      .post('/admin/login')
      .set('Accept', 'application/json')
      .send({ ...ADMIN, _csrf: csrf })
      .expect(200);
    csrf = await tokenDe('/admin/tarefas');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('lista e formulário do catálogo abrem', async () => {
    await admin.get('/admin/tarefas').set('Accept', 'text/html').expect(200);
    await admin.get('/admin/tarefas/novo').set('Accept', 'text/html').expect(200);
  });

  it('cria o tipo, edita e o desativa sem apagar a linha', async () => {
    const criada = await admin
      .post('/admin/tarefas')
      .set('Accept', 'application/json')
      .send({ ...campos(), _csrf: csrf })
      .expect(201);
    idCriado = Number(criada.body.id);
    assert.ok(idCriado > 0);

    const [[gravado]] = await banco.conexao.query(
      `SELECT tt.slug, tt.name, tt.default_target, tt.reward_points, tt.reward_coins,
              tt.progress_source, tt.is_active, sc.slug AS scope
         FROM task_types tt
         JOIN task_scopes sc ON sc.id = tt.scope_id
        WHERE tt.id = ?`,
      [idCriado],
    );
    assert.equal(gravado.slug, campos().slug);
    assert.equal(gravado.scope, 'diaria');
    assert.equal(gravado.progress_source, 'cell_completed');
    assert.equal(Number(gravado.default_target), 2);
    assert.equal(Number(gravado.is_active), 1);

    const lista = await admin.get('/admin/tarefas').set('Accept', 'application/json').expect(200);
    assert.ok(lista.body.some((tipo) => Number(tipo.id) === idCriado));

    const editada = await admin
      .post(`/admin/tarefas/${idCriado}`)
      .set('Accept', 'application/json')
      .send({ ...campos({ nome: `Editada ${sufixo}`, polen: 9, mel: 11, slug: '' }), _csrf: csrf })
      .expect(200);
    assert.equal(editada.body.name, `Editada ${sufixo}`);
    assert.equal(Number(editada.body.reward_points), 9);
    assert.equal(editada.body.slug, campos().slug, 'slug em branco mantém o atual');

    await admin
      .post(`/admin/tarefas/${idCriado}/ativo`)
      .set('Accept', 'application/json')
      .send({ ativo: 'false', _csrf: csrf })
      .expect(200);

    const [[desativado]] = await banco.conexao.query(
      'SELECT is_active FROM task_types WHERE id = ?',
      [idCriado],
    );
    assert.equal(Number(desativado.is_active), 0, 'a linha continua no banco, só sai do catálogo');

    const geraveis = await tasksRepository.listarTipos();
    assert.ok(!geraveis.some((tipo) => Number(tipo.id) === idCriado));

    const [[rastro]] = await banco.conexao.query(
      `SELECT action, entity_type FROM audit_logs
        WHERE entity_type = 'task_type' AND entity_id = ? ORDER BY id`,
      [idCriado],
    );
    assert.ok(rastro, 'a criação deixou rastro na auditoria');
    assert.equal(rastro.entity_type, 'task_type');
  });

  it('recusa fonte desconhecida, escopo inventado e slug repetido', async () => {
    await admin
      .post('/admin/tarefas')
      .set('Accept', 'application/json')
      .send({ ...campos({ nome: 'Fonte inventada' }), fonte: 'adivinhar', _csrf: csrf })
      .expect(422);

    await admin
      .post('/admin/tarefas')
      .set('Accept', 'application/json')
      .send({ ...campos({ nome: 'Escopo inventado' }), escopo: 'mensal', _csrf: csrf })
      .expect(422);

    await admin
      .post('/admin/tarefas')
      .set('Accept', 'application/json')
      .send({ ...campos({ nome: 'Slug repetido' }), _csrf: csrf })
      .expect(422);
  });
});
