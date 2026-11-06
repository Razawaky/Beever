import * as tasksService from '../services/tasksService.js';
import { assincrono } from '../utils/erros.js';
import { paginaDeVolta, querJson } from '../utils/resposta.js';

export const listar = assincrono(async (req, res) => {
  res.json(await tasksService.listarDoUsuario(req.session.usuarioId));
});

export const concluir = assincrono(async (req, res) => {
  const recompensa = await tasksService.concluir(Number(req.params.id), req.session.usuarioId);

  if (querJson(req)) return res.json(recompensa);
  // Receber a recompensa não pode mudar o jogador de tela: quem clicou na
  // Colmeia volta para a Colmeia.
  res.redirect(paginaDeVolta(req.body.voltarPara));
});
