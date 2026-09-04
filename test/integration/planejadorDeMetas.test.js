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
import * as goalProgressSources from '../../src/services/goalProgressSources.js';
import * as goalsService from '../../src/services/goalsService.js';

/**
 * O `GoalPlannerService` contra banco real (RN-014, RN-015, RN-016, RN-018).
 *
 * A prova desta tarefa é o aceite da E04: dois jogadores com disponibilidades
 * diferentes recebem conjuntos de metas coerentes com a tabela da RN-014. Aqui
 * são três — 1, 4 e 7 dias por semana —, cada um passando pelo onboarding de
 * verdade, porque é a conclusão do onboarding que dispara a geração (RF-ONB-07).
 *
 * O caso que falta, edição de 5 para 2 dias com meta em andamento, depende da
 * tela de disponibilidade (T-04.6) e é a T-04.7.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const TIPOS_MENSURAVEIS = [
  'acumular-mel',
  'atingir-nivel',
  'concluir-celulas',
  'concluir-favo',
  'manter-sequencia',
];
const DIA_EM_MS = 24 * 60 * 60 * 1000;

describe('planejador de metas', opcoes, () => {
  let banco;
  let app;

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function lerToken(agente, caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  /**
   * Um jogador que passou pelo onboarding inteiro, com a disponibilidade e o
   * tempo de sessão que o caso precisa. Devolve o que os testes usam depois:
   * as metas que nasceram e como falar com o banco e com a sessão dele.
   */
  async function jogadorPronto({ apelido, dias, minutos }) {
    const agente = request.agent(app);
    let csrf = await lerToken(agente, '/cadastro');

    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido,
        email: `${apelido}@beever.dev`,
        data_nasc: '2013-06-15',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: csrf,
      })
      .expect(201);

    csrf = await lerToken(agente, '/onboarding');
    const conclusao = await agente
      .put(`/perfil/${cadastro.body.idPerfil}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido,
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias,
        tempo: minutos,
        _csrf: csrf,
      })
      .expect(200);

    const [[perfil]] = await banco.conexao.query('SELECT user_id FROM profiles WHERE id = ?', [
      cadastro.body.idPerfil,
    ]);

    return {
      agente,
      idUsuario: Number(perfil.user_id),
      metasGeradas: conclusao.body.metasGeradas,
      metas: await metasAtivas(Number(perfil.user_id)),
    };
  }

  async function metasAtivas(idUsuario) {
    const [linhas] = await banco.conexao.query(
      `SELECT g.id, g.title, g.target_value, g.current_value, g.reward_coins, g.reward_points, g.due_at,
              t.slug AS tipo, d.slug AS dificuldade
         FROM goals g
         JOIN goal_types t ON t.id = g.goal_type_id
         JOIN goal_difficulties d ON d.id = g.difficulty_id
         JOIN goal_statuses s ON s.id = g.status_id
        WHERE g.user_id = ? AND s.slug = 'ativa'
        ORDER BY g.id`,
      [idUsuario],
    );
    return linhas;
  }

  /** Quantos dias faltam para o prazo, arredondado — o horário exato não importa. */
  function diasAte(data) {
    return Math.round((new Date(data).getTime() - Date.now()) / DIA_EM_MS);
  }

  it('1 dia na semana rende 1 meta de 28 dias, dificuldade alta (RN-014)', async () => {
    const jogador = await jogadorPronto({ apelido: 'planner-um-dia', dias: ['3'], minutos: 10 });

    assert.equal(jogador.metasGeradas, 1, 'a conclusão do onboarding já devolve o que gerou');
    assert.equal(jogador.metas.length, 1);

    const [meta] = jogador.metas;
    assert.equal(meta.dificuldade, 'alta');
    assert.equal(diasAte(meta.due_at), 28);
    assert.equal(Number(meta.reward_coins), 200, 'recompensa da dificuldade alta, congelada na criação');
    assert.equal(Number(meta.reward_points), 120);
  });

  it('4 dias rendem 2 metas de 14 dias, uma de cada tipo (RN-014, RN-015)', async () => {
    const jogador = await jogadorPronto({ apelido: 'planner-quatro-dias', dias: ['1', '2', '4', '5'], minutos: 20 });

    assert.equal(jogador.metas.length, 2);
    for (const meta of jogador.metas) {
      assert.equal(meta.dificuldade, 'media');
      assert.equal(diasAte(meta.due_at), 14);
      assert.equal(Number(meta.reward_coins), 150);
    }

    const tipos = jogador.metas.map((meta) => meta.tipo);
    assert.equal(new Set(tipos).size, 2, 'havendo tipo livre, o planejador não repete assunto');
  });

  /**
   * Sete dias pedem três metas, e há cinco tipos mensuráveis: cada uma sai de um
   * assunto diferente. O alvo repetido só apareceria se o planejador ficasse sem
   * tipo livre, o que deixou de acontecer quando célula, favo e sequência
   * ganharam fonte de progresso.
   */
  it('7 dias rendem 3 metas de 7 dias, cada uma de um assunto', async () => {
    const jogador = await jogadorPronto({
      apelido: 'planner-semana-cheia',
      dias: ['0', '1', '2', '3', '4', '5', '6'],
      minutos: 10,
    });

    assert.equal(jogador.metas.length, 3);
    for (const meta of jogador.metas) {
      assert.equal(meta.dificuldade, 'simples');
      assert.equal(diasAte(meta.due_at), 7);
    }

    const tipos = jogador.metas.map((meta) => meta.tipo);
    assert.equal(new Set(tipos).size, 3, 'havendo tipo livre, o planejador não repete assunto');
  });

  /**
   * RN-015: "nunca gera meta impossível". Patrimônio e cofre estão semeados como
   * tipo, mas ninguém sabe medi-los antes da E09 — uma meta dessas ficaria
   * parada em zero para sempre.
   */
  it('não sorteia tipo que o sistema ainda não sabe medir', async () => {
    const jogador = await jogadorPronto({ apelido: 'planner-mensuravel', dias: ['2', '4'], minutos: 10 });

    for (const meta of jogador.metas) {
      assert.ok(TIPOS_MENSURAVEIS.includes(meta.tipo), `tipo sem régua de progresso foi sorteado: ${meta.tipo}`);
      assert.ok(
        Number(meta.target_value) > Number(meta.current_value),
        'meta não pode nascer já cumprida',
      );
      assert.match(meta.title, /Chegue a/);
    }
  });

  /**
   * As três fontes que a auditoria da E08 encontrou semeadas e sem
   * implementação. O que este caso prova é que elas leem o número de verdade em
   * vez de ficar paradas em zero — e que a sequência lida é a de hoje, não o
   * recorde, senão a meta de manter sequência nunca cairia com a quebra.
   */
  it('célula, favo e sequência medem o progresso de verdade', async () => {
    const jogador = await jogadorPronto({ apelido: 'planner-fontes', dias: ['1', '3'], minutos: 10 });

    assert.equal(await goalProgressSources.medir('cell_completed', jogador.idUsuario), 0);
    assert.equal(await goalProgressSources.medir('hive_completed', jogador.idUsuario), 0);
    assert.equal(await goalProgressSources.medir('streak_days', jogador.idUsuario), 0);

    const [[celula]] = await banco.conexao.query(
      'SELECT id, hive_id FROM cells WHERE is_active = 1 AND deleted_at IS NULL LIMIT 1',
    );
    await banco.conexao.query(
      `INSERT INTO cell_progress (user_id, cell_id, stars, attempts, first_completed_at, last_completed_at)
       VALUES (?, ?, 2, 1, NOW(), NOW())`,
      [jogador.idUsuario, celula.id],
    );
    await banco.conexao.query(
      `INSERT INTO hive_progress (user_id, hive_id, completed_cells, total_cells, percent, completed_at)
       VALUES (?, ?, 1, 1, 100, NOW())`,
      [jogador.idUsuario, celula.hive_id],
    );
    await banco.conexao.query(
      'INSERT INTO streaks (user_id, current_days, best_days) VALUES (?, 4, 9)',
      [jogador.idUsuario],
    );

    assert.equal(await goalProgressSources.medir('cell_completed', jogador.idUsuario), 1);
    assert.equal(await goalProgressSources.medir('hive_completed', jogador.idUsuario), 1);
    assert.equal(
      await goalProgressSources.medir('streak_days', jogador.idUsuario),
      4,
      'a fonte lê a sequência de hoje, não a melhor marca',
    );
  });

  it('abrir o painel de novo não cria meta a mais', async () => {
    const jogador = await jogadorPronto({ apelido: 'planner-idempotente', dias: ['1', '3', '5'], minutos: 10 });
    assert.equal(jogador.metas.length, 2);

    await jogador.agente.get('/painel').set('Accept', 'text/html').expect(200);
    await jogador.agente.get('/metas').set('Accept', 'text/html').expect(200);

    const depois = await metasAtivas(jogador.idUsuario);
    assert.equal(depois.length, 2, 'o planejador completa o que falta, não empilha metas');
    assert.deepEqual(
      depois.map((meta) => Number(meta.id)),
      jogador.metas.map((meta) => Number(meta.id)),
      'e não troca as metas que já existiam',
    );
  });

  /**
   * RN-016 e RN-018: meta concluída dá lugar a outra, e a conta nunca fica sem
   * meta ativa. A conclusão de verdade exige ter alcançado o alvo, então o teste
   * credita o mel antes — é o mesmo caminho que o jogo usa ao pagar tarefa.
   */
  it('repõe a meta concluída, mantendo a conta sempre com meta ativa', async () => {
    // O que este caso mede é a reposição, não o sorteio. Com cinco tipos no
    // catálogo, a meta de mel pode não sair — e é a única que o teste sabe
    // concluir creditando saldo. Os outros tipos saem do sorteio e voltam no
    // fim, para nenhum caso depender da ordem de execução.
    const regras = await semSorteioDeOutrosTipos();

    try {
      const jogador = await jogadorPronto({
        apelido: 'planner-reposicao',
        dias: ['0', '1', '2', '3', '4', '5', '6'],
        minutos: 10,
      });
      const [meta] = jogador.metas.filter((linha) => linha.tipo === 'acumular-mel');
      assert.ok(meta, 'sem os outros tipos no sorteio, toda meta é de mel');

      await emTransacao((conexao) =>
        coinsService.creditar(conexao, jogador.idUsuario, Number(meta.target_value), {
          motivo: 'ajuste-administrativo',
        }),
      );

      await goalsService.concluir(Number(meta.id), jogador.idUsuario);

      const depois = await metasAtivas(jogador.idUsuario);
      assert.equal(depois.length, 3, 'a faixa de semana cheia pede três metas ativas, e elas existem de novo');

      const ids = depois.map((linha) => Number(linha.id));
      assert.ok(!ids.includes(Number(meta.id)), 'a meta concluída saiu das ativas');

      const reposta = depois.find(
        (linha) => !jogador.metas.some((antiga) => Number(antiga.id) === Number(linha.id)),
      );
      assert.ok(reposta, 'nasceu uma meta no lugar da concluída');
      assert.ok(
        Number(reposta.target_value) > Number(reposta.current_value),
        'a meta que substitui também não nasce cumprida, mesmo com o saldo alto',
      );
    } finally {
      await restaurarRegrasDeAlvo(regras);
    }
  });

  /** Tira do catálogo tudo que não for meta de mel e devolve o que foi tirado. */
  async function semSorteioDeOutrosTipos() {
    const [regras] = await banco.conexao.query('SELECT * FROM goal_target_rules');
    await banco.conexao.query(
      `DELETE FROM goal_target_rules
        WHERE goal_type_id <> (SELECT id FROM goal_types WHERE slug = 'acumular-mel')`,
    );
    return regras;
  }

  async function restaurarRegrasDeAlvo(regras) {
    for (const regra of regras) {
      await banco.conexao.query(
        `INSERT IGNORE INTO goal_target_rules
           (goal_type_id, base_per_session, min_increment, max_increment, rounding_step)
         VALUES (?, ?, ?, ?, ?)`,
        [
          regra.goal_type_id,
          regra.base_per_session,
          regra.min_increment,
          regra.max_increment,
          regra.rounding_step,
        ],
      );
    }
  }
});
