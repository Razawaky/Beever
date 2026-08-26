# Auditoria da E11 — Landing page

**Data:** 2026-08-26 · **Revisor:** o mesmo que escreveu a etapa, no papel de
revisor · **Suíte no fechamento:** 765 testes passando.

## Como esta auditoria foi feita

A etapa foi verificada contra o aceite do roadmap, os requisitos RF-LAN-01 a 05,
RNF-03 e RNF-20 a 26, mais os RNF-33 a 36 que a T-11.6 trouxe junto. O checklist
de aceite visual da seção 8 do `docs/04-DESIGN-SYSTEM-E-LANDING.md` foi aplicado;
o checklist de banco da seção 8 do `docs/03` não se aplica, porque a etapa não
toca schema. A conferência foi feita lendo o código e o CSS compilado, e não o
que o estado do projeto afirma.

## Requisitos

| Requisito | Status | Onde | Teste |
|---|---|---|---|
| RF-LAN-01 página pública com identidade, favos e animação | atendido e testado | `pages/home.ejs`, `partials/landing/*`, `styles/landing.css` | `landing.test.js`, `movimentoDaLanding.test.js` |
| RF-LAN-02 CTA de registro nas seções relevantes | atendido e testado | cabeçalho, herói, como-funciona, economia, chamada-final, rodapé | `landing.test.js` |
| RF-LAN-03 as dez seções, na ordem | atendido e testado | `home.ejs` | `landing.test.js` |
| RF-LAN-04 responsiva e acessível | parcial | classes responsivas nos partials | foco, alvo e títulos testados; 320 px não verificado em navegador |
| RF-LAN-05 respeita `prefers-reduced-motion` | atendido e testado | `landing.js`, `landing.css`, `acessibilidade.css` | `acessibilidadeDaLanding.test.js` |
| RNF-03 LCP, CLS e 60 fps | parcial | arte em WebP, dimensões declaradas, JS de 31,7 KB | peso medido; LCP, CLS e fps não medidos (DT-74) |
| RNF-20 de 320 px a desktop | atendido sem teste | grid e flex responsivos | nenhum |
| RNF-21 contraste AA | atendido e testado | tokens recalculados na T-11.7 | `contraste.test.js`, inclusive sob três tipos de daltonismo |
| RNF-22 alvo de toque | atendido e testado | `ui/botao.ejs`, `summary`, chaves do painel | `acessibilidadeDaLanding.test.js` |
| RNF-23 foco visível | atendido e testado | componente de botão e links | varredura de todo clicável |
| RNF-24 linguagem adequada | atendido sem teste | texto das seis seções | nenhum — rascunho de dev (DT-78) |
| RNF-25 nada só por cor | atendido e testado | semana, acordeão, chaves do painel | `acessibilidadeDaLanding.test.js` |
| RNF-26 movimento desligável | atendido e testado | painel e preferência do sistema | idem |
| RNF-33 a 36 dados, consentimento, moeda fictícia, sem anúncio | atendido e testado | `pages/privacidade.ejs`, `pais-e-escolas.ejs`, `env.js` | `privacidade.test.js` |

Camadas, recompensa no servidor, auditoria de mel e XP, transação e idempotência:
nada a apontar, porque a etapa não tem SQL, service nem movimentação de saldo.
Entrada validada e escapada: as duas páginas públicas não recebem entrada, e todo
texto sai por `<%=`.

## Lacunas encontradas, e o que foi feito

**L-1, bloqueante — corrigida.** Se a página abrisse com movimento reduzido, os
observadores de revelação nunca eram criados; religar o movimento pelo painel
devolvia o estado escondido das seções sem ninguém para revelá-las, e o conteúdo
sumia até recarregar. Os observadores passaram a ser ligados sempre, fora de
qualquer condição, e só a rolagem suave e o parallax dependem da escolha. O
contador, que é movimento feito em JavaScript, passou a conferir o estado antes
de contar. Coberto por teste de regressão.

**L-2, alto — corrigida.** O botão do painel era `fixed bottom-4 right-4` e ficava
por cima do "Continuar" da Colmeia, que é `fixed bottom-4` abaixo de `sm`. O
painel sobe para `bottom-24` no celular e volta a `bottom-4` a partir de `sm`.

**L-3, alto — corrigida.** O painel aparecia na tela de jogo, contra a regra da
seção 5 do design system. `renderizarPagina` ganhou a opção `comAcessibilidade`,
ligada por padrão, e a tela de célula a desliga.

**L-4, médio — segue aberta, por impossibilidade.** O aceite da etapa é "60 fps no
celular, sem layout shift, e utilizável com animação desligada". A terceira parte
está testada. As duas primeiras exigem navegador, que não existe neste ambiente. O
roteiro de medição está em `docs/MEDICAO-DE-PERFORMANCE.md` e a dívida é a DT-74.

**L-5, médio — corrigida.** Três imagens sem `width` e `height`, que é risco direto
de salto de layout: o logo do cabeçalho do app, o logo da tela de entrada e o
avatar do perfil.

**L-6, baixo — corrigida.** O título do painel era um `h2` e entrava no índice de
títulos de toda página; virou parágrafo, com o `aria-labelledby` intacto.

**L-7, baixo — corrigida.** `mask-image` sem prefixo deixava a coluna de mel como
um retângulo sólido no Safari anterior ao 15.4. As três propriedades ganharam a
versão `-webkit-`.

**L-8, baixo — corrigida.** O botão do painel tinha rótulo visível e rótulo
escondido ao mesmo tempo, e o leitor de tela lia os dois. Agora vale um por
largura de tela.

**L-9, baixo — corrigida.** O acordeão prometia abertura animada e abria seco. A
resposta entra deslizando, animando só `opacity` e `transform`, e a animação some
com o movimento desligado.

## Veredito

**Pode avançar, com uma ressalva que não é de código.** Os três itens de risco
alto e médio-baixo foram corrigidos na mesma sessão, com teste de regressão para
os três primeiros. Nenhum defeito de camada, de segurança ou de regra de negócio
foi encontrado — a etapa não toca essas frentes.

A ressalva é a L-4: **a E11 não pode ser declarada aprovada em performance** até
alguém rodar a medição em navegador. O aceite dela é um número, e o número não
existe. Tudo o mais está provado por teste.
