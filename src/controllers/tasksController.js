import * as tasksService from '../services/tasksService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';

export const listar = assincrono(async (req, res) => {
  res.json(await tasksService.listarDoUsuario(req.session.usuarioId));
});

export const criar = assincrono(async (req, res) => {
  const { tipo, data_prazo: prazo, alvo } = req.body;
  const idTarefa = await tasksService.criar(req.session.usuarioId, {
    tipo,
    prazo,
    alvo: alvo === undefined || alvo === '' ? null : Number(alvo),
  });

  if (querJson(req)) return res.status(201).json({ id: idTarefa });
  res.redirect('/metas');
});

export const concluir = assincrono(async (req, res) => {
  const recompensa = await tasksService.concluir(Number(req.params.id), req.session.usuarioId);

  if (querJson(req)) return res.json(recompensa);
  res.redirect('/metas');
});
