# Acessibilidade e responsividade — T-14.7

**Data:** 2026-09-03 · **Requisitos:** RNF-20 a RNF-26 (mobile-first de 320 px,
contraste AA, alvo de 44 px, teclado com foco visível, linguagem da faixa, nada
só por cor, `prefers-reduced-motion`).

## O que passou a existir

Até aqui a acessibilidade era provada em duas telas. A T-11.7 tinha escrito o
`acessibilidadeDaLanding.test.js` para a landing e para a página de privacidade,
e o `contraste.test.js` julgava a paleta da identidade contra a WCAG e contra as
três formas de daltonismo. As outras trinta telas do projeto nunca tinham passado
por régua nenhuma.

O `acessibilidadeDasTelas.test.js` busca cada uma das trinta telas pelo HTTP, do
jeito que o navegador buscaria, com sessão de jogador e sessão de administrador,
e roda a mesma bateria em todas. São sete públicas, doze do jogador e onze do
painel administrativo. A varredura em si mora no `test/helpers/acessibilidade.js`,
que também passou a ser a casa da conta de contraste que o `contraste.test.js`
fazia por si.

A bateria pergunta se algum elemento apaga o foco do teclado, se botão alcança os
44 px de altura, se todo campo tem nome que o leitor de tela leia, se a ordem de
títulos dá para navegar por voz, se o par de cor escrito no mesmo elemento
alcança 4,5:1, se alguma largura fixa passa dos 320 px, se toda tabela tem
rolagem própria, se toda tela declara idioma e deixa ampliar, se o painel de
acessibilidade está presente com os quatro ajustes desligados, se cada folha de
estilo com animação atende quem pede menos movimento, e se os jogos de arrastar
chegam ao mesmo lugar por clique e por teclado.

## O achado da tarefa

Quatrocentos e onze elementos focáveis não tinham nenhuma indicação de foco. A
landing e a política tinham, porque a T-11.7 escreveu `focus-visible:outline` em
cada elemento delas à mão; o resto da aplicação, escrito antes, não tinha. A
navegação inteira do painel administrativo, os links de voltar, as caixas de
marcar do perfil e do cadastro: nada mostrava onde o teclado estava.

Escrever a classe em quatrocentos e onze lugares consertaria as telas de hoje e
deixaria a próxima tela nascer errada de novo, que foi exatamente o que
aconteceu depois da T-11.7. A correção é uma regra de base no `tema.css`, com
contorno de 3 px em âmbar e afastamento de 2 px, valendo para todo
`:focus-visible` do projeto. O teste mudou junto: em vez de cobrar a classe de
cada elemento, ele cobra que a regra exista e que ninguém escreva `outline-none`
sem pôr outro indicador no lugar. A mesma troca foi feita no teste da landing,
que continuaria exigindo a classe de elementos que já não precisam dela.

As outras cinco correções são pontuais. Os dois botões do cofre e o "Sair da
conta" da Colmeia ficavam abaixo dos 44 px e ganharam altura mínima. O campo de
arquivo da ilustração da atividade tinha só a legenda do grupo em volta, o que
faz o leitor de tela anunciar apenas "arquivo", e ganhou rótulo próprio. O
onboarding não tinha `h1` nenhum, então quem entra por leitor de tela chegava
numa página sem nome, e ganhou um título de leitura. Na trilha o título do favo
era `h3` logo abaixo do `h1` da página, um salto de nível; o `favo-card` passou a
receber o nível de quem o inclui, porque na Colmeia ele está mesmo abaixo de um
`h2` de seção e ali o `h3` estava certo.

## O que já estava certo

Nenhuma tela fixa largura maior que 320 px, toda tabela do painel administrativo
já rolava dentro do próprio invólucro, nenhuma trava o zoom do navegador, e todas
declaram `pt-BR`. Nenhum par de cor escrito num mesmo elemento reprova em AA, o
que era o risco real de uma paleta aprovada em tese e usada de qualquer jeito na
prática. O painel de acessibilidade, com movimento, contraste, tamanho de texto e
distração, já estava em toda tela com os quatro ajustes desligados por padrão, e
ausente só na tela de jogo, que é onde ele atrapalharia. Os jogos de arrastar já
nasceram feitos de botões, então arrastar sempre foi atalho e nunca requisito.

## O que esta tarefa não prova

A varredura é do HTML servido, sem navegador, e é honesto dizer o que isso
deixa de fora. Quebra de layout a 320 px de verdade, com fonte carregada e
conteúdo real, só se vê abrindo a página; o que está provado é que ninguém fixou
largura maior que a tela. Contraste de texto sobre fundo herdado de um elemento
ancestral também não é calculado, porque exigiria montar a árvore inteira do
documento: o que se julga é o par escrito no mesmo elemento. A altura de toque é
aceita por altura declarada ou por 12 px de espaço vertical, que com uma linha de
texto fecha os 44 px, mas quem passa raspando depende da fonte carregar. E a
RNF-24, sobre linguagem adequada à faixa etária, não é automatizável: continua
sendo leitura humana. Tudo isso está registrado como DT-121.

## Números

Trinta telas coletadas, quinze conferências rodando sobre todas elas, quinze
testes novos. Quatrocentas e onze faltas de foco corrigidas por uma regra de
base, e mais cinco correções pontuais em cinco arquivos de view. Suíte completa
em 1060 testes, sem falha.
