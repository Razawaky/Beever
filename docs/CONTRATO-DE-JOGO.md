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

## O exemplo do Arraste e Classifique

O corpo do segundo jogo é `{ tipo, enunciado, categorias: [{ id, nome }], cartas: [{ texto, categoria }] }`, em que `categoria` é o `id` da caixa certa daquela carta. O `conferirForma` exige pelo menos duas caixas com identificadores diferentes e recusa carta cuja caixa certa não está na lista. O `paraJogar` entrega as caixas inteiras — o jogador precisa vê-las — e das cartas devolve só o texto. As respostas chegam como lista de `id` de caixa, uma por carta, na ordem em que as cartas foram enviadas, e carta sem caixa nenhuma conta como erro.

Vale notar que a resposta deste jogo não é número, e sim texto: o contrato nunca prometeu número, prometeu uma decisão por item na ordem em que o conteúdo foi enviado.

## O exemplo do Monte o Orçamento

O corpo do terceiro jogo é `{ tipo, enunciado, total, passo, categorias: [{ id, nome, minimo, maximo, dica }] }`, e a resposta é a lista de números, um por categoria, na ordem enviada. O `conferirForma` exige que o passo caiba no total um número exato de vezes e recusa orçamento cujas regras não fecham — soma dos mínimos acima do total, ou soma dos máximos abaixo dele —, porque nesse conteúdo nenhuma divisão zeraria os erros. O `validar` conta um erro por categoria fora da faixa e mais um quando a soma não bate com o total, então `total` é o número de categorias mais um.

Este é o único jogo sem gabarito escondido, e o `paraJogar` devolve as regras inteiras: aqui a regra é o enunciado, não a resposta. Esconder o mínimo de cada categoria não tornaria o jogo mais honesto, tornaria-o impossível.

## O exemplo do Cofre do Tempo

O corpo do quarto jogo é `{ tipo, enunciado, nomeDoCiclo, entradaPorCiclo, minimoPorCiclo, taxaPorCiclo, ciclos, meta }`, e a resposta é a lista de depósitos, um por ciclo. O saldo é calculado com o depósito entrando no começo do ciclo e o rendimento caindo no fim, arredondado para baixo a cada ciclo — é isso que faz guardar cedo render mais do que guardar tarde, que é a lição do jogo. O `validar` conta um erro por ciclo cujo depósito fura a regra e mais um se a meta não vier, então `total` é o número de ciclos mais um. Ciclo inválido perde o depósito daquele ciclo, mas o tempo passa: o que já estava guardado rende assim mesmo.

Como no orçamento, o `conferirForma` recusa conteúdo sem decisão possível: meta que nem guardando tudo se alcança, e meta que guardar o mínimo já alcança. A mesma conta do saldo existe no `public/js/cofre.js`, porque a tela projeta a curva enquanto o jogador decide; se uma das duas mudar, a outra muda junto.

## O exemplo do Mercado Esperto

O corpo do quinto jogo é `{ tipo, rodadas: [{ enunciado, unidade, opcoes: [{ texto, preco, quantidade }] }] }`, e a resposta é a lista de índices de opção, um por rodada. A diferença dele para os outros é que **o gabarito não está escrito no conteúdo**: a melhor compra é a de menor preço por unidade, calculada a partir dos dois números. Assim nenhum conteúdo consegue declarar uma "melhor compra" que a conta desmente. O `conferirForma` recusa rodada com menos de duas opções, preço ou quantidade que não sejam positivos, e empate no primeiro lugar — empate daria duas respostas certas e a contagem passaria a depender de qual delas o jogador marcou.

O `paraJogar` entrega preço e quantidade inteiros, porque fazer essa conta é o jogo; o que a tela nunca mostra é o preço por unidade já calculado.

## O exemplo do Ordene a Prioridade

O corpo do sexto jogo é `{ tipo, enunciado, itens: [{ id, texto, ordem }] }`, com `ordem` indo de 1 até a quantidade de itens, sem repetir, e a resposta é a lista de `id` na ordem escolhida pelo jogador. O `paraJogar` devolve os itens **embaralhados** e sem `ordem` — mandá-los na ordem em que estão no conteúdo entregaria a resposta.

O erro é contado **por par invertido**, e não por posição fora do lugar: com quatro itens são seis pares, trocar dois vizinhos custa um erro e inverter a lista inteira custa seis. Contar por posição faria mover um item empurrar todos os outros, e uma bobagem viraria nota zero — o oposto da RN-030. Item que o jogador não ordenou fica depois de todos, então perde os pares dele.

## Estado salvo, que ainda não existe

A RF-JOG-07 prevê retomar uma partida interrompida, e é P1, planejada para a T-07.7. O lugar dela no contrato é uma quarta função opcional, `estadoParaSalvar(respostasParciais)`, e uma coluna de estado na partida. Nenhum jogo da E07 deve inventar seu próprio jeito de salvar antes disso: quem precisar guardar progresso parcial agora, guarda no navegador e assume que fechar a aba custa a partida.

## Como acrescentar um jogo

Escreva o validador no mapa, com as três funções, e um teste unitário dele em `test/unit/validadoresDeJogo.test.js`, que roda sem banco. Semeie o conteúdo em `scripts/seeds/`, no formato que o `conferirForma` aceita. Monte a área da tela em `src/views/partials/jogos/` e o JavaScript dela em `src/public/js/`, que manda as respostas no formato que o `validar` espera; a casca em volta — cabeçalho, carregando, erro, barra e resultado — já existe em `pages/celula.ejs` e em `public/js/partida.js`, e o mapa de qual jogo usa qual das duas está no `paginaController`. Nada além disso precisa mudar: o motor de recompensas já sabe pagar qualquer jogo, desde a E06.
