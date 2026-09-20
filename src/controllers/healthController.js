import * as healthService from '../services/healthService.js';
import { assincrono } from '../utils/erros.js';

/**
 * Camada de controller: fina, só traduz HTTP. Nenhuma regra de negócio e
 * nenhum SQL — apenas chama o service e escolhe o formato da resposta.
 */
export const mostrar = assincrono(async (req, res) => {
  const saude = await healthService.verificarSaude();
  res.status(saude.status === 'ok' ? 200 : 503).json(saude);
});
