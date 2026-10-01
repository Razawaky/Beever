import { erroValidacao } from '../utils/erros.js';

/**
 * A regra do apelido que outras crianças veem (RN-049, RF-GAM-03).
 *
 * Existe porque a liga da T-13.4 publica o apelido para até trinta
 * desconhecidos: até ela, o campo só aparecia para o próprio dono. Puro e sem
 * banco, para valer igual na rota, no service e no teste.
 */

const TAMANHO_MINIMO = 2;
const TAMANHO_MAXIMO = 20;

// Letra, número, espaço, hífen e sublinhado. Arroba e ponto ficam de fora
// porque é com eles que se escreve e-mail e endereço de rede social.
const CARACTERES_PERMITIDOS = /^[\p{L}\p{N} _-]+$/u;

// Quatro dígitos seguidos já são telefone, data de nascimento ou documento.
const SEQUENCIA_DE_DIGITOS = /\d{4}/;

// Três palavras ou mais é nome completo, que a RN-049 proíbe coletar.
const PALAVRAS_DEMAIS = /^\S+\s+\S+\s+\S+/;

/** O motivo da recusa, ou `null` quando o apelido pode ser publicado. */
export function motivoDeRecusa(apelido) {
  const limpo = String(apelido ?? '').trim();

  if (limpo.length < TAMANHO_MINIMO) return 'O apelido precisa ter ao menos 2 letras';
  if (limpo.length > TAMANHO_MAXIMO) return 'O apelido pode ter no máximo 20 letras';
  if (!CARACTERES_PERMITIDOS.test(limpo)) return 'Use só letras, números, espaço, hífen e sublinhado';
  if (SEQUENCIA_DE_DIGITOS.test(limpo)) return 'Não use telefone, data nem documento no apelido';
  if (PALAVRAS_DEMAIS.test(limpo)) return 'Não use seu nome completo: outras crianças veem seu apelido';

  return null;
}

export function ehApelidoPublico(apelido) {
  return motivoDeRecusa(apelido) === null;
}

/** Para o validador da rota, que espera exceção em vez de mensagem. */
export function exigirApelidoPublico(apelido) {
  const motivo = motivoDeRecusa(apelido);
  if (motivo) throw erroValidacao(motivo);
  return true;
}

/**
 * O apelido do jeito que o ranque pode mostrar.
 *
 * Contas criadas antes desta regra podem ter qualquer coisa no campo, e o
 * ranque não pode ser a primeira tela a publicá-la. O substituto usa o id
 * interno, que é número de tabela e não diz nada sobre a criança.
 */
export function apelidoParaRanque(apelido, idUsuario) {
  return ehApelidoPublico(apelido) ? String(apelido).trim() : `Abelha ${idUsuario}`;
}
