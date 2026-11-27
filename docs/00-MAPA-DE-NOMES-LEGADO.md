# Mapa de nomes: legado → novo

Decisão de checkpoint que a E00 devia entregar e a E01 consome na primeira hora.
Fecha a lacuna L-02 da auditoria da etapa.

Este documento diz **como cada tabela e coluna do banco antigo se chama no
schema novo**. Não define o DDL — isso é a T-01.3. Serve para que ninguém
precise decidir nomenclatura no meio do trabalho de schema.

---

## 1. Regra que gera o mapa

Três fontes, nesta ordem de precedência:

1. **`docs/03-BANCO-DE-DADOS-DBA.md`, seção 3** — convenções obrigatórias:
   tabela em `snake_case` **plural**, PK `id BIGINT UNSIGNED`, FK
   `<entidade_singular>_id`, booleano com prefixo `is_`/`has_`, `created_at` e
   `updated_at` em toda tabela de negócio, datas em UTC.
2. **`docs/03-BANCO-DE-DADOS-DBA.md`, seção 4** — o modelo alvo já nomeia as
   tabelas (`users`, `game_sessions`, `audit_logs`, `hives`, `cells`).
3. **`docs/PROMPT-MESTRE.md`, seção 7.1** — identificadores em inglês;
   comentários, documentação e commits em português.

### Conflito sinalizado e como foi resolvido

A seção 7.1 do `PROMPT-MESTRE` diz que termos de produto (`mel`, `favo`,
`patrimonio`) "ficam como estão". A seção 4 do documento de banco nomeia essas
mesmas coisas em inglês: `coins`, `hives`, `patrimony_snapshots`.

**Resolução adotada:** os dois valem, em camadas diferentes.

- **Identificadores** (tabela, coluna, função, variável) seguem o documento de
  banco: inglês. É o documento específico da matéria e o mais recente.
- **Texto de produto** — interface, mensagens ao usuário, comentários,
  documentação, glossário do TCC — mantém `mel`, `pólen`, `favo`, `colmeia`,
  `patrimônio`. É a linguagem que a criança lê e que o TCC defende.

Na prática: a coluna se chama `coins` e o rótulo na tela diz "mel". O comentário
acima da função explica em português que mel é a moeda gasta na loja.

Se o time preferir o inverso, é decisão de uma linha — mas precisa ser tomada
**antes** da T-01.3, não depois.

---

## 2. Tabelas

`beever.sql` (raiz) é o dump do banco legado; `migrations/001` é o schema atual
em produção de desenvolvimento. As duas colunas de origem existem porque nem
toda tabela aparece nas duas.

| Legado (`beever.sql`) | Atual (`migrations/001`) | Alvo (E01) | Observação |
|---|---|---|---|
| `usuario` | `usuario` | **`users`** | `tipo_usuario` do legado morre: admin é tabela própria |
| — | `admin` | **`admins`** | Já existe no schema atual; mantém a verificação por join |
| `perfil` | `perfil` | **`profiles`** | O legado guardava `senha_perfil` (perfil estilo Netflix) e `moedas`. A senha morre; o saldo vai para `wallets` |
| — | — | **`wallets`** | Nova: saldo em cache (`coins`, `xp_total`, `points_total`, `level`) |
| `nivel` | `nivel` | **`levels`** + `wallets` | O legado misturava catálogo e estado. `levels` vira tabela versionada de definição; o nível do usuário vai para `wallets` |
| `sessions` | `sessions` | **`sessions`** | Mantém o nome: é o store do `express-session` |
| `sessao` | `sessao_jogo` | **`game_sessions`** | A `sessao` legada misturava jogo e cookie de login; a parte de login já está em `sessions` |
| `jogos` | `jogo` | **`game_types`** + `cells` | O "jogo" legado era catálogo com `min_score`; no alvo, tipo de jogo e atividade são coisas distintas |
| `conteudos` | `conteudo` | **`contents`** | Ganha `cell_id` e `body` em JSON validado |
| — | — | **`hives`**, **`cells`**, **`cell_progress`**, **`hive_progress`** | Novas: trilha de favos e células não existem em nenhum dos dois |
| `item` | `item` | **`items`** | Ganha comportamento econômico (`counts_in_patrimony`, `valuation_rate`, `upkeep_cost`, `income_per_cycle`) |
| — | — | **`item_categories`**, **`item_behaviors`**, **`item_behaviors_map`**, **`item_requirements`** | Novas: `categoria` era texto solto no legado |
| `compra` | `compra` | **`purchases`** | `preco_unitario` → `price_at_purchase`; a regra de não recalcular já vale hoje |
| `inventario` | `inventario` | **`inventory`** | Singular no alvo, por decisão do documento de banco |
| `cronograma` | `cronograma` | **`schedules`** | Muda de forma: o legado era um intervalo com `dia`/`horario`; o alvo é `user_id` + `weekday` (0–6) + `is_available`, com UNIQUE por par |
| `metas` | `meta` | **`goals`** + `goal_types` | O tipo de meta sai de texto livre para tabela de domínio |
| `tarefa` | `tarefa` | **`tasks`** + `task_types` | Mesma mudança de `goals` |
| `log_user`, `log_perfil`, `log_acesso_user`, `log_acesso_perfil` | `auditoria` | **`audit_logs`** | As quatro tabelas de log ad-hoc do legado já foram consolidadas em uma; o alvo só renomeia e acrescenta `ip_hash` e índices |
| — | `schema_migrations` | **`schema_migrations`** | Mantém o nome; ganha `checksum` |

**Sem origem legada** — nascem na E01 ou depois, sem nada para migrar:
`age_bands`, `guardian_consents`, `reward_configs`, `reward_reasons`,
`xp_ledger`, `point_ledger`, `coin_ledger`, `idempotency_keys`, `streaks`,
`streak_events`, `vaults`, `vault_transactions`, `economic_cycles`,
`patrimony_snapshots`, `achievements`, `user_achievements`, `leagues`,
`league_members`.

**Morrem sem substituto direto:** `usuario.tipo_usuario` (vira a tabela
`admins`), `perfil.senha_perfil` (o modelo é 1:1 perfil↔usuário, não há login
por perfil), e a parte de cookie de login da `sessao` legada.

---

## 3. Colunas

Padrões que resolvem a maioria dos casos sem consulta caso a caso:

| Padrão legado | Padrão alvo | Exemplo |
|---|---|---|
| `id_<entidade>` (prefixo) | `<entidade>_id` (sufixo) | `id_perfil` → `user_id` |
| `id` da própria tabela | `id` | mantém, mas `BIGINT UNSIGNED` |
| `data_criacao` | `created_at` | UTC, `DATETIME` |
| `data_atualizacao` / ausente | `updated_at` | passa a existir em toda tabela de negócio |
| `ultimo_login` | `last_login_at` | |
| `data_inicio` / `data_fim` | `started_at` / `finished_at` | em `game_sessions` |
| `status` como texto livre | tabela de domínio + FK | nunca `ENUM` de coluna |
| flag como `TINYINT` sem prefixo | `is_` / `has_` | `ativo` → `is_active` |

Colunas nomeadas, uma a uma:

| Legado | Alvo | Nota |
|---|---|---|
| `usuario.nome` | `users.name` | |
| `usuario.email` | `users.email` | UNIQUE |
| `usuario.senha` | `users.password_hash` | o nome deixa explícito que não é a senha |
| `usuario.data_nasc` | `users.birth_date` | `DATE` |
| `usuario.status` | `users.is_active` | |
| `perfil.apelido` / `perfil.nome_perfil` | `users.nickname` | sobe para `users`, conforme o modelo alvo |
| `perfil.avatar_img` | `profiles.avatar_id` | vira FK, não caminho de arquivo |
| `perfil.objetivo` | `profiles.initial_goal_id` | vira FK |
| `perfil.moedas` | `wallets.coins` | `BIGINT`, unidades inteiras — **nunca** `FLOAT` |
| `perfil.pontos` | `wallets.points_total` | `INT UNSIGNED` |
| `perfil.onboarding_concluido` | `users.onboarding_completed_at` | data em vez de booleano: registra *quando*, e o booleano continua derivável |
| `nivel.xp_atual` | `wallets.xp_total` | `INT UNSIGNED` |
| `nivel.xp_proximo_nivel` | `levels.required_xp` | sai do usuário e vira catálogo; o código nunca calcula nível por fórmula |
| `item.preco` | `items.price` | `BIGINT` |
| `item.categoria` | `items.category_id` | FK para `item_categories` |
| `item.descricao` | `items.description_kid` | o nome lembra que o texto é para criança |
| `compra.preco_unitario` | `purchases.price_at_purchase` | nunca recalculado |
| `compra.preco_total` | derivado | quantidade × preço; não se guarda o que dá para calcular |
| `sessao_jogo.pontos_obtidos` | `game_sessions.points_awarded` | |
| `sessao_jogo.moedas_ganhas` | `game_sessions.coins_awarded` | |
| `sessao_jogo.xp_obtido` | `game_sessions.xp_awarded` | |
| `sessao_jogo.duracao_seg` | `game_sessions.duration_seconds` | `INT`, segundos |
| `auditoria.ator_tipo` / `ator_id` | `audit_logs.actor_type` / `actor_id` | |
| `auditoria.acao` | `audit_logs.action` | |
| `auditoria.entidade` / `entidade_id` | `audit_logs.entity_type` / `entity_id` | índice composto |
| `auditoria.estado_anterior` / `estado_novo` | `audit_logs.before_state` / `after_state` | JSON |
| `tarefa.progresso` | `tasks.current_value` / `target_value` | progresso vira contagem, não porcentagem |

---

## 4. Impacto no código

Todo `src/repositories/*.js` consulta os nomes da coluna "Atual". Quando o
schema novo entrar, os 12 repositories quebram junto — é o risco R-01 do
`ESTADO-DO-PROJETO.md`. Este mapa é também o roteiro dessa correção: cada linha
da tabela da seção 2 aponta um repository a ajustar.

Ordem sugerida, do mais isolado ao mais acoplado: `healthRepository`,
`auditoriaRepository`, `itemRepository`, `inventarioRepository`,
`compraRepository`, `tarefaRepository`, `metaRepository`,
`cronogramaRepository`, `nivelRepository`, `perfilRepository`,
`usuarioRepository`.

---

## 5. O que este documento ainda não decide

A lacuna L-04 da auditoria segue aberta: **a lista completa do que vai para
`migrations/_legacy/`**. Está decidido que `migrations/001_schema_inicial.sql` e
`002_perfil_onboarding_concluido.sql` vão. Falta decidir o destino de
`docs/legacy/beever.sql` e do `beever.sql` da raiz depois que o schema novo
estiver derivado dele. Decisão de arrumação, não de modelagem — não bloqueia a
T-01.3.
