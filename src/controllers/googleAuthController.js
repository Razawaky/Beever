import * as googleAuthService from '../services/googleAuthService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';
import { iniciarSessaoLogin } from '../utils/sessaoLogin.js';

/** Login com Google: ida, volta e o fim do cadastro de quem ainda não tinha conta. */

export const iniciar = assincrono(async (req, res) => {
  const { endereco, state, codeVerifier } = await googleAuthService.iniciarLogin();
  req.session.google = { state, codeVerifier };
  res.redirect(endereco);
});

export const retorno = assincrono(async (req, res) => {
  const ida = req.session.google;
  delete req.session.google;

  // Quem cancela na tela do Google volta com `error` e sem código.
  if (req.query.error) return res.redirect('/login');

  const perfil = await googleAuthService.perfilDoRetorno({
    codigo: req.query.code,
    stateRecebido: req.query.state,
    ida,
  });
  const resultado = await googleAuthService.entrar(perfil);

  if (resultado.cadastroPendente) {
    req.session.cadastroGoogle = resultado.cadastroPendente;
    return res.redirect('/cadastro/google');
  }

  const { usuario } = resultado;
  await iniciarSessaoLogin(req, {
    usuarioId: usuario.id,
    email: usuario.email,
    ehAdmin: usuario.ehAdmin,
    perfilId: usuario.perfilId,
    onboardingConcluido: usuario.onboardingConcluido,
  });
  res.redirect(usuario.onboardingConcluido ? '/painel' : '/onboarding');
});

export const completarCadastro = assincrono(async (req, res) => {
  const pendente = req.session.cadastroGoogle;
  if (!pendente) return res.redirect('/login');

  const usuario = await googleAuthService.completarCadastro({
    ...pendente,
    apelido: req.body.apelido,
    dataNasc: req.body.data_nasc,
    consentimentoResponsavel: Boolean(req.body.consentimento_responsavel),
  });

  // A regeneração da sessão leva junto o cadastro pendente.
  await iniciarSessaoLogin(req, {
    usuarioId: usuario.id,
    email: usuario.email,
    ehAdmin: false,
    perfilId: usuario.idPerfil,
    onboardingConcluido: false,
  });

  if (querJson(req)) return res.status(201).json(usuario);
  res.redirect('/onboarding');
});
