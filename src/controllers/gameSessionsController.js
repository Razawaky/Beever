import * as gameSessionService from '../services/gameSessionService.js';
import { assincrono } from '../utils/erros.js';

/**
 * A partida, em JSON. Sem view: quem monta a tela é `src/public/js/quiz.js`.
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
  });
});

export const fechar = assincrono(async (req, res) => {
  const resultado = await gameSessionService.fechar(req.session.usuarioId, req.params.token, {
    respostas: req.body.respostas,
  });

  res.json(resultado);
});

export const abandonar = assincrono(async (req, res) => {
  res.json(await gameSessionService.abandonar(req.session.usuarioId, req.params.token));
});
