import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import * as cellsRepository from '../../src/repositories/cellsRepository.js';
import * as hivesRepository from '../../src/repositories/hivesRepository.js';
import * as itemsRepository from '../../src/repositories/itemsRepository.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as userLevelsRepository from '../../src/repositories/userLevelsRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';
import * as walletsRepository from '../../src/repositories/walletsRepository.js';
import * as coinsService from '../../src/services/coinsService.js';
import * as gameSessionService from '../../src/services/gameSessionService.js';
import * as purchasesService from '../../src/services/purchasesService.js';

/**
 * Aceite da E06 — o motor de recompensas sob concorrência de verdade.
 *
 * O critério da etapa, no texto do roadmap: "um teste que envia a mesma
 * conclusão 5 vezes em paralelo credita exatamente uma vez". Junto dele, os
 * outros dois que a T-06.8 pede: repetir paga 25% de XP e zero mel, e cliente
 * mentindo na pontuação é ignorado.
 *
 * É a primeira vez que o projeto exerce concorrência real. Até aqui, tudo o que
 * se sabia sobre duplo envio vinha de chamadas em sequência — e sequência não
 * prova nada sobre duas requisições que chegam no mesmo milissegundo.
 *
 * As cinco chamadas precisam terminar **sem erro**: uma credita e quatro
 * devolvem o resultado gravado. Quem clicou cinco vezes por ansiedade não pode
 * ver mensagem de falha.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const RESPOSTAS_CERTAS = [0, 0];
const RESPOSTAS_COM_ERRO = [1, 2];
const ENVIOS_SIMULTANEOS = 5;

describe('aceite da E06 — motor de recompensas', opcoes, () => {
  let banco;
  let conexao;
  let idUsuario;
  let celula;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;

    idUsuario = await usersRepository.criar({
      email: 'aceite-motor@beever.dev',
      apelido: 'jogador',
      dataNasc: '2018-04-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
    const idPerfil = await profilesRepository.criar({ idUsuario });
    await profilesRepository.atualizar(idPerfil, { faixaEtaria: 'A' });
    await walletsRepository.criar(idUsuario);
    await userLevelsRepository.criar(idUsuario);

    const favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, ['A']);
    celula = celulas[0];
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function livros() {
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

  async function contar(sql, parametros) {
    const [linhas] = await conexao.query(sql, parametros);
    return Number(linhas[0].total);
  }

  it('cinco conclusões da mesma partida, em paralelo, creditam exatamente uma vez', async () => {
    const antes = await livros();
    const { token } = await gameSessionService.abrir(idUsuario, celula.id);

    const resultados = await Promise.all(
      Array.from({ length: ENVIOS_SIMULTANEOS }, () =>
        gameSessionService.fechar(idUsuario, token, { respostas: RESPOSTAS_CERTAS }),
      ),
    );

    // Nenhuma das cinco pode falhar: quem clicou cinco vezes recebe a tela de
    // resultado, e não um erro.
    assert.equal(resultados.length, ENVIOS_SIMULTANEOS);

    const creditaram = resultados.filter((resultado) => resultado.jaEstavaFechada === false);
    assert.equal(creditaram.length, 1, 'só uma chamada pode ter creditado');

    const paga = creditaram[0];
    const depois = await livros();
    assert.equal(depois.xp, antes.xp + paga.xp, 'o livro de XP recebeu um crédito, não cinco');
    assert.equal(depois.polen, antes.polen + paga.polen);
    assert.equal(depois.mel, antes.mel + paga.mel + paga.bonusDeMelPorNivel);

    // As quatro repetidas precisam responder a mesma coisa que a que pagou.
    for (const resultado of resultados) {
      assert.equal(resultado.estrelas, paga.estrelas);
    }

    assert.equal(
      await contar('SELECT COUNT(*) AS total FROM game_sessions WHERE token = ? AND finished_at IS NOT NULL', [
        token,
      ]),
      1,
    );
    assert.equal(
      await contar(
        `SELECT COUNT(*) AS total FROM audit_logs
          WHERE action = 'partida.concluida' AND actor_id = ? AND entity_id = (SELECT id FROM game_sessions WHERE token = ?)`,
        [idUsuario, token],
      ),
      1,
      'uma partida creditada tem uma linha de auditoria',
    );
  });

  it('cinco compras simultâneas com a mesma chave compram uma vez (DT-18)', async () => {
    const item = await itemsRepository.buscarPorSlug('patinete');
    await emTransacao((conn) =>
      coinsService.creditar(conn, idUsuario, Number(item.price) * ENVIOS_SIMULTANEOS, {
        motivo: 'ajuste-administrativo',
      }),
    );

    const saldoAntes = (await coinsService.obterCarteira(idUsuario)).mel;
    const chave = randomUUID();

    const resultados = await Promise.all(
      Array.from({ length: ENVIOS_SIMULTANEOS }, () =>
        purchasesService.comprar(idUsuario, item.id, { chaveDeIdempotencia: chave }),
      ),
    );

    assert.equal(
      resultados.filter((resultado) => resultado.repetida === false).length,
      1,
      'só um dos cliques cria compra',
    );
    assert.equal(
      await contar('SELECT COUNT(*) AS total FROM purchases WHERE user_id = ? AND item_id = ?', [
        idUsuario,
        item.id,
      ]),
      1,
    );
    assert.equal(
      (await coinsService.obterCarteira(idUsuario)).mel,
      saldoAntes - Number(item.price),
      'debitou uma vez só',
    );
  });

  it('repetir a célula paga 25% de XP e zero mel (RN-008)', async () => {
    const primeira = await gameSessionService.abrir(idUsuario, celula.id);
    assert.equal(primeira.ehRepeticao, true, 'a célula já foi concluída no primeiro teste');

    const antes = await livros();
    const resultado = await gameSessionService.fechar(idUsuario, primeira.token, {
      respostas: RESPOSTAS_CERTAS,
    });
    const depois = await livros();

    assert.equal(resultado.mel, 0);
    assert.equal(resultado.polen, 0);
    assert.ok(resultado.xp > 0, 'XP é reduzido, não zerado');
    assert.equal(depois.xp, antes.xp + resultado.xp);
    assert.equal(depois.mel, antes.mel + resultado.bonusDeMelPorNivel, 'só o bônus de nível pode entrar');
  });

  it('cliente mentindo na pontuação é ignorado (RN-007)', async () => {
    const { token } = await gameSessionService.abrir(idUsuario, celula.id);

    const resultado = await gameSessionService.fechar(idUsuario, token, {
      respostas: RESPOSTAS_COM_ERRO,
      erros: 0,
      estrelas: 3,
      pontuacao: 100,
      xp: 9999,
      mel: 9999,
    });

    assert.equal(resultado.erros, 2, 'quem conta erro é o gabarito do banco');
    assert.equal(resultado.estrelas, 2, '2 erros são 2 estrelas (RN-030)');
    assert.notEqual(resultado.xp, 9999);
  });
});
