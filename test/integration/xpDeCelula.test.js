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
import * as rewardConfigsRepository from '../../src/repositories/rewardConfigsRepository.js';
import * as userLevelsRepository from '../../src/repositories/userLevelsRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';
import * as walletsRepository from '../../src/repositories/walletsRepository.js';
import * as levelsService from '../../src/services/levelsService.js';

/**
 * XP de célula concluída, contra banco real.
 *
 * O que estes testes protegem: o valor pago sai de `reward_configs` e não do
 * código (RN-006), repetir paga 25% (RN-008), e o livro de XP continua
 * explicando o `xp_total` do cache — que é o que o `db:reconcile` confere.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('XP de célula concluída', opcoes, () => {
  let banco;
  let conexao;
  let idUsuario;
  let celula;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;

    idUsuario = await usersRepository.criar({
      email: 'xp-de-celula@beever.dev',
      apelido: 'jogador',
      dataNasc: '2018-04-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
    const idPerfil = await profilesRepository.criar({ idUsuario });
    await profilesRepository.atualizar(idPerfil, { faixaEtaria: 'A' });
    // Conta criada peça por peça: `usersRepository.criar` não abre carteira nem
    // linha de nível — quem faz isso no app é o `usersService`.
    await walletsRepository.criar(idUsuario);
    await userLevelsRepository.criar(idUsuario);

    const favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, ['A']);
    celula = await cellsRepository.buscarPorId(celulas[0].id);
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  async function xpDaTabela(estrelas) {
    const configuracao = await rewardConfigsRepository.buscarConfiguracao({
      slugDoTipoDeJogo: celula.game_type_slug,
      codigoDaFaixa: celula.age_band_code,
      estrelas,
    });
    return Number(configuracao.xp_amount);
  }

  async function xpNoLivro() {
    const [linhas] = await conexao.query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM xp_ledger WHERE user_id = ?',
      [idUsuario],
    );
    return Number(linhas[0].total);
  }

  it('a estreia paga o que a tabela manda, sem número no código', async () => {
    const esperado = await xpDaTabela(3);

    const resultado = await emTransacao((conn) =>
      levelsService.creditarPorCelula(conn, idUsuario, { celula, estrelas: 3, ehRepeticao: false }),
    );

    assert.equal(resultado.xpCreditado, esperado);
    assert.equal(await xpNoLivro(), esperado, 'o livro precisa explicar o saldo');
  });

  it('repetir a mesma célula paga 25% do XP (RN-008)', async () => {
    const cheio = await xpDaTabela(3);
    const antes = await xpNoLivro();

    const resultado = await emTransacao((conn) =>
      levelsService.creditarPorCelula(conn, idUsuario, { celula, estrelas: 3, ehRepeticao: true }),
    );

    assert.equal(resultado.xpCreditado, Math.round(cheio * 0.25));
    assert.equal(await xpNoLivro(), antes + resultado.xpCreditado);
  });

  it('tentativa sem estrela não credita nem lança linha no livro', async () => {
    const antes = await xpNoLivro();

    const resultado = await emTransacao((conn) =>
      levelsService.creditarPorCelula(conn, idUsuario, { celula, estrelas: 0, ehRepeticao: false }),
    );

    assert.equal(resultado.xpCreditado, 0);
    assert.equal(resultado.subiuDeNivel, false);
    assert.equal(await xpNoLivro(), antes, 'zero não vira lançamento');
  });

  it('o cache de user_levels continua batendo com o livro', async () => {
    const [linhas] = await conexao.query('SELECT level, xp_total FROM user_levels WHERE user_id = ?', [idUsuario]);

    assert.equal(Number(linhas[0].xp_total), await xpNoLivro());
  });

  it('subir de nível devolve o bônus de mel da curva, sem creditar mel aqui', async () => {
    const [antes] = await conexao.query('SELECT coins FROM wallets WHERE user_id = ?', [idUsuario]);

    // 280 XP é o nível 2 na curva semeada; o salto é grande de propósito, para
    // atravessar o degrau numa tacada só.
    const resultado = await emTransacao((conn) =>
      levelsService.creditarXp(conn, idUsuario, 400, { motivo: 'ajuste-administrativo' }),
    );

    const [depois] = await conexao.query('SELECT coins FROM wallets WHERE user_id = ?', [idUsuario]);

    assert.equal(resultado.subiuDeNivel, true);
    assert.ok(resultado.bonusDeMelPorNivel > 0, 'a curva promete mel ao subir de nível');
    assert.equal(Number(depois[0].coins), Number(antes[0].coins), 'quem paga mel é o coinsService, na T-06.5');
  });
});
