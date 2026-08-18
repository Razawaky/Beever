import * as profilesService from '../services/profilesService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';

export const meu = assincrono(async (req, res) => {
  res.json(await profilesService.obterDoUsuario(req.session.usuarioId));
});

export const atualizar = assincrono(async (req, res) => {
  const { apelido, avatar, fuso, minutos_por_sessao: minutosPorSessao } = req.body;
  const perfil = await profilesService.atualizar(Number(req.params.id), req.session.usuarioId, {
    apelido,
    avatar,
    fuso,
    minutosPorSessao: minutosPorSessao === undefined ? undefined : Number(minutosPorSessao),
  });
  res.json(perfil);
});

export const remover = assincrono(async (req, res) => {
  await profilesService.remover(Number(req.params.id), req.session.usuarioId);
  res.json({ mensagem: 'Perfil removido com sucesso' });
});

export const salvarOnboarding = assincrono(async (req, res) => {
  const { apelido, avatar, objetivo, nivel } = req.body;
  // Um único dia marcado chega como string; a normalização de verdade é do
  // service, aqui só se garante que ele sempre receba lista.
  const dias = req.body.dias === undefined ? [] : [].concat(req.body.dias);

  const resultado = await profilesService.salvarOnboarding(Number(req.params.id), req.session.usuarioId, {
    apelido,
    avatar,
    objetivo,
    nivel,
    dias,
  });
  req.session.onboardingConcluido = true;

  if (querJson(req)) return res.json({ mensagem: 'Onboarding salvo com sucesso', ...resultado });
  res.redirect('/painel');
});
