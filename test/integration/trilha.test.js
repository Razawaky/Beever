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
import * as progressRepository from '../../src/repositories/progressRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';
import { ESTADOS } from '../../src/services/contentService.js';
import * as contentService from '../../src/services/contentService.js';

/**
 * `contentService` contra banco real.
 *
 * O caso que dá nome à etapa é o último: célula travada não abre nem quando o
 * pedido chega direto no service, sem passar pela tela. É o que impede burlar a
 * trilha pela URL.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('trilha — contentService', opcoes, () => {
  let banco;
  let conexao;
  let idUsuario;
  let primeiroFavo;
  let segundoFavo;
  let celulas;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;

    idUsuario = await usersRepository.criar({
      email: 'trilha-service@beever.dev',
      apelido: 'trilheiro',
      dataNasc: '2018-04-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
    const idPerfil = await profilesRepository.criar({ idUsuario });
    await profilesRepository.atualizar(idPerfil, { faixaEtaria: 'A' });

    primeiroFavo = await hivesRepository.buscarPorSlug('primeiros-passos');
    segundoFavo = await hivesRepository.buscarPorSlug('guardar-e-gastar');
    celulas = await cellsRepository.listarDoFavoComProgresso(primeiroFavo.id, idUsuario);
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  /** Conclui a célula com três estrelas e reconta o percentual do favo. */
  async function concluir(celula) {
    await emTransacao(async (c) => {
      await progressRepository.registrarTentativa(c, {
        idUsuario,
        idCelula: celula.id,
        estrelas: 3,
        erros: 0,
        pontuacao: 100,
        concluidaEm: new Date(),
      });
      await progressRepository.recalcularFavo(c, idUsuario, celula.hive_id);
    });
  }

  it('a trilha começa com o primeiro favo aberto e o segundo travado', async () => {
    const trilha = await contentService.listarTrilha(idUsuario);

    assert.equal(trilha.length, 2, 'a faixa A tem dois favos semeados');
    assert.equal(trilha[0].estado, ESTADOS.disponivel);
    assert.equal(trilha[0].percentual, 0);
    assert.equal(trilha[1].estado, ESTADOS.travadoPorPercentual);
    assert.match(trilha[1].motivo, /80%/);
  });

  it('quem não tem faixa não vê trilha nenhuma (RN-029)', async () => {
    const semFaixa = await usersRepository.criar({
      email: 'sem-faixa@beever.dev',
      apelido: 'sem-faixa',
      dataNasc: '2018-04-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
    await profilesRepository.criar({ idUsuario: semFaixa });

    assert.deepEqual(await contentService.listarTrilha(semFaixa), []);
  });

  it('lista as células do favo aberto, só a primeira disponível', async () => {
    const { celulas: lista } = await contentService.listarCelulasDoFavo(idUsuario, primeiroFavo.id);

    assert.equal(lista.length, 4);
    assert.equal(lista[0].estado, ESTADOS.disponivel);
    assert.ok(
      lista.slice(1).every((celula) => celula.estado === ESTADOS.travadoPorCelulaAnterior),
      'a trilha abre uma célula de cada vez',
    );
    assert.ok(lista[0].temConteudo, 'a primeira célula do seed tem conteúdo');
  });

  it('favo travado não lista célula nenhuma', async () => {
    await assert.rejects(() => contentService.listarCelulasDoFavo(idUsuario, segundoFavo.id), /80%/);
  });

  it('abrir a primeira célula devolve o conteúdo da versão atual', async () => {
    const { celula, conteudo } = await contentService.abrirCelula(idUsuario, celulas[0].id);

    assert.equal(Number(celula.id), Number(celulas[0].id));
    assert.equal(celula.estado, ESTADOS.disponivel);
    assert.equal(Number(conteudo.version), 1);
    assert.ok(conteudo.body, 'o corpo da atividade vem junto');
  });

  /** O critério de aceite da etapa: não dá para pular a fila pela URL. */
  it('célula travada não abre nem indo direto ao service', async () => {
    await assert.rejects(
      () => contentService.abrirCelula(idUsuario, celulas[2].id),
      /Conclua a célula anterior/,
      'a terceira célula não abre com a segunda por fazer',
    );
  });

  it('concluir a célula abre a seguinte, e só ela', async () => {
    await concluir(celulas[0]);

    const { celulas: lista } = await contentService.listarCelulasDoFavo(idUsuario, primeiroFavo.id);
    assert.equal(lista[0].estado, ESTADOS.concluido);
    assert.equal(lista[1].estado, ESTADOS.disponivel);
    assert.equal(lista[2].estado, ESTADOS.travadoPorCelulaAnterior);

    const aberta = await contentService.abrirCelula(idUsuario, celulas[1].id);
    assert.equal(Number(aberta.celula.id), Number(celulas[1].id));
  });

  it('a 80% do favo o seguinte abre (RN-027)', async () => {
    await concluir(celulas[1]);
    await concluir(celulas[2]);

    const parcial = await contentService.listarTrilha(idUsuario);
    assert.equal(parcial[0].percentual, 75);
    assert.equal(parcial[1].estado, ESTADOS.travadoPorPercentual, '75% ainda não é 80%');

    await concluir(celulas[3]);

    const completa = await contentService.listarTrilha(idUsuario);
    assert.equal(completa[0].percentual, 100);
    assert.ok(completa[0].concluido, 'favo fechado tem data de conclusão');
    assert.equal(completa[1].estado, ESTADOS.disponivel, 'o favo seguinte abriu');
  });

  it('requisito de patrimônio trava o favo mesmo com o percentual cumprido (RN-028)', async () => {
    await conexao.query('UPDATE hives SET required_patrimony = 500 WHERE id = ?', [segundoFavo.id]);

    const travada = await contentService.listarTrilha(idUsuario);
    assert.equal(travada[1].estado, ESTADOS.travadoPorPatrimonio);
    assert.match(travada[1].motivo, /500 de patrimônio/);

    await assert.rejects(() => contentService.listarCelulasDoFavo(idUsuario, segundoFavo.id), /patrimônio/);

    await conexao.query('UPDATE hives SET required_patrimony = 0 WHERE id = ?', [segundoFavo.id]);
    const liberada = await contentService.listarTrilha(idUsuario);
    assert.equal(liberada[1].estado, ESTADOS.disponivel);
  });

  it('requisito de item trava o favo até o jogador ter o item (RN-028)', async () => {
    const [[item]] = await conexao.query('SELECT id FROM items ORDER BY id LIMIT 1');
    await conexao.query('UPDATE hives SET required_item_id = ? WHERE id = ?', [item.id, segundoFavo.id]);

    const semItem = await contentService.listarTrilha(idUsuario);
    assert.equal(semItem[1].estado, ESTADOS.travadoPorItem);

    await conexao.query(
      `INSERT INTO inventory (user_id, item_id, status_id, current_value)
       VALUES (?, ?, (SELECT id FROM inventory_statuses WHERE slug = 'ativo'), 10)`,
      [idUsuario, item.id],
    );

    const comItem = await contentService.listarTrilha(idUsuario);
    assert.equal(comItem[1].estado, ESTADOS.disponivel, 'ter o item destrava o favo');

    await conexao.query('UPDATE hives SET required_item_id = NULL WHERE id = ?', [segundoFavo.id]);
  });
});
