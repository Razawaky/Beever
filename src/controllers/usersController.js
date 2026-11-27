import * as usersService from '../services/usersService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';
import { idContaDaSessao } from '../middlewares/requireAuth.js';
import { iniciarSessaoLogin } from '../utils/sessaoLogin.js';

/** Controllers só traduzem HTTP: nenhuma regra, nenhum SQL. */

export const criar = assincrono(async (req, res) => {
  const { email, data_nasc: dataNasc, senha, apelido } = req.body;

  // A conta do responsável não é perfil de jogo: entra direto na seleção, onde
  // ele cadastra as crianças. `perfilId` fica vazio até uma delas ser escolhida.
  const usuario = await usersService.criar({ email, dataNasc, senha, apelido });

  await iniciarSessaoLogin(req, {
    usuarioId: usuario.id,
    contaUsuarioId: usuario.id,
    email: usuario.email,
    ehAdmin: false,
    perfilId: null,
    onboardingConcluido: true,
  });

  if (querJson(req)) return res.status(201).json(usuario);
  res.redirect('/perfis');
});

export const atualizar = assincrono(async (req, res) => {
  const { apelido, email, data_nasc: dataNasc, senha } = req.body;
  const atualizado = await usersService.atualizar(
    Number(req.params.id),
    { apelido, email, dataNasc, senha },
    { id: idContaDaSessao(req), ehAdmin: req.session.ehAdmin },
  );
  res.json(atualizado);
});

export const inativar = assincrono(async (req, res) => {
  await usersService.inativar(Number(req.params.id), {
    id: req.session.usuarioId,
    ehAdmin: req.session.ehAdmin,
  });
  res.json({ mensagem: 'Conta inativada com sucesso' });
});
