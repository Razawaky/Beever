import * as tasksService from '../services/tasksService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';

export const listar = assincrono(async (req, res) => {
  res.json(await tasksService.listarDoUsuario(req.session.usuarioId));
});

/**
 * Registra um passo cumprido. O tamanho do passo é decidido no service — o
 * cliente diz que avançou, não quanto.
 */
export const avancar = assincrono(async (req, res) => {
  const tarefa = await tasksService.registrarProgresso(Number(req.params.id), req.session.usuarioId);

  if (querJson(req)) return res.json(tarefa);
  res.redirect('/metas');
});

export const concluir = assincrono(async (req, res) => {
  const recompensa = await tasksService.concluir(Number(req.params.id), req.session.usuarioId);

  if (querJson(req)) return res.json(recompensa);
  res.redirect('/metas');
});
