import * as itemService from '../services/itemService.js';
import { assincrono } from '../utils/erros.js';

export const listar = assincrono(async (req, res) => {
  res.json(await itemService.listarCatalogo());
});
