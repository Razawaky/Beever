# Auditoria da E06 — motor de recompensas

Laudo escrito depois de as oito tarefas estarem entregues e commitadas, no
formato das auditorias da E04 e da E05. O grafo foi reconstruído antes da
revisão — estava parado três commits atrás —, e tudo abaixo foi conferido em
código, schema e teste, não no que o estado do projeto afirma.

## 1. Requisitos

| Requisito | Status | Onde |
|---|---|---|
| RN-001 três recompensas sem conversão | atendido e testado | `levelsService` calcula o bônus do degrau e não paga mel; `recompensaDaCelula.test.js` |
| RN-002 XP só acumula | atendido e testado | `ck_xp_ledger_amount CHECK (amount > 0)`; `lancarXp` só credita |
| RN-003 nível pela tabela `levels` | atendido e testado | `levelsService.test.js`, com curva sintética |
| RN-004 mel nunca negativo | atendido e testado | `WHERE coins >= ?` + `ck_wallets_coins`; teste do débito recusado |
| RN-005 inteiros, nunca `FLOAT` | atendido e testado | `schema.test.js`; o único `DECIMAL` é fator, não dinheiro |
| RN-006 valor vem do banco | atendido e testado | `reward_configs` e `reward_modifiers`, 54 combos conferidos |
| RN-007 cálculo só no servidor | parcial | quiz coberto; cinco dos seis tipos de jogo sem validador (escopo E07) |
| RN-008 repetição 25% / zero | atendido e testado | os três services, mais o aceite |
| RN-009 token único, sem crédito duplo | atendido e testado | chave de idempotência + `FOR UPDATE`; cinco conclusões em paralelo |
| RN-010 auditoria de toda alteração | atendido e testado **após a L-1** | partida, tarefa, meta, XP inicial e compra, todas com saldo antes/depois |
| RNF-15 saldo em transação | atendido e testado | as três recompensas numa transação só |
| RNF-16 idempotência | atendido e testado | `idempotencia.test.js` e cinco compras simultâneas |
| RNF-17 auditoria imutável | atendido e testado | gatilhos da migration `008`, com teste |

**Critério de aceite da etapa** — "a mesma conclusão enviada 5 vezes em paralelo
credita exatamente uma vez": **atendido**, com prova tripla (livros,
`game_sessions` e contagem de linhas de auditoria).

**Camadas:** nenhuma SQL fora de `src/repositories/`, nenhuma regra de
recompensa em controller.

## 2. Lacunas corrigidas nesta passagem

**L-1 — a compra auditava sem o saldo.** A T-06.7 enriqueceu partida, tarefa,
meta e onboarding, e passou batido justamente na única operação que *tira* mel.
Corrigido: `compra.realizada` agora carrega o retrato antes e depois.

**L-2 — `is_replay` podia mentir.** Era gravado na abertura e nunca corrigido.
Quem abre duas partidas antes de concluir a célula abre as duas como estreia, e
a segunda é paga como repetição: o relatório diria estreia, o livro diria 25%.
Corrigido no `finalizar`, com `COALESCE` — ausente quer dizer "não sei", e aí o
valor da abertura fica. **Esse `COALESCE` nasceu de um teste vermelho**: a
primeira versão sobrescrevia com o padrão e apagava a informação de quem fecha
partida sem calcular recompensa, e o teste de repository acusou na hora.

**L-3 — partida abandonada respondia como resultado.** `fechar` via
`finished_at` preenchido e devolvia o registro zerado com `jaEstavaFechada`,
então a tela da E07 anunciaria "zero estrelas, zero mel" como se fosse
desempenho. Agora é erro de validação: desistência não é desempenho zero.

## 3. Lacunas abertas, de risco baixo

| # | Lacuna | Onde tratar |
|---|---|---|
| L-4 | Sessão aberta não expira e não tem limite; o status `expirada` existe desde a E01 e ninguém o usa | E07, junto da tela de jogo |
| L-5 | `validadoresDeJogo` sem teste próprio, sendo função pura e o coração da RN-007 | T-07.1 |
| L-6 | `gameSessionService.abandonar` sem teste de service | E07 |
| L-7 | `idempotency_keys` cresce para sempre, sem política de expurgo | E14, com o `limpezaService` |
| L-8 | `conteudoParaJogar` usa o validador de respostas com lista vazia só para conferir a forma | T-07.1 |
| L-9 | Só 1 das 24 células é jogável: as outras têm conteúdo `placeholder` | E07 e E12 |
| L-10 | Nada foi visto em navegador — não há rota nem tela de partida | E07 |

## 4. Veredito

**Pode avançar.** Zero bloqueantes, e as três lacunas de risco médio foram
corrigidas antes da abertura da E07. As sete restantes são de risco baixo, todas
com etapa marcada.
