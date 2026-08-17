import * as compraService from '../services/compraService.js';
import { assincrono } from '../utils/erros.js';

export const criar = assincrono(async (req, res) => {
  const idItem = Number(req.body.idItem);
  const { item } = await compraService.comprar(req.session.perfilId, idItem, req.session.usuarioId);

  if (req.accepts(['html', 'json']) === 'json') {
    return res.status(201).json({ mensagem: `${item.nome} comprado com sucesso`, item });
  }
  res.redirect('/loja');
});
