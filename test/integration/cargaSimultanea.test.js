import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { opcoesDeCarga, opcoesDeTempo } from '../helpers/relogio.js';
import { env } from '../../src/config/env.js';
import { fecharPool, pool } from '../../src/config/database.js';
import * as profilesRepository from '../../src/repositories/profilesRepository.js';
import * as userLevelsRepository from '../../src/repositories/userLevelsRepository.js';
import * as usersRepository from '../../src/repositories/usersRepository.js';
import * as walletsRepository from '../../src/repositories/walletsRepository.js';
import * as homeService from '../../src/services/homeService.js';

/**
 * Trinta jogadores ao mesmo tempo (RNF-02, T-14.3).
 *
 * Não é benchmark: é regressão de concorrência. O pool tem menos conexões do que
 * usuários simultâneos — é assim que pool funciona —, então o que este arquivo
 * cobra é que a fila ande. Consulta que segura conexão além do necessário, ou
 * transação que espera por I/O de fora do banco, aparece aqui como espera que
 * cresce, e não como erro.
 *
 * A visita à Colmeia é o alvo certo porque é o caminho mais caro do sistema:
 * fecha ciclo econômico, julga sequência, abre liga, sincroniza metas e tarefas
 * e ainda monta a trilha inteira.
 *
 * O cronômetro é pulado sob instrumentação de cobertura, pelo mesmo motivo da
 * T-14.2: a instrumentação infla justamente o número que a RNF-01 cobra.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : opcoesDeCarga;

const JOGADORES_SIMULTANEOS = 30;

/** O teto da RNF-01 para a página mais cara, com todos chegando de uma vez. */
const TETO_DA_VISITA_MS = 2000;

describe('trinta jogadores ao mesmo tempo', opcoes, () => {
  let banco;
  const jogadores = [];

  before(async () => {
    banco = await criarBancoDeTeste();

    // Contas criadas pelo repository, e não pelo cadastro HTTP: o bcrypt do
    // registro é caro de propósito e dominaria a medição, escondendo o que esta
    // tarefa quer ver, que é a disputa por conexão.
    for (let numero = 0; numero < JOGADORES_SIMULTANEOS; numero += 1) {
      const idUsuario = await usersRepository.criar({
        email: `carga${numero}@beever.dev`,
        apelido: `carga${numero}`,
        dataNasc: '2015-06-15',
        senhaHash: '$2b$10$hashfalsoparatestes000000000000000000000000000000000000',
      });
      const idPerfil = await profilesRepository.criar({ idUsuario });
      await profilesRepository.atualizar(idPerfil, { faixaEtaria: 'B' });
      await walletsRepository.criar(idUsuario);
      await userLevelsRepository.criar(idUsuario);
      jogadores.push(idUsuario);
    }
  });

  after(async () => {
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('o pool tem menos conexões do que jogadores, que é o cenário real', () => {
    assert.ok(
      env.banco.limitePool < JOGADORES_SIMULTANEOS,
      `com pool de ${env.banco.limitePool} para ${JOGADORES_SIMULTANEOS} jogadores, a fila é exercitada`,
    );
  });

  it('as trinta visitas à Colmeia terminam, e nenhuma fica sem conexão', async () => {
    const resultados = await Promise.allSettled(
      jogadores.map((idUsuario) => homeService.obterColmeia(idUsuario)),
    );

    const falhas = resultados
      .filter((resultado) => resultado.status === 'rejected')
      .map((resultado) => resultado.reason?.message ?? String(resultado.reason));

    assert.deepEqual(falhas, [], 'nenhuma visita pode falhar por disputa de conexão');
    assert.equal(resultados.length, JOGADORES_SIMULTANEOS);
  });

  it('a visita simultânea devolve a Colmeia inteira, e não meia tela', async () => {
    const colmeias = await Promise.all(jogadores.map((idUsuario) => homeService.obterColmeia(idUsuario)));

    for (const colmeia of colmeias) {
      assert.ok(colmeia.jogador.apelido, 'todo jogador volta identificado');
      assert.ok(Array.isArray(colmeia.trilha));
      assert.ok(Array.isArray(colmeia.tarefas));
      assert.ok(Object.hasOwn(colmeia, 'liga'));
    }
  });

  it('a fila do pool devolve todas as conexões no fim', async () => {
    await Promise.all(jogadores.map((idUsuario) => homeService.obterColmeia(idUsuario)));

    // Conexão que não volta para o pool é o defeito que a carga revela: a
    // aplicação segue de pé e vai ficando mais lenta até travar de vez.
    const emUso = pool.pool._allConnections.length - pool.pool._freeConnections.length;
    assert.equal(emUso, 0, 'toda conexão emprestada precisa voltar');
  });

  it('a visita mais cara continua dentro do teto com todos chegando juntos', opcoesDeTempo, async () => {
    const inicio = performance.now();
    await Promise.all(jogadores.map((idUsuario) => homeService.obterColmeia(idUsuario)));
    const duracao = Math.round((performance.now() - inicio) / JOGADORES_SIMULTANEOS);

    assert.ok(
      duracao < TETO_DA_VISITA_MS,
      `cada visita levou ${duracao}ms em média com 30 simultâneas, e o teto da RNF-01 é ${TETO_DA_VISITA_MS}ms`,
    );
  });
});
