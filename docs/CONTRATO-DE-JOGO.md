# Contrato de jogo

Todo jogo do Beever conversa com o servidor do mesmo jeito, e é isso que a RF-JOG-08 pede. Quem define o contrato é o código, em `src/services/validadoresDeJogo.js`; este documento explica o formato e usa o Quiz do Favo como exemplo pronto. Se um dia os dois discordarem, o código está certo e este texto está velho.

## O ciclo de uma partida

O jogador abre a partida em `gameSessionService.abrir`, que confere se a célula está liberada, recusa conteúdo que não dá para jogar e devolve três coisas: o token da partida, a célula e o conteúdo sem o gabarito. O front monta a tela com esse conteúdo e guarda o token.

Quando o jogador termina, o front chama `gameSessionService.fechar` com o token e a lista de respostas. O servidor busca o gabarito no banco, conta os erros, transforma erros em estrelas pela RN-030, paga XP, pólen e mel na mesma transação e devolve o resultado. A duração da partida é calculada pelo banco, a partir da hora de abertura.

O front nunca manda pontuação, estrelas, tempo ou quantidade de acertos. Se mandar, é ignorado: é a RN-007, e existe teste com esse nome. O token é gerado no servidor e vale uma vez só, então reenviar a mesma conclusão devolve o resultado já gravado em vez de pagar de novo.

## O que cada validador precisa ter

Um validador é um objeto no mapa `VALIDADORES`, indexado pelo slug do tipo de jogo em `game_types`, com três funções. `conferirForma(corpo)` recebe o `contents.body` e lança erro de validação quando o conteúdo não é jogável, seja porque falta gabarito, seja porque o gabarito está incoerente. `paraJogar(corpo)` devolve o mesmo conteúdo sem nada que entregue a resposta, e é o que vai para a tela. `validar(corpo, respostas)` devolve `{ erros, total }`, em que `total` é quantas decisões o jogo pediu e `erros` quantas saíram diferentes do gabarito.

O contrato é só esse. O que conta como erro é decisão de cada jogo: no quiz é a alternativa diferente da certa, no Arraste e Classifique será a carta na caixa errada, no Monte o Orçamento será a regra de distribuição não respeitada. Pergunta ou decisão deixada em branco conta como erro em todos eles, porque deixar em branco não pode valer estrela.

## O exemplo do quiz

O corpo do Quiz do Favo é `{ tipo, perguntas: [{ enunciado, alternativas, correta }] }`, com `correta` sendo o índice da alternativa certa dentro de `alternativas`. O `conferirForma` recusa conteúdo sem perguntas, pergunta com menos de duas alternativas e resposta certa fora da lista. O `paraJogar` devolve enunciado e alternativas, e deixa o `correta` para trás. O `validar` compara resposta a resposta, na ordem das perguntas.

## Estado salvo, que ainda não existe

A RF-JOG-07 prevê retomar uma partida interrompida, e é P1, planejada para a T-07.7. O lugar dela no contrato é uma quarta função opcional, `estadoParaSalvar(respostasParciais)`, e uma coluna de estado na partida. Nenhum jogo da E07 deve inventar seu próprio jeito de salvar antes disso: quem precisar guardar progresso parcial agora, guarda no navegador e assume que fechar a aba custa a partida.

## Como acrescentar um jogo

Escreva o validador no mapa, com as três funções, e um teste unitário dele em `test/unit/validadoresDeJogo.test.js`, que roda sem banco. Semeie o conteúdo em `scripts/seeds/`, no formato que o `conferirForma` aceita. Monte a tela e o JavaScript da página, que manda as respostas no formato que o `validar` espera. Nada além disso precisa mudar: o motor de recompensas já sabe pagar qualquer jogo, desde a E06.
