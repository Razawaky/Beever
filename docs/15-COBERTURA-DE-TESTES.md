# Cobertura de testes — T-14.2

**Data:** 2026-08-31 · **Suíte no fechamento:** 1003 testes passando ·
**Requisito:** RNF-28 — 100% dos services de cálculo, rotas críticas com integração.

## O que existia antes

Nada. O projeto tinha 975 testes e **nenhuma medição**: sabia-se que passavam,
não se sabia o que tocavam. A primeira medição desta tarefa mostrou 97,42% de
linha e 86,30% de ramo nos services — bom de partida, e com o buraco exatamente
onde mais importa: os caminhos de recusa dos services que mexem em mel.

## Como se mede

`npm run test:cobertura`, que chama `scripts/cobertura.js`. Usa a cobertura
embutida no Node 22 (`--experimental-test-coverage`), sem dependência nova. O
arquivo é o único lugar onde mora a lista dos **services de cálculo**, e é ele
que o portão da T-14.5 vai chamar.

**Quem entra na lista:** service que decide um número que a criança vê ou gasta —
mel, pólen, XP, patrimônio, progresso, posição. São 24. Ficam de fora quem só
orquestra tela ou cadastro, quem é infraestrutura, e os repositories, cujo lugar
de prova é o teste de integração contra banco real. Piso global de aplicação
inteira foi recusado de propósito: ele deixa um service de mel ficar em 60% com
o total verde.

**Os três pisos.** Linha é 100% e não se negocia — linha que nenhum teste executa
é regra que ninguém provou. Ramo (91%) e função (99%) são catraca: o número é o
que a suíte alcança hoje e só sobe.

## O número

| | antes | depois |
|---|---|---|
| Linha | 97,42% | **100%** |
| Ramo | 86,30% | 92,06% |
| Função | 96,36% | 99,23% |

Sete services estão em 100% nos três: `achievementsService`, `coinsService`,
`comportamentosDoItem`, `criteriosDeConquista`, `eventosDeConquista`,
`patrimonyService`, `pointsService`, `purchasesService` e `taskProgressSources`.

## O que os testes novos provam

**As guardas de saldo** (`guardasDeSaldo.test.js`). Toda função que credita ou
debita começa recusando o que não é inteiro positivo, e nenhuma dessas recusas
era exercitada. São elas que impedem meio mel, mel negativo e `NaN` de chegarem
ao livro, onde não haveria como desfazer sem estorno à mão. Cobre também as duas
listas fechadas que a T-14.1 criou para os identificadores de SQL.

**A posse da partida** (`guardasDaPartida.test.js`). As quatro portas da partida
conferem que o token existe e que a partida é de quem está pedindo, e a suíte
sempre jogou com o dono do token. É o que impede alguém de fechar a partida de
outra criança e creditar o mel na própria conta. O arquivo prova também que
atividade removida no meio da partida derruba a partida em vez de fazer a conta
sobre conteúdo que não existe mais.

**O seed incompleto** (`recompensaSemConfiguracao.test.js`). As três contas de
recompensa decidiram pagar zero e gritar no log quando falta configuração, em vez
de estourar — o buraco é de administração e derrubar a partida da criança não o
conserta. Essa decisão existia só no papel. O arquivo apaga a linha, mede e
devolve: sem configuração do tipo de jogo, sem o modificador de repetição, sem o
item do escudo e com a tabela de níveis vazia.

**Os requisitos de item que o seed não usa** (`requisitosDeItem.test.js`).
`patrimonio-minimo` e `favo-concluido` existiam no código e nunca tinham sido
avaliados, e os dois ficam disponíveis para o painel cadastrar desde a T-12.3 —
é ali que um administrador cria a primeira linha de um tipo nunca exercitado.

**O prêmio que falha** (`ligaSemanal.test.js`). O pagamento do pódio é o único
ponto da liga que engole o próprio erro, porque um prêmio que falha não pode
impedir o fechamento da semana das outras trinta crianças. O `catch` existia só
no papel.

## Código morto encontrado pela medição

Oito exportações públicas sem um único chamador, removidas nesta tarefa:
`inventoryService.listarDoUsuario` e `.valorEmPatrimonio`,
`tasksService.listarTiposDisponiveis`, `progressService.recalcularFavo`,
`goalsService.listarRenovaveis` e `.atualizarProgresso`,
`economicCycleService.listarUltimos` e `levelsService.niveisDePartidaDisponiveis`.
Quatro delas eram invólucro de repository que o resto do código já chamava
direto. Foi a medição que as apontou: linha nunca executada por teste nenhum e,
na conferência, nunca executada por ninguém.

## Cobertura e cronômetro não se medem juntos

A instrumentação infla o tempo de resposta: a visita mais pesada do app passa de
1,2 s para mais de 2 s e reprova a própria RNF-01. Por isso `scripts/cobertura.js`
marca a execução com `MEDINDO_COBERTURA=1`, e `test/helpers/relogio.js` faz os
três testes de tempo se pularem — ou, no caso do aceite da economia, pularem só a
asserção do cronômetro, porque os casos seguintes dependem daquela visita ter
acontecido. **Quem cobra o teto da RNF-01 é `npm run test:db`.**

## O que falta para 100% de ramo, e por quê

Quinze services ficam entre 78% e 96% de ramo. O que sobra é de três famílias, e
nenhuma delas se fecha com teste honesto:

**Reserva que nunca dispara.** `valores[criterio] ?? 0`, `meu?.posicao ?? null`,
`item.purchase_price ?? item.current_value` — o lado direito só roda com o banco
num estado que as próprias consultas impedem. `conquistasDoJogador` (78,57%) é o
caso mais visível: os três ramos que faltam são reservas de dado que sempre vem.

**Parâmetro com padrão.** `limite = 30`, `conexao = null`, `agora = new Date()` —
cada padrão é um ramo, e chamar a função das duas formas só para marcar o número
é teste sem afirmação.

**Falha de infraestrutura.** O `catch` que registra e segue quando o banco cai no
meio da operação. Forçá-lo exigiria mock, e este projeto testa contra banco real
de propósito.

A recomendação é manter a catraca em 91% e subir o número quando um caso de
negócio novo cobrir um desses ramos naturalmente — não escrever teste para
persegui-lo.

## O que esta tarefa não cobre

Cobertura de repositories e de views, que não entram no piso da RNF-28. Cobertura
de mutação, que é o que de fato mede se a asserção existe. E o portão no
pipeline, que é a T-14.5: aqui o comando existe e reprova com código de saída 1;
falta alguém chamá-lo no CI.
