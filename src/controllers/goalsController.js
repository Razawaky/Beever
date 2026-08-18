import * as goalsService from '../services/goalsService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';

// A página `/metas` é renderizada pelo paginaController, que junta metas,
// tarefas e catálogo. Aqui é só o contrato JSON.
export const listar = assincrono(async (req, res) => {
  res.json(await goalsService.listarDoUsuario(req.session.usuarioId));
});

export const concluir = assincrono(async (req, res) => {
  const recompensa = await goalsService.concluir(Number(req.params.id), req.session.usuarioId);

  if (querJson(req)) return res.json(recompensa);
  res.redirect('/metas');
});
