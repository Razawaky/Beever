import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { emTransacao, fecharPool } from '../../src/config/database.js';
import * as cellsRepository from '../../src/repositories/cellsRepository.js';
import * as hivesRepository from '../../src/repositories/hivesRepository.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as userLevelsRepository from '../../src/repositories/userLevelsRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';
import * as walletsRepository from '../../src/repositories/walletsRepository.js';
import * as coinsService from '../../src/services/coinsService.js';
import * as gameSessionService from '../../src/services/gameSessionService.js';
import * as itemsRepository from '../../src/repositories/itemsRepository.js';
import * as purchasesService from '../../src/services/purchasesService.js';

/**
 * Auditoria dos créditos, contra banco real (RN-010, RNF-17).
 *
 * O que estes testes protegem: a partida deixava de gerar qualquer rastro, e
 * crédito sem rastro é crédito que ninguém consegue explicar depois. Uma linha
 * por partida, com o saldo antes e depois — não três linhas, uma por
 * recompensa, que descreveriam o detalhe e perderiam o fato.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const RESPOSTAS_CERTAS = [0, 0];

describe('auditoria dos créditos', opcoes, () => {
  let banco;
  let conexao;
  let idUsuario;
  let celula;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;

    idUsuario = await usersRepository.criar({
      email: 'auditoria-creditos@beever.dev',
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

  async function linhasDaPartida() {
    const [linhas] = await conexao.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.before_state, a.after_state, t.slug AS ator
         FROM audit_logs a
         JOIN audit_actor_types t ON t.id = a.actor_type_id
        WHERE a.action = 'partida.concluida' AND a.actor_id = ?
        ORDER BY a.id`,
      [idUsuario],
    );
    return linhas;
  }

  it('fechar a partida grava uma linha com o saldo antes e depois', async () => {
    const { token } = await gameSessionService.abrir(idUsuario, celula.id);
    const resultado = await gameSessionService.fechar(idUsuario, token, { respostas: RESPOSTAS_CERTAS });

    const linhas = await linhasDaPartida();
    assert.equal(linhas.length, 1, 'uma linha por partida');

    const linha = linhas[0];
    assert.equal(linha.ator, 'usuario');
    assert.equal(linha.entity_type, 'game_session');

    const antes = linha.before_state;
    const depois = linha.after_state;
    assert.equal(depois.xp, antes.xp + resultado.xp, 'o XP do depois precisa fechar com o que foi pago');
    assert.equal(depois.polen, antes.polen + resultado.polen);
    assert.equal(depois.mel, antes.mel + resultado.mel + resultado.bonusDeMelPorNivel);
    assert.equal(depois.estrelas, resultado.estrelas);
    assert.equal(depois.melGanho, resultado.mel + resultado.bonusDeMelPorNivel);
  });

  it('o reenvio idempotente não gera segunda linha, porque nada mudou', async () => {
    const { token } = await gameSessionService.abrir(idUsuario, celula.id);
    await gameSessionService.fechar(idUsuario, token, { respostas: RESPOSTAS_CERTAS });

    const antes = (await linhasDaPartida()).length;
    await gameSessionService.fechar(idUsuario, token, { respostas: RESPOSTAS_CERTAS });

    assert.equal((await linhasDaPartida()).length, antes);
  });

  it('a repetição também é registrada, e o registro diz que foi repetição', async () => {
    const { token } = await gameSessionService.abrir(idUsuario, celula.id);
    await gameSessionService.fechar(idUsuario, token, { respostas: RESPOSTAS_CERTAS });

    const linhas = await linhasDaPartida();
    const ultima = linhas[linhas.length - 1];

    assert.equal(ultima.after_state.ehRepeticao, true);
    assert.equal(ultima.after_state.melGanho, 0, 'repetir não paga mel (RN-008)');
  });

  it('a compra também registra o saldo antes e depois (L-1)', async () => {
    const item = await itemsRepository.buscarPorSlug('patinete');
    await emTransacao((conn) =>
      coinsService.creditar(conn, idUsuario, Number(item.price), { motivo: 'ajuste-administrativo' }),
    );

    const compra = await purchasesService.comprar(idUsuario, item.id);

    const [linhas] = await conexao.query(
      `SELECT before_state, after_state FROM audit_logs
        WHERE action = 'compra.realizada' AND entity_id = ?`,
      [compra.idCompra],
    );

    const antes = linhas[0].before_state;
    const depois = linhas[0].after_state;
    assert.equal(depois.mel, antes.mel - Number(item.price), 'a linha precisa mostrar o mel que saiu');
    assert.equal(depois.precoTotal, Number(item.price));
  });

  it('a trilha é imutável: não dá para alterar nem apagar linha (RNF-17)', async () => {
    const linha = (await linhasDaPartida())[0];

    await assert.rejects(() =>
      conexao.query('UPDATE audit_logs SET action = ? WHERE id = ?', ['mentira', linha.id]),
    );
    await assert.rejects(() => conexao.query('DELETE FROM audit_logs WHERE id = ?', [linha.id]));
  });
});
