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
 * As tarefas do dia na Colmeia (RF-HOM-08).
 *
 * O que estes testes protegem: a tarefa em andamento aparece sem botão, a
 * cumprida oferece a recompensa ali mesmo, e receber devolve o jogador à tela
 * de onde ele clicou — não é a Colmeia que perde o lugar por causa de um
 * redirecionamento fixo.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('tarefas na Colmeia', opcoes, () => {
  let banco;
  let app;
  let agente;

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

  async function tarefas() {
    const resposta = await agente.get('/painel').set('Accept', 'application/json').expect(200);
    return resposta.body.tarefas;
  }

  /** Põe a tarefa no alvo, que é o que o evento faria se o jogador jogasse. */
  async function cumprir(idTarefa) {
    await banco.conexao.query('UPDATE tasks SET current_value = target_value WHERE id = ?', [idTarefa]);
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
        apelido: 'tarefeira',
        email: 'tarefeira@beever.dev',
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
        apelido: 'tarefeira',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['0', '1', '2', '3', '4', '5', '6'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a tarefa do dia aparece na Colmeia com o progresso escrito', async () => {
    const lista = await tarefas();
    assert.ok(lista.length > 0, 'a colmeia propõe as tarefas do dia quando o jogador entra');

    const html = await pagina('/painel');
    const tarefa = lista[0];

    assert.match(html, /Suas tarefas de hoje/);
    assert.match(html, new RegExp(tarefa.titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, new RegExp(`${tarefa.atual} de ${tarefa.alvo}`));
    assert.match(html, new RegExp(`${tarefa.percentual}% feito`));
  });

  it('tarefa em andamento não oferece recompensa', async () => {
    const html = await pagina('/painel');
    const bloco = html.split('Suas tarefas de hoje')[1].split('Sua meta mais próxima')[0];

    assert.ok(!bloco.includes('Receber recompensa'), 'só o alvo cumprido abre o botão');
  });

  it('a tarefa cumprida é recebida na Colmeia e o jogador continua na Colmeia', async () => {
    const [tarefa] = await tarefas();
    await cumprir(tarefa.id);

    const html = await pagina('/painel');
    assert.match(html, /Receber recompensa/);

    const csrf = /name="_csrf" value="([^"]+)"/.exec(html)[1];
    await agente
      .post(`/tarefas/${tarefa.id}/concluir`)
      .set('Accept', 'text/html')
      .type('form')
      .send({ _csrf: csrf, voltarPara: '/painel' })
      .expect(302)
      .expect('Location', '/painel');
  });

  it('destino de volta fora da lista branca cai no padrão, sem redirecionar para fora', async () => {
    const lista = await tarefas();
    const pendente = lista.find((tarefa) => !tarefa.concluida);
    if (!pendente) return;

    await cumprir(pendente.id);
    const csrf = await lerToken('/painel');

    await agente
      .post(`/tarefas/${pendente.id}/concluir`)
      .set('Accept', 'text/html')
      .type('form')
      .send({ _csrf: csrf, voltarPara: 'https://exemplo.invalido/roubo' })
      .expect(302)
      .expect('Location', '/metas');
  });

  it('a tela de metas usa o mesmo card, com a barra que a Colmeia não tem', async () => {
    const html = await pagina('/metas');

    assert.match(html, /aria-label="Progresso da tarefa/);
  });
});
