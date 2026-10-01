import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';
import * as schedulesService from '../../src/services/schedulesService.js';
import { fontesMensuraveis } from '../../src/services/taskProgressSources.js';
import * as tasksService from '../../src/services/tasksService.js';
import { dataDoDia, diaDaSemana } from '../../src/utils/diaDoJogador.js';

/**
 * Geração e progresso das tarefas (RF-TAR-01, RF-TAR-02, RN-046, RN-047).
 * O que estes testes protegem: dia fora da agenda não gera, o teto de 3 ativas
 * vale contando o que sobrou, a vencida expira e abre vaga, e o progresso vem do
 * evento — jogar move a tarefa, clicar não.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('tarefas do dia', opcoes, () => {
  let banco;
  let app;
  let agente;
  let idUsuario;
  let idCelula;

  // O relógio é o de verdade: a tarefa nasce com `created_at` do banco, e a
  // janela que ela mede começa aí. Data fingida deixaria a janela invertida.
  const HOJE = diaDaSemana(dataDoDia(new Date(), 'America/Sao_Paulo'));
  const OUTRO_DIA = (HOJE + 3) % 7;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function limparTarefas() {
    await banco.conexao.query('DELETE FROM tasks WHERE user_id = ?', [idUsuario]);
    await banco.conexao.query('DELETE FROM game_sessions WHERE user_id = ?', [idUsuario]);
    await banco.conexao.query('DELETE FROM streak_events WHERE user_id = ?', [idUsuario]);
  }

  async function ativas() {
    const [linhas] = await banco.conexao.query(
      `SELECT t.id, t.current_value, t.target_value, tt.progress_source, sc.slug AS scope
         FROM tasks t
         JOIN task_types tt ON tt.id = t.task_type_id
         JOIN task_scopes sc ON sc.id = tt.scope_id
         JOIN goal_statuses st ON st.id = t.status_id
        WHERE t.user_id = ? AND st.slug = 'ativa'
        ORDER BY t.id`,
      [idUsuario],
    );
    return linhas;
  }

  async function celulaConcluidaEm() {
    await banco.conexao.query(
      `INSERT INTO game_sessions (user_id, cell_id, status_id, token, finished_at, stars)
       VALUES (?, ?, (SELECT id FROM game_session_statuses WHERE slug = 'concluida'), ?, NOW(), 3)`,
      [idUsuario, idCelula, randomUUID()],
    );
  }

  async function definirAgenda(dias) {
    await emTransacao((conexao) => schedulesService.definirSemana(conexao, idUsuario, dias));
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
        apelido: 'tarefeiro',
        email: 'tarefas@beever.dev',
        data_nasc: '2015-02-10',
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
        apelido: 'tarefeiro',
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

    const [[celula]] = await banco.conexao.query('SELECT id FROM cells ORDER BY id LIMIT 1');
    idCelula = Number(celula.id);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('dia fora da agenda do jogador não gera tarefa', async () => {
    await limparTarefas();
    // Marca um dia da semana que não é o de hoje.
    await definirAgenda([OUTRO_DIA]);

    const resultado = await tasksService.garantirTarefasDoDia(idUsuario);

    assert.equal(resultado.criadas, 0);
    assert.equal(resultado.motivo, 'dia fora da agenda do jogador');
    assert.equal((await ativas()).length, 0);
  });

  it('nunca passa de 3 tarefas ativas (RN-047)', async () => {
    await limparTarefas();
    await definirAgenda([0, 1, 2, 3, 4, 5, 6]);

    await tasksService.garantirTarefasDoDia(idUsuario);
    await tasksService.garantirTarefasDoDia(idUsuario);
    await tasksService.garantirTarefasDoDia(idUsuario);

    assert.ok((await ativas()).length <= 3, 'chamar de novo no mesmo dia não empilha tarefa');
  });

  it('a tarefa vencida expira e abre vaga para a do dia', async () => {
    await limparTarefas();
    await definirAgenda([0, 1, 2, 3, 4, 5, 6]);
    await tasksService.garantirTarefasDoDia(idUsuario);

    // Empurra tudo para o passado: é o jogador que sumiu por uma semana.
    await banco.conexao.query('UPDATE tasks SET due_at = NOW() - INTERVAL 1 DAY WHERE user_id = ?', [idUsuario]);

    const resultado = await tasksService.garantirTarefasDoDia(idUsuario);

    assert.ok(resultado.criadas > 0, 'a vaga liberada pela expiração foi preenchida');
    const [expiradas] = await banco.conexao.query(
      `SELECT COUNT(*) AS total
         FROM tasks t JOIN goal_statuses st ON st.id = t.status_id
        WHERE t.user_id = ? AND st.slug = 'expirada'`,
      [idUsuario],
    );
    assert.ok(Number(expiradas[0].total) > 0);
  });

  it('concluir células move a tarefa sozinha, sem clique nenhum', async () => {
    await limparTarefas();
    await definirAgenda([0, 1, 2, 3, 4, 5, 6]);
    await tasksService.garantirTarefasDoDia(idUsuario);

    const [tarefa] = (await ativas()).filter((ativa) => ativa.progress_source === 'cell_completed');
    assert.ok(tarefa, 'a tarefa diária de células foi proposta');

    for (let feita = 0; feita < Number(tarefa.target_value); feita += 1) {
      await celulaConcluidaEm();
    }
    await tasksService.sincronizarProgresso(idUsuario);

    const [depois] = (await ativas()).filter((ativa) => Number(ativa.id) === Number(tarefa.id));
    assert.equal(Number(depois.current_value), Number(tarefa.target_value), 'o progresso veio do evento');
  });

  it('o progresso não passa do alvo nem volta atrás', async () => {
    const [tarefa] = (await ativas()).filter((ativa) => ativa.progress_source === 'cell_completed');
    await celulaConcluidaEm();
    await tasksService.sincronizarProgresso(idUsuario);

    const [depois] = (await ativas()).filter((ativa) => Number(ativa.id) === Number(tarefa.id));
    assert.equal(Number(depois.current_value), Number(tarefa.target_value));
  });

  it('só propõe tarefa cuja fonte o sistema sabe medir', async () => {
    const [linhas] = await banco.conexao.query(
      `SELECT tt.progress_source
         FROM tasks t JOIN task_types tt ON tt.id = t.task_type_id
        WHERE t.user_id = ?`,
      [idUsuario],
    );

    const mensuraveis = fontesMensuraveis();
    assert.ok(
      linhas.every((linha) => mensuraveis.includes(linha.progress_source)),
      'tarefa sem fonte medível não pode ser proposta',
    );
    // Desde a T-09.4 o cofre existe, então `vault_deposit` entrou na lista.
    assert.ok(mensuraveis.includes('vault_deposit'));
  });

  it('a rota do passo manual deixou de existir', async () => {
    await limparTarefas();
    await definirAgenda([0, 1, 2, 3, 4, 5, 6]);
    await tasksService.garantirTarefasDoDia(idUsuario);
    const [tarefa] = await ativas();
    const csrf = await lerToken('/metas');

    await agente
      .post(`/tarefas/${tarefa.id}/progresso`)
      .set('Accept', 'application/json')
      .send({ _csrf: csrf })
      .expect(404);
  });
});
