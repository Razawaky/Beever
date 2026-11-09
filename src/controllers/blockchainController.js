import * as service from '../services/logBlockchainService.js';

export async function listar(req, res) {
  res.json(await service.listar());
}

export async function verificar(req, res) {
  res.json(await service.validar());
}