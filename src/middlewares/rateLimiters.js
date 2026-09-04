import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import { env } from '../config/env.js';

/**
 * Limites de requisição. O documento exige rate limiting nas rotas de
 * autenticação e de compra — os pontos onde força bruta e repetição acidental
 * causam dano real.
 *
 * Em teste os limites são desligados para não interferir nas asserções.
 */
const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.teste,
};

/**
 * Em qual balde a tentativa cai: o e-mail enviado, ou o endereço quando não veio
 * e-mail nenhum.
 *
 * Exportada para o teste poder conferir a chave sem subir servidor. O
 * `ipKeyGenerator` é quem sabe agrupar IPv6 por bloco — sem ele, cada endereço
 * de uma faixa /64 contaria como um cliente novo, e o limite não limitaria nada.
 */
export function chaveDaCredencial(req) {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  return email ? `email:${email}` : ipKeyGenerator(req.ip);
}

const METODOS_DE_LEITURA = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Em qual balde a requisição cai no limite global: quem está logado e só está
 * lendo conta por sessão, e o resto conta por endereço. Sem isto uma sala de
 * aula inteira, que sai de um IP só, é contada como uma pessoa — a medição de
 * carga bateu no teto com trinta crianças (DT-112).
 */
export function chaveDoLimiteGlobal(req) {
  const usuario = req.session?.usuarioId;
  if (usuario && METODOS_DE_LEITURA.has(req.method)) return `sessao:${usuario}`;
  return ipKeyGenerator(req.ip);
}

/** Rede de segurança geral, aplicada a toda a aplicação. */
export const limiteGlobal = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  keyGenerator: chaveDoLimiteGlobal,
  message: { erro: 'Muitas requisições. Tente de novo em alguns minutos.' },
});

/**
 * Login e cadastro, contados por endereço.
 *
 * O teto é largo de propósito: numa sala de aula todo mundo sai do mesmo IP, e
 * dez erros somados entre alunos diferentes trancavam a turma inteira por quinze
 * minutos. Quem segura a força bruta contra uma conta é o limite por credencial
 * abaixo; este aqui é só a rede de baixo contra varredura em massa.
 */
export const limiteAutenticacao = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 60,
  skipSuccessfulRequests: true,
  message: { erro: 'Muitas tentativas de acesso. Aguarde alguns minutos.' },
});

/**
 * Login e cadastro, contados pelo e-mail tentado.
 *
 * É este que contém a força bruta: cinco erros na mesma conta fecham a porta
 * daquela conta, e o colega ao lado continua entrando. Acertar a senha não
 * consome o balde (`skipSuccessfulRequests`), então quem sabe a própria senha
 * nunca é barrado.
 */
export const limitePorCredencial = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: chaveDaCredencial,
  message: { erro: 'Muitas tentativas nesta conta. Aguarde alguns minutos.' },
});

/**
 * Rotas que creditam recompensa: progresso e conclusão de tarefa e de meta.
 *
 * A regra de negócio já impede ganhar sem cumprir; isto é a rede de baixo — se
 * algum dia uma checagem escapar, o estrago fica limitado ao que cabe em um
 * minuto, em vez de ser tão rápido quanto o navegador aguentar.
 */
export const limiteRecompensa = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 30,
  message: { erro: 'Calma aí! Espere um instante antes de continuar.' },
});

/**
 * Escrita na área administrativa, com atenção ao upload.
 *
 * O limite global de 600 por quinze minutos é rede de segurança de aplicação
 * inteira e não segura arquivo: cada cadastro de item ou de atividade pode
 * carregar até 8 MB, gravados numa pasta em disco. Cento e vinte escritas por
 * janela é folga larga para quem cadastra conteúdo de verdade, e teto curto o
 * bastante para o disco não virar problema.
 */
export const limiteAdministrativo = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 120,
  message: { erro: 'Muitas alterações seguidas. Aguarde alguns minutos.' },
});

/** Compras: evita duplo clique virar débito duplo e limita abuso. */
export const limiteCompra = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 20,
  message: { erro: 'Muitas compras seguidas. Aguarde um instante.' },
});
