import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { fecharPool } from '../../src/config/database.js';
import * as cellsRepository from '../../src/repositories/cellsRepository.js';
import * as hivesRepository from '../../src/repositories/hivesRepository.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as userLevelsRepository from '../../src/repositories/userLevelsRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';
import * as walletsRepository from '../../src/repositories/walletsRepository.js';
import * as gameSessionService from '../../src/services/gameSessionService.js';

/**
 * A partida de ponta a ponta, contra banco real.
 *
 * O que estes testes protegem: a nota vem do servidor (RN-007) — o cliente pode
 * mandar o que quiser junto das respostas que nada disso entra na conta —, o
 * mesmo token não credita duas vezes (RN-009), e repetir a célula paga 25% de XP
 * e zero mel (RN-008).
 *
 * As duas primeiras células de "primeiros passos" têm jogo semeado — quiz e
 * arrastar —, e a terceira é de um jogo que ainda não existe: é ela que aparece
 * aqui como célula não jogável.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const RESPOSTAS_CERTAS = [0, 0];
const RESPOSTAS_COM_UM_ERRO = [0, 2];
const CAIXAS_CERTAS = ['entra', 'entra', 'sai', 'sai'];

describe('sessão de jogo', opcoes, () => {
  let banco;
  let conexao;
  let idUsuario;
  let celulas;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;

    idUsuario = await usersRepository.criar({
      email: 'sessao-de-jogo@beever.dev',
      apelido: 'jogador',
      dataNasc: '2018-04-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
    const idPerfil = await profilesRepository.criar({ idUsuario });
    await profilesRepository.atualizar(idPerfil, { faixaEtaria: 'A' });
    await walletsRepository.criar(idUsuario);
    await userLevelsRepository.criar(idUsuario);

    const favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, ['A']);
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function saldos() {
    const [linhas] = await conexao.query(
      `SELECT (SELECT COALESCE(SUM(amount), 0) FROM xp_ledger WHERE user_id = ?) AS xp,
              (SELECT COALESCE(SUM(amount), 0) FROM point_ledger WHERE user_id = ?) AS polen,
              (SELECT COALESCE(SUM(amount), 0) FROM coin_ledger WHERE user_id = ?) AS mel`,
      [idUsuario, idUsuario, idUsuario],
    );
    return {
      xp: Number(linhas[0].xp),
      polen: Number(linhas[0].polen),
      mel: Number(linhas[0].mel),
    };
  }

  it('a célula travada não abre partida, mesmo pedindo direto', async () => {
    await assert.rejects(
      () => gameSessionService.abrir(idUsuario, celulas[1].id),
      (erro) => erro.esperado === true,
      'a segunda célula depende da primeira (RN-026)',
    );
  });

  it('abrir devolve token e as perguntas sem o gabarito', async () => {
    const partida = await gameSessionService.abrir(idUsuario, celulas[0].id);

    assert.match(partida.token, /^[0-9a-f-]{36}$/);
    assert.equal(partida.ehRepeticao, false);
    assert.ok(partida.conteudo.perguntas.length > 0);
    for (const pergunta of partida.conteudo.perguntas) {
      assert.equal(pergunta.correta, undefined, 'mandar a resposta certa para a tela seria teatro');
    }
  });

  it('fechar com tudo certo paga as três recompensas e grava a partida', async () => {
    const antes = await saldos();
    const { token } = await gameSessionService.abrir(idUsuario, celulas[0].id);

    const resultado = await gameSessionService.fechar(idUsuario, token, { respostas: RESPOSTAS_CERTAS });

    assert.equal(resultado.erros, 0);
    assert.equal(resultado.estrelas, 3, 'sem erro são 3 estrelas (RN-030)');
    assert.ok(resultado.xp > 0 && resultado.polen > 0 && resultado.mel > 0);

    const depois = await saldos();
    assert.equal(depois.xp, antes.xp + resultado.xp, 'o livro precisa explicar o crédito');
    assert.equal(depois.polen, antes.polen + resultado.polen);
    assert.equal(depois.mel, antes.mel + resultado.mel + resultado.bonusDeMelPorNivel);

    const [linhas] = await conexao.query(
      'SELECT stars, errors, xp_awarded, points_awarded, duration_seconds, finished_at FROM game_sessions WHERE token = ?',
      [token],
    );
    assert.equal(Number(linhas[0].stars), 3);
    assert.ok(linhas[0].finished_at, 'partida fechada precisa de data de fim');
    assert.ok(linhas[0].duration_seconds !== null, 'a duração sai do banco, não do cronômetro do navegador (RF-CON-04)');
  });

  it('reenviar o mesmo token devolve o resultado, sem creditar de novo (RN-009)', async () => {
    const { token } = await gameSessionService.abrir(idUsuario, celulas[0].id);
    const primeira = await gameSessionService.fechar(idUsuario, token, { respostas: RESPOSTAS_CERTAS });

    const antes = await saldos();
    const segunda = await gameSessionService.fechar(idUsuario, token, { respostas: RESPOSTAS_CERTAS });
    const depois = await saldos();

    assert.equal(segunda.jaEstavaFechada, true);
    assert.equal(segunda.xp, primeira.xp, 'o reenvio recebe o que a partida rendeu');
    assert.deepEqual(depois, antes, 'e não credita nada de novo');
  });

  it('a pontuação mandada pelo cliente é ignorada; quem conta erro é o servidor (RN-007)', async () => {
    const { token } = await gameSessionService.abrir(idUsuario, celulas[0].id);

    const resultado = await gameSessionService.fechar(idUsuario, token, {
      respostas: RESPOSTAS_COM_UM_ERRO,
      erros: 0,
      estrelas: 3,
      pontuacao: 100,
      xp: 9999,
    });

    assert.equal(resultado.erros, 1, 'o gabarito do banco é que decide');
    assert.equal(resultado.estrelas, 3, '1 erro ainda são 3 estrelas (RN-030)');
    assert.notEqual(resultado.xp, 9999);
  });

  it('repetir a célula paga 25% de XP e zero mel (RN-008)', async () => {
    const antes = await saldos();
    const partida = await gameSessionService.abrir(idUsuario, celulas[0].id);

    assert.equal(partida.ehRepeticao, true, 'a célula já foi concluída antes');

    const resultado = await gameSessionService.fechar(idUsuario, partida.token, { respostas: RESPOSTAS_CERTAS });
    const depois = await saldos();

    assert.equal(resultado.ehRepeticao, true);
    assert.equal(resultado.mel, 0);
    assert.equal(resultado.polen, 0);
    assert.ok(resultado.xp > 0, 'XP reduzido, não zerado');
    assert.equal(depois.xp, antes.xp + resultado.xp);
    assert.equal(depois.mel, antes.mel + resultado.bonusDeMelPorNivel, 'só o bônus de nível pode ter entrado');
  });

  it('célula sem jogo implementado recusa abrir, em vez de pagar por conteúdo vazio', async () => {
    // A segunda célula é a de arrastar, que a T-07.3 implementou: para chegar a
    // uma célula sem validador é preciso concluí-la e liberar a terceira, cujo
    // jogo ainda não existe.
    const arraste = await gameSessionService.abrir(idUsuario, celulas[1].id);
    await gameSessionService.fechar(idUsuario, arraste.token, { respostas: CAIXAS_CERTAS });

    await assert.rejects(
      () => gameSessionService.abrir(idUsuario, celulas[2].id),
      (erro) => erro.codigo === 'VALIDACAO',
      'a terceira célula está liberada agora, mas o jogo dela ainda não existe',
    );
  });

  it('a partida abandonada é recusada, e não devolve um resultado zerado (L-3)', async () => {
    const { token } = await gameSessionService.abrir(idUsuario, celulas[0].id);
    await gameSessionService.abandonar(idUsuario, token);

    await assert.rejects(
      () => gameSessionService.fechar(idUsuario, token, { respostas: RESPOSTAS_CERTAS }),
      (erro) => erro.codigo === 'VALIDACAO',
      'desistência não é desempenho zero',
    );
  });

  it('is_replay é gravado com o que foi pago, não com o que era verdade na abertura (L-2)', async () => {
    // Duas partidas abertas antes de qualquer conclusão: as duas nascem como
    // estreia, e a segunda a fechar é paga como repetição.
    const primeira = await gameSessionService.abrir(idUsuario, celulas[0].id);
    const segunda = await gameSessionService.abrir(idUsuario, celulas[0].id);

    await gameSessionService.fechar(idUsuario, primeira.token, { respostas: RESPOSTAS_CERTAS });
    const resultado = await gameSessionService.fechar(idUsuario, segunda.token, { respostas: RESPOSTAS_CERTAS });

    const [linhas] = await conexao.query('SELECT is_replay FROM game_sessions WHERE token = ?', [
      segunda.token,
    ]);
    assert.equal(resultado.ehRepeticao, true);
    assert.equal(Number(linhas[0].is_replay), 1, 'o registro precisa dizer o que o livro diz');
  });

  it('partida de outro jogador não pode ser fechada', async () => {
    const { token } = await gameSessionService.abrir(idUsuario, celulas[0].id);
    const idIntruso = await usersRepository.criar({
      email: 'intruso-sessao@beever.dev',
      apelido: 'intruso',
      dataNasc: '2018-04-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });

    await assert.rejects(
      () => gameSessionService.fechar(idIntruso, token, { respostas: RESPOSTAS_CERTAS }),
      (erro) => erro.codigo === 'ACESSO_NEGADO',
    );
  });
});
