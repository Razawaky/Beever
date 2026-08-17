import * as usuarioService from '../services/usuarioService.js';
import { assincrono } from '../utils/erros.js';
import { iniciarSessaoLogin } from '../utils/sessaoLogin.js';

/** Controllers só traduzem HTTP: nenhuma regra, nenhum SQL. */

export const listar = assincrono(async (req, res) => {
  res.json(await usuarioService.listar());
});

export const criar = assincrono(async (req, res) => {
  const { nome, email, data_nasc: dataNasc, senha, apelido } = req.body;
  const usuario = await usuarioService.criar({ nome, email, dataNasc, senha, apelido });

  // Conta recém-criada nunca passou pelo onboarding: loga direto, sem exigir
  // um segundo formulário de login.
  await iniciarSessaoLogin(req, {
    usuarioId: usuario.id,
    email: usuario.email,
    ehAdmin: false,
    perfilId: usuario.idPerfil,
    onboardingConcluido: false,
  });

  if (req.accepts(['html', 'json']) === 'json') return res.status(201).json(usuario);
  res.redirect('/onboarding');
});

export const atualizar = assincrono(async (req, res) => {
  const { nome, email, data_nasc: dataNasc, senha } = req.body;
  const atualizado = await usuarioService.atualizar(
    Number(req.params.id),
    { nome, email, dataNasc, senha },
    { id: req.session.usuarioId, ehAdmin: req.session.ehAdmin }
  );
  res.json(atualizado);
});

export const inativar = assincrono(async (req, res) => {
  await usuarioService.inativar(Number(req.params.id), {
    id: req.session.usuarioId,
    ehAdmin: req.session.ehAdmin,
  });
  res.json({ mensagem: 'Conta inativada com sucesso' });
});
