import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { emTransacao, fecharPool, pool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';
import * as inventoryRepository from '../../src/repositories/inventoryRepository.js';
import * as itemsRepository from '../../src/repositories/itemsRepository.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as coinsService from '../../src/services/coinsService.js';
import * as contentService from '../../src/services/contentService.js';

/**
 * A Colmeia agregada (RF-HOM-01 a 09, RNF-01 e RNF-04).
 *
 * O que estes testes protegem: a home responde todos os blocos numa chamada só,
 * a meta em destaque é a que vence primeiro, o "Continuar" aponta para uma
 * célula que existe e é jogável, e o número de consultas não cresce quando o
 * jogador acumula item — que é a forma que um N+1 tem de aparecer.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('a Colmeia', opcoes, () => {
  let banco;
  let app;
  let agente;
  let idUsuario;
  let patinete;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function colmeia() {
    const resposta = await agente.get('/painel').set('Accept', 'application/json').expect(200);
    return resposta.body;
  }

  /**
   * Quantas consultas a Colmeia dispara numa visita. Conta o `pool.execute`, que
   * é por onde passa toda leitura de tela; o que roda dentro de transação usa a
   * conexão emprestada e fica de fora, e é escrita, não leitura.
   */
  async function consultasDaColmeia() {
    const original = pool.execute.bind(pool);
    let contagem = 0;
    pool.execute = (...argumentos) => {
      contagem += 1;
      return original(...argumentos);
    };

    try {
      await agente.get('/painel').set('Accept', 'application/json').expect(200);
    } finally {
      pool.execute = original;
    }

    return contagem;
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
        apelido: 'moradora',
        email: 'moradora@beever.dev',
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
        apelido: 'moradora',
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
    patinete = await itemsRepository.buscarPorSlug('patinete');
    await emTransacao(async (conexao) => {
      await coinsService.creditar(conexao, idUsuario, 3000, { motivo: 'ajuste-administrativo' });
      await inventoryRepository.adicionar(conexao, {
        idUsuario,
        idItem: patinete.id,
        valorInicial: Number(patinete.price),
      });
    });
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('responde os blocos da home numa chamada só', async () => {
    const home = await colmeia();

    assert.equal(home.jogador.apelido, 'moradora');
    assert.ok(home.jogador.nivel.nivel >= 1, 'nível e barra de XP (RF-HOM-01)');
    assert.equal(typeof home.jogador.mel, 'number', 'saldo de mel (RF-HOM-02)');
    assert.equal(
      home.jogador.patrimonio.total,
      home.jogador.patrimonio.carteira + home.jogador.patrimonio.cofre + home.jogador.patrimonio.bens,
      'o patrimônio fecha na soma da RN-039',
    );
    assert.equal(home.sequencia.dias.length, 7, 'a semana da sequência (RF-HOM-03)');
    assert.ok(Array.isArray(home.trilha) && home.trilha.length > 0, 'a trilha de favos (RF-HOM-06)');
    assert.ok(Array.isArray(home.tarefas), 'as tarefas do dia (RF-HOM-08)');
    assert.ok(Object.hasOwn(home.ciclo, 'aviso'), 'o aviso do ciclo (RF-HOM-09)');
  });

  it('a mesma página continua saindo em HTML para o navegador', async () => {
    const html = await agente.get('/painel').set('Accept', 'text/html').expect(200);

    assert.match(html.text, /moradora/);
    assert.match(html.text, /Seu patrimônio/);
  });

  it('a meta em destaque é a que vence primeiro, com prazo e recompensa', async () => {
    const antes = await colmeia();
    assert.ok(antes.metaEmDestaque, 'o planejador cria as metas na primeira visita');

    // Uma das outras metas ganha um prazo mais curto que o do destaque atual: o
    // destaque tem de mudar de dono sozinho, sem nada além do vencimento.
    const outra = antes.outrasMetas.at(-1);
    assert.ok(outra, 'o plano da RN-014 tem mais de uma meta');
    await banco.conexao.query('UPDATE goals SET due_at = NOW() + INTERVAL 1 DAY WHERE id = ?', [outra.id]);

    const depois = await colmeia();

    assert.equal(depois.metaEmDestaque.id, outra.id);
    assert.equal(depois.metaEmDestaque.diasRestantes, 1);
    assert.ok(depois.metaEmDestaque.melDaRecompensa > 0, 'a criança lê quanto ganha ao concluir');
    assert.ok(depois.metaEmDestaque.percentual >= 0 && depois.metaEmDestaque.percentual <= 100);
    assert.ok(
      !depois.outrasMetas.some((meta) => meta.id === outra.id),
      'a meta em destaque não se repete na lista das outras',
    );
  });

  it('o "Continuar" aponta para a primeira célula jogável do favo em aberto', async () => {
    const home = await colmeia();

    assert.ok(home.proximaCelula, 'jogador novo sempre tem por onde começar (RF-HOM-07)');

    const { celulas } = await contentService.listarCelulasDoFavo(idUsuario, home.proximaCelula.idFavo);
    const esperada = celulas.find((celula) => !celula.concluida && celula.temJogo);

    assert.equal(home.proximaCelula.id, Number(esperada.id));
    assert.equal(home.proximaCelula.titulo, esperada.title);
  });

  it('o número de consultas não cresce quando o jogador acumula item (RNF-04)', async () => {
    const antes = await consultasDaColmeia();

    await emTransacao(async (conexao) => {
      for (let unidade = 0; unidade < 12; unidade += 1) {
        await inventoryRepository.adicionar(conexao, {
          idUsuario,
          idItem: patinete.id,
          valorInicial: Number(patinete.price),
        });
      }
    });

    // Duas visitas de aquecimento absorvem o que só acontece uma vez depois do
    // dado novo. A primeira grava a foto do patrimônio do dia e destrava as
    // conquistas de patrimônio que os itens novos alcançaram (T-13.2); como
    // desbloquear paga mel, o total muda de novo e a segunda visita fecha a
    // conta. A medição vem do estado estável.
    await colmeia();
    await colmeia();
    const depois = await consultasDaColmeia();

    assert.equal(depois, antes, 'consulta por item é exatamente o N+1 que a RNF-04 proíbe');
  });

  it('a Colmeia responde dentro do teto de 2 s da RNF-01', async () => {
    const comecou = Date.now();
    await colmeia();

    assert.ok(Date.now() - comecou < 2000, 'a home é a tela mais visitada do jogo');
  });
});
