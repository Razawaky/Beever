import * as purchasesService from '../services/purchasesService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';

export const criar = assincrono(async (req, res) => {
  const idItem = Number(req.body.idItem);
  const { item, precoPago, desconto, repetida } = await purchasesService.comprar(req.session.usuarioId, idItem, {
    chaveDeIdempotencia: req.body.chaveDeIdempotencia ?? null,
    idUnidadeTrocada: req.body.idUnidadeTrocada ? Number(req.body.idUnidadeTrocada) : null,
  });

  if (querJson(req)) {
    // Envio repetido responde 200, e não 201: nada foi criado desta vez.
    return res.status(repetida ? 200 : 201).json({
      mensagem: `${item.name} comprado com sucesso`,
      item,
      precoPago,
      desconto,
      repetida,
    });
  }
  res.redirect('/loja');
});

export const meuExtrato = assincrono(async (req, res) => {
  res.json(await purchasesService.listarDoUsuario(req.session.usuarioId));
});
