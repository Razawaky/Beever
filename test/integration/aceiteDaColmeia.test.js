import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { montarJogadorAvancado } from '../helpers/jogadorAvancado.js';
import { criarApp } from '../../src/app.js';
import { emTransacao, fecharPool, pool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as coinsService from '../../src/services/coinsService.js';
import * as vaultService from '../../src/services/vaultService.js';

/**
 * O aceite da E10: "a Colmeia carrega em ≤2 s com dados semeados de um usuário
 * avançado (≥50 células, ≥10 itens)".
 *
 * O arquivo prova as duas metades do critério sobre o mesmo jogador: a Colmeia
 * vem inteira e correta, e vem dentro do teto da RNF-01. Tempo sozinho não
 * bastaria — num MySQL local, uma consulta por favo passa verde —, então o
 * número de consultas do jogador avançado é comparado com o de um jogador novo.
 */

const TETO_DA_PAGINA_MS = 2000;

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('aceite da Colmeia', opcoes, () => {
  let banco;
  let app;
  let agente;
  let novato;
  let idUsuario;
  let cenario;

  async function lerToken(cliente, caminho) {
    const resposta = await cliente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  /** Cria a conta e conclui o onboarding, que é como todo jogador começa. */
  async function criarJogador(cliente, apelido) {
    let csrf = await lerToken(cliente, '/login');
    const cadastro = await cliente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido,
        email: `${apelido}@beever.dev`,
        data_nasc: '2014-05-01',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: csrf,
      })
      .expect(201);

    csrf = await lerToken(cliente, '/onboarding');
    await cliente
      .put(`/perfil/${cadastro.body.idPerfil}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido,
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['0', '1', '2', '3', '4', '5', '6'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    await profilesRepository.atualizar(cadastro.body.idPerfil, { faixaEtaria: 'C' });

    const [[perfil]] = await banco.conexao.query('SELECT user_id FROM profiles WHERE id = ?', [
      cadastro.body.idPerfil,
    ]);
    return Number(perfil.user_id);
  }

  /** Quantas consultas uma visita à Colmeia dispara, pelo pool. */
  async function consultasDaColmeia(cliente) {
    const original = pool.execute.bind(pool);
    let contagem = 0;
    pool.execute = (...argumentos) => {
      contagem += 1;
      return original(...argumentos);
    };

    try {
      await cliente.get('/painel').set('Accept', 'application/json').expect(200);
    } finally {
      pool.execute = original;
    }

    return contagem;
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);
    novato = request.agent(app);

    idUsuario = await criarJogador(agente, 'avancada');
    await criarJogador(novato, 'novata');

    cenario = await montarJogadorAvancado(banco.conexao, idUsuario);

    await emTransacao((conexao) =>
      coinsService.creditar(conexao, idUsuario, 4000, { motivo: 'ajuste-administrativo' }),
    );
    await vaultService.depositar(idUsuario, 1500);

    // Visita de aquecimento nos dois: os efeitos de primeira visita (ciclo,
    // tarefas do dia, plano de metas) não podem entrar na medição.
    await agente.get('/painel').set('Accept', 'application/json').expect(200);
    await novato.get('/painel').set('Accept', 'application/json').expect(200);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('o cenário é mesmo o de um jogador avançado', async () => {
    assert.ok(cenario.celulasConcluidas >= 50, 'o critério pede pelo menos 50 células');
    assert.ok(cenario.unidades >= 10, 'e pelo menos 10 itens');

    const [[concluidas]] = await banco.conexao.query(
      'SELECT COUNT(*) AS total FROM cell_progress WHERE user_id = ? AND first_completed_at IS NOT NULL',
      [idUsuario],
    );
    const [[unidades]] = await banco.conexao.query(
      'SELECT COUNT(*) AS total FROM inventory WHERE user_id = ?',
      [idUsuario],
    );

    assert.equal(Number(concluidas.total), cenario.celulasConcluidas);
    assert.equal(Number(unidades.total), cenario.unidades);
  });

  it('a Colmeia do jogador avançado vem inteira e correta', async () => {
    const resposta = await agente.get('/painel').set('Accept', 'application/json').expect(200);
    const home = resposta.body;

    assert.equal(home.jogador.apelido, 'avancada');
    assert.equal(
      home.jogador.patrimonio.total,
      home.jogador.patrimonio.carteira + home.jogador.patrimonio.cofre + home.jogador.patrimonio.bens,
      'o patrimônio fecha na soma da RN-039',
    );
    assert.ok(home.jogador.patrimonio.cofre >= 1500, 'o cofre entra na conta');
    assert.ok(home.jogador.patrimonio.bens > 0, 'os doze itens entram como bens');
    assert.equal(home.sequencia.dias.length, 7);
    assert.ok(home.trilha.length >= cenario.favos, 'a trilha grande chega inteira');
    assert.ok(home.trilha.some((favo) => favo.emFoco), 'e com foco em algum favo');
    assert.ok(home.metaEmDestaque, 'a meta em destaque');
    assert.ok(Array.isArray(home.tarefas), 'as tarefas do dia');
    assert.ok(home.proximaCelula, 'e o destino do Continuar');
  });

  it('a página desenhada carrega dentro do teto de 2 s da RNF-01', async (t) => {
    // Três medições, e vale a pior: uma execução isolada num banco local diz
    // pouco, e a suíte inteira disputa o mesmo MySQL.
    const tempos = [];
    for (let volta = 0; volta < 3; volta += 1) {
      const comecou = Date.now();
      await agente.get('/painel').set('Accept', 'text/html').expect(200);
      tempos.push(Date.now() - comecou);
    }

    const pior = Math.max(...tempos);
    // O número medido vai para a saída do teste: é evidência da RNF-01, e não
    // adianta só saber que passou do teto ou não.
    t.diagnostic(`Colmeia do jogador avançado: ${tempos.join(' ms, ')} ms (teto ${TETO_DA_PAGINA_MS} ms)`);
    assert.ok(pior < TETO_DA_PAGINA_MS, `a Colmeia levou ${pior} ms, e o teto da RNF-01 é ${TETO_DA_PAGINA_MS} ms`);
  });

  it('a Colmeia não cobra mais consultas quando o jogador acumula mais dado (RNF-04)', async (t) => {
    // A comparação é do mesmo jogador antes e depois de crescer, e não entre
    // dois jogadores: o plano de metas é sorteado, e uma meta de nível lê a
    // curva de níveis a mais — diferença de sorteio, não de tamanho de dado.
    await consultasDaColmeia(agente);
    const antes = await consultasDaColmeia(agente);

    const [itens] = await banco.conexao.query('SELECT id, price FROM items WHERE is_active = 1 LIMIT 8');
    const [[ativo]] = await banco.conexao.query("SELECT id FROM inventory_statuses WHERE slug = 'ativo'");
    await banco.conexao.query('INSERT INTO inventory (user_id, item_id, status_id, current_value) VALUES ?', [
      itens.map((item) => [idUsuario, item.id, ativo.id, Number(item.price)]),
    ]);

    // Aquecimento: a foto do patrimônio do dia é reescrita uma vez quando o
    // total muda, e isso não é consulta que cresce com o dado. São duas visitas
    // porque a primeira destrava as conquistas de patrimônio que os itens novos
    // alcançaram (T-13.2), e desbloquear paga mel, que move o total de novo.
    await consultasDaColmeia(agente);
    await consultasDaColmeia(agente);
    const depois = await consultasDaColmeia(agente);

    t.diagnostic(`consultas por visita: ${antes} antes, ${depois} com oito itens a mais`);
    assert.equal(depois, antes, 'consulta que cresce com favo, célula ou item é o N+1 que a RNF-04 proíbe');
  });

  it('o "Continuar" do jogador avançado leva a uma célula que abre de verdade', async () => {
    const resposta = await agente.get('/painel').set('Accept', 'application/json').expect(200);
    const { proximaCelula } = resposta.body;

    const pagina = await agente
      .get(`/trilha/${proximaCelula.idFavo}/celula/${proximaCelula.id}`)
      .set('Accept', 'text/html')
      .expect(200);

    assert.match(pagina.text, new RegExp(proximaCelula.titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});
