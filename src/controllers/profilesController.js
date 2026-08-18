import * as profilesService from '../services/profilesService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';

export const meu = assincrono(async (req, res) => {
  res.json(await profilesService.obterDoUsuario(req.session.usuarioId));
});

/**
 * Interruptor vindo de formulário. Caixa marcada chega como `"on"` no envio
 * tradicional e como `true` no JSON; desmarcada some do corpo, e é por isso que
 * "ausente" precisa continuar sendo `undefined` e não `false`: o service trata
 * ausência como "não mexeu".
 */
function booleano(valor) {
  if (valor === undefined) return undefined;
  return valor !== false && valor !== 'false' && valor !== '0' && valor !== 0;
}

export const atualizar = assincrono(async (req, res) => {
  const {
    apelido,
    avatar,
    fuso,
    minutos_por_sessao: minutosPorSessao,
    som_ativo: somAtivo,
    animacao_reduzida: animacaoReduzida,
  } = req.body;

  const perfil = await profilesService.atualizar(Number(req.params.id), req.session.usuarioId, {
    apelido,
    avatar,
    fuso,
    minutosPorSessao: minutosPorSessao === undefined ? undefined : Number(minutosPorSessao),
    somAtivo: booleano(somAtivo),
    animacaoReduzida: booleano(animacaoReduzida),
  });
  res.json(perfil);
});

export const remover = assincrono(async (req, res) => {
  await profilesService.remover(Number(req.params.id), req.session.usuarioId);
  res.json({ mensagem: 'Perfil removido com sucesso' });
});

/**
 * Um passo respondido. Devolve sempre o rascunho inteiro, e não só um "ok",
 * para que a tela não precise adivinhar em que passo o servidor acha que ela
 * está — quem manda no progresso é o servidor.
 */
export const salvarPassoDoOnboarding = assincrono(async (req, res) => {
  const rascunho = await profilesService.salvarPassoDoOnboarding(Number(req.params.id), req.session.usuarioId, {
    passo: req.body.passo,
    resposta: req.body.resposta,
  });
  res.json(rascunho);
});

export const salvarOnboarding = assincrono(async (req, res) => {
  const { apelido, avatar, objetivo, nivel, tempo } = req.body;
  // Um único dia marcado chega como string; a normalização de verdade é do
  // service, aqui só se garante que ele sempre receba lista.
  const dias = req.body.dias === undefined ? [] : [].concat(req.body.dias);
  // O corpo da conclusão é o mesmo objeto de respostas do wizard, com uma chave
  // por passo: `tempo` e `preferencias` chegam com o nome do passo, não com o
  // nome da coluna. Quem veio passo a passo já gravou os dois, e mandá-los de
  // novo só regrava o mesmo valor.
  const preferencias = req.body.preferencias === undefined ? undefined : [].concat(req.body.preferencias);

  const resultado = await profilesService.salvarOnboarding(Number(req.params.id), req.session.usuarioId, {
    apelido,
    avatar,
    objetivo,
    nivel,
    dias,
    minutosPorSessao: tempo === undefined ? undefined : Number(tempo),
    preferencias,
  });
  req.session.onboardingConcluido = true;

  if (querJson(req)) return res.json({ mensagem: 'Onboarding salvo com sucesso', ...resultado });
  res.redirect('/painel');
});
