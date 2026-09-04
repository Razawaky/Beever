import * as gameSessionService from '../services/gameSessionService.js';
import { assincrono } from '../utils/erros.js';

/**
 * A partida, em JSON. Sem view: quem monta a tela é o JavaScript de cada jogo,
 * em `src/public/js/`.
 *
 * A página do jogo é só uma casca. Ela abre a partida por aqui, recebe token e
 * conteúdo juntos, e devolve as respostas no fim — então `GET` nunca cria
 * partida, e atualizar a tela não deixa rastro de partida abandonada.
 */

export const abrir = assincrono(async (req, res) => {
  const partida = await gameSessionService.abrir(req.session.usuarioId, Number(req.body.idCelula));

  res.status(201).json({
    token: partida.token,
    ehRepeticao: partida.ehRepeticao,
    celula: {
      id: Number(partida.celula.id),
      titulo: partida.celula.title,
      tipoDeJogo: partida.celula.game_type_slug,
    },
    conteudo: partida.conteudo,
    // O que o jogador já tinha decidido antes de a sessão ser interrompida
    // (RF-JOG-07). `null` quando a partida é nova.
    estado: partida.estado,
    retomada: partida.retomada,
  });
});

export const fechar = assincrono(async (req, res) => {
  const resultado = await gameSessionService.fechar(req.session.usuarioId, req.params.token, {
    respostas: req.body.respostas,
  });

  res.json(resultado);
});

/** Guarda o progresso parcial. É rascunho: nada aqui entra na conta da recompensa. */
export const salvarEstado = assincrono(async (req, res) => {
  res.json(await gameSessionService.salvarEstado(req.session.usuarioId, req.params.token, req.body.respostas));
});

export const abandonar = assincrono(async (req, res) => {
  res.json(await gameSessionService.abandonar(req.session.usuarioId, req.params.token));
});
