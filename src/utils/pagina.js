import { statSync } from 'node:fs';

import { classeDeCorDeFundoDoAvatar } from '../config/avatar.js';
import { iconeDaConquista } from '../config/conquistas.js';
import { svgIcone } from '../public/js/icones.js';
import { classeDaBarra } from './barraDeProgresso.js';
import { preferenciasDaSessao } from './preferenciasDeAcessibilidade.js';

/**
 * A URL dos estilos leva o horário de modificação do arquivo: assim uma
 * alteração no bundle chega ao navegador mesmo quando ele guardou a folha em
 * cache.
 */
function versaoDoAsset(caminho) {
  return Math.floor(statSync(new URL(`../public${caminho}`, import.meta.url)).mtimeMs);
}

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
    estilosExtras = [],
    ...conteudo
  } = dados;

  const preferencias = preferenciasDaSessao(res.req);
  const classesAcessibilidade = [
    preferencias.animacaoReduzida ? 'a11y-movimento-reduzido' : null,
    preferencias.transicoesSuaves ? 'transicoes-suaves' : null,
    !preferencias.somAtivo ? 'a11y-sem-som' : null,
  ]
    .filter(Boolean)
    .join(' ');

  // O token CSRF passa a valer para o script do painel também: quando a
  // preferência é da conta, o clique precisa avisar o servidor. Quem já passa
  // `dadosBody` continua mandando no próprio valor.
  const dadosDoCorpo = {
    ...(res.locals?.csrfToken ? { 'csrf-token': res.locals.csrfToken } : {}),
    ...dadosBody,
  };
  if (preferencias.logado) {
    dadosDoCorpo['preferencias-perfil'] = preferencias.chavesGerenciadas.join(' ');
  }

  return res.render('layout', {
    pagina: `pages/${pagina}`,
    versaoDoCss: versaoDoAsset('/css/app.css'),
    estilosExtras: estilosExtras.map((caminho) => `${caminho}?v=${versaoDoAsset(caminho)}`),
    scripts: scripts.map((caminho) => `${caminho}?v=${versaoDoAsset(caminho)}`),
    // Disponível em toda página: barra de progresso aparece no painel e nas
    // metas, e nenhuma das duas pode escrever largura em atributo `style`.
    classeDaBarra,
    // Também global: a conquista aparece na Colmeia e na tela dela, e o ícone
    // tem um lugar só de troca (DT-103).
    iconeDaConquista,
    classeDeCorDeFundoDoAvatar,
    // Os SVGs são montados aqui, e não só em `app.locals`, para que até a tela
    // de erro — renderizada por um app mínimo nos testes — encontre o helper.
    svgIcone,
    classeBody,
    classesAcessibilidade,
    comCabecalho,
    comRodape,
    comAcessibilidade,
    dadosBody: dadosDoCorpo,
    ...conteudo,
  });
}
