import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
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
 * A posse da partida (T-14.2, RNF-28).
 *
 * As quatro portas da partida — abrir, salvar estado, fechar e abandonar —
 * conferem duas coisas antes de qualquer outra: que o token existe e que a
 * partida é de quem está pedindo. A conferência estava escrita nas quatro e não
 * era exercitada em nenhuma: a suíte sempre jogou com o dono do token.
 *
 * É o que impede alguém de fechar a partida de outra criança com três estrelas
 * e creditar o mel na conta dela — ou, pior, na própria.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('posse da partida', opcoes, () => {
  let banco;
  let dona;
  let intrusa;
  let token;

  /** Conta pronta para jogar: perfil na faixa A, carteira e nível. */
  async function criarJogadora(email, apelido) {
    const idUsuario = await usersRepository.criar({
      email,
      apelido,
      dataNasc: '2018-04-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
    const idPerfil = await profilesRepository.criar({ idUsuario });
    await profilesRepository.atualizar(idPerfil, { faixaEtaria: 'A' });
    await walletsRepository.criar(idUsuario);
    await userLevelsRepository.criar(idUsuario);
    return idUsuario;
  }

  before(async () => {
    banco = await criarBancoDeTeste();

    dona = await criarJogadora('dona-da-partida@beever.dev', 'dona');
    intrusa = await criarJogadora('intrusa@beever.dev', 'intrusa');

    const favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, dona, ['A']);
    ({ token } = await gameSessionService.abrir(dona, celulas[0].id));
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('célula sem conteúdo publicado não abre partida', async () => {
    const favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    // A primeira célula do primeiro favo: é a única aberta para quem nunca jogou,
    // e o teste precisa passar da trava de sequência para chegar ao conteúdo.
    const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, intrusa, ['A']);
    const orfa = celulas[0];

    // Conteúdo despublicado é o estado em que o painel deixa a célula enquanto o
    // administrador reescreve a atividade. Quem barra é o `contentService`, antes
    // de a partida existir: sem isso a criança abriria uma partida vazia e o
    // fechamento pagaria por conteúdo nenhum.
    await banco.conexao.query('UPDATE contents SET is_active = 0 WHERE cell_id = ?', [orfa.id]);
    try {
      await assert.rejects(() => gameSessionService.abrir(intrusa, orfa.id), /ainda não está disponível|conteúdo/i);
    } finally {
      await banco.conexao.query('UPDATE contents SET is_active = 1 WHERE cell_id = ?', [orfa.id]);
    }
  });

  it('token que não existe não abre porta nenhuma', async () => {
    const inventado = randomUUID();

    await assert.rejects(() => gameSessionService.salvarEstado(dona, inventado, []), /não encontrada/);
    await assert.rejects(() => gameSessionService.fechar(dona, inventado, { respostas: [] }), /não encontrada/);
    await assert.rejects(() => gameSessionService.abandonar(dona, inventado), /não encontrada/);
  });

  it('a partida de outra criança é intocável, pelas três portas', async () => {
    await assert.rejects(() => gameSessionService.salvarEstado(intrusa, token, []), /de outro jogador/);
    await assert.rejects(() => gameSessionService.fechar(intrusa, token, { respostas: [] }), /de outro jogador/);
    await assert.rejects(() => gameSessionService.abandonar(intrusa, token), /de outro jogador/);
  });

  it('atividade removida no meio da partida derruba a partida, e não credita', async () => {
    // O administrador pode tirar a atividade do ar enquanto alguém joga. A
    // partida guarda qual conteúdo sorteou, então o fechamento vai buscá-lo e
    // não acha — e é melhor a criança ver erro do que a conta ser feita sobre
    // um conteúdo que não existe mais.
    const [[atual]] = await banco.conexao.query(
      'SELECT cell_id, content_id FROM game_sessions WHERE token = ?',
      [token],
    );

    // Partida antiga, aberta antes de a célula ganhar acervo, não guarda qual
    // atividade sorteou: ela pergunta pela atual da célula. Despublicada a
    // atividade, não há o que jogar.
    await banco.conexao.query('UPDATE game_sessions SET content_id = NULL WHERE token = ?', [token]);
    await banco.conexao.query('UPDATE contents SET is_active = 0 WHERE cell_id = ?', [atual.cell_id]);

    try {
      await assert.rejects(() => gameSessionService.fechar(dona, token, { respostas: [] }), /não tem conteúdo/);
    } finally {
      await banco.conexao.query('UPDATE contents SET is_active = 1 WHERE cell_id = ?', [atual.cell_id]);
      await banco.conexao.query('UPDATE game_sessions SET content_id = ? WHERE token = ?', [
        atual.content_id,
        token,
      ]);
    }
  });

  it('a partida abandonada não guarda mais progresso nem paga', async () => {
    await gameSessionService.abandonar(dona, token);

    await assert.rejects(() => gameSessionService.salvarEstado(dona, token, []), /encerrada/);
  });

  it('fechar a partida abandonada não credita nada', async () => {
    await assert.rejects(() => gameSessionService.fechar(dona, token, { respostas: [] }), /abandonada|encerrada/);
  });
});
