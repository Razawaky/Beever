# Auditoria da E10 — Colmeia (Home)

Laudo de 2026-08-25, no formato do da E09. A etapa foi auditada por quem a
escreveu, com a instrução de ser cético com o próprio trabalho. Três lacunas
foram corrigidas na mesma sessão e estão marcadas abaixo; as outras viraram
dívida registrada.

Uma ressalva de método: o grafo do projeto está construído no commit `dab8433`,
anterior à etapa inteira, então ele não enxerga `homeService`, `card-meta`,
`card-tarefa` nem `botao-continuar`. A verificação foi feita lendo o código e
rodando a suíte, e não confiando no grafo.

## Requisitos

| Requisito | Status | Onde está / teste |
|---|---|---|
| RF-HOM-01 nível e barra de XP | atendido e testado | `cabecalho-colmeia.ejs`, `barra-progresso.ejs`; `cabecalhoDaColmeia.test.js` |
| RF-HOM-02 saldo de mel e patrimônio | atendido e testado | `badge-recurso.ejs`, `homeService.obterColmeia`; `cabecalhoDaColmeia.test.js`, `colmeia.test.js` |
| RF-HOM-03 sequência com dias marcados | atendido e testado | `calendario-semana.ejs` no topo; `cabecalhoDaColmeia.test.js` |
| RF-HOM-04 meta mais próxima do vencimento | atendido e testado | `goalsService.resumirMeta`, `card-meta.ejs`; `resumoDeMetas.test.js`, `metaDaColmeia.test.js` |
| RF-HOM-05 outras metas resumidas | atendido e testado | `homeService.obterColmeia`, `painel.ejs`; `metaDaColmeia.test.js` |
| RF-HOM-06 trilha em hexágonos com estado | atendido e testado | `homeService.marcarFocoDaTrilha`, `favo-card.ejs`; `focoDaTrilha.test.js`, `trilhaDaColmeia.test.js` |
| RF-HOM-07 botão "Continuar" | atendido e testado | `contentService.proximaCelulaPendente`, `botao-continuar.ejs`; `continuarDaColmeia.test.js`, que abre o destino e exige 200 |
| RF-HOM-08 tarefas do dia | atendido e testado | `tasksService.resumirTarefa`, `card-tarefa.ejs`; `tarefasDaColmeia.test.js` |
| RF-HOM-09 aviso do evento econômico | atendido e testado | `economicCycleService.avisoDoDia`; `avisoDoCiclo.test.js` |
| RNF-01 página em até 2 s | atendido e testado | `aceiteDaColmeia.test.js` — 87 a 102 ms com 60 células, 50 concluídas e 12 itens |
| RNF-04 sem consulta N+1 | parcial | provado na Colmeia (`aceiteDaColmeia.test.js`, `colmeia.test.js`); loja e inventário, que o mesmo requisito cita, seguem sem medição |
| RNF-11 sem estilo na marcação | atendido e testado | largura por classe `barra-N`; as quatro telas afirmam `doesNotMatch(/style="/)` |
| RNF-25 estado nunca só por cor | atendido e testado | urgência da meta e estado do favo com ícone e palavra; `metaDaColmeia.test.js`, `trilhaDaColmeia.test.js` |

## O que estava certo

Nenhuma SQL fora de repository, nenhuma regra de negócio nova em controller ou
view, nenhum `<%- %>` com dado de usuário, nenhuma cor literal nas views novas,
nenhum contorno preto e todo número de dinheiro tabular. A aritmética de meta e
de tarefa saiu do EJS para os services donos de cada assunto. O redirecionamento
depois de receber a recompensa passa por lista branca, e o caso de destino
forjado tem teste. A etapa não tocou no banco: nenhuma migration, nenhuma
coluna, e a DT-63 foi paga lendo uma coluna que já existia.

## Lacunas corrigidas na mesma sessão

**A Colmeia perdeu o `<h1>`.** Antes da T-10.2 o apelido era o `h1` da página;
o cabeçalho novo o escreve como parágrafo, e nenhum outro elemento assumiu o
lugar. Todas as outras telas do jogo têm um. Quem navega por cabeçalhos com
leitor de tela chega à tela mais visitada do produto sem título de página, e a
hierarquia começa direto em `h2`. É regressão introduzida por esta etapa.
Corrigida: o apelido voltou a ser `h1` no cabeçalho, e o caso virou teste — as
quatro telas autenticadas foram conferidas com o servidor de pé e todas têm um.

**Existem duas orquestrações de chegada do jogador.** `homeService.prepararVisita`
faz seis passos, e `paginaController.metas` repete cinco deles à mão, sem o
ciclo econômico. Quem entra por `/metas` tem meta e tarefa sincronizadas, mas
vê o saldo de antes das contas da semana — que é a DT-59, ainda aberta. O risco
não é o de hoje, é o da próxima mudança: alterar a ordem em um lugar e esquecer
o outro produz divergência silenciosa entre duas telas do mesmo jogo. Corrigida:
a tela de metas e a de perfil passaram a chamar `prepararVisita`, então a
chegada do jogador tem uma dona só. A DT-59 encolheu — loja, inventário, cofre e
trilha continuam sem processar o ciclo — mas deixou de ser código duplicado.

**O vocabulário de estado do favo vazou do dono.** `contentService` exporta
`ESTADOS`, e mesmo assim a string `'disponivel'` aparecia escrita à mão no
`homeService`, no `paginaController` e em duas views. Corrigida: a trilha e a
lista de células passaram a devolver `aberto` e `aberta` prontos, e nenhuma view
ou controller compara estado com texto.

## Lacunas que viraram dívida

**A Colmeia custa sessenta consultas por visita.** Nenhuma cresce com favo,
célula ou item, e isso está provado; mas perfil, faixas etárias e a curva de
níveis são lidos por mais de um service na mesma requisição. Está dentro do
RNF-01 com folga de vinte vezes, então não é urgente — é a DT-72.

**A tela de perfil ficou para trás.** Ela continua calculando o percentual da
meta dentro do EJS, exatamente a aritmética que a T-10.3 tirou da Colmeia e da
tela de metas. Três telas mostram meta, e duas delas falam a mesma língua.

**Nada foi visto em navegador real.** O topo grudado rolando, a serpentina da
trilha a 320 px, o botão fixo sobre o fim da página e o foco de teclado
passeando por sete blocos seguem sem olho humano. É a DT-22, que atravessa o
projeto desde a E02 e agora cobre a tela mais importante dele.

## Veredito

**Pode avançar, zero bloqueantes.** O aceite da etapa está provado com jogador
avançado, os nove requisitos da Colmeia têm tela e teste, e nenhuma lacuna
compromete dado, saldo ou segurança. As três de conserto barato foram fechadas
na mesma sessão; as restantes têm dono registrado na dívida técnica, e a maior
delas continua sendo a DT-22, que é olhar as telas num navegador de verdade.
