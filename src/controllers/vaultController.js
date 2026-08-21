import * as vaultService from '../services/vaultService.js';
import { assincrono } from '../utils/erros.js';

/** O cofre do jogador logado: resumo, depósito, saque e meta. */

export const meu = assincrono(async (req, res) => {
  res.json(
    await vaultService.obterDoUsuario(req.session.usuarioId, {
      porSemana: req.query.porSemana ? Number(req.query.porSemana) : 0,
      semanas: req.query.semanas ? Number(req.query.semanas) : 8,
    }),
  );
});

export const depositar = assincrono(async (req, res) => {
  const resultado = await vaultService.depositar(req.session.usuarioId, Number(req.body.valor));
  res.status(201).json(resultado);
});

export const sacar = assincrono(async (req, res) => {
  const resultado = await vaultService.sacar(req.session.usuarioId, Number(req.body.valor));
  res.status(201).json(resultado);
});

export const definirMeta = assincrono(async (req, res) => {
  const resultado = await vaultService.definirMeta(req.session.usuarioId, {
    valor: req.body.valor ? Number(req.body.valor) : null,
    prazo: req.body.prazo ?? null,
  });
  res.json(resultado);
});
