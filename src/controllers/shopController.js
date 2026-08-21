import * as shopService from '../services/shopService.js';
import { assincrono } from '../utils/erros.js';

/** A vitrine já respondida para o jogador logado, e a prévia da compra. */

export const vitrine = assincrono(async (req, res) => {
  res.json(await shopService.listarVitrine(req.session.usuarioId));
});

export const previa = assincrono(async (req, res) => {
  const idItem = Number(req.params.idItem);
  res.json(
    await shopService.previaDaCompra(req.session.usuarioId, idItem, {
      idUnidadeTrocada: req.query.idUnidadeTrocada ? Number(req.query.idUnidadeTrocada) : null,
    }),
  );
});
