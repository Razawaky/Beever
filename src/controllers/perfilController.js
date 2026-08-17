import * as perfilService from '../services/perfilService.js';
import { assincrono } from '../utils/erros.js';

export const meu = assincrono(async (req, res) => {
  res.json(await perfilService.obterDoUsuario(req.session.usuarioId));
});

export const atualizar = assincrono(async (req, res) => {
  const { apelido, avatar_img: avatarImg } = req.body;
  const perfil = await perfilService.atualizar(Number(req.params.id), req.session.usuarioId, {
    apelido,
    avatarImg,
  });
  res.json(perfil);
});

export const remover = assincrono(async (req, res) => {
  await perfilService.remover(Number(req.params.id), req.session.usuarioId);
  res.json({ mensagem: 'Perfil removido com sucesso' });
});

export const salvarOnboarding = assincrono(async (req, res) => {
  const { apelido, objetivo, nivel } = req.body;
  const resultado = await perfilService.salvarOnboarding(Number(req.params.id), req.session.usuarioId, {
    apelido,
    objetivo,
    nivel,
  });
  req.session.onboardingConcluido = true;

  if (req.accepts(['html', 'json']) === 'json') {
    return res.json({ mensagem: 'Onboarding salvo com sucesso', ...resultado });
  }
  res.redirect('/painel');
});
