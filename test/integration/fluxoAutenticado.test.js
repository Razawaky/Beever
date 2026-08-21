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
import * as coinsService from '../../src/services/coinsService.js';
import * as vaultService from '../../src/services/vaultService.js';

/**
 * O caminho que o jogador percorre, do cadastro à compra, contra o banco real.
 *
 * Até aqui a suíte cobria repositories isolados e páginas públicas; **rota
 * autenticada não tinha teste nenhum** — a metade da DT-16 que ficou aberta
 * quando a T-02.1 fechou a outra. Este arquivo é o que prova que as três
 * camadas conversam: controller lê a sessão, service aplica a regra, repository
 * grava, e o dinheiro bate no fim.
 *
 * Tudo numa sessão só, na ordem em que a pessoa faria, porque é justamente a
 * ordem que revela problema: onboarding que não marca, mel que não chega,
 * compra que debita duas vezes.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const AMANHA = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

/**
 * A agenda semanal do jogador precisa incluir **hoje**.
 *
 * `tasksService` só propõe tarefa em dia marcado na agenda (RN-011), e a agenda
 * daqui era fixa em segunda, quarta e sexta. O efeito só aparecia no calendário:
 * a suíte passava nesses três dias e reprovava nos outros quatro, derrubando de
 * uma vez tarefa, pagamento de mel e pólen, compra, meta e auditoria da compra —
 * seis testes caindo por um motivo que não tinha nada a ver com o que eles
 * verificam.
 *
 * Três dias alternados a partir de hoje mantêm o mesmo cenário de antes (agenda
 * parcial, não a semana inteira) sem amarrar o resultado ao dia em que a suíte
 * roda. O passo 2 garante dias distintos: 7 é ímpar, então 0, 2 e 4 nunca se
 * repetem ao voltar pelo módulo.
 */
const HOJE = new Date().getDay();
const DIAS_DA_AGENDA = [HOJE, (HOJE + 2) % 7, (HOJE + 4) % 7].map(String);

describe('fluxo autenticado', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let perfilId;

  /**
   * O token de CSRF é preso à sessão, e a sessão é regenerada no cadastro e no
   * login — de propósito: um id plantado antes da autenticação não pode
   * sobreviver a ela. Por isso o token é relido de uma página depois de cada
   * regeneração, que é o que o navegador faz naturalmente.
   */
  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  /** O id do jogador logado, para plantar os eventos que movem a tarefa. */
  async function idDoJogador() {
    const [[usuario]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', ['fluxo@beever.dev']);
    return Number(usuario.id);
  }

  /**
   * Produz os eventos que a tarefa mede. Desde a T-08.5 não existe passo manual:
   * quem move a tarefa é a célula concluída, o dia jogado ou o favo fechado.
   */
  async function gerarEventos(tarefa) {
    const idUsuario = await idDoJogador();
    const alvo = Number(tarefa.target_value);

    if (tarefa.progress_source === 'cell_completed') {
      const [[celula]] = await banco.conexao.query('SELECT id FROM cells ORDER BY id LIMIT 1');
      for (let feita = 0; feita < alvo; feita += 1) {
        await banco.conexao.query(
          `INSERT INTO game_sessions (user_id, cell_id, status_id, token, finished_at, stars)
           VALUES (?, ?, (SELECT id FROM game_session_statuses WHERE slug = 'concluida'), ?, NOW(), 3)`,
          [idUsuario, celula.id, randomUUID()],
        );
      }
      return;
    }

    if (tarefa.progress_source === 'active_days') {
      for (let dia = 0; dia < alvo; dia += 1) {
        await banco.conexao.query(
          `INSERT IGNORE INTO streak_events (user_id, event_date, event_type_id)
           VALUES (?, CURDATE() - INTERVAL ? DAY, (SELECT id FROM streak_event_types WHERE slug = 'cumprido'))`,
          [idUsuario, dia],
        );
      }
      return;
    }

    if (tarefa.progress_source === 'vault_deposit') {
      // A tarefa do cofre mede mel guardado, então o jogador precisa ter mel
      // para guardar antes de cumpri-la.
      await emTransacao((conexao) =>
        coinsService.creditar(conexao, idUsuario, alvo, { motivo: 'ajuste-administrativo' }),
      );
      await vaultService.depositar(idUsuario, alvo);
      return;
    }

    if (tarefa.progress_source === 'hive_completed') {
      const [[favo]] = await banco.conexao.query('SELECT id FROM hives ORDER BY id LIMIT 1');
      await banco.conexao.query(
        `INSERT INTO hive_progress (user_id, hive_id, completed_cells, total_cells, percent, completed_at)
         VALUES (?, ?, 1, 1, 100, NOW())
         ON DUPLICATE KEY UPDATE percent = 100, completed_at = NOW()`,
        [idUsuario, favo.id],
      );
    }
  }

  /**
   * Cumpre a tarefa do jeito que o jogador cumpre: gerando o evento que ela mede
   * e só então recebendo. Não há atalho para concluir — é o ponto da correção.
   */
  async function cumprirTarefa(idTarefa) {
    const [tarefa] = (await tarefasAtivas()).filter((ativa) => Number(ativa.id) === Number(idTarefa));
    await gerarEventos(tarefa);
    // Abrir a tela relê o progresso na fonte.
    await tarefasAtivas();

    await agente
      .post(`/tarefas/${idTarefa}/concluir`)
      .set('Accept', 'application/json')
      .send({ _csrf: csrf })
      .expect(200);
  }

  /** As tarefas do dia, geradas pelo servidor quando o jogador abre a tela. */
  async function tarefasAtivas() {
    await agente.get('/metas').set('Accept', 'text/html').expect(200);
    const lista = await agente.get('/tarefas').set('Accept', 'application/json').expect(200);
    return lista.body.filter((tarefa) => tarefa.status === 'ativa');
  }

  async function melAtual() {
    const perfil = await agente.get('/perfil/meu').set('Accept', 'application/json').expect(200);
    return Number(perfil.body.mel);
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);
    csrf = await lerToken('/login');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('recusa o cadastro de criança sem autorização do responsável', async () => {
    const resposta = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'semautorizacao',
        email: 'sem-consentimento@beever.dev',
        data_nasc: '2014-05-20',
        senha: 'beever123',
        _csrf: csrf,
      })
      .expect(422);

    assert.equal(resposta.body.codigo, 'CONSENTIMENTO_NECESSARIO');

    // E não pode ter sobrado meia conta: a recusa acontece antes de qualquer
    // escrita, inclusive antes do hash da senha.
    const [linhas] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', [
      'sem-consentimento@beever.dev',
    ]);
    assert.equal(linhas.length, 0);
  });

  it('cadastra a conta e já entra logado', async () => {
    const resposta = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'jogadora',
        email: 'fluxo@beever.dev',
        data_nasc: '2014-05-20',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: csrf,
      })
      .expect(201);

    assert.equal(resposta.body.consentimentoDeResponsavel, true);

    const [[consentimento]] = await banco.conexao.query(
      `SELECT g.guardian_email, g.ip_hash
         FROM guardian_consents g
         JOIN users u ON u.id = g.user_id
        WHERE u.email = ?`,
      ['fluxo@beever.dev'],
    );
    assert.equal(consentimento.guardian_email, 'fluxo@beever.dev', 'o e-mail do registro é o do responsável');
    assert.match(consentimento.ip_hash, /^[0-9a-f]{64}$/, 'a origem fica registrada como hash');

    perfilId = resposta.body.idPerfil;
    assert.ok(perfilId, 'o cadastro devolve o perfil criado junto da conta');
    // A faixa etária sai da data de nascimento, contra a tabela `age_bands`.
    assert.equal(resposta.body.faixaEtaria, 'C');
  });

  /**
   * A tela impede semana vazia desabilitando o botão, mas quem fala com a API
   * direto não passa pela tela. A RF-ONB-03 exige pelo menos um dia, e sem esta
   * recusa dava para concluir o onboarding sem nenhum: a RN-014 não tem faixa
   * para zero dias, e a agenda vazia derrubaria a geração de tarefas depois.
   */
  it('o onboarding recusa uma semana sem nenhum dia marcado', async () => {
    csrf = await lerToken('/onboarding');

    const resposta = await agente
      .put(`/perfil/${perfilId}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: 'jogadora',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'intermediate',
        dias: [],
        _csrf: csrf,
      })
      .expect(422);

    assert.match(JSON.stringify(resposta.body), /dia da semana/i);

    const perfil = await agente.get('/perfil/meu').set('Accept', 'application/json').expect(200);
    assert.equal(perfil.body.onboardingConcluido, false, 'recusa não pode marcar a conta como configurada');
  });

  it('o onboarding grava nível inicial, agenda e marca a conta', async () => {
    csrf = await lerToken('/onboarding');

    const resposta = await agente
      .put(`/perfil/${perfilId}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: 'jogadora',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'intermediate',
        dias: DIAS_DA_AGENDA,
        _csrf: csrf,
      })
      .expect(200);

    assert.equal(resposta.body.nivel, 5, 'quem já sabe do assunto começa adiantado');
    assert.equal(resposta.body.diasDisponiveis, 3);

    const perfil = await agente.get('/perfil/meu').set('Accept', 'application/json').expect(200);
    assert.equal(perfil.body.avatar, 'beenie-classico');
    assert.equal(perfil.body.objetivo_inicial, 'comprar-algo');
    assert.equal(perfil.body.onboardingConcluido, true);
    assert.equal(perfil.body.nivel.nivel, 5);
  });

  /**
   * RN-011 conhece cinco durações de sessão, e o banco repete a lista num CHECK.
   * O validador aceitava de 5 a 60, então um valor fora da lista passava pela
   * rota e só morria no MySQL — erro de formulário chegando ao jogador como
   * falha do servidor. Eram três durações até a T-04.3, quando 30 e 45 minutos
   * entraram por decisão de produto; 7 continua não sendo uma delas.
   */
  it('o perfil recusa tempo de sessão fora de 5, 10, 20, 30 ou 45 minutos', async () => {
    csrf = await lerToken('/painel');

    await agente
      .put(`/perfil/${perfilId}`)
      .set('Accept', 'application/json')
      .send({ minutos_por_sessao: 7, _csrf: csrf })
      .expect(422);

    await agente
      .put(`/perfil/${perfilId}`)
      .set('Accept', 'application/json')
      .send({ minutos_por_sessao: 45, _csrf: csrf })
      .expect(200);
  });

  /**
   * RN-050: som e animação são do perfil, e até a T-04.3 nenhuma tela os
   * escrevia — as colunas existiam e ficavam no padrão para sempre (DT-20).
   */
  it('o perfil grava as preferências de som e de animação', async () => {
    csrf = await lerToken('/painel');

    const resposta = await agente
      .put(`/perfil/${perfilId}`)
      .set('Accept', 'application/json')
      .send({ som_ativo: false, animacao_reduzida: true, _csrf: csrf })
      .expect(200);

    assert.equal(Number(resposta.body.is_sound_enabled), 0);
    assert.equal(Number(resposta.body.has_reduced_motion), 1);
  });

  it('o painel e a loja renderizam com os dados da sessão', async () => {
    const painel = await agente.get('/painel').set('Accept', 'text/html').expect(200);
    assert.match(painel.text, /jogadora/);
    assert.match(painel.text, /de mel/);

    const loja = await agente.get('/loja').set('Accept', 'text/html').expect(200);
    assert.match(loja.text, /Comprar|Sem mel/);
  });

  it('as barras de progresso sobrevivem à CSP das páginas autenticadas', async () => {
    // A CSP declara `style-src 'self'` sem `'unsafe-inline'` (RNF-11), e isso
    // vale também para o atributo `style` de um elemento — não só para a tag
    // `<style>`. As barras de XP, de tarefa e de meta escreviam a largura ali
    // dentro e o navegador descartava as três, que apareciam vazias. Nada
    // acusou porque `curl` e `supertest` não aplicam CSP; este teste passa a
    // olhar a marcação, que é onde o defeito estava visível o tempo todo.
    for (const caminho of ['/painel', '/metas']) {
      const pagina = await agente.get(caminho).set('Accept', 'text/html').expect(200);

      assert.doesNotMatch(
        pagina.text,
        /style="/,
        `${caminho} não pode escrever estilo na marcação: a CSP descarta e o elemento fica sem tamanho`,
      );
    }

    // A barra de XP do nível está sempre no painel, com ou sem meta em curso —
    // é ela que prova que a largura saiu do atributo e virou classe.
    const painel = await agente.get('/painel').set('Accept', 'text/html').expect(200);
    assert.match(painel.text, /class="[^"]*barra-\d+/, 'o painel desenha a largura por classe');
    assert.match(painel.text, /role="progressbar"[\s\S]*?aria-valuenow="\d+"/, 'e anuncia o valor exato');
  });

  it('a mesma URL serve página para o navegador e JSON para a API', async () => {
    const pagina = await agente.get('/metas').set('Accept', 'text/html').expect(200);
    assert.match(pagina.text, /Minhas metas/);

    const api = await agente.get('/metas').set('Accept', 'application/json').expect(200);
    assert.ok(Array.isArray(api.body), 'pedindo JSON, a rota de página passa a vez para a API');
  });

  it('o servidor propõe as tarefas do dia; o jogador não as inventa', async () => {
    const tarefas = await tarefasAtivas();

    assert.ok(tarefas.length > 0, 'entrar na tela gera as tarefas do dia');
    assert.ok(tarefas.length <= 3, 'o teto do dia limita quanto dá para ganhar');
    assert.ok(
      tarefas.every((tarefa) => Number(tarefa.current_value) === 0),
      'tarefa nasce por cumprir',
    );

    // A rota de criação deixou de existir: era por ela que se fabricava mel.
    await agente
      .post('/tarefas')
      .set('Accept', 'application/json')
      .send({ tipo: 'concluir-3-celulas', data_prazo: AMANHA, _csrf: csrf })
      .expect(404);
  });

  it('tarefa não cumprida não paga — era o atalho do mel infinito', async () => {
    const [tarefa] = await tarefasAtivas();
    const antes = await melAtual();

    const recusa = await agente
      .post(`/tarefas/${tarefa.id}/concluir`)
      .set('Accept', 'application/json')
      .send({ _csrf: csrf })
      .expect(422);

    assert.match(recusa.body.erro, /ainda não foi cumprida/);
    assert.equal(await melAtual(), antes, 'e nada foi creditado');
  });

  it('cumprir a tarefa paga mel e pólen, e só na primeira vez', async () => {
    const [tarefa] = await tarefasAtivas();
    const antes = await melAtual();

    await cumprirTarefa(tarefa.id);
    const depois = await melAtual();

    assert.equal(depois - antes, Number(tarefa.reward_coins), 'paga exatamente o que a tarefa prometia');

    const repetida = await agente
      .post(`/tarefas/${tarefa.id}/concluir`)
      .set('Accept', 'application/json')
      .send({ _csrf: csrf })
      .expect(422);
    assert.ok(repetida.body.erro, 'concluir de novo é recusado, sem pagar de novo');
    assert.equal(await melAtual(), depois, 'e o saldo não se mexe');
  });

  it('comprar debita o mel, guarda o preço e entrega a unidade', async () => {
    const catalogo = await agente.get('/loja/itens').set('Accept', 'application/json').expect(200);
    const barato = [...catalogo.body.itens].sort((a, b) => Number(a.price) - Number(b.price))[0];

    // Este teste é sobre a compra, não sobre como o mel foi ganho: com o teto de
    // 3 tarefas ativas por dia, o jogador de verdade levaria dias para juntar o
    // preço, e o relógio aqui não anda. O saldo entra direto.
    const idUsuario = await idDoJogador();
    await emTransacao((conexao) =>
      coinsService.creditar(conexao, idUsuario, Number(barato.price), { motivo: 'ajuste-administrativo' }),
    );

    const antes = await melAtual();
    await agente
      .post('/loja/compras')
      .set('Accept', 'application/json')
      .send({ idItem: barato.id, _csrf: csrf })
      .expect(201);

    assert.equal(await melAtual(), antes - Number(barato.price), 'debita exatamente o preço do item');

    const inventario = await agente.get('/loja/inventario').set('Accept', 'application/json').expect(200);
    assert.ok(
      [...inventario.body.bens, ...inventario.body.cosmeticos].some(
        (grupo) => Number(grupo.itemId) === Number(barato.id),
      ),
      'o item comprado aparece no inventário',
    );

    const extrato = await agente.get('/loja/compras').set('Accept', 'application/json').expect(200);
    assert.equal(Number(extrato.body[0].total_price), Number(barato.price), 'o extrato congela o preço pago');
  });

  it('a prévia explica o impacto da compra antes de confirmar', async () => {
    const catalogo = await agente.get('/loja/itens').set('Accept', 'application/json').expect(200);
    const barato = [...catalogo.body.itens].sort((a, b) => Number(a.price) - Number(b.price))[0];

    const previa = await agente
      .get(`/loja/itens/${barato.id}/previa`)
      .set('Accept', 'application/json')
      .expect(200);

    assert.equal(previa.body.precoPago, Number(barato.price));
    assert.equal(previa.body.saldoDepois, previa.body.saldoAtual - previa.body.precoPago);
    assert.equal(typeof previa.body.custoSemanal, 'number');
  });

  it('item de troca inválido é recusado na validação da rota', async () => {
    const catalogo = await agente.get('/loja/itens').set('Accept', 'application/json').expect(200);
    const barato = [...catalogo.body.itens].sort((a, b) => Number(a.price) - Number(b.price))[0];

    await agente
      .post('/loja/compras')
      .set('Accept', 'application/json')
      .send({ idItem: barato.id, idUnidadeTrocada: 'a-casa-do-vizinho', _csrf: csrf })
      .expect(422);
  });

  it('guardar e tirar mel do cofre pelas rotas do cofre', async () => {
    const idUsuario = await idDoJogador();
    await emTransacao((conexao) =>
      coinsService.creditar(conexao, idUsuario, 300, { motivo: 'ajuste-administrativo' }),
    );
    const antes = await melAtual();
    const cofreAntes = (await agente.get('/cofre').set('Accept', 'application/json').expect(200)).body.saldo;

    const deposito = await agente
      .post('/cofre/depositos')
      .set('Accept', 'application/json')
      .send({ valor: 200, _csrf: csrf })
      .expect(201);
    assert.equal(deposito.body.saldo, cofreAntes + 200);
    assert.equal(await melAtual(), antes - 200);

    const saque = await agente
      .post('/cofre/saques')
      .set('Accept', 'application/json')
      .send({ valor: 50, _csrf: csrf })
      .expect(201);
    assert.equal(saque.body.saldo, cofreAntes + 150);
    assert.equal(await melAtual(), antes - 150);

    const resumo = await agente
      .get('/cofre?porSemana=100&semanas=3')
      .set('Accept', 'application/json')
      .expect(200);
    assert.equal(resumo.body.saldo, cofreAntes + 150);
    assert.equal(resumo.body.projecao.length, 3);
    assert.ok(resumo.body.extrato.length >= 2, 'depósito e saque no extrato');
  });

  it('tirar do cofre mais do que há é recusado com 422', async () => {
    const resposta = await agente
      .post('/cofre/saques')
      .set('Accept', 'application/json')
      .send({ valor: 999999, _csrf: csrf })
      .expect(422);

    assert.equal(resposta.body.codigo, 'COFRE_INSUFICIENTE');
  });

  it('compra sem mel suficiente é barrada com 422 e não deixa rastro', async () => {
    const catalogo = await agente.get('/loja/itens').set('Accept', 'application/json').expect(200);
    const caro = [...catalogo.body.itens].sort((a, b) => Number(b.price) - Number(a.price))[0];

    const antes = await melAtual();
    const resposta = await agente
      .post('/loja/compras')
      .set('Accept', 'application/json')
      .send({ idItem: caro.id, _csrf: csrf })
      .expect(422);

    assert.ok(['MEL_INSUFICIENTE', 'REQUISITO_NAO_CUMPRIDO'].includes(resposta.body.codigo));
    assert.equal(await melAtual(), antes, 'compra recusada não pode mexer no saldo');
  });

  /**
   * Nenhum RF-MET dá ao jogador o poder de criar meta: elas são geradas pela
   * disponibilidade (RF-MET-01). Deixar escolher alvo e prazo furaria a RN-014
   * inteira — dificuldade, prazo e recompensa proporcional ao tempo declarado.
   */
  it('o jogador não cria meta: quem decide é o planejador', async () => {
    await agente
      .post('/metas')
      .set('Accept', 'application/json')
      .send({ titulo: 'Juntar mel para o patinete', alvo: 200, data_final: AMANHA, _csrf: csrf })
      .expect(404);

    const metas = await agente.get('/metas').set('Accept', 'application/json').expect(200);
    // Esta conta marcou três dias na semana, e a RN-014 dá duas metas à faixa.
    assert.equal(metas.body.length, 2, 'as metas da listagem são todas do planejador');
    assert.ok(
      metas.body.every((meta) => meta.status === 'ativa'),
      'e nascem ativas',
    );
  });

  it('a tela de metas não oferece formulário de criação', async () => {
    const pagina = await agente.get('/metas').set('Accept', 'text/html').expect(200);
    assert.doesNotMatch(pagina.text, /Nova meta/);
    assert.doesNotMatch(pagina.text, /action="\/metas"/);
  });

  it('meta não alcançada não paga', async () => {
    const metas = await agente.get('/metas').set('Accept', 'application/json').expect(200);
    const distante = metas.body.find((meta) => Number(meta.target_value) > Number(meta.current_value));
    const antes = await melAtual();

    const recusa = await agente
      .post(`/metas/${distante.id}/concluir`)
      .set('Accept', 'application/json')
      .send({ _csrf: csrf })
      .expect(422);

    assert.match(recusa.body.erro, /ainda não foi alcançada/);
    assert.equal(await melAtual(), antes);
  });

  it('meta alcançada paga o que a dificuldade declara', async () => {
    // Pega uma meta do planejador, passa o tipo dela para "acumular mel" e baixa
    // o alvo para o que o jogador já tem: o progresso do mel é lido da carteira,
    // então ela passa a estar cumprida sem inventar meta que o jogo não geraria.
    // O tipo é fixado porque o sorteio é aleatório entre cinco assuntos, e o que
    // este caso mede é o pagamento, não o sorteio.
    const lista = await agente.get('/metas').set('Accept', 'application/json').expect(200);
    const meta = lista.body.find((linha) => linha.status === 'ativa');
    assert.ok(meta, 'o planejador precisa ter dado ao menos uma meta ativa');

    await banco.conexao.query(
      `UPDATE goals SET goal_type_id = (SELECT id FROM goal_types WHERE slug = 'acumular-mel')
        WHERE id = ?`,
      [meta.id],
    );

    const alvo = Math.max(1, (await melAtual()) - 1);
    await banco.conexao.query('UPDATE goals SET target_value = ? WHERE id = ?', [alvo, meta.id]);

    // Abrir a tela sincroniza o progresso a partir da fonte real.
    await agente.get('/metas').set('Accept', 'text/html').expect(200);

    const antes = await melAtual();
    const recompensa = await agente
      .post(`/metas/${meta.id}/concluir`)
      .set('Accept', 'application/json')
      .send({ _csrf: csrf })
      .expect(200);

    assert.ok(recompensa.body.mel > 0, 'meta concluída precisa pagar — antes pagava zero');
    assert.equal(await melAtual(), antes + recompensa.body.mel);

    const metas = await agente.get('/metas').set('Accept', 'application/json').expect(200);
    const concluida = metas.body.find((linha) => Number(linha.id) === Number(meta.id));
    assert.equal(concluida.status, 'concluida');
  });

  it('o livro explica o saldo: carteira e ledgers batem no fim do fluxo', async () => {
    const conexao = banco.conexao;
    const [[usuario]] = await conexao.query('SELECT id FROM users WHERE email = ?', ['fluxo@beever.dev']);

    const [[carteira]] = await conexao.query('SELECT coins, points_total FROM wallets WHERE user_id = ?', [
      usuario.id,
    ]);
    const [[mel]] = await conexao.query('SELECT COALESCE(SUM(amount), 0) AS total FROM coin_ledger WHERE user_id = ?', [
      usuario.id,
    ]);
    const [[polen]] = await conexao.query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM point_ledger WHERE user_id = ?',
      [usuario.id],
    );
    const [[xp]] = await conexao.query('SELECT COALESCE(SUM(amount), 0) AS total FROM xp_ledger WHERE user_id = ?', [
      usuario.id,
    ]);
    const [[nivel]] = await conexao.query('SELECT xp_total FROM user_levels WHERE user_id = ?', [usuario.id]);

    assert.equal(Number(carteira.coins), Number(mel.total), 'mel: cache e livro têm que fechar');
    assert.equal(Number(carteira.points_total), Number(polen.total), 'pólen: idem');
    // O XP inicial do onboarding também passa pelo livro. Ele não passava, e foi
    // o `db:reconcile` que pegou — esta asserção existe para não voltar.
    assert.equal(Number(nivel.xp_total), Number(xp.total), 'XP: idem, inclusive o ponto de partida');
  });

  it('a auditoria registra a compra com ator, requisição e origem', async () => {
    const conexao = banco.conexao;
    const [[registro]] = await conexao.query(
      `SELECT t.slug AS ator, l.action, l.entity_type, l.after_state, l.ip_hash, l.request_id
         FROM audit_logs l
         JOIN audit_actor_types t ON t.id = l.actor_type_id
        WHERE l.action = 'compra.realizada'
        ORDER BY l.id DESC
        LIMIT 1`,
    );

    assert.ok(registro, 'toda compra precisa deixar rastro (RN-010)');
    assert.equal(registro.ator, 'usuario');
    assert.equal(registro.entity_type, 'purchase');

    // Preenchidos pelo AuditService a partir do contexto da requisição: nenhum
    // service conhece o `req`, e mesmo assim a linha sai completa.
    assert.match(registro.ip_hash, /^[0-9a-f]{64}$/, 'o IP entra como hash, nunca em claro');
    assert.match(registro.request_id, /^[0-9a-f-]{36}$/, 'a linha aponta para a requisição que a gerou');

    const depois = typeof registro.after_state === 'string' ? JSON.parse(registro.after_state) : registro.after_state;
    assert.ok(depois.precoTotal > 0);
  });

  it('o logout encerra a sessão e a rota privada volta a exigir login', async () => {
    await agente.post('/sessao/logout').set('Accept', 'application/json').send({ _csrf: csrf }).expect(200);

    await agente.get('/perfil/meu').set('Accept', 'application/json').expect(401);
  });

  /**
   * Conta recém-criada que tenta pular a configuração do perfil.
   *
   * Vale a pena o segundo agente: a regra do onboarding só se testa com uma
   * conta que ainda não passou por ele, e a do bloco de cima já passou no
   * segundo teste. Antes da T-02.4 esta bateria não existia — a checagem morava
   * dentro de dois controllers de página, e as rotas JSON de loja, metas e
   * tarefas simplesmente não checavam nada.
   */
  describe('quem ainda não concluiu o onboarding', () => {
    let novato;
    let tokenNovato;
    let perfilNovato;

    before(async () => {
      novato = request.agent(app);

      const paginaLogin = await novato.get('/login').set('Accept', 'text/html');
      tokenNovato = /name="_csrf" value="([^"]+)"/.exec(paginaLogin.text)[1];

      const cadastro = await novato
        .post('/users')
        .set('Accept', 'application/json')
        .send({
          apelido: 'novato',
          email: 'novato@beever.dev',
          data_nasc: '2015-01-10',
          senha: 'beever123',
          consentimento_responsavel: 'on',
          _csrf: tokenNovato,
        })
        .expect(201);

      perfilNovato = cadastro.body.idPerfil;

      const paginaOnboarding = await novato.get('/onboarding').set('Accept', 'text/html');
      tokenNovato = /data-csrf-token="([^"]+)"/.exec(paginaOnboarding.text)[1];
    });

    it('é mandado de volta ao onboarding ao abrir painel, loja ou metas', async () => {
      for (const caminho of ['/painel', '/loja', '/metas']) {
        const resposta = await novato.get(caminho).set('Accept', 'text/html').expect(302);
        assert.equal(resposta.headers.location, '/onboarding', `${caminho} deveria redirecionar`);
      }
    });

    it('recebe 403 com código nas rotas JSON de jogo, em vez de HTML', async () => {
      for (const caminho of ['/loja/itens', '/metas', '/tarefas']) {
        const resposta = await novato.get(caminho).set('Accept', 'application/json').expect(403);
        assert.equal(resposta.body.codigo, 'ONBOARDING_PENDENTE', `${caminho} deveria barrar`);
      }
    });

    it('não consegue comprar antes de configurar o perfil', async () => {
      const resposta = await novato
        .post('/loja/compras')
        .set('Accept', 'application/json')
        .send({ idItem: 1, _csrf: tokenNovato })
        .expect(403);

      assert.equal(resposta.body.codigo, 'ONBOARDING_PENDENTE');
    });

    it('depois de concluir, passa a entrar normalmente', async () => {
      await novato
        .put(`/perfil/${perfilNovato}/onboarding`)
        .set('Accept', 'application/json')
        .send({
          apelido: 'novato',
          avatar: 'babybee',
          objetivo: 'aprender-a-guardar',
          nivel: 'beginner',
          dias: ['2', '4'],
          _csrf: tokenNovato,
        })
        .expect(200);

      await novato.get('/painel').set('Accept', 'text/html').expect(200);
      await novato.get('/loja/itens').set('Accept', 'application/json').expect(200);
    });

    it('e não consegue refazer o onboarding para reescrever o ponto de partida', async () => {
      const resposta = await novato
        .put(`/perfil/${perfilNovato}/onboarding`)
        .set('Accept', 'application/json')
        .send({
          apelido: 'novato',
          avatar: 'babybee',
          objetivo: 'entender-juros',
          nivel: 'advanced',
          dias: ['1'],
          _csrf: tokenNovato,
        })
        .expect(409);

      assert.equal(resposta.body.codigo, 'ONBOARDING_JA_CONCLUIDO');

      const perfil = await novato.get('/perfil/meu').set('Accept', 'application/json').expect(200);
      assert.equal(perfil.body.nivel.nivel, 1, 'o nível inicial escolhido da primeira vez continua valendo');

      const paginaOnboarding = await novato.get('/onboarding').set('Accept', 'text/html').expect(302);
      assert.equal(paginaOnboarding.headers.location, '/painel', 'a própria tela também deixa de ser acessível');
    });
  });
});
