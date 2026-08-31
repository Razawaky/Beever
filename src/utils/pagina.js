import { iconeDaConquista } from '../config/conquistas.js';
import { classeDaBarra } from './barraDeProgresso.js';

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
    // A tela de jogo é a única que pede o contrário: nada clicável fora do jogo
    // (seção 5 do design system). Todas as outras trazem o painel.
    comAcessibilidade = true,
    dadosBody = {},
    scripts = [],
    ...conteudo
  } = dados;

  return res.render('layout', {
    pagina: `pages/${pagina}`,
    // Disponível em toda página: barra de progresso aparece no painel e nas
    // metas, e nenhuma das duas pode escrever largura em atributo `style`.
    classeDaBarra,
    // Também global: a conquista aparece na Colmeia e na tela dela, e o ícone
    // tem um lugar só de troca (DT-103).
    iconeDaConquista,
    classeBody,
    comCabecalho,
    comRodape,
    comAcessibilidade,
    dadosBody,
    scripts,
    ...conteudo,
  });
}
