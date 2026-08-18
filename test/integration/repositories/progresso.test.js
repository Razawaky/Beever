import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../../helpers/banco.js';
import { emTransacao, fecharPool } from '../../../src/config/database.js';
import * as cellsRepository from '../../../src/repositories/cellsRepository.js';
import * as hivesRepository from '../../../src/repositories/hivesRepository.js';
import * as progressRepository from '../../../src/repositories/progressRepository.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';

/**
 * `progressRepository` contra banco real.
 *
 * Duas coisas são checadas aqui e não em outro lugar: que repetir uma célula
 * nunca derruba o que já foi conquistado, e que o percentual do favo é sempre
 * recontado das células — nunca escrito à mão.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const AGORA = new Date();

describe('progressRepository', opcoes, () => {
  let banco;
  let conexao;
  let idUsuario;
  let favo;
  let celulas;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;
    idUsuario = await usersRepository.criar({
      email: 'progresso@beever.dev',
      apelido: 'progresso',
      dataNasc: '2018-04-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });

    favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario);
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  function registrar(idCelula, dados) {
    return emTransacao((c) => progressRepository.registrarTentativa(c, { idUsuario, idCelula, ...dados }));
  }

  it('a primeira tentativa cria a linha do jogador na célula', async () => {
    await registrar(celulas[0].id, { estrelas: 2, erros: 3, pontuacao: 70, concluidaEm: AGORA });

    const progresso = await progressRepository.buscarProgressoDaCelula(idUsuario, celulas[0].id);
    assert.equal(Number(progresso.stars), 2);
    assert.equal(Number(progresso.attempts), 1);
    assert.equal(Number(progresso.errors), 3);
    assert.equal(Number(progresso.best_score), 70);
    assert.ok(progresso.first_completed_at, 'concluir grava a estreia');
  });

  it('repetir pior não derruba estrelas nem melhor pontuação', async () => {
    await registrar(celulas[0].id, { estrelas: 1, erros: 5, pontuacao: 20, concluidaEm: AGORA });

    const progresso = await progressRepository.buscarProgressoDaCelula(idUsuario, celulas[0].id);
    assert.equal(Number(progresso.stars), 2, 'a estrela conquistada é do jogador, não da última tentativa');
    assert.equal(Number(progresso.best_score), 70);
    assert.equal(Number(progresso.attempts), 2, 'tentativas somam');
    assert.equal(Number(progresso.errors), 8, 'erros somam, porque a célula de revisão vai precisar deles');
  });

  it('repetir melhor sobe estrelas, e a estreia continua sendo a primeira', async () => {
    const antes = await progressRepository.buscarProgressoDaCelula(idUsuario, celulas[0].id);
    await registrar(celulas[0].id, { estrelas: 3, erros: 0, pontuacao: 100, concluidaEm: new Date() });

    const depois = await progressRepository.buscarProgressoDaCelula(idUsuario, celulas[0].id);
    assert.equal(Number(depois.stars), 3);
    assert.equal(Number(depois.best_score), 100);
    assert.equal(
      depois.first_completed_at.getTime(),
      antes.first_completed_at.getTime(),
      'a estreia é gravada uma vez só — é ela que separa novidade de repetição na hora de pagar',
    );
    assert.ok(depois.last_completed_at >= depois.first_completed_at);
  });

  it('tentativa que não conclui conta como tentativa e não vira estreia', async () => {
    await registrar(celulas[1].id, { estrelas: 0, erros: 2, pontuacao: 10, concluidaEm: null });

    const progresso = await progressRepository.buscarProgressoDaCelula(idUsuario, celulas[1].id);
    assert.equal(Number(progresso.attempts), 1);
    assert.equal(progresso.first_completed_at, null, 'desistir no meio não conclui a célula');
  });

  it('o banco recusa estrela fora de 0 a 3', async () => {
    await assert.rejects(
      registrar(celulas[2].id, { estrelas: 4, erros: 0, pontuacao: 0, concluidaEm: AGORA }),
      /ck_cell_progress_stars|Check constraint/,
    );
  });

  it('conta concluídas contra o total, e só vale com pelo menos uma estrela', async () => {
    const contagem = await progressRepository.contarCelulasDoFavo(idUsuario, favo.id);

    assert.equal(contagem.total, 4);
    assert.equal(contagem.concluidas, 1, 'a segunda célula tem tentativa, mas não tem estrela nem conclusão');
  });

  it('o percentual do favo é recontado das células, nunca escrito à mão', async () => {
    const progresso = await emTransacao((c) => progressRepository.recalcularFavo(c, idUsuario, favo.id));

    assert.equal(Number(progresso.completed_cells), 1);
    assert.equal(Number(progresso.total_cells), 4);
    assert.equal(Number(progresso.percent), 25);
    assert.equal(progresso.completed_at, null, 'favo só fecha quando todas as células fecham');
  });

  it('recalcular de novo não duplica a linha do favo', async () => {
    await emTransacao((c) => progressRepository.recalcularFavo(c, idUsuario, favo.id));

    const [linhas] = await conexao.query('SELECT COUNT(*) AS total FROM hive_progress WHERE user_id = ? AND hive_id = ?', [
      idUsuario,
      favo.id,
    ]);
    assert.equal(Number(linhas[0].total), 1, 'é UPSERT, e a UNIQUE (user, favo) é quem garante');
  });

  it('completar todas as células fecha o favo, e a data de fechamento não se move', async () => {
    for (const celula of celulas) {
      await registrar(celula.id, { estrelas: 3, erros: 0, pontuacao: 100, concluidaEm: new Date() });
    }

    const fechado = await emTransacao((c) => progressRepository.recalcularFavo(c, idUsuario, favo.id));
    assert.equal(Number(fechado.percent), 100);
    assert.equal(Number(fechado.completed_cells), 4);
    assert.ok(fechado.completed_at, 'favo completo tem data');

    const denovo = await emTransacao((c) => progressRepository.recalcularFavo(c, idUsuario, favo.id));
    assert.equal(
      denovo.completed_at.getTime(),
      fechado.completed_at.getTime(),
      'recalcular não reescreve a data de quando o favo foi fechado',
    );
  });

  it('a trilha lê o progresso de todos os favos de uma vez', async () => {
    const lista = await progressRepository.listarProgressoDosFavos(idUsuario);

    assert.equal(lista.length, 1, 'só o favo que este jogador tocou tem linha');
    assert.equal(Number(lista[0].hive_id), Number(favo.id));
    assert.equal(Number(lista[0].percent), 100);
  });

  it('progresso de um jogador não aparece no de outro', async () => {
    const outro = await usersRepository.criar({
      email: 'progresso-outro@beever.dev',
      apelido: 'outro',
      dataNasc: '2018-04-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });

    assert.equal((await progressRepository.listarProgressoDosFavos(outro)).length, 0);
    assert.equal(await progressRepository.buscarProgressoDaCelula(outro, celulas[0].id), null);

    const contagem = await progressRepository.contarCelulasDoFavo(outro, favo.id);
    assert.equal(contagem.concluidas, 0, 'conta nova começa do zero, mesmo num favo já fechado por outro');
  });
});
