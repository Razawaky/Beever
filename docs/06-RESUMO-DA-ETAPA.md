# E06 em uma página

A E06 construiu o motor de recompensas, que é o coração do jogo, e foi feita antes dos jogos justamente para que todo jogo use o mesmo contrato. Foram oito tarefas, oito commits, e a suíte saiu de 349 para 395 testes.

Tudo começou tirando os números do código. A tabela `reward_configs` existia desde a E01 com 54 linhas semeadas e nenhum service a lia, e a tabela nova `reward_modifiers` passou a guardar o corte da repetição, porque os 25% da RN-008 também são valor de recompensa e a RN-006 proíbe valor de recompensa escrito à mão. Quanto uma célula paga depende do tipo de jogo, da faixa da célula e das estrelas, e quem responde isso é o `rewardConfigsRepository`.

Sobre essa base vieram os três services de crédito, um por recompensa, sem nenhum deles pagar o que é do outro. O `levelsService` calcula o XP, resolve a subida de nível pela curva do banco e devolve o bônus do degrau sem creditá-lo; o `pointsService` faz o pólen; o `coinsService` faz o mel, valida saldo e é quem paga o bônus de nível, porque mel entra por uma porta só. Repetir uma célula rende 25% de XP, zero pólen e zero mel.

O `gameSessionService` juntou tudo. A partida abre com um token gerado no servidor e devolve o conteúdo sem o gabarito, fecha conferindo as respostas contra o gabarito do banco e paga as três recompensas na mesma transação, com a duração calculada pelo próprio banco. Nada que venha do navegador entra na conta, nem pontuação, nem estrelas, nem tempo, e é isso que fecha a RN-007 e a RF-CON-04.

Depois vieram as duas garantias que faltavam. A idempotência ganhou mecanismo próprio, com a chave reservada dentro da transação da operação, e passou a valer para a partida e também para a compra, que até então debitava duas vezes em dois cliques. E todo crédito passou a deixar rastro com o saldo antes e depois em trilha imutável, incluindo a partida e o XP inicial do onboarding, que creditavam sem qualquer registro.

A etapa fecha com o critério de aceite exercido de verdade: cinco conclusões da mesma partida disparadas em paralelo creditam exatamente uma vez, e o mesmo vale para cinco compras simultâneas com a mesma chave. Foi a primeira vez que o projeto exerceu concorrência real. A auditoria da etapa apontou dez lacunas, três de risco médio que já foram corrigidas e sete de risco baixo com etapa marcada, e o detalhe de cada uma está em `docs/06-AUDITORIA-DA-ETAPA.md`.

O que a E06 não entregou, e é bom saber antes da E07: nenhuma tela mostra recompensa, porque rota e tela de jogo são da etapa seguinte, e cinco dos seis tipos de jogo ainda não têm validador, então só uma das 24 células semeadas é jogável hoje.
