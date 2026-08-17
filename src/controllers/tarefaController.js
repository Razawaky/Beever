import * as tarefaService from '../services/tarefaService.js';
import { assincrono } from '../utils/erros.js';

export const criar = assincrono(async (req, res) => {
  const { titulo, descricao, data_prazo: dataPrazo, prioridade } = req.body;
  const idMeta = Number(req.params.idMeta);
  const idTarefa = await tarefaService.criar(req.session.perfilId, req.session.usuarioId, idMeta, {
    titulo,
    descricao,
    dataPrazo,
    prioridade,
  });

  if (req.accepts(['html', 'json']) === 'json') return res.status(201).json({ id: idTarefa });
  res.redirect('/metas');
});

export const concluir = assincrono(async (req, res) => {
  const idTarefa = Number(req.params.id);
  const resultado = await tarefaService.concluir(idTarefa, req.session.perfilId, req.session.usuarioId);

  if (req.accepts(['html', 'json']) === 'json') return res.json(resultado);
  res.redirect('/metas');
});
