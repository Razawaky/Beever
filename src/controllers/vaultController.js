import * as vaultService from '../services/vaultService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';

/** O cofre do jogador logado: resumo, depósito, saque e meta. */

export const meu = assincrono(async (req, res) => {
  res.json(
    await vaultService.obterDoUsuario(req.session.usuarioId, {
      porSemana: req.query.porSemana ? Number(req.query.porSemana) : 0,
      semanas: req.query.semanas ? Number(req.query.semanas) : 8,
    }),
  );
});

// O formulário da tela do cofre é um POST comum: quem veio pelo navegador
// volta para `/cofre` com o saldo novo, quem pediu JSON recebe JSON.
export const depositar = assincrono(async (req, res) => {
  const resultado = await vaultService.depositar(req.session.usuarioId, Number(req.body.valor));
  if (querJson(req)) return res.status(201).json(resultado);
  res.redirect('/cofre');
});

export const sacar = assincrono(async (req, res) => {
  const resultado = await vaultService.sacar(req.session.usuarioId, Number(req.body.valor));
  if (querJson(req)) return res.status(201).json(resultado);
  res.redirect('/cofre');
});

export const definirMeta = assincrono(async (req, res) => {
  const resultado = await vaultService.definirMeta(req.session.usuarioId, {
    valor: req.body.valor ? Number(req.body.valor) : null,
    prazo: req.body.prazo ?? null,
  });
  if (querJson(req)) return res.json(resultado);
  res.redirect('/cofre');
});
