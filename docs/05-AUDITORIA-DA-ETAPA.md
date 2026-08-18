# Auditoria da E05 — conteúdo e trilha

**Data:** 2026-08-18 · **Branch:** `refactor/arquitetura-em-camadas` ·
**Commit auditado:** `84aa1fa` · **Papel:** revisor, não autor.

Critério de aceite do `02-ROADMAP-ETAPAS.md`: *"trilha navegável com estados
corretos e impossível burlar pré-requisito via URL"*. Requisitos declarados:
RF-CON-01 a 06, RN-025 a 029.

Desta vez a auditoria mediu em vez de supor onde deu para medir — a segunda
passagem da E04 ensinou que suspeita não conferida vale pouco, e que às vezes a
medição desmente o auditor.

Nada foi corrigido aqui. Este documento é diagnóstico.

---

## 1. Requisito a requisito

| Requisito | Status | Onde está | Prova |
|---|---|---|---|
| RF-CON-01 Listar favos com progresso e requisitos visíveis | **atendido e testado** | `contentService.listarTrilha`, `views/pages/trilha.ejs`, `partials/ui/favo-card.ejs` | `trilha.test.js`, `telasDaTrilha.test.js`: "a trilha mostra os dois favos, um aberto e um travado com o motivo escrito" |
| RF-CON-02 Listar células do favo com estado e estrelas | **atendido e testado** | `contentService.listarCelulasDoFavo`, `views/pages/favo.ejs` | `telasDaTrilha.test.js`: "concluir a primeira célula troca o botão para Repetir" confere as três estrelas em texto |
| RF-CON-03 Abrir célula respeitando pré-requisitos | **atendido e testado** | `contentService.abrirCelula`, e a mesma checagem em `progressService.registrarTentativa` | `aceiteDaTrilha.test.js`: "célula travada não abre por porta nenhuma" |
| RF-CON-04 Registrar progresso por célula (tentativas, erros, estrelas, **tempo**) | **parcial** | `progressService.registrarTentativa` grava tentativas, erros e estrelas em `cell_progress` | `progressoDaTrilha.test.js`, `repositories/progresso.test.js`. **Tempo não é gravado por ninguém hoje** — ver L-2 |
| RF-CON-05 Tela de resultado com estrelas, XP, mel, pólen | **não atendido** | — | Depende do motor de recompensas (E06) e da tela de jogo (E07). Decisão registrada na T-05.4 |
| RF-CON-06 Filtrar conteúdo por faixa de idade | **atendido e testado** | `contentService.faixasVisiveis`, filtro em SQL no favo **e** na célula | `faixaEtaria.test.js`: três jogadores de 7, 10 e 14 anos veem 2, 4 e 6 favos |
| RF-CON-07 Célula de revisão a partir dos erros (P1) | **não atendido** | erros já são acumulados em `cell_progress.errors` | P1 declarado no requisito; a matéria-prima existe |
| RN-025 Hierarquia favo → célula → conteúdo | **atendido e testado** | quatro repositories da T-05.1 | `repositories/conteudo.test.js` |
| RN-026 Células sequenciais, 1 estrela libera a próxima | **atendido e testado** | `contentService.estadosDasCelulas` | `contentService.test.js` (unitário, inclusive "tentativa sem estrela não conta") e `trilha.test.js` |
| RN-027 80% do favo libera o seguinte | **atendido e testado** | `contentService.estadoDoFavo` + `progressRepository.recalcularFavo` | `aceiteDaTrilha.test.js`: "60% não libera o favo seguinte; 80% libera" — com **dado real**, depois que a T-05.6 achou que isso nunca havia sido exercido |
| RN-028 Requisito de patrimônio ou item | **atendido e testado** | `contentService.estadoDoFavo` | `aceiteDaTrilha.test.js` e `trilha.test.js`. Patrimônio conta só inventário (DT-35) |
| RN-029 Só a própria faixa e as anteriores | **atendido e testado** | filtro em `hivesRepository.listarPorFaixas` e `cellsRepository.listarDoFavoComProgresso` | `faixaEtaria.test.js`: inclusive "célula de faixa acima não aparece nem entra na conta do favo" |

**Critério de aceite da etapa:** atendido. A trilha navega com os estados certos,
e o pré-requisito é recusado nas três portas que existem hoje — abrir pelo
service, mandar resultado, e pedir a lista pelo endereço.

---

## 2. Verificações estruturais

| Item | Veredito |
|---|---|
| Camadas respeitadas | **ok** — `grep` por SQL em `src/services`, `src/controllers`, `src/routes` e `src/views` não retorna nada |
| Regra fora de service | **ok** — as views recebem `estado` e `motivo` prontos e só escolhem aparência |
| Cálculo de recompensa só no servidor | **não se aplica** — a E05 não paga nada, de propósito; `progressService` devolve `ehRepeticao` para a E06 decidir |
| Auditoria em mudança de saldo | **não se aplica** — nenhum saldo se move nesta etapa |
| Transação onde importa | **ok** — tentativa e recálculo do favo na mesma transação, e a leitura pós-escrita usa a mesma conexão |
| Idempotência | **ok pelo desenho** — o percentual é sempre recontado das células, então repetir o recálculo não acumula erro. Token de sessão é T-06.6 |
| Validação de entrada | **parcial** — ver L-3: `/trilha/:id` não valida o parâmetro |
| Escape na view | **ok** — `trilha.ejs`, `favo.ejs` e `favo-card.ejs` só usam `<%= %>`; `<%- %>` aparece apenas em `include` |
| Prepared statements | **ok** — inclusive nos `IN (?)`, montados com marcadores e nunca por concatenação de valor |
| Testes | **347 passando, 0 falhando**; `npx eslint src test` sai 0 |

### Desempenho — uma suspeita medida e descartada

O caminho de `registrarTentativa` chama `abrirCelula`, que chama
`listarCelulasDoFavo`, que chama `listarTrilha` — mais de uma dúzia de consultas
por conclusão de célula, com perfil e faixas lidos três vezes. Parecia lacuna de
desempenho (RNF: jogo abaixo de 1 s). **Medido, com banco real e faixa C (seis
favos): `listarTrilha` custa 6,3 ms e `registrarTentativa` custa 21,7 ms.** Não é
problema de desempenho; é redundância, e fica registrada como L-6, de risco
baixo, para quando a trilha crescer.

---

## 3. Lacunas, em ordem de risco

| # | Lacuna | Risco | Onde |
|---|---|---|---|
| L-1 | **O botão "Jogar" leva a 404.** A lista de células aponta para `/trilha/:idFavo/celula/:idCelula`, e essa rota não existe — a tela de jogo é E07. O jogador que chegar à trilha hoje encontra a ação principal quebrada. Não bloqueia a E06, mas bloqueia qualquer demonstração | alto | `src/views/pages/favo.ejs`, sem rota correspondente em `src/routes/index.js` |
| L-2 | **O tempo da RF-CON-04 não é gravado por ninguém.** A decisão de deixá-lo em `game_sessions.duration_seconds` está registrada e é defensável, mas a coluna continua vazia e nenhuma tarefa da E05 a preenche: o requisito da etapa fica pela metade até a T-06.5 | médio | `src/services/progressService.js`, `game_sessions` |
| L-3 | **`/trilha/:id` não valida o parâmetro.** Todas as outras rotas com `:id` usam `param('id').isInt({ min: 1 })` + `validate`; esta confia no `Number()` do controller, e um id inválido vira `NaN` que só falha lá adiante. Não vaza dado nem quebra, mas é a DoD ("toda entrada validada") não cumprida e uma inconsistência que alguém vai copiar | médio-baixo | `src/routes/index.js:43` |
| L-4 | **`cellsRepository.contarDoFavo` não filtra faixa e não é usado em produção.** Sobrou da T-05.1: hoje só um teste o chama. Quem o usar amanhã terá um denominador que ignora a RN-029 — exatamente o defeito que a T-05.5 corrigiu nas outras consultas | baixo | `src/repositories/cellsRepository.js:88` |
| L-5 | **Favo travado responde com a página de erro genérica.** O motivo aparece ("Conclua 80% do favo anterior"), o que já é melhor que um 403 seco, mas o único botão é "Voltar para o início" em vez de voltar à trilha, e a criança recebe o número do status na tela | baixo | `src/views/pages/erro.ejs` |
| L-6 | **Perfil e faixas são lidos três vezes por conclusão de célula.** `faixasDoJogador` roda duas vezes e `contextoDoJogador` uma. Medido: 21,7 ms — não é problema hoje, mas é trabalho repetido que cresce com o catálogo | baixo | `src/services/progressService.js`, `src/services/contentService.js` |
| L-7 | **O checklist visual não foi conferido em navegador.** Tokens, foco de teclado, `prefers-reduced-motion` e "ícone junto de cor" foram verificados por leitura do código; 320 px sem rolagem horizontal e contraste medido pedem navegador de verdade, e nenhuma das duas telas novas foi aberta em um | baixo | `src/views/pages/trilha.ejs`, `favo.ejs` |

---

## 3.1 O que já foi corrigido

Corrigido logo depois do laudo, no commit que o acompanha:

- **L-1** — a célula liberada mostra "em breve" em vez de um link para rota
  inexistente. A troca é uma constante no controller (`JOGO_DISPONIVEL`), que a
  E07 vira para `true` quando a tela de jogo existir. Teste: a página não contém
  `/celula/` em lugar nenhum.
- **L-3** — `/trilha/:id` ganhou `param('id').isInt({ min: 1 })` e `validate`,
  como todas as outras rotas com `:id`. Teste: `/trilha/abc` e `/trilha/0`
  respondem 422.

Seguem abertas L-2, L-4, L-5, L-6 e L-7, com o encaminhamento da seção 4.

---

## 4. Veredito da primeira passagem *(mantido — ver seção 5)*

**Pode avançar para a E06. Zero bloqueantes técnicos.**

Os doze requisitos da etapa estão atendidos e testados, com duas exceções
declaradas e datadas: a RF-CON-05 depende do motor de recompensas e da tela de
jogo, e a RF-CON-07 é P1. As camadas, o escape, os prepared statements e a
transação passaram na conferência.

**Com uma ressalva que não é técnica: a L-1 bloqueia demonstração.** A trilha é
navegável até o botão "Jogar", que hoje leva a 404. Enquanto a E07 não chega, a
correção honesta é o botão dizer "em breve" na célula sem jogo — o mesmo que a
tela já faz para célula sem conteúdo — em vez de prometer o que não existe.

Encaminhamento sugerido:

- **L-1** antes de qualquer apresentação; é meia hora de trabalho.
- **L-3** junto, porque é uma linha e fecha a DoD.
- **L-2** vira registro explícito na abertura da T-06.5, que é quem vai
  preencher a coluna.
- **L-4** some ou ganha o filtro, na mesma passada da L-1.
- **L-5, L-6, L-7** para a E10/E11, com o resto do trabalho de front — e a L-7
  precisa acontecer antes da entrega, não depois.

---

## 5. Segunda passagem — 2026-08-18, commit `299ef80`

Reauditoria depois das correções da seção 3.1, e desta vez com o checklist de
banco aplicado — a primeira passagem **pulou o passo 6 do roteiro de auditoria**,
embora a E05 tenha mexido em seed. Também é a passagem que finalmente olhou para
o que a tela escreve, e não só para o que o código decide.

### 5.1 O checklist de banco, que a primeira passagem não aplicou

A E05 não criou migration — só semeou conteúdo. O item que importa aqui é a
idempotência do seed, e ela foi **medida**: rodando `db:seed` duas vezes contra o
mesmo banco, as contagens ficam iguais — 6 favos, 24 células, 24 conteúdos antes
e depois. As `ON DUPLICATE KEY UPDATE` novas se apoiam em chaves que já existiam
(`uq_hives_slug`, `uq_cells_hive_order`, `uq_contents_cell_version`), e o
`INSERT` de conteúdo-placeholder é condicionado a `WHERE existente.id IS NULL`.

Nenhum valor monetário novo, nenhum saldo, nenhuma tabela nova: os demais itens
do checklist da seção 8 do documento de banco não se aplicam a esta etapa.

### 5.2 As correções da seção 3.1 se sustentam

| Lacuna | Confere? |
|---|---|
| L-1 | **sim** — a página do favo não contém `/celula/` em lugar nenhum, e a constante `JOGO_DISPONIVEL` deixa a volta para a E07 num ponto só |
| L-3 | **sim** — `/trilha/abc` e `/trilha/0` são recusados na rota |

### 5.3 O que as duas passagens anteriores deixaram passar

**L-8 (médio) — a trilha diz "0 de ? células" para todo favo nunca jogado.**
É a primeira coisa que um jogador novo lê. O texto sai de
`favo.celulasTotais || '?'`, e `celulasTotais` vem de `hive_progress`, que **só
ganha linha depois da primeira tentativa**. O número existe e é conhecido — o
favo tem quatro células no catálogo —, mas a tela pergunta em vez de dizer.
Capturado com a página renderizada de uma conta recém-criada:

```
0 de ? células · 0%
```

A tela do favo não tem o defeito, porque lá há um segundo caminho
(`|| celulas.length`). A trilha e o painel de desktop têm.

**L-9 (médio-baixo) — endereço inválido responde "Verifique os campos
preenchidos", com status 422.** A correção da L-3 pendurou o validador de campo
numa rota de página, e a mensagem que ele produz fala de formulário. Quem digita
`/trilha/abc` no navegador lê um recado sobre campos que ele não preencheu, com
um status que descreve entidade inválida em vez de endereço inexistente — 404
seria a resposta honesta. É dívida que a própria correção criou, e vale registrar
como tal.

### 5.4 Veredito da segunda passagem

**Pode avançar para a E06. Zero bloqueantes.**

As duas lacunas novas são de interface e não afetam regra, dado ou segurança —
mas as duas são visíveis para o jogador, e a L-8 aparece na primeira tela da
trilha. Encaminhamento sugerido:

1. **L-8** — a trilha já tem como saber o total: `cellsRepository.contarDoFavo`
   existe, sobra sem uso (é a L-4) e resolve as duas lacunas de uma vez, se
   ganhar o filtro de faixa que a L-4 pede.
2. **L-9** — rota de página com id inválido devia terminar em 404, não em 422 de
   formulário.
3. As demais — L-2, L-5, L-6, L-7 — seguem como estavam.

A lição desta passagem, para as auditorias seguintes: **o roteiro tem sete
passos, e pular um deles é como a primeira passagem quase deixou o seed sem
conferência.** E olhar o HTML renderizado acha em minutos o que a leitura do
código não acha — as duas lacunas novas saíram de imprimir a página, não de reler
o service.
