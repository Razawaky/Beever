import * as profilesRepository from '../repositories/profilesRepository.js';
import { assincrono } from '../utils/erros.js';
import { sincronizarPreferenciasDaSessao } from '../utils/preferenciasDeAcessibilidade.js';

/**
 * Traz as preferências de som e animação do perfil para a sessão.
 *
 * Só consulta o banco uma vez por persona: quando a sessão troca de perfil, ou
 * quando é antiga e ainda não tem o cache. As rotas que mudam as preferências
 * atualizam a sessão direto, para que a próxima página já nasça com a classe
 * certa sem esperar esta consulta.
 */
export const carregarPreferenciasDeAcessibilidade = assincrono(async (req, res, next) => {
  const usuarioId = req.session?.usuarioId;
  if (!usuarioId) return next();
  if (req.session.preferenciasCarregadasPara === Number(usuarioId)) return next();

  const perfil = await profilesRepository.buscarPorUsuario(usuarioId);
  sincronizarPreferenciasDaSessao(req, perfil);
  return next();
});
