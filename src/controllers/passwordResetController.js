import * as passwordResetService from '../services/passwordResetService.js';
import { assincrono } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';
import { querJson } from '../utils/resposta.js';

/** Recuperação de senha: pedir o link e gravar a senha nova. As telas GET ficam no paginaController. */

export const solicitar = assincrono(async (req, res) => {
  await passwordResetService.solicitarRecuperacao(req.body.email);

  const validadeEmMinutos = passwordResetService.VALIDADE_DO_LINK_EM_MINUTOS;
  if (querJson(req)) {
    return res.json({ mensagem: 'Se existir uma conta com esse e-mail, mandamos um link.', validadeEmMinutos });
  }
  renderizarPagina(res, 'recuperar-senha', { titulo: 'Esqueceu a senha? — Beever', enviado: true, validadeEmMinutos });
});

export const redefinir = assincrono(async (req, res) => {
  const { token, senha, desconectarTodos } = req.body;
  await passwordResetService.redefinirSenha({ token, senha, desconectarTodos: Boolean(desconectarTodos) });

  if (querJson(req)) return res.json({ mensagem: 'Senha alterada' });
  res.redirect('/login?senha=alterada');
});
