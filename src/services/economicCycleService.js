import { emTransacao } from '../config/database.js';
import * as economicCyclesRepository from '../repositories/economicCyclesRepository.js';
import * as inventoryRepository from '../repositories/inventoryRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import * as walletsRepository from '../repositories/walletsRepository.js';
import { dataDoDia, diaDaSemana, diferencaEmDias, inicioDoDia, somarDias } from '../utils/diaDoJogador.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as patrimonyService from './patrimonyService.js';
import * as profilesService from './profilesService.js';
import * as vaultService from './vaultService.js';

/**
 * O ciclo econômico semanal (RN-036), processado de forma preguiçosa: quem some
 * seis semanas volta e recebe os seis ciclos de uma vez, na primeira página que
 * abrir. Sem cron, e o app segue stateless.
 *
 * A idempotência não é confiada a este service: quem trava é a UNIQUE de
 * `economic_cycles`, e o ciclo só aplica efeito quando o `INSERT` foi dele.
 */

const CICLOS_MAXIMOS_POR_VISITA = 12;
const CICLOS_PARA_VENDA_FORCADA = 2;
const PERCENTUAL_DA_VENDA_FORCADA = 50;

/** O domingo daquela data — a semana do jogador começa no domingo, como na sequência. */
function semanaDe(dataISO) {
  return somarDias(dataISO, -diaDaSemana(dataISO));
}

/**
 * Qual ciclo o jogador está vivendo agora: quantas semanas cheias separam a
 * semana em que a conta nasceu da semana de hoje, no fuso dele.
 *
 * O número sai do calendário, e não de um contador: o mesmo instante devolve
 * sempre o mesmo ciclo, então reprocessar não desloca a economia dele.
 */
export function numeroDoCiclo({ criadoEm, agora, fuso }) {
  const semanaDaConta = semanaDe(dataDoDia(new Date(criadoEm), fuso));
  const semanaDeHoje = semanaDe(dataDoDia(agora, fuso));
  return Math.max(Math.floor(diferencaEmDias(semanaDaConta, semanaDeHoje) / 7), 0);
}

/**
 * Separa o que vai ser aplicado do que só vai ser marcado.
 *
 * Quem volta depois de um ano não pode perder o inventário inteiro na primeira
 * tela: acima do teto, os ciclos mais antigos são marcados como processados sem
 * efeito, para o calendário não ficar devendo.
 */
export function separarPendentes({ ultimoProcessado, cicloAtual }) {
  const todos = [];
  for (let numero = ultimoProcessado + 1; numero <= cicloAtual; numero += 1) {
    todos.push(numero);
  }

  const corte = Math.max(todos.length - CICLOS_MAXIMOS_POR_VISITA, 0);
  return { pular: todos.slice(0, corte), aplicar: todos.slice(corte) };
}

/**
 * Aplica a valorização e a depreciação de cada unidade (RN-034).
 *
 * A conta mora no `UPDATE` do repository, com piso e teto do item, então o
 * valor novo é lido de volta para o extrato saber quanto subiu e quanto caiu.
 */
async function aplicarValores(conexao, idUsuario, unidades, regras) {
  const mudam = unidades.filter((unidade) => {
    const taxa = Number(unidade.valuation_rate);
    if (taxa === 0) return false;
    return taxa > 0 || regras.depreciacao;
  });
  if (mudam.length === 0) return { valorizacao: 0, depreciacao: 0 };

  for (const unidade of mudam) {
    await inventoryRepository.aplicarCicloDeValor(conexao, unidade.id);
  }

  const depois = await inventoryRepository.listarParaCiclo(idUsuario, conexao);
  const valorPorUnidade = new Map(depois.map((unidade) => [unidade.id, Number(unidade.current_value)]));

  let valorizacao = 0;
  let depreciacao = 0;
  for (const unidade of mudam) {
    const antes = Number(unidade.current_value);
    const diferenca = (valorPorUnidade.get(unidade.id) ?? antes) - antes;
    if (diferenca > 0) valorizacao += diferenca;
    else depreciacao += -diferenca;
  }

  return { valorizacao, depreciacao };
}

/** A renda dos negócios do jogador (RN-034). Unidade inadimplente não produz. */
async function creditarRenda(conexao, idUsuario, unidades) {
  let renda = 0;
  for (const unidade of unidades) {
    const valor = Number(unidade.income_per_cycle);
    if (valor <= 0 || unidade.status !== 'ativo') continue;

    await coinsService.creditar(conexao, idUsuario, valor, {
      motivo: 'renda-passiva',
      referenciaTipo: 'inventory',
      referenciaId: unidade.id,
    });
    renda += valor;
  }
  return { renda };
}

/**
 * Cobra o custo fixo de cada unidade (RN-037). A renda já entrou: quem tem
 * negócio paga as contas com o que ele rendeu, e não fica inadimplente por
 * ordem de execução.
 *
 * O débito vai direto ao `walletsRepository` de propósito: o `coinsService`
 * estoura quando falta mel, e aqui faltar mel não é erro — é inadimplência, que
 * a regra manda tratar sem nunca virar dívida negativa.
 */
async function cobrarCustoFixo(conexao, idUsuario, unidades, regras) {
  let custo = 0;
  const inadimplentes = [];

  // Faixa sem custo fixo também perdoa o que ficou devendo antes: a dívida era
  // da regra antiga, e ninguém deve ser punido por ter feito aniversário.
  if (!regras.custoFixo) {
    for (const unidade of unidades) {
      if (unidade.status === 'inadimplente') {
        await inventoryRepository.regularizar(conexao, unidade.id);
      }
    }
    return { custo, inadimplentes };
  }

  for (const unidade of unidades) {
    const valor = Number(unidade.upkeep_cost);
    if (valor <= 0) continue;

    const pagou = await walletsRepository.debitarMel(conexao, {
      idUsuario,
      quantidade: valor,
      motivo: 'custo-fixo',
      referenciaTipo: 'inventory',
      referenciaId: unidade.id,
    });

    if (pagou === 0) {
      await inventoryRepository.marcarInadimplente(conexao, unidade.id);
      inadimplentes.push(unidade.item_name);
      continue;
    }

    custo += valor;
    if (unidade.status === 'inadimplente') {
      await inventoryRepository.regularizar(conexao, unidade.id);
    }
  }

  return { custo, inadimplentes };
}

/** Vende por 50% o que passou de dois ciclos devendo (RN-037), com aviso no extrato. */
async function venderInadimplentesVencidas(conexao, idUsuario, regras) {
  if (!regras.inadimplencia) return [];

  const vencidas = await inventoryRepository.listarInadimplentesVencidas(
    idUsuario,
    CICLOS_PARA_VENDA_FORCADA,
    conexao,
  );

  const vendidos = [];
  for (const unidade of vencidas) {
    const valor = Math.floor((Number(unidade.current_value) * PERCENTUAL_DA_VENDA_FORCADA) / 100);
    const afetadas = await inventoryRepository.marcarComoVendido(conexao, unidade.id, valor);
    if (afetadas === 0) continue;

    if (valor > 0) {
      await coinsService.creditar(conexao, idUsuario, valor, {
        motivo: 'venda-por-inadimplencia',
        referenciaTipo: 'inventory',
        referenciaId: unidade.id,
      });
    }
    vendidos.push({ item: unidade.item_name, valor });
  }

  return vendidos;
}

/**
 * Um ciclo inteiro, numa transação só: marca, aplica e grava o extrato.
 *
 * A marca vem primeiro porque é ela que trava — `registrar` devolve `false`
 * para quem chegou depois, e esse ciclo sai sem tocar em nada. A ordem dos
 * efeitos é fixa: valor, renda, custo, venda forçada e por último o cofre.
 */
async function processarUm(idUsuario, numeroDoCiclo, { fuso, semanaDaConta, regras }) {
  const inicioDoCiclo = inicioDoDia(somarDias(semanaDaConta, numeroDoCiclo * 7), fuso);

  return emTransacao(async (conexao) => {
    const primeiraVez = await economicCyclesRepository.registrar(conexao, { idUsuario, numeroDoCiclo });
    if (!primeiraVez) return null;

    // RN-038: `regras` diz o que esta faixa vive. A Faixa A não deprecia, não
    // paga custo fixo e não fica inadimplente — valorização e renda continuam.
    const unidades = await inventoryRepository.listarParaCiclo(idUsuario, conexao);
    const valores = await aplicarValores(conexao, idUsuario, unidades, regras);
    const { renda } = await creditarRenda(conexao, idUsuario, unidades);
    const { custo, inadimplentes } = await cobrarCustoFixo(conexao, idUsuario, unidades, regras);
    const vendidos = await venderInadimplentesVencidas(conexao, idUsuario, regras);
    const cofre = await vaultService.aplicarRendimento(conexao, idUsuario, { desde: inicioDoCiclo });

    const resumo = {
      numero: numeroDoCiclo,
      valorizacao: valores.valorizacao,
      depreciacao: valores.depreciacao,
      renda,
      custo,
      inadimplentes,
      vendidos,
      rendimentoDoCofre: cofre.rendimento,
      metaDoCofre: cofre.meta,
    };

    await economicCyclesRepository.gravarResumo(conexao, { idUsuario, numeroDoCiclo, resumo });
    return resumo;
  });
}

/** Marca o ciclo antigo demais como processado, sem efeito nenhum. */
async function marcarSemEfeito(idUsuario, numeroDoCiclo) {
  await emTransacao((conexao) =>
    economicCyclesRepository.registrar(conexao, {
      idUsuario,
      numeroDoCiclo,
      resumo: { numero: numeroDoCiclo, pulado: true },
    }),
  );
}

/**
 * Roda todos os ciclos que passaram desde a última visita e devolve os extratos,
 * do mais antigo para o mais novo. É o que a Colmeia mostra na T-09.8.
 *
 * Cada ciclo tem transação própria: falha no quarto preserva os três primeiros,
 * e a próxima visita continua de onde parou.
 */
export async function processarPendentes(idUsuario, agora = new Date()) {
  const usuario = await usersRepository.buscarPorId(idUsuario);
  if (!usuario) return [];

  const fuso = await profilesService.fusoDoUsuario(idUsuario);
  const cicloAtual = numeroDoCiclo({ criadoEm: usuario.created_at, agora, fuso });
  const ultimoProcessado = await economicCyclesRepository.ultimoNumeroProcessado(idUsuario);
  const { pular, aplicar } = separarPendentes({ ultimoProcessado, cicloAtual });
  if (pular.length === 0 && aplicar.length === 0) return [];

  const regras = await profilesService.regrasEconomicasDoUsuario(idUsuario);
  const semanaDaConta = semanaDe(dataDoDia(new Date(usuario.created_at), fuso));
  for (const numero of pular) {
    await marcarSemEfeito(idUsuario, numero);
  }

  const antes = await auditService.retratoDoSaldo(idUsuario);
  const resumos = [];
  for (const numero of aplicar) {
    const resumo = await processarUm(idUsuario, numero, { fuso, semanaDaConta, regras });
    if (resumo) resumos.push(resumo);
  }

  if (resumos.length === 0) return [];

  // A foto do patrimônio sai uma vez, no fim: é o ponto do gráfico da semana de
  // quem passou o período fora (DT-56).
  await patrimonyService.obterDoUsuario(idUsuario);
  await auditService.registrarRecompensa(auditService.sistema(), 'ciclo.economico', {
    entidade: 'economic_cycle',
    id: idUsuario,
    antes,
    depois: await auditService.retratoDoSaldo(idUsuario),
    detalhes: { ciclos: resumos.map((resumo) => resumo.numero), pulados: pular.length },
  });

  return resumos;
}

/** Os últimos extratos gravados, do mais novo para o mais antigo (RF-HOM-09). */
export async function listarUltimos(idUsuario, limite = 10) {
  return economicCyclesRepository.listarUltimos(idUsuario, limite);
}
