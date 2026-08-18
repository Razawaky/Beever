/**
 * Renderiza uma página dentro do layout base.
 *
 * Existe para que nenhum controller precise saber que existe um `layout.ejs`
 * nem lembrar de passar `classeBody`, `scripts` e companhia. O controller diz
 * qual página quer e com quais dados; o resto tem padrão.
 *
 * @param {import('express').Response} res
 * @param {string} pagina nome do arquivo em `views/pages`, sem extensão
 * @param {object} dados o que a página precisa, mais as opções de layout abaixo
 */
export function renderizarPagina(res, pagina, dados = {}) {
  const {
    classeBody = 'min-h-screen bg-white text-tinta antialiased',
    comCabecalho = false,
    comRodape = false,
    dadosBody = {},
    scripts = [],
    ...conteudo
  } = dados;

  return res.render('layout', {
    pagina: `pages/${pagina}`,
    classeBody,
    comCabecalho,
    comRodape,
    dadosBody,
    scripts,
    ...conteudo,
  });
}
