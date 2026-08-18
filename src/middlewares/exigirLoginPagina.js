/**
 * Guarda de páginas HTML: sem sessão, manda para o login.
 *
 * Existe separado do `requireAuth` porque a resposta certa depende do cliente.
 * Uma rota JSON sem sessão devolve 401 e o cliente decide o que fazer; uma
 * página sem sessão precisa levar a pessoa para a tela de entrar — um 401 em
 * HTML é um beco sem saída.
 *
 * Estava declarado dentro de `src/routes/index.js`, o que escondia um guarda de
 * autenticação no meio do arquivo de rotas (dívida DT-07). Middleware mora em
 * `src/middlewares/`.
 */
export function exigirLoginPagina(req, res, next) {
  if (req.session?.usuarioId) return next();
  res.redirect('/login');
}
