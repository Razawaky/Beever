import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../../helpers/banco.js';
import { fecharPool } from '../../../src/config/database.js';
import * as cellsRepository from '../../../src/repositories/cellsRepository.js';
import * as contentsRepository from '../../../src/repositories/contentsRepository.js';
import * as hivesRepository from '../../../src/repositories/hivesRepository.js';
import * as usersRepository from '../../../src/repositories/usersRepository.js';

/**
 * Os três repositories de conteúdo contra banco real.
 *
 * O que estes testes protegem é a ordem: o favo anterior e a célula anterior são
 * a matéria-prima da RN-026 e da RN-027, e uma consulta que devolvesse a ordem
 * errada deixaria a trilha destrancar sozinha.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('repositories de conteúdo', opcoes, () => {
  let banco;
  let conexao;
  let idUsuario;

  before(async () => {
    banco = await criarBancoDeTeste();
    conexao = banco.conexao;
    idUsuario = await usersRepository.criar({
      email: 'trilha@beever.dev',
      apelido: 'trilha',
      dataNasc: '2018-04-02',
      senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
    });
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('lista os favos da faixa na ordem da trilha', async () => {
    const favos = await hivesRepository.listarPorFaixas(['A']);

    assert.equal(favos.length, 2, 'o seed tem dois favos na faixa A');
    assert.deepEqual(
      favos.map((favo) => favo.slug),
      ['primeiros-passos', 'guardar-e-gastar'],
      'a ordem é a de `order_index`, não a de inserção',
    );
    assert.equal(Number(favos[0].unlock_percent), 80, 'o percentual da RN-027 vem junto');
  });

  it('cada faixa recebe só os seus favos, e as faixas somam (RN-029)', async () => {
    assert.equal((await hivesRepository.listarPorFaixas([])).length, 0, 'sem faixa, sem trilha');
    assert.equal((await hivesRepository.listarPorFaixas(['B'])).length, 2, 'a faixa B tem dois favos');

    const duasFaixas = await hivesRepository.listarPorFaixas(['A', 'B']);
    assert.equal(duasFaixas.length, 4, 'quem vê A e B recebe os quatro');
    assert.deepEqual(
      duasFaixas.map((favo) => favo.age_band_code),
      ['A', 'A', 'B', 'B'],
      'a ordem é por faixa e depois por posição — a trilha começa no conteúdo mais novo',
    );

    assert.equal((await hivesRepository.listarPorFaixas(['A', 'B', 'C'])).length, 6);
  });

  it('favo inativo some da trilha', async () => {
    await conexao.query("UPDATE hives SET is_active = 0 WHERE slug = 'guardar-e-gastar'");
    assert.equal((await hivesRepository.listarPorFaixas(['A'])).length, 1);
    assert.equal(await hivesRepository.buscarPorSlug('guardar-e-gastar'), null);

    await conexao.query("UPDATE hives SET is_active = 1 WHERE slug = 'guardar-e-gastar'");
  });

  it('o favo anterior é o vizinho da mesma faixa, e o primeiro não tem', async () => {
    const primeiro = await hivesRepository.buscarPorSlug('primeiros-passos');
    const segundo = await hivesRepository.buscarPorSlug('guardar-e-gastar');

    assert.equal(await hivesRepository.buscarAnterior(primeiro), null, 'o primeiro favo abre sem pré-requisito');
    assert.equal(Number((await hivesRepository.buscarAnterior(segundo)).id), Number(primeiro.id));
  });

  it('as células do favo vêm em ordem, com o progresso zerado de quem nunca jogou', async () => {
    const favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, ['A']);

    assert.equal(celulas.length, 4);
    assert.deepEqual(
      celulas.map((celula) => Number(celula.order_index)),
      [1, 2, 3, 4],
    );
    assert.equal(celulas[0].title, 'O que é mel?');
    assert.equal(celulas[0].game_type_slug, 'quiz-do-favo', 'o tipo de jogo decide qual validador roda');
    assert.equal(Number(celulas[0].stars), 0, 'célula nunca jogada aparece com zero, não some da lista');
    assert.equal(celulas[0].first_completed_at, null);
  });

  it('a célula anterior é a de ordem imediatamente menor no mesmo favo', async () => {
    const favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, ['A']);

    assert.equal(await cellsRepository.buscarAnterior(celulas[0]), null, 'a primeira célula abre sem pré-requisito');
    assert.equal(
      Number((await cellsRepository.buscarAnterior(celulas[2])).id),
      Number(celulas[1].id),
      'a anterior da terceira é a segunda',
    );
  });

  it('conta as células de vários favos de uma vez, respeitando a faixa', async () => {
    const primeiro = await hivesRepository.buscarPorSlug('primeiros-passos');
    const segundo = await hivesRepository.buscarPorSlug('guardar-e-gastar');
    const deOutraFaixa = await hivesRepository.buscarPorSlug('o-tempo-e-o-juro');

    const totais = await cellsRepository.contarPorFavos([primeiro.id, segundo.id, deOutraFaixa.id], ['A']);

    assert.equal(totais.get(Number(primeiro.id)), 4, 'é o denominador da RN-027');
    assert.equal(totais.get(Number(segundo.id)), 4);
    assert.equal(totais.has(Number(deOutraFaixa.id)), false, 'favo de faixa acima não entra na conta');

    assert.equal((await cellsRepository.contarPorFavos([], ['A'])).size, 0);
    assert.equal((await cellsRepository.contarPorFavos([primeiro.id], [])).size, 0);
  });

  it('o banco recusa duas células na mesma posição do favo', async () => {
    const favo = await hivesRepository.buscarPorSlug('primeiros-passos');

    await assert.rejects(
      conexao.query(
        `INSERT INTO cells (hive_id, game_type_id, age_band_id, order_index, title)
         SELECT ?, c.game_type_id, c.age_band_id, 1, 'Célula intrusa'
           FROM cells c WHERE c.hive_id = ? LIMIT 1`,
        [favo.id, favo.id],
      ),
      /Duplicate entry/,
      'sem a UNIQUE, "a próxima célula" ficaria ambígua',
    );
  });

  it('o conteúdo vem na versão mais recente da célula', async () => {
    const favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    const [primeira] = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, ['A']);

    const conteudo = await contentsRepository.buscarAtualDaCelula(primeira.id);
    assert.ok(conteudo, 'a primeira célula do seed tem conteúdo');
    assert.equal(Number(conteudo.version), 1);

    await conexao.query(
      "INSERT INTO contents (cell_id, version, body) VALUES (?, 2, JSON_OBJECT('tipo', 'quiz', 'perguntas', JSON_ARRAY()))",
      [primeira.id],
    );

    const atual = await contentsRepository.buscarAtualDaCelula(primeira.id);
    assert.equal(Number(atual.version), 2, 'a busca traz a versão nova, e a antiga continua guardada');
    assert.equal((await contentsRepository.listarVersoesDaCelula(primeira.id)).length, 2);
  });

  it('diz quais células já têm conteúdo, para a trilha não abrir célula vazia', async () => {
    const favo = await hivesRepository.buscarPorSlug('primeiros-passos');
    const celulas = await cellsRepository.listarDoFavoComProgresso(favo.id, idUsuario, ['A']);
    const ids = celulas.map((celula) => Number(celula.id));

    const comConteudo = await contentsRepository.listarCelulasComConteudo(ids);
    assert.ok(comConteudo.length > 0 && comConteudo.length <= ids.length);
    assert.ok(comConteudo.every((id) => ids.includes(id)));
    assert.deepEqual(await contentsRepository.listarCelulasComConteudo([]), []);
  });
});
