import { emTransacao } from '../config/database.js';
import * as rewardConfigsRepository from '../repositories/rewardConfigsRepository.js';
import * as vaultsRepository from '../repositories/vaultsRepository.js';
import { ErroAplicacao, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';

/**
 * O cofre: onde o jogador guarda mel para render (RN-042) em vez de gastar na
 * loja. Depósito e saque mexem em duas contas e no extrato, então tudo acontece
 * numa transação só, com o cofre travado antes de gravar o movimento — dois
 * saques ao mesmo tempo escreveriam dois `balance_after` com o mesmo número.
 */

const BONUS_DE_META = 'bonus-de-meta-do-cofre';
const SEMANAS_POR_CICLO = 1;
const LIMITE_DE_SEMANAS_DA_PROJECAO = 520;

function exigirValorValido(valor, acao) {
  if (!Number.isInteger(valor) || valor <= 0) {
    throw erroValidacao(`O valor para ${acao} precisa ser um número inteiro maior que zero`);
  }
}

/** O retrato que a auditoria da RN-010 pede, com o cofre junto do mel. */
async function retratoComCofre(idUsuario) {
  const [saldo, cofre] = await Promise.all([
    auditService.retratoDoSaldo(idUsuario),
    vaultsRepository.buscarPorUsuario(idUsuario),
  ]);
  return { ...saldo, cofre: Number(cofre?.balance ?? 0) };
}

/**
 * Paga o bônus quando o saldo alcança a meta (RN-044) e limpa a meta.
 *
 * A meta esvaziada é a trava contra pagar duas vezes, e é o que libera o
 * jogador a declarar a próxima — o extrato guarda a linha do bônus, então a
 * história não se perde. O percentual vem de `reward_modifiers`, como manda a
 * RN-006.
 */
async function pagarMetaSeBatida(conexao, idUsuario, cofre, saldoAtual) {
  const alvo = Number(cofre.goal_amount ?? 0);
  if (alvo <= 0 || saldoAtual < alvo) return null;

  const fator = await rewardConfigsRepository.buscarModificador(BONUS_DE_META, conexao);
  const bonus = Math.floor(alvo * (fator?.coins_factor ?? 0));

  await vaultsRepository.definirMeta(conexao, idUsuario, { valor: null, prazo: null });
  if (bonus <= 0) return { alvo, bonus: 0, saldoDepois: saldoAtual };

  await vaultsRepository.creditar(conexao, idUsuario, bonus);
  await vaultsRepository.registrarTransacao(conexao, {
    idUsuario,
    tipo: 'bonus-meta',
    valor: bonus,
    saldoDepois: saldoAtual + bonus,
  });

  return { alvo, bonus, saldoDepois: saldoAtual + bonus };
}

/** Guarda mel no cofre: sai da carteira, entra no cofre, e o extrato registra (RF-COF-01). */
export async function depositar(idUsuario, valor) {
  exigirValorValido(valor, 'depositar');
  const antes = await retratoComCofre(idUsuario);

  const resultado = await emTransacao(async (conexao) => {
    await vaultsRepository.criarSeNaoExistir(idUsuario, conexao);
    const cofre = await vaultsRepository.bloquearPorUsuario(conexao, idUsuario);

    await coinsService.debitar(conexao, idUsuario, valor, { motivo: 'deposito-cofre' });
    await vaultsRepository.creditar(conexao, idUsuario, valor);

    const saldo = Number(cofre.balance) + valor;
    await vaultsRepository.registrarTransacao(conexao, {
      idUsuario,
      tipo: 'deposito',
      valor,
      saldoDepois: saldo,
    });

    const meta = await pagarMetaSeBatida(conexao, idUsuario, cofre, saldo);
    return { saldo: meta?.saldoDepois ?? saldo, meta };
  });

  await registrarNaAuditoria(idUsuario, 'cofre.deposito', antes, { valor, meta: resultado.meta });
  return resultado;
}

/**
 * Tira mel do cofre (RF-COF-01). O saque é livre — a RN-043 não o proíbe, só
 * deixa de pagar rendimento sobre o que saiu no ciclo.
 */
export async function sacar(idUsuario, valor) {
  exigirValorValido(valor, 'sacar');
  const antes = await retratoComCofre(idUsuario);

  const saldo = await emTransacao(async (conexao) => {
    const cofre = await vaultsRepository.bloquearPorUsuario(conexao, idUsuario);
    const afetadas = cofre ? await vaultsRepository.debitar(conexao, idUsuario, valor) : 0;

    // Zero linhas afetadas quer dizer saldo insuficiente: a checagem e o débito
    // acontecem na mesma instrução, como na carteira.
    if (afetadas === 0) {
      throw new ErroAplicacao('Não há esse tanto de mel no cofre', {
        status: 422,
        codigo: 'COFRE_INSUFICIENTE',
      });
    }

    await coinsService.creditar(conexao, idUsuario, valor, { motivo: 'saque-cofre' });

    const restante = Number(cofre.balance) - valor;
    await vaultsRepository.registrarTransacao(conexao, {
      idUsuario,
      tipo: 'saque',
      valor,
      saldoDepois: restante,
    });
    return restante;
  });

  await registrarNaAuditoria(idUsuario, 'cofre.saque', antes, { valor });
  return { saldo };
}

/**
 * O rendimento de um ciclo (RN-042). Quem decide quantos ciclos passaram é o
 * `economicCycleService` da T-09.5; aqui se aplica um.
 *
 * `desde` é o instante do último ciclo processado: o mel sacado depois dele não
 * rende neste ciclo (RN-043). Recebe a conexão porque o rendimento é um passo
 * do ciclo, e o ciclo inteiro é uma transação só.
 */
export async function aplicarRendimento(conexao, idUsuario, { desde }) {
  const cofre = await vaultsRepository.bloquearPorUsuario(conexao, idUsuario);
  if (!cofre) return { rendimento: 0, saldo: 0, meta: null };

  const saldo = Number(cofre.balance);
  const sacado = desde ? await vaultsRepository.totalSacadoDesde(idUsuario, desde, conexao) : 0;
  const base = Math.max(saldo - sacado, 0);
  const rendimento = Math.floor((base * Number(cofre.interest_rate)) / 100);

  if (rendimento <= 0) {
    const meta = await pagarMetaSeBatida(conexao, idUsuario, cofre, saldo);
    return { rendimento: 0, saldo: meta?.saldoDepois ?? saldo, meta };
  }

  await vaultsRepository.creditar(conexao, idUsuario, rendimento);
  const saldoDepois = saldo + rendimento;
  await vaultsRepository.registrarTransacao(conexao, {
    idUsuario,
    tipo: 'rendimento',
    valor: rendimento,
    saldoDepois,
  });

  const meta = await pagarMetaSeBatida(conexao, idUsuario, cofre, saldoDepois);
  return { rendimento, saldo: meta?.saldoDepois ?? saldoDepois, meta };
}

/** Declara ou apaga a meta do cofre (RF-COF-03, RN-044). */
export async function definirMeta(idUsuario, { valor = null, prazo = null } = {}) {
  if (valor !== null) exigirValorValido(valor, 'a meta do cofre');

  await emTransacao(async (conexao) => {
    await vaultsRepository.criarSeNaoExistir(idUsuario, conexao);
    await vaultsRepository.definirMeta(conexao, idUsuario, { valor, prazo });
  });

  return obterDoUsuario(idUsuario);
}

/**
 * A projeção da RF-COF-04: guardando `porSemana`, quanto o jogador terá daqui a
 * `semanas`. Conta pura, sem banco — o depósito da semana entra depois do
 * rendimento, porque mel que acabou de chegar ainda não rendeu.
 */
export function projetar({ saldo, porSemana, semanas, taxaPercentual }) {
  const linhas = [];
  let total = saldo;

  for (let semana = 1; semana <= semanas; semana += 1) {
    total = Math.floor((total * (100 + taxaPercentual)) / 100) + porSemana;
    linhas.push({ semana, total });
  }

  return linhas;
}

/**
 * Em quantas semanas o jogador chega ao alvo guardando `porSemana`. Devolve
 * `null` quando não chega nunca — guardar zero com taxa zero é um laço infinito
 * esperando para acontecer, então o teto de dez anos é explícito.
 */
export function semanasParaAlcancar({ saldo, porSemana, alvo, taxaPercentual }) {
  if (saldo >= alvo) return 0;

  let total = saldo;
  for (let semana = 1; semana <= LIMITE_DE_SEMANAS_DA_PROJECAO; semana += 1) {
    total = Math.floor((total * (100 + taxaPercentual)) / 100) + porSemana;
    if (total >= alvo) return semana;
  }

  return null;
}

/** O cofre como a tela pede (RF-COF-01 a 04): saldo, meta, extrato e projeção. */
export async function obterDoUsuario(idUsuario, { porSemana = 0, semanas = 8 } = {}) {
  const [cofre, extrato] = await Promise.all([
    vaultsRepository.buscarPorUsuario(idUsuario),
    vaultsRepository.listarTransacoes(idUsuario),
  ]);

  const saldo = Number(cofre?.balance ?? 0);
  const taxaPercentual = Number(cofre?.interest_rate ?? 0);
  const alvo = Number(cofre?.goal_amount ?? 0);

  return {
    saldo,
    taxaPercentual,
    semanasPorCiclo: SEMANAS_POR_CICLO,
    meta: alvo > 0 ? { valor: alvo, prazo: cofre.goal_due_at } : null,
    semanasParaAMeta:
      alvo > 0 ? semanasParaAlcancar({ saldo, porSemana, alvo, taxaPercentual }) : null,
    projecao: projetar({ saldo, porSemana, semanas, taxaPercentual }),
    extrato,
  };
}

/** Auditoria do que mexeu no mel (RN-010): o retrato do antes e o do depois. */
async function registrarNaAuditoria(idUsuario, acao, antes, detalhes) {
  await auditService.registrarRecompensa(auditService.usuario(idUsuario), acao, {
    entidade: 'vault',
    id: idUsuario,
    antes,
    depois: await retratoComCofre(idUsuario),
    detalhes,
  });
}
