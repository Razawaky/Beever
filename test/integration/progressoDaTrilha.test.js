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
import * as usersRepository from '../../src/repositories/usersRepository.js';
import { ESTADOS } from '../../src/services/contentService.js';
import * as contentService from '../../src/services/contentService.js';
import * as progressService from '../../src/services/progressService.js';

/**
 * `progressService` contra banco real.
 *
 * Dois casos carregam a tarefa: registrar tentativa move o percentual do favo na
 * mesma transação — porque a RN-027 decide desbloqueio com ele — e mandar
 * resultado para célula travada é recusado, do mesmo jeito que abrir.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('progressService', opcoes, () => {
  let banco;
  let idUsuario;
  let favo;
  let celulas;

  before(async () => {
    banco = await criarBancoDeTeste();

    idUsuario = await usersRepository.criar({
      email: 'progresso-service@beever.dev',
      apelido: 'jogador',
      dataNasc: '2018-04-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
    const idPerfil = await profilesRepository.criar({ idUsuario });
    await profilesRepository.atualizar(idPerfil, { faixaEtaria: 'A' });

    favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, ['A']);
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a tentativa vira estrelas e move o percentual do favo de uma vez', async () => {
    const resultado = await progressService.registrarTentativa(idUsuario, celulas[0].id, {
      erros: 2,
      pontuacao: 80,
      concluiu: true,
    });

    assert.equal(resultado.estrelas, 2, '2 erros são 2 estrelas (RN-030)');
    assert.equal(resultado.ehRepeticao, false, 'estreia não é repetição');
    assert.equal(Number(resultado.celula.stars), 2);
    assert.equal(Number(resultado.favo.percent), 25, 'uma de quatro células');
    assert.equal(resultado.favoConcluido, false);
  });

  it('a célula seguinte abre assim que a anterior conclui', async () => {
    const { celulas: lista } = await contentService.listarCelulasDoFavo(idUsuario, favo.id);

    assert.equal(lista[0].estado, ESTADOS.concluido);
    assert.equal(lista[1].estado, ESTADOS.disponivel);
  });

  it('tentativa que não conclui conta, mas não abre a próxima nem move o percentual', async () => {
    const resultado = await progressService.registrarTentativa(idUsuario, celulas[1].id, {
      erros: 1,
      pontuacao: 10,
      concluiu: false,
    });

    assert.equal(resultado.estrelas, 0);
    assert.equal(Number(resultado.celula.attempts), 1, 'a tentativa fica registrada');
    assert.equal(resultado.celula.first_completed_at, null);
    assert.equal(Number(resultado.favo.percent), 25, 'o percentual não andou');

    const { celulas: lista } = await contentService.listarCelulasDoFavo(idUsuario, favo.id);
    assert.equal(lista[2].estado, ESTADOS.travadoPorCelulaAnterior);
  });

  it('repetir é marcado como repetição, e ir pior não derruba a estrela conquistada', async () => {
    const resultado = await progressService.registrarTentativa(idUsuario, celulas[0].id, {
      erros: 9,
      pontuacao: 5,
      concluiu: true,
    });

    assert.equal(resultado.estrelas, 1, 'a tentativa em si valeu uma estrela');
    assert.equal(resultado.ehRepeticao, true, 'é o que a RN-008 vai cobrar mais barato');
    assert.equal(Number(resultado.celula.stars), 2, 'o que já era do jogador continua sendo');
    assert.equal(Number(resultado.celula.attempts), 2);
  });

  it('resultado enviado para célula travada é recusado (RF-CON-03)', async () => {
    await assert.rejects(
      () => progressService.registrarTentativa(idUsuario, celulas[3].id, { erros: 0, concluiu: true }),
      /Conclua a célula anterior/,
      'sem isto, bastava mandar um resultado para destravar a trilha inteira',
    );
  });

  it('recusa contagem de erros que não é inteiro não negativo', async () => {
    await assert.rejects(
      () => progressService.registrarTentativa(idUsuario, celulas[1].id, { erros: -1, concluiu: true }),
      /inteiro não negativo/,
    );
  });

  it('concluir todas as células fecha o favo e abre o seguinte', async () => {
    for (const celula of celulas.slice(1)) {
      await progressService.registrarTentativa(idUsuario, celula.id, { erros: 0, pontuacao: 100, concluiu: true });
    }

    const resumo = await progressService.resumoDoFavo(idUsuario, favo.id);
    assert.equal(resumo.concluidas, 4);
    assert.equal(resumo.percentual, 100);

    const trilha = await contentService.listarTrilha(idUsuario);
    assert.ok(trilha[0].concluido, 'favo fechado tem data');
    assert.equal(trilha[1].estado, ESTADOS.disponivel, 'o favo seguinte abriu (RN-027)');
  });

  it('o progresso é do jogador: outra conta começa do zero no mesmo favo', async () => {
    const outro = await usersRepository.criar({
      email: 'progresso-service-outro@beever.dev',
      apelido: 'outro',
      dataNasc: '2018-04-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
    const idPerfil = await profilesRepository.criar({ idUsuario: outro });
    await profilesRepository.atualizar(idPerfil, { faixaEtaria: 'A' });

    const resumo = await progressService.resumoDoFavo(outro, favo.id);
    assert.equal(resumo.concluidas, 0);
    assert.equal(resumo.percentual, 0);
  });
});
