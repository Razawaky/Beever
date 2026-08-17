import * as metaService from '../services/metaService.js';
import { assincrono } from '../utils/erros.js';

export const listar = assincrono(async (req, res) => {
  const metas = await metaService.listarDoPerfil(req.session.perfilId);

  if (req.accepts(['html', 'json']) === 'json') return res.json(metas);
  res.render('pages/metas', { titulo: 'Metas — Beever', metas });
});

export const criar = assincrono(async (req, res) => {
  const { titulo, descricao, data_final: dataFinal } = req.body;
  const idMeta = await metaService.criar(req.session.perfilId, req.session.usuarioId, { titulo, descricao, dataFinal });

  if (req.accepts(['html', 'json']) === 'json') return res.status(201).json({ id: idMeta });
  res.redirect('/metas');
});
