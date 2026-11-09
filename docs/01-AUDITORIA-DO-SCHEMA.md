# T-01.1 + T-01.2 — Auditoria do schema

Relatório obrigatório da E01, no formato de 9 itens da seção 2 de
`docs/03-BANCO-DE-DADOS-DBA.md`. Entregue **antes** de qualquer migration, como
o checklist de aceite exige.

Data: 2026-08-17 · Papel: DBA sênior

---

## Resumo em 2 minutos

Compararam-se três coisas: o dump da raiz (`beever.sql`), o schema atual
(`migrations/001` + `002`) e o modelo alvo da seção 4 do documento de banco.

**O achado que decide a etapa:** o dump da raiz é o mais antigo dos três em
modelagem. Tem **zero foreign keys**, zero `CHECK`, sete colunas `ENUM` onde
deveria haver tabela de domínio, quatro tabelas de log ad-hoc guardando cópias
de nome e e-mail, e a tabela `sessao` misturando sessão de jogo com cookie de
login. O schema atual em `migrations/` é estritamente melhor: tem FK com
`ON DELETE` pensado, `CHECK` de saldo, `admin` como tabela própria e auditoria
unificada.

**O que isso significa na prática:** o schema definitivo não sai de nenhum dos
dois. Sai do modelo alvo, aproveitando do atual as decisões de integridade que
já estão certas e do dump apenas o inventário de campos que o produto usava e
que não podem sumir (`objetivo`, `avatar_img`, `min_score`, `prioridade` de
tarefa).

**Tamanho do buraco:** os dois schemas juntos têm 20 tabelas distintas. O modelo
alvo pede **46**. Faltam 30 tabelas que nenhum dos dois tem, e elas não são
enfeite: sem elas não existe trilha (RN-025), nem recompensa configurável
(RN-006), nem idempotência (RN-009), nem sequência (RN-019 a 024), nem economia
(RN-034 a 045), nem cofre (RN-042).

**Boa notícia inesperada:** dinheiro nunca foi ponto flutuante. `moedas`,
`preco` e `valor` são `INT` nos dois schemas. A RN-005 já está respeitada; o
único `FLOAT` do projeto é `tarefa.progresso`, e ele também sai.

**Decisões que preciso de você:** 4, listadas na seção 12. Nenhuma migration
foi criada, movida ou aplicada nesta tarefa.

---

## 0. Fontes e vocabulário

O roadmap chama o script da raiz de "novo" e o de `migrations/` de "antigo".
Como a T-00.1 mostrou (divergência D-01), os rótulos estão invertidos em
qualidade de modelagem. Para não trocar as bolas, este relatório usa:

| Rótulo | Arquivo | O que é |
|---|---|---|
| **dump** | `beever.sql` (raiz) | Export phpMyAdmin de 11/08/2026 do banco legado. 17 tabelas |
| **atual** | `migrations/001_schema_inicial.sql` + `002` | Schema em uso no desenvolvimento. 15 tabelas |
| **alvo** | seção 4 de `docs/03-BANCO-DE-DADOS-DBA.md` | Modelo de destino. 46 tabelas |

Estrutura conferida arquivo por arquivo (tabela, coluna, tipo, chave,
constraint), não de memória.

---

# AUDITORIA DO SCHEMA

## 1. Tabelas no dump, ausentes no atual

| Tabela | O que é | Destino |
|---|---|---|
| `log_user` | log de criação/atualização/inativação/exclusão de usuário, com cópia de `nome` e `email` | **descartar** — consolidada em `audit_logs` |
| `log_perfil` | idem, para perfil, com cópia de `email_user` e `nome_perfil` | **descartar** — idem |
| `log_acesso_user` | histórico de login, com cópia de `nome` e `email` | **descartar** — idem |
| `log_acesso_perfil` | histórico de login por perfil | **descartar** — idem |
| `sessao` | sessão de jogo **e** cookie de login na mesma tabela (`id_sessao_cookie`) | **dividir** — parte de jogo vira `game_sessions`, parte de login já é `sessions` |

Nenhuma dessas cinco é perda: as quatro primeiras já foram substituídas por
`auditoria` no schema atual, e a quinta é a colisão do item 8.

## 2. Tabelas no atual, ausentes no dump

| Tabela | Por que existe | Perda intencional? |
|---|---|---|
| `admin` | RN-051: admin por tabela e join, nunca por coluna | **Não é perda — é correção.** O dump usa `usuario.tipo_usuario ENUM`, que a RN-051 proíbe explicitamente |
| `sessao_jogo` | separação da `sessao` legada | **Não é perda.** É a correção da colisão |
| `auditoria` | RN-010 | **Não é perda.** Substitui as quatro tabelas `log_*` |
| `schema_migrations` | controle do runner | Criada pelo `scripts/migrate.js`, não pelo arquivo |

**Confirmação necessária:** nenhuma tabela do atual deve ser abandonada em favor
do dump. Se a leitura tivesse sido a literal — "o dump é o novo, aplique-o" —
o projeto perderia essas quatro estruturas e reintroduziria a violação da
RN-051.

## 3. Tabelas exigidas pelas regras de negócio e ausentes nos dois

Trinta tabelas. Agrupadas pela regra que as obriga:

| Regra | Tabelas ausentes |
|---|---|
| RN-003 (nível por tabela versionada) | `levels` como catálogo — hoje `nivel` guarda estado por usuário, não a curva |
| RN-006 (recompensa configurável) | `reward_configs`, `reward_reasons` |
| RN-001/002/010 (três moedas, auditáveis) | `xp_ledger`, `point_ledger`, `coin_ledger`, `wallets` |
| RN-009 (idempotência) | `idempotency_keys` |
| RN-011/029/038 (faixa de idade) | `age_bands` |
| RN-011/013/014 (disponibilidade) | `schedules` — o `cronograma` legado tem outra forma (ver item 7) |
| RN-015 (tipos de meta) | `goal_types` |
| RN-019 a 024 (sequência) | `streaks`, `streak_events` |
| RN-025 a 031 (trilha) | `hives`, `cells`, `cell_progress`, `hive_progress`, `game_types` |
| RN-033/034/035 (economia dos itens) | `item_categories`, `item_behaviors`, `item_behaviors_map`, `item_requirements` |
| RN-036/037 (ciclo econômico) | `economic_cycles` |
| RN-039 (patrimônio) | `patrimony_snapshots` |
| RN-042 a 044 (cofre) | `vaults`, `vault_transactions` |
| RN-046/047 (tarefas) | `task_types` |
| RN-049/053 + RNF-34 (LGPD) | `guardian_consents` |
| RF-GAM (P1) | `achievements`, `user_achievements`, `leagues`, `league_members` |

As quatro de gamificação são P1 e podem ficar para depois sem quebrar o MVP. As
outras 26 são MVP.

## 4. Tipos incorretos

| Onde | Problema | Regra | Correção |
|---|---|---|---|
| `tarefa.progresso FLOAT` — **nos dois** | Progresso em ponto flutuante. Comparação `= 100` nunca é confiável em binário flutuante; a trava de idempotência da conclusão de tarefa depende justamente de `< 100` | RN-005 por analogia | `current_value` / `target_value` inteiros |
| `conteudos.corpo VARCHAR(255)` — dump | Corpo da atividade limitado a 255 caracteres | RF-CON | `contents.body` JSON validado + `version` |
| `item.tipo INT` — dump | Número mágico sem FK nem tabela de referência | RN-034 | `category_id` + `item_behaviors_map` |
| `item.categoria VARCHAR(50)` — atual | Texto livre onde deveria haver domínio | RN-034 | FK para `item_categories` |
| 7 colunas `ENUM` — dump e atual | `status`, `prioridade`, `tipo_usuario`, `acao`, `ator_tipo` | convenção: enum é tabela | tabelas de domínio |
| PKs `INT` — nos dois | Convenção pede `BIGINT UNSIGNED` | seção 3 | `BIGINT UNSIGNED AUTO_INCREMENT` |
| Sem `updated_at` — nos dois | Nenhuma tabela tem | seção 3 | `created_at` + `updated_at` em toda tabela de negócio |
| Datas sem fuso — nos dois | Nenhuma coluna de fuso em lugar nenhum; `cronograma.dia DATE`, `conteudos.data_publicacao DATE` | **RN-024** | `DATETIME` em UTC + `profiles.timezone`. Sem isso a virada do dia da sequência é impossível de calcular certo |
| `COLLATE=utf8mb4_general_ci` — dump | A convenção pede `utf8mb4_0900_ai_ci` | seção 3 | declarar explicitamente |
| Collation não declarada — atual | Herda o padrão do servidor. Hoje dá certo por acaso (MySQL 8.4), mas não é garantia | seção 3 | declarar explicitamente |

**Dinheiro está correto nos dois.** `perfil.moedas`, `item.preco`/`valor`,
`compra.preco_unitario`/`preco_total` são todos `INT`. Nenhum `FLOAT` ou
`DECIMAL` em valor monetário. A RN-005 já é respeitada e deve continuar sendo,
agora em `BIGINT`.

## 5. Integridade faltando

**No dump — o problema é estrutural, não pontual:**

- **Zero foreign keys.** As 17 tabelas têm apenas `KEY` (índice), nunca
  `FOREIGN KEY`. `compra.id_item` pode apontar para item inexistente e o banco
  aceita.
- **Zero `CHECK`.** `perfil.moedas` pode ficar negativo — viola RN-004 no nível
  em que ela precisa valer, que é o banco.
- **Um único `UNIQUE`**: `usuario.email`.

**No atual — bom, com lacunas:** FKs com `ON DELETE` pensado (`CASCADE` em dado
do usuário, `RESTRICT` em catálogo), `CHECK` de saldo (`ck_perfil_moedas`),
`UNIQUE` em `perfil.id_usuario`, `admin.user_id_user`, `nivel.id_perfil` e
`inventario(id_perfil, id_item)`. Falta:

| Constraint exigida | Regra | Existe? |
|---|---|---|
| `UNIQUE(game_sessions.token)` | RN-009 | não — a coluna `token` nem existe |
| `UNIQUE(idempotency_keys.key)` | RN-009 | não |
| `UNIQUE(user_id, cycle_number)` em `economic_cycles` | RN-036 | não |
| `UNIQUE(user_id, weekday)` em `schedules` | RN-011 | não |
| `UNIQUE(user_id, cell_id)` em `cell_progress` | RN-026 | não |
| `UNIQUE(hive_id, order_index)` em `cells` | RN-026 | não |
| `CHECK (balance >= 0)` em `vaults` | RN-042 | não |
| `CHECK (valuation_floor_pct BETWEEN 0 AND 100)` | RN-034 | não |
| Ledger e auditoria com `ON DELETE RESTRICT` | seção 5.4 | `auditoria` não tem FK nenhuma |

Sobre a `auditoria` sem FK: é defensável em tabela append-only (o histórico
sobrevive ao registro que o originou), mas hoje é omissão, não decisão. Deve
virar decisão documentada.

## 6. Índices faltando

Nenhuma das seis consultas que o documento de banco lista na seção 5.7 tem
índice em qualquer um dos dois schemas — porque nenhuma das tabelas envolvidas
existe ainda:

`goals(user_id, status, due_at)` · `cell_progress(user_id, cell_id)` ·
`inventory(user_id, status)` · `coin_ledger(user_id, created_at)` ·
`cells(hive_id, order_index)` · `streak_events(user_id, event_date)`

Faltando também no que **já existe**:

- `auditoria` só tem `PRIMARY KEY (id)`. A consulta de auditoria do admin
  (RF-ADM-04) precisa de `(entidade, entidade_id)` e `(ator_id, criado_em)`.
  Hoje seria varredura de tabela inteira.
- `usuario(status, ultimo_login)` — o cron de expurgo de contas inativas filtra
  exatamente por esses dois campos e hoje faz varredura completa.

## 7. Riscos de normalização

| Risco | Onde | Impacto |
|---|---|---|
| Cópia de dado pessoal em log | as 4 tabelas `log_*` do dump guardam `nome` e `email` duplicados | **Viola RN-053**: excluir a conta não apaga o dado pessoal, que sobrevive no log. `audit_logs` guarda `entity_id` e estado em JSON, não cópia de identidade |
| Segunda senha | `perfil.senha_perfil` no dump | Resquício do modelo Netflix (N perfis por conta). Viola RN-050 (1:1) e cria uma credencial a mais para vazar |
| Data de nascimento duplicada | `usuario.data_nasc` **e** `perfil.data_nasc` no dump | Duas fontes de verdade para a idade, que é o que decide a faixa (RN-029) |
| Enum de coluna | 7 ocorrências | Acrescentar um status novo exige migration destrutiva |
| Catálogo misturado com estado | `nivel` guarda `nivel`, `xp_atual` e `xp_proximo_nivel` por usuário | RN-003 quer `levels` como curva versionada e o progresso em `wallets` |
| Valor derivado armazenado | `compra.preco_total` = `quantidade × preco_unitario` | Menor de todos, e há argumento a favor de manter (prova histórica). Vira decisão, item 12 |
| Inventário sem valor | `inventario` só tem quantidade | RN-039 (patrimônio) e RN-037 (venda por inadimplência) são impossíveis sem `current_value` e `status` |
| Saldo sem histórico | `perfil.moedas` é uma coluna só | Impossível provar como o usuário chegou ao saldo — exatamente o que a auditoria do TCC precisa demonstrar. É o argumento dos ledgers |

## 8. Colisões de nome

| Colisão | Situação |
|---|---|
| `sessao` × `sessions` | **Real e ativa no dump.** `sessao` guarda sessão de jogo (`pontos_obtidos`, `moedas_ganhas`) **e** o cookie de login (`id_sessao_cookie`), enquanto `sessions` é o store do `express-session`. Dois conceitos, nomes quase idênticos, responsabilidades cruzadas |
| `sessao_jogo` × `sessions` | **Já resolvida** no schema atual. No alvo vira `game_sessions` × `sessions`, que é o par que o `CLAUDE.md` exige |
| `nivel` (tabela) × `nivel` (coluna) | Menor, mas presente nos dois: a tabela `nivel` tem uma coluna `nivel`. No alvo, `levels.level` e `wallets.level` deixam claro quem é catálogo e quem é estado |

## 9. Conflitos com o `CLAUDE.md`

| Conflito | Resolução proposta |
|---|---|
| `CLAUDE.md` nomeia entidades em inglês (`GameSession`, `game_sessions`); os dois schemas são em português | Já decidido na T-00.1: identificadores em inglês, texto de produto em português. Mapa completo em `00-MAPA-DE-NOMES-LEGADO.md` |
| `CLAUDE.md` fala em "Points" e "Coins" genéricos | Os requisitos nomeiam **pólen** e **mel**, com glossário. O documento de requisitos vence |
| `CLAUDE.md` documenta `admin` com `id_admin + user_id_user` | Ver item 10, conflito A |
| `CLAUDE.md` descreve `Level.currentXp` / `Level.nextLevelXp`, isto é, uma linha de nível por usuário | Ver item 10, conflito B. Contradiz a RN-003 |
| `CLAUDE.md` não menciona ledger, carteira, cofre, ciclo econômico, patrimônio nem faixa de idade | O `CLAUDE.md` é anterior aos requisitos. Precisa ser atualizado ao fim da E01, não seguido |

---

## 10. Conflitos que a seção 7 do documento de banco manda sinalizar

### Conflito A — nome das colunas de `admins`

`CLAUDE.md` e o schema atual usam `id_admin` + `user_id_user`. Isso veio de
geração automática de diagrama e quebra a convenção `id` / `user_id` que vale
para todas as outras 45 tabelas.

**Recomendação: padronizar para `id` + `user_id`.**
**Custo:** baixo. Um `SELECT` em `usuarioRepository.buscarPorEmailComSenha` (o
join que decide se é admin), uma linha no `scripts/seed.js`, e a atualização do
`CLAUDE.md`. Nenhum dado de produção a migrar.

### Conflito B — `levels` como configuração × `Level` por usuário

`CLAUDE.md` sugere uma linha por usuário; a RN-003 exige tabela versionada de
curva de XP, com o progresso do usuário em outro lugar.

**Recomendação: seguir a RN-003.** `levels` é catálogo (`level`, `required_xp`,
`reward_coins`), semeado com `100 * n^1.5` arredondado à dezena; o progresso vai
para `wallets` (`xp_total`, `level`).
**Custo:** baixo, e ele já está sendo pago — `nivelService.creditarXp` é código
morto (DT-03), então não há comportamento em produção para preservar. O que
existe hoje é `XP_POR_NIVEL = 1000` fixo no código, que a RN-003 proíbe.

### Conflito C — `contents` com payload JSON

Flexível para seis tipos de jogo, mas o banco não valida o conteúdo do JSON.

**Recomendação: JSON + `version` no registro + validação de schema na
aplicação**, com o tipo de jogo em `game_types` para saber qual validador
aplicar.
**Alternativa oferecida:** uma tabela por tipo de jogo (`quiz_questions`,
`budget_items`…). Mais rígida e validada pelo banco, mas multiplica migrations
a cada jogo novo e torna a E07 mais cara. Para seis tipos de jogo num MVP de
TCC, o custo não se paga.
**Custo da recomendada:** um validador por tipo de jogo na E07, mais o risco
aceito de que um JSON malformado só falhe na aplicação.

### Conflito D — encontrado nesta auditoria, fora da lista da seção 7

A RN-010 exige auditoria em toda alteração de XP, pólen, mel e compra. Hoje a
garantia mora no service chamador, não em quem mexe no dinheiro (lacuna L-03 da
auditoria da E00). Os ledgers append-only resolvem isso **na estrutura**: se
todo crédito e débito passa por `xp_ledger` / `point_ledger` / `coin_ledger`, a
trilha existe por construção, e `scripts/reconcile.js` prova que `wallets` bate
com a soma do ledger.

**Recomendação: ledger é a verdade, `wallets` é cache**, atualizado na mesma
transação. É o que a seção 4.3 já propõe; registro aqui para que fique como
resposta explícita ao L-03.

---

## 11. Riscos de execução

| ID | Risco | Mitigação proposta |
|---|---|---|
| RE-01 | **Numeração das migrations colide com o histórico.** `schema_migrations` no banco de desenvolvimento já tem `001_schema_inicial.sql` e `002_perfil_onboarding_concluido.sql` aplicados. Os arquivos novos começam de `001` outra vez | `npm run db:reset` antes da primeira aplicação (comando que ainda não existe — T-01.4), ou banco novo do zero. Nunca renumerar arquivo já aplicado |
| RE-02 | **Os 12 repositories quebram** ao trocar os nomes de tabela (risco R-01 do estado) | Ordem de correção já definida na seção 4 do `00-MAPA-DE-NOMES-LEGADO.md`. A aplicação fica sem subir contra o banco novo até a E02/E03 |
| RE-03 | **Runner atual não tem checksum.** A seção 6 exige que uma migration já aplicada que mude de conteúdo faça o runner falhar | T-01.4. Enquanto não existir, editar migration aplicada passa silenciosamente |
| RE-04 | **Dump gerado em MySQL 8.0.46, servidor é 8.4.11** | Não há sintaxe descontinuada relevante no que vai ser aproveitado (só `CREATE TABLE` simples). Risco baixo, mas o banco de destino deve ser criado do zero em 8.4 |
| RE-05 | **46 tabelas é muito para uma tarefa.** Quebrar mal gera migration gigante e irreversível | A seção 6 já prescreve 7 arquivos temáticos. Seguir essa divisão, uma migration coesa por arquivo, com instrução de reversão em comentário no topo |
| RE-06 | **Escopo P1 dentro do MVP.** Conquistas e liga (4 tabelas) não são MVP | Ficam para uma migration `007_gamification.sql` separada, aplicável depois sem tocar nas outras |

---

## 12. Decisões para o checkpoint

| # | Decisão | Recomendação |
|---|---|---|
| 1 | Colunas de `admins`: `id_admin`+`user_id_user` ou `id`+`user_id`? | ★ `id` + `user_id` (conflito A) |
| 2 | `levels` como catálogo versionado, progresso em `wallets`? | ★ Sim, conforme RN-003 (conflito B) |
| 3 | Conteúdo dos jogos em JSON validado na aplicação, ou uma tabela por tipo de jogo? | ★ JSON + `version` + `game_types` (conflito C) |
| 4 | `purchases.total_price` armazenado ou derivado de quantidade × preço? | ★ Armazenar. É registro histórico de uma transação, e o argumento de "não guardar derivado" perde para o de prova contábil — o mesmo motivo de `price_at_purchase` |

Fora do checkpoint, decidido como DBA e registrado: ledgers append-only como
fonte de verdade do saldo (conflito D), `BIGINT UNSIGNED` em toda PK,
`utf8mb4_0900_ai_ci` declarado explicitamente, `created_at`/`updated_at` em toda
tabela de negócio, datas em UTC com fuso em `profiles.timezone`, e enums como
tabela de domínio.

**Próxima tarefa:** T-01.3 — arquivar o schema atual em `migrations/_legacy/` e
escrever as migrations versionadas do modelo alvo, nos 7 arquivos temáticos da
seção 6.
