import * as cronogramaRepository from '../repositories/cronogramaRepository.js';

/**
 * Sem tela própria: toda meta precisa de um cronograma (foreign key), então
 * este service garante que cada perfil tenha um, criado na primeira meta.
 */
export async function obterOuCriarAtivo(idPerfil) {
  const existente = await cronogramaRepository.buscarAtivoDoPerfil(idPerfil);
  if (existente) return existente.id;
  return cronogramaRepository.criarPadrao(idPerfil);
}
