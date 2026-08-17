import * as inventarioService from '../services/inventarioService.js';
import { assincrono } from '../utils/erros.js';

export const meu = assincrono(async (req, res) => {
  res.json(await inventarioService.listarDoPerfil(req.session.perfilId));
});
