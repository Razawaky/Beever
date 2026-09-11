import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { fecharPool } from '../../src/config/database.js';
import * as shopService from '../../src/services/shopService.js';

/**
 * Os dois tipos de requisito que o seed não usa (T-14.2, RNF-28).
 *
 * O catálogo de hoje só exige nível e item anterior, então `patrimonio-minimo`
 * e `favo-concluido` existiam no código e nunca tinham sido avaliados. Os dois
 * ficam disponíveis para o painel cadastrar desde a T-12.3, e é exatamente aí
 * que um administrador cria a primeira linha de um tipo nunca exercitado.
 *
 * `favo-concluido` cai no caso `default` de propósito: a fonte de verdade ainda
 * não existe, e o item avisa que o requisito não pode ser conferido em vez de
 * dizer que está cumprido.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('requisitos de item ainda não usados pelo seed', opcoes, () => {
  let banco;
  let idUsuario;

  async function exigir(slugDoItem, slugDoTipo, colunas = {}) {
    const [[item]] = await banco.conexao.query('SELECT id FROM items WHERE slug = ?', [slugDoItem]);
    const [[tipo]] = await banco.conexao.query('SELECT id FROM item_requirement_types WHERE slug = ?', [
      slugDoTipo,
    ]);

    const nomes = ['item_id', 'requirement_type_id', ...Object.keys(colunas)];
    const valores = [item.id, tipo.id, ...Object.values(colunas)];
    await banco.conexao.query(
      `INSERT INTO item_requirements (${nomes.join(', ')}) VALUES (${nomes.map(() => '?').join(', ')})`,
      valores,
    );
    return Number(item.id);
  }

  function pendenciasDe(vitrine, idItem) {
    const achado = vitrine.itens.find((item) => Number(item.id) === idItem);
    assert.ok(achado, 'o item precisa aparecer na vitrine');
    // A vitrine separa o que barra a compra do que é só aviso; aqui os dois
    // interessam, porque o teste é sobre o requisito ser avaliado.
    return [...achado.bloqueios, ...achado.avisos];
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    const [[ana]] = await banco.conexao.query('SELECT id FROM users WHERE email = ?', ['ana@beever.dev']);
    idUsuario = Number(ana.id);
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('patrimônio mínimo acima do que a criança tem vira recado com o número', async () => {
    const idItem = await exigir('patinete', 'patrimonio-minimo', { required_patrimony: 999999 });

    const pendencias = pendenciasDe(await shopService.listarVitrine(idUsuario), idItem);
    const patrimonio = pendencias.find((pendencia) => pendencia.tipo === 'patrimonio-minimo');

    assert.ok(patrimonio, 'o requisito precisa aparecer como pendência');
    assert.match(patrimonio.mensagem, /999999 de patrimônio/);
  });

  it('patrimônio mínimo que a criança já alcançou some da lista', async () => {
    const idItem = await exigir('bicicleta', 'patrimonio-minimo', { required_patrimony: 0 });

    const pendencias = pendenciasDe(await shopService.listarVitrine(idUsuario), idItem);

    assert.equal(
      pendencias.filter((pendencia) => pendencia.tipo === 'patrimonio-minimo').length,
      0,
      'requisito cumprido não é pendência',
    );
  });

  it('requisito que ninguém sabe conferir avisa, e não bloqueia a compra', async () => {
    const idItem = await exigir('terreno', 'favo-concluido');

    const pendencias = pendenciasDe(await shopService.listarVitrine(idUsuario), idItem);
    const favo = pendencias.find((pendencia) => pendencia.tipo === 'favo-concluido');

    assert.ok(favo, 'o requisito precisa aparecer');
    assert.equal(favo.naoVerificavelAinda, true, 'não sabemos conferir, então não bloqueia');
    assert.match(favo.mensagem, /ainda não pode ser verificado/);
  });
});
