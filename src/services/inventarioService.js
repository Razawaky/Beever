import * as inventarioRepository from '../repositories/inventarioRepository.js';

export async function listarDoPerfil(idPerfil) {
  return inventarioRepository.listarPorPerfil(idPerfil);
}
