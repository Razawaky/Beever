# Medição de performance da landing

Este roteiro existe porque o ambiente de desenvolvimento onde a E11 foi escrita
não tem navegador, e número de performance sem navegador é chute. O que já foi
provado por teste automatizado está marcado abaixo; o que falta é medição, e
precisa de alguém com o Chrome aberto.

O orçamento é o da seção 6.4 do `docs/04-DESIGN-SYSTEM-E-LANDING.md`: LCP de até
2,5 s em 4G simulado, CLS perto de zero, 60 fps na rolagem, nenhuma imagem acima
de 200 KB e JavaScript da página abaixo de 30 KB não comprimido.

## O que já está provado por teste

O peso do JavaScript é conferido em `test/integration/movimentoDaLanding.test.js`,
somando `landing.js` e o Lenis contra o teto de 30.720 bytes. O contraste de toda
a paleta, inclusive sob deuteranopia, protanopia e tritanopia, é calculado em
`test/unit/contraste.test.js`. Foco visível, alvo de toque, ordem de títulos e o
controle de movimento são varridos em
`test/integration/acessibilidadeDaLanding.test.js`. A reserva de espaço das
imagens — que é o que evita salto de layout — é conferida em
`test/integration/landing.test.js`.

## Como medir o que falta

Suba a aplicação com `npm run dev` e abra `http://localhost:3000` no Chrome, numa
janela anônima para não pegar cache nem extensão.

Para o LCP, abra o painel Lighthouse, escolha o modo Navigation com preset
Mobile, marque "Simulated throttling" e rode. Anote LCP, CLS e o TBT. O elemento
que costuma ser o LCP aqui é a imagem da Beenie no herói, hoje um WebP de 33 KB.

Para os quadros por segundo, abra o painel Performance, comece a gravação, role a
página inteira de cima até o rodapé em velocidade normal e pare. Olhe a faixa de
Frames: barras vermelhas são quadros longos. O ponto mais provável de queda é a
seção do herói, onde as três camadas de parallax se movem juntas.

Repita as duas medições com "Reduzir movimento desta página" ligado, no rodapé, e
com a preferência de sistema de movimento reduzido ativada. Nos dois casos, o
esperado é que nada se mova e que os números melhorem.

## Onde anotar o resultado

Escreva os números em `docs/ESTADO-DO-PROJETO.md`, na seção da E11, e feche a
dívida DT-74. Se algum número estourar o orçamento, o primeiro suspeito é a
imagem do herói, e o segundo é o número de camadas em movimento simultâneo.
