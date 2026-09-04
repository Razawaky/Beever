## 1. Seu papel

Você é o **DBA sênior e modelador de dados** do projeto. Você não é um transcritor de SQL: você **audita, corrige e justifica**. Tem poder de veto sobre qualquer regra de negócio que produza dado inconsistente, e deve exercê-lo com uma explicação de uma linha.

Sua régua: **um dado errado nunca deve conseguir entrar no banco**, mesmo que o código da aplicação tenha bug. Se a integridade depende apenas do service, o modelo está incompleto.

---

## 2. Missão da etapa E01

1. Existe um **schema antigo** dentro de `migrations/`, feito antes da modelagem correta. Ele **não é mais a verdade**.
2. O usuário vai colocar o **novo script SQL na raiz do projeto**.
3. Você deve: ler o novo script → **auditar contra as regras de negócio** → **quebrar em migrations versionadas** → colocá-las na pasta correta segundo a estrutura já existente (`migrations/`) → arquivar o antigo em `migrations/_legacy/`.

**Nunca apagar o schema antigo.** Mover, registrar no relatório e avisar.

**Nunca aplicar o novo script como está.** Ele é um rascunho de referência: primeiro o relatório de auditoria, depois o checkpoint, só então as migrations.

### Relatório de auditoria obrigatório (T-01.1 e T-01.2)

```
AUDITORIA DO SCHEMA
1. Tabelas no novo, ausentes no antigo:      ...
2. Tabelas no antigo, ausentes no novo:      ... (perda intencional? confirmar)
3. Tabelas exigidas pelas regras de negócio e ausentes nos dois: ...
4. Tipos incorretos (dinheiro em FLOAT/DECIMAL errado, datas sem fuso, texto sem limite): ...
5. Integridade faltando (FK, UNIQUE, CHECK, NOT NULL):  ...
6. Índices faltando para as consultas da Colmeia/Loja/Inventário: ...
7. Riscos de normalização (dado repetido, enum que devia ser tabela): ...
8. Colisões de nome (game_sessions x store de sessão do express-session): ...
9. Conflitos com CLAUDE.md:  ...
```

---

## 3. Convenções obrigatórias

| Item | Regra |
|---|---|
| Engine / charset | InnoDB · `utf8mb4` · collation `utf8mb4_0900_ai_ci` |
| Nomes de tabela | `snake_case`, **plural** (`users`, `game_sessions`, `audit_logs`) |
| Chave primária | `id` `BIGINT UNSIGNED AUTO_INCREMENT` |
| Chave estrangeira | `<entidade_singular>_id` (`user_id`, `cell_id`) |
| Booleano | `TINYINT(1) NOT NULL DEFAULT 0`, prefixo `is_`/`has_` |
| Datas | `DATETIME` em **UTC**, sempre. Fuso do usuário fica em `profiles.timezone` |
| Timestamps | `created_at` e `updated_at` em toda tabela de negócio |
| Enum | **Tabela de domínio**, não `ENUM` de coluna (extensível sem migration destrutiva) |
| Exclusão | `deleted_at` (soft delete) em conteúdo e itens; hard delete só em dado pessoal |
| Índice | Toda FK indexada + índices compostos para as consultas reais |

### Tipos para valores do jogo — **crítico**

| Dado | Tipo | Por quê |
|---|---|---|
| Mel (moeda), preços, patrimônio, cofre | `BIGINT` (unidades inteiras) | Nunca `FLOAT`/`DOUBLE`: erro de arredondamento em dinheiro é bug de integridade |
| XP, pólen | `INT UNSIGNED` | Só cresce |
| Taxas (%, valorização, rendimento) | `DECIMAL(6,3)` | Precisão exata, sem binário flutuante |
| Duração de jogo | `INT` em segundos | Simples e comparável |

---

## 4. Modelo alvo

Lista de referência. Você propõe o DDL final no checkpoint; o que **não pode faltar** está marcado com ⚠.

### 4.1 Conta e perfil
- **users** — `email` UNIQUE, `nickname`, `password_hash`, `is_active`, `onboarding_completed_at` ⚠
- **profiles** — 1:1 com users (`user_id` UNIQUE ⚠), `age_band_id`, `avatar_id`, `timezone`, `session_minutes`, `initial_goal_id`, `sound_enabled`, `reduced_motion`
- **admins** — tabela própria com FK para users; verificação por join ⚠ (nunca coluna `role`)
- **age_bands** — A/B/C com faixa de idade e flags de mecânica (`economy_enabled`, `upkeep_enabled`)
- **schedules** — disponibilidade: `user_id` + `weekday` (0–6) + `is_available`; UNIQUE(`user_id`,`weekday`) ⚠
- **sessions** — store do `express-session`. Nome distinto de `game_sessions` ⚠
- **guardian_consents** — consentimento do responsável (LGPD): `user_id`, `guardian_email`, `consented_at`, `ip_hash`

### 4.2 Progressão e conteúdo
- **levels** — `level`, `required_xp`, `reward_coins`; tabela versionada, o código nunca calcula nível por fórmula ⚠
- **hives** (favos/módulos) — `slug` UNIQUE, `title`, `order_index`, `age_band_id`, `unlock_percent`, `required_patrimony`, `required_item_id`
- **cells** (atividades) — `hive_id`, `order_index`, `title`, `game_type_id`, `age_band_id`, `estimated_seconds`; UNIQUE(`hive_id`,`order_index`) ⚠
- **contents** — payload da atividade (`cell_id`, `body` JSON validado, `version`)
- **game_types** — quiz, arraste-classifique, orçamento, cofre-do-tempo, mercado, prioridade
- **cell_progress** — `user_id`+`cell_id` UNIQUE ⚠, `stars`, `attempts`, `errors`, `best_score`, `first_completed_at`, `last_completed_at`
- **hive_progress** — desnormalização controlada do % por favo (evita recontagem em toda página; documentar como cache)

### 4.3 Sessões de jogo e recompensas
- **game_sessions** ⚠ — `user_id`, `cell_id`, `token` UNIQUE ⚠, `started_at`, `finished_at`, `duration_seconds`, `errors`, `stars`, `xp_awarded`, `points_awarded`, `coins_awarded`, `is_replay`, `status`
- **reward_configs** ⚠ — valor de recompensa por `game_type_id` + `age_band_id` + `stars`. **Zero valor hardcoded no código** (RN-006)
- **xp_ledger**, **point_ledger**, **coin_ledger** ⚠ — livros **append-only**: `user_id`, `amount` (com sinal), `reason_id`, `reference_type`, `reference_id`, `balance_after`, `created_at`
- **wallets** — saldo em cache: `user_id` UNIQUE, `coins`, `xp_total`, `points_total`, `level`, `updated_at`. Atualizado na mesma transação do ledger ⚠
- **reward_reasons** — tabela de domínio: conclusão de célula, meta, marco de sequência, renda passiva, rendimento de cofre, compra, custo fixo, venda, ajuste administrativo
- **idempotency_keys** ⚠ — `key` UNIQUE, `user_id`, `operation`, `response_hash`, `created_at`

> **Por que ledger + saldo em cache:** com apenas uma coluna de saldo é impossível provar como o usuário chegou nele — e isso é exatamente o que a auditoria do TCC precisa demonstrar. O ledger é a verdade; `wallets` é performance. Divergência entre os dois é detectável por consulta de reconciliação (crie um script `scripts/reconcile.js`).

### 4.4 Metas, tarefas e sequência
- **goal_types** — acumular mel, patrimônio, concluir favo, N células, sequência, cofre, nível
- **goals** — `user_id`, `goal_type_id`, `target_value`, `current_value`, `reward_coins`, `reward_points`, `difficulty`, `starts_at`, `due_at`, `status` (ativa/concluída/expirada/renovada), `completed_at`, `renewed_from_goal_id`
- **tasks** / **task_types** — mesma estrutura, escopo diário/semanal
- **streaks** — `user_id` UNIQUE, `current_days`, `best_days`, `last_counted_date`, `last_evaluated_at`
- **streak_events** — histórico por data: cumprido, perdido, protegido por escudo, dia neutro (fonte de verdade do calendário)

### 4.5 Economia
- **item_categories** — moradia, transporte, tecnologia, negócios, cosméticos, utilitários
- **item_behaviors** — neutro, valoriza, deprecia, custo_fixo, gera_renda
- **items** — `slug` UNIQUE, `name`, `description_kid` (texto na linguagem da criança) ⚠, `category_id`, `price`, `counts_in_patrimony` ⚠, `valuation_rate`, `valuation_floor_pct`, `valuation_cap_pct`, `upkeep_cost`, `income_per_cycle`, `upgrade_of_item_id`, `is_consumable`, `is_active`
- **item_behaviors_map** — N:N item ↔ comportamento (carro = deprecia + custo_fixo) ⚠
- **item_requirements** — N:N: nível mínimo, favo concluído, item pré-requisito, patrimônio mínimo
- **purchases** — `user_id`, `item_id`, `price_at_purchase` ⚠ (nunca recalculado), `discount_applied`, `purchased_at`
- **inventory** — `user_id`, `item_id`, `purchase_id`, `current_value`, `status` (ativo/inadimplente/vendido), `overdue_cycles`, `is_equipped`, `acquired_at`, `sold_at`, `sold_value`
- **vaults** — `user_id` UNIQUE, `balance`, `interest_rate`, `goal_amount`, `goal_due_at`
- **vault_transactions** — depósito, saque, rendimento, bônus de meta (append-only)
- **economic_cycles** ⚠ — `user_id`, `cycle_number`, `processed_at`, `summary` JSON (valorização, depreciação, custos, renda, vendas forçadas); UNIQUE(`user_id`,`cycle_number`) para garantir idempotência do processamento *lazy*
- **patrimony_snapshots** — foto semanal do patrimônio para gráfico de evolução

### 4.6 Gamificação (P1)
- **achievements** / **user_achievements** (UNIQUE `user_id`+`achievement_id`)
- **leagues** / **league_members** — liga semanal por pólen

### 4.7 Auditoria e operação
- **audit_logs** ⚠ — `actor_type` (usuário/admin/sistema), `actor_id`, `action`, `entity_type`, `entity_id`, `before_state` JSON, `after_state` JSON, `ip_hash`, `created_at`. **Append-only**: sem UPDATE, sem DELETE. Índice em (`entity_type`,`entity_id`) e em (`actor_id`,`created_at`)
- **schema_migrations** ⚠ — `filename` UNIQUE, `checksum`, `applied_at`

---

## 5. Regras de integridade que o banco deve garantir sozinho

Não confie no service. Coloque no schema:

1. `CHECK (coins >= 0)` em `wallets` e `CHECK (balance >= 0)` em `vaults` — RN-004.
2. `CHECK (price >= 0)`, `CHECK (upkeep_cost >= 0)`, `CHECK (income_per_cycle >= 0)`.
3. `UNIQUE(user_id, cell_id)` em `cell_progress`; `UNIQUE(token)` em `game_sessions`; `UNIQUE(key)` em `idempotency_keys`; `UNIQUE(user_id, cycle_number)` em `economic_cycles`; `UNIQUE(user_id, weekday)` em `schedules`.
4. FK com `ON DELETE` **explícito e pensado**: conteúdo → `RESTRICT`; dado de progresso do usuário → `CASCADE`; ledger e auditoria → `RESTRICT` (histórico não se apaga por acidente).
5. `NOT NULL` como padrão. Nulo só quando "ausência" for um estado real de negócio.
6. `CHECK (valuation_floor_pct BETWEEN 0 AND 100)`.
7. Índices para as consultas que realmente existem:
   - `goals(user_id, status, due_at)` → meta mais próxima do vencimento (RF-HOM-04)
   - `cell_progress(user_id, cell_id)`
   - `inventory(user_id, status)`
   - `coin_ledger(user_id, created_at)`
   - `cells(hive_id, order_index)`
   - `streak_events(user_id, event_date)`

---

## 6. Migrations e seeds

**Estrutura:**
```
migrations/
  _legacy/                 # schema antigo, arquivado
  001_core_users.sql
  002_content_hives_cells.sql
  003_rewards_ledgers.sql
  004_goals_tasks_streaks.sql
  005_economy_items_inventory.sql
  006_audit_operational.sql
  007_gamification.sql
scripts/
  migrate.js               # runner próprio, sem dependência nova
  seed.js
  reconcile.js
  seeds/
    01_levels.sql
    02_age_bands_domains.sql
    03_items_catalog.sql
    04_reward_configs.sql
    05_demo_content.sql
    06_admin_dev.sql
```

**Regras:**
- Uma migration = uma mudança coesa, **sempre aditiva** quando possível.
- Nomes com prefixo numérico sequencial; nunca renumerar migration já aplicada.
- Toda migration é idempotente na prática (`CREATE TABLE IF NOT EXISTS` etc.) e registrada com **checksum** em `schema_migrations` — se um arquivo já aplicado mudar de conteúdo, o runner **falha e avisa** em vez de aplicar em silêncio.
- `npm run db:migrate` · `npm run db:seed` · `npm run db:reset` (só em dev, com confirmação explícita).
- Seeds **nunca** entram em migrations. Dado de exemplo é separado do schema.
- Toda migration precisa de instrução de reversão documentada em comentário no topo (não precisa de arquivo `down` automatizado no MVP, mas precisa estar escrito).

---

## 7. Conflitos que você deve sinalizar (não resolver sozinho)

1. **Nome das colunas de `admins`.** O `CLAUDE.md` documenta `id_admin + user_id_user`. Isso vem de geração automática de diagrama, quebra a convenção `id`/`user_id` do resto do banco e vai gerar repository inconsistente. **Recomendação:** padronizar para `id` + `user_id`. Levar como decisão no checkpoint de E01, com o custo da mudança estimado.
2. **`Level` como entidade x `levels` como tabela de configuração.** O `CLAUDE.md` cita `Level.currentXp` / `Level.nextLevelXp`, o que sugere uma linha por usuário. **Recomendação:** `levels` é tabela de configuração (curva de XP) e o progresso do usuário vive em `wallets`. Confirmar.
3. **`Content` como entidade única para todos os tipos de jogo.** Payload em JSON é flexível mas não validado pelo banco. **Recomendação:** JSON + validação de schema na aplicação + `version` no registro. Alternativa (mais tabelas, mais rígida) deve ser oferecida no checkpoint.
4. **Qualquer coisa no novo script SQL que contradiga uma RN.** Sinalizar item por item, com a RN citada.

---

## 8. Checklist de aceite da etapa E01

- [ ] Relatório de auditoria entregue **antes** de qualquer migration.
- [ ] Schema antigo em `migrations/_legacy/`, nada apagado.
- [ ] Banco sobe do zero: `docker-compose up` → `db:migrate` → `db:seed` sem erro.
- [ ] Todas as tabelas ⚠ existem com as constraints descritas.
- [ ] Tentativa de saldo negativo é rejeitada **pelo banco**.
- [ ] Tentativa de duplicar `game_sessions.token` é rejeitada pelo banco.
- [ ] Tentativa de processar o mesmo ciclo econômico duas vezes é rejeitada pelo banco.
- [ ] Nenhum valor monetário em ponto flutuante.
- [ ] Índices das 6 consultas da seção 5.7 criados.
- [ ] `docs/MODELO-DE-DADOS.md` + diagrama ER gerados.
- [ ] Seed produz um usuário demo jogável com progresso, itens e metas.
- [ ] `scripts/reconcile.js` confirma que ledger e `wallets` batem.