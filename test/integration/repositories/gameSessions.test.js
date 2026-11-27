import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../../helpers/banco.js';
import { emTransacao, fecharPool } from '../../../src/config/database.js';
import * as gameSessionsRepository from '../../../src/repositories/gameSessionsRepository.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';

/**
 * `gameSessionsRepository` contra banco real — a partida jogada.
 *
 * O token é a defesa contra o mesmo resultado chegar duas vezes, e é o que
 * estes testes mais cobram: fechar de novo tem que devolver zero linhas
 * afetadas, para o motor de recompensas não pagar a mesma partida duas vezes.
 *
 * A duração é calculada pelo banco a partir do `started_at`, nunca pelo
 * cliente — cronômetro que vem do navegador é número que o jogador controla, e
 * a recompensa depende dele.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('gameSessionsRepository', opcoes, () => {
  let banco;
  let conexao;
  let idCelula;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;
    const [celulas] = await conexao.query('SELECT id FROM cells ORDER BY id LIMIT 1');
    idCelula = celulas[0].id;
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function jogador(sufixo) {
    return usersRepository.criar({
      email: `partida-${sufixo}@beever.dev`,
      apelido: `partida-${sufixo}`,
      dataNasc: '2015-08-08',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
  }

  async function partidaAberta(sufixo) {
    const idUsuario = await jogador(sufixo);
    const token = randomUUID();
    const id = await emTransacao((c) => gameSessionsRepository.iniciar(c, { idUsuario, idCelula, token }));
    return { idUsuario, token, id };
  }

  it('abre a partida na célula, com status aberta', async () => {
    const { token, id } = await partidaAberta('abrir');

    const partida = await gameSessionsRepository.buscarPorToken(token);
    assert.equal(Number(partida.id), Number(id));
    assert.equal(partida.status, 'aberta');
    assert.equal(Number(partida.cell_id), Number(idCelula));
    assert.equal(partida.finished_at, null);
    assert.equal(Number(partida.stars), 0);
  });

  it('fecha a partida gravando estrelas, erros e o que rendeu', async () => {
    const { token } = await partidaAberta('fechar');

    const afetadas = await emTransacao((c) =>
      gameSessionsRepository.finalizar(c, { token, estrelas: 3, erros: 1, xp: 30, pontos: 15, moedas: 20 }),
    );

    assert.equal(afetadas, 1);
    const partida = await gameSessionsRepository.buscarPorToken(token);
    assert.equal(partida.status, 'concluida');
    assert.equal(Number(partida.stars), 3);
    assert.equal(Number(partida.errors), 1);
    assert.equal(Number(partida.xp_awarded), 30);
    assert.equal(Number(partida.points_awarded), 15);
    assert.equal(Number(partida.coins_awarded), 20);
    assert.ok(partida.finished_at);
    assert.ok(Number(partida.duration_seconds) >= 0, 'a duração vem do banco, não do cliente');
  });

  it('fechar a mesma partida duas vezes não paga duas vezes', async () => {
    const { token } = await partidaAberta('reenvio');

    const primeira = await emTransacao((c) => gameSessionsRepository.finalizar(c, { token, estrelas: 3, moedas: 50 }));
    const segunda = await emTransacao((c) => gameSessionsRepository.finalizar(c, { token, estrelas: 3, moedas: 50 }));

    assert.equal(primeira, 1);
    assert.equal(segunda, 0, 'reenviar o resultado não pode afetar linha nenhuma');
    assert.equal(Number((await gameSessionsRepository.buscarPorToken(token)).coins_awarded), 50);
  });

  it('recusa token repetido', async () => {
    const { token } = await partidaAberta('token-repetido');
    const outro = await jogador('token-repetido-2');

    await assert.rejects(
      emTransacao((c) => gameSessionsRepository.iniciar(c, { idUsuario: outro, idCelula, token })),
      /Duplicate|uq_game_sessions_token/,
    );
  });

  it('abandona a partida aberta e não deixa fechá-la depois', async () => {
    const { token } = await partidaAberta('abandono');

    assert.equal(await emTransacao((c) => gameSessionsRepository.abandonar(c, token)), 1);
    assert.equal((await gameSessionsRepository.buscarPorToken(token)).status, 'abandonada');
    assert.equal(
      await emTransacao((c) => gameSessionsRepository.finalizar(c, { token, estrelas: 3 })),
      0,
      'partida abandonada já está fechada',
    );
  });

  it('mais de 3 estrelas é recusado pelo banco', async () => {
    const { token } = await partidaAberta('estrelas');

    await assert.rejects(
      emTransacao((c) => gameSessionsRepository.finalizar(c, { token, estrelas: 4 })),
      /ck_game_sessions_stars/,
    );
  });

  it('conta as partidas concluídas na célula, para distinguir estreia de repetição', async () => {
    const { idUsuario, token } = await partidaAberta('repeticao');

    assert.equal(await gameSessionsRepository.contarConcluidasNaCelula(idUsuario, idCelula), 0);

    await emTransacao((c) => gameSessionsRepository.finalizar(c, { token, estrelas: 2 }));
    assert.equal(await gameSessionsRepository.contarConcluidasNaCelula(idUsuario, idCelula), 1);

    const segundoToken = randomUUID();
    await emTransacao((c) =>
      gameSessionsRepository.iniciar(c, { idUsuario, idCelula, token: segundoToken, ehRepeticao: true }),
    );
    await emTransacao((c) => gameSessionsRepository.finalizar(c, { token: segundoToken, estrelas: 3 }));

    assert.equal(await gameSessionsRepository.contarConcluidasNaCelula(idUsuario, idCelula), 2);
    assert.equal(Number((await gameSessionsRepository.buscarPorToken(segundoToken)).is_replay), 1);
  });

  it('lista o histórico da mais recente para a mais antiga, respeitando o limite', async () => {
    const { idUsuario } = await partidaAberta('historico');

    for (let i = 0; i < 3; i += 1) {
      await emTransacao((c) => gameSessionsRepository.iniciar(c, { idUsuario, idCelula, token: randomUUID() }));
    }

    const todas = await gameSessionsRepository.listarPorUsuario(idUsuario);
    assert.equal(todas.length, 4);

    const duas = await gameSessionsRepository.listarPorUsuario(idUsuario, 2);
    assert.equal(duas.length, 2);
    assert.ok(Number(duas[0].id) > Number(duas[1].id), 'a mais recente vem primeiro');
  });

  it('devolve nulo para token desconhecido', async () => {
    assert.equal(await gameSessionsRepository.buscarPorToken(randomUUID()), null);
  });
});
