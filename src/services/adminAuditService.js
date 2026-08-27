import * as auditLogsRepository from '../repositories/auditLogsRepository.js';

/**
 * Leitura da trilha de auditoria pelo painel (RF-ADM-05).
 *
 * Mora separado do `auditService` de propósito: aquele é a porta de escrita da
 * trilha, usada por oito services, e não deve crescer com consulta. Aqui não
 * existe nenhuma função que escreve — a tabela é append-only por gatilho
 * (RNF-17), e a tela não pode nem sugerir o contrário.
 */

const TIPOS_DE_ATOR = ['usuario', 'admin', 'sistema'];
const POR_PAGINA = 50;

/** Data do formulário para o instante que a consulta usa. Vazio vira nulo. */
function inicioDoDia(data) {
  return data ? `${data} 00:00:00` : null;
}

function fimDoDia(data) {
  return data ? `${data} 23:59:59` : null;
}

/**
 * O que a tela mandou vira filtro, e o que não serve é descartado em silêncio.
 *
 * Descartar é melhor do que recusar: filtro é conveniência, e uma tela de
 * auditoria que responde erro porque o campo veio vazio atrapalha quem só
 * queria ver tudo.
 */
export function filtrosDaConsulta(recebido = {}) {
  const numero = (valor) => {
    const convertido = Number.parseInt(valor, 10);
    return Number.isInteger(convertido) && convertido > 0 ? convertido : null;
  };

  return {
    atorTipo: TIPOS_DE_ATOR.includes(recebido.atorTipo) ? recebido.atorTipo : null,
    atorId: numero(recebido.atorId),
    acao: recebido.acao ? String(recebido.acao).slice(0, 100) : null,
    entidade: recebido.entidade ? String(recebido.entidade).slice(0, 60) : null,
    entidadeId: numero(recebido.entidadeId),
    requestId: recebido.requestId ? String(recebido.requestId).slice(0, 36) : null,
    de: inicioDoDia(recebido.de),
    ate: fimDoDia(recebido.ate),
  };
}

/** Em qual página estamos, e quantas existem. Página fora do intervalo vira a primeira. */
export function paginacao(pagina, total, porPagina = POR_PAGINA) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const atual = Math.min(Math.max(Number.parseInt(pagina, 10) || 1, 1), paginas);

  return { atual, paginas, porPagina, total, deslocamento: (atual - 1) * porPagina };
}

export async function consultar(recebido = {}) {
  const filtros = filtrosDaConsulta(recebido);
  const total = await auditLogsRepository.contarComFiltros(filtros);
  const pagina = paginacao(recebido.pagina, total);

  const [linhas, acoes] = await Promise.all([
    auditLogsRepository.listarComFiltros(filtros, {
      limite: pagina.porPagina,
      deslocamento: pagina.deslocamento,
    }),
    auditLogsRepository.listarAcoes(),
  ]);

  return { linhas, acoes, filtros, pagina, tiposDeAtor: TIPOS_DE_ATOR };
}

/**
 * O mesmo recorte, em CSV, para o resultado sair da tela — a trilha é material
 * de defesa do TCC, e ler cem linhas numa página não é o mesmo que ter o arquivo.
 *
 * Sem paginação: quem exporta quer o recorte inteiro. O teto é o do repository.
 */
export async function exportarCsv(recebido = {}) {
  const filtros = filtrosDaConsulta(recebido);
  const linhas = await auditLogsRepository.listarComFiltros(filtros, { limite: 200 });

  const cabecalho = ['id', 'quando', 'ator_tipo', 'ator_id', 'acao', 'entidade', 'entidade_id', 'request_id'];
  const corpo = linhas.map((linha) => [
    linha.id,
    new Date(linha.created_at).toISOString(),
    linha.ator_tipo,
    linha.actor_id ?? '',
    linha.action,
    linha.entity_type,
    linha.entity_id ?? '',
    linha.request_id ?? '',
  ]);

  return [cabecalho, ...corpo].map((colunas) => colunas.map(paraCampoCsv).join(',')).join('\n');
}

/**
 * Um campo de CSV, com aspas quando o conteúdo pede.
 *
 * O `'` na frente de campo que começa com sinal não é enfeite: planilha trata
 * `=`, `+`, `-` e `@` como início de fórmula, e a auditoria carrega texto que
 * veio de fora.
 */
function paraCampoCsv(valor) {
  const texto = String(valor ?? '');
  const comRiscoDeFormula = /^[=+\-@]/.test(texto) ? `'${texto}` : texto;

  return /[",\n]/.test(comRiscoDeFormula) ? `"${comRiscoDeFormula.replaceAll('"', '""')}"` : comRiscoDeFormula;
}
