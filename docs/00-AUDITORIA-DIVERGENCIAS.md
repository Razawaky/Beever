# T-00.1 — Relatório de divergências

Auditoria de leitura, sem alteração de código. Compara o que existe no
repositório contra `CLAUDE.md`, `docs/ESTADO-DO-PROJETO.md` e os documentos de
escopo `docs/01` a `docs/04`.

Data: 2026-08-17 · Branch: `refactor/arquitetura-em-camadas` · Último commit:
`5891668 refactor: migra para arquitetura em camadas (MVC + Service + Repository)`

---

## 1. Como este relatório foi produzido

O protocolo de sessão pede `get_architecture_overview_tool` e
`detect_changes_tool` (servidor MCP `code-review-graph`). **Esses tools não
estavam disponíveis nesta sessão** — o `.mcp.json` aponta para
`venv/bin/python3 -m code_review_graph`, mas o servidor não respondeu. O
inventário foi feito com `find`, `grep`, `git status` e execução real de `npm run
lint` e `npm test`. É mais lento e pode deixar passar arquivo órfão; o
cruzamento com `git status` reduz esse risco, mas não o elimina.

## 2. Baseline medido (não copiado do documento antigo)

| Verificação | Resultado real |
|---|---|
| `npm test` | **22 passam, 0 falham** (MySQL no ar) |
| `npm run lint` | **falha: 3242 erros** — porém **nenhum** em `src/`, `scripts/` ou `test/` |
| Origem dos erros de lint | `.claude/skills/impeccable/scripts/**` e `.github/skills/**` (scripts de plugin de terceiros, não são código do projeto) |
| `console.log` em `src/` | zero (as duas ocorrências do `grep` estão dentro de comentários) |
| Node | `.nvmrc` = 22, instalado v22.22.3, `engines` pede `>=20` — coerente |
| Tailwind | **v4.3.3** (`tailwindcss` + `@tailwindcss/cli`) |
| MySQL | 8.x via `docker-compose` |
| Estado do git | 19 arquivos modificados e ~30 novos, **nada commitado** desde `5891668` |

A afirmação "lint limpo" do `ESTADO-DO-PROJETO.md` é verdadeira para o código do
projeto e falsa para o comando como está configurado hoje: o `eslint.config.js`
ignora `node_modules`, `src/public/css`, `docs/legacy` e `venv`, mas não ignora
`.claude/` nem `.github/`, que passaram a existir depois. Correção é uma linha
(ver D-08).

---

## 3. Divergências bloqueantes

### D-01 — O SQL da raiz não é o schema novo; é um dump mais recente do banco legado

Foi passada a informação de que `beever.sql` na raiz seria o schema novo e
`migrations/` o antigo. A comparação diz o contrário:

| | `beever.sql` (raiz) | `migrations/001_schema_inicial.sql` |
|---|---|---|
| Origem | dump phpMyAdmin, gerado em 11/08/2026 | schema escrito à mão |
| Foreign keys | **nenhuma** | presentes, com `CHECK` |
| Auditoria | 4 tabelas ad-hoc: `log_user`, `log_perfil`, `log_acesso_user`, `log_acesso_perfil` | tabela `auditoria` única |
| Sessão | `sessao` e `sessions` convivendo (colisão jogo × login) | `sessao_jogo` separada de `sessions` |
| Admin | inexistente | tabela `admin` (`id_admin` + `user_id_user`) |
| Relação com `docs/legacy/beever.sql` | mesmo schema; diferença é só data do dump e volume de dados | substituto modernizado dele |

Ou seja: `beever.sql` da raiz e `docs/legacy/beever.sql` são o **mesmo banco**,
exportado em datas diferentes (11/08/2026 e 02/01/2026).

**Decisão do usuário, tomada com essa informação na mesa:** seguir mesmo assim
com `beever.sql` como ponto de partida da E01 — não aplicá-lo como está, mas
reestruturá-lo por completo no papel de DBA, até que atenda às regras de negócio
de `docs/01-REQUISITOS-E-REGRAS.md` e às convenções de
`docs/03-BANCO-DE-DADOS-DBA.md`. `migrations/001` e `002` vão para
`migrations/_legacy/` sem serem apagados, e permanecem consultáveis como
referência de FKs, `CHECK` e modelo de auditoria já resolvidos.

**Consequência a aceitar conscientemente (R-01):** o schema resultante da E01
não será compatível com os repositories atuais. Todo `src/repositories/*.js`
consulta tabelas em português (`perfil`, `compra`, `meta`, `tarefa`,
`inventario`). Entre o fim da E01 e a realinhamento na E02/E03, **a aplicação
não sobe contra o banco novo**. O roadmap já prevê reescrever essas camadas, mas
a janela de app quebrado é real e precisa estar no cronograma, não ser
descoberta depois.

### D-02 — O roadmap descreve um produto maior do que o código existente

`docs/02-ROADMAP-ETAPAS.md` e `docs/01-REQUISITOS-E-REGRAS.md` especificam
favos, células, pólen, mel, patrimônio, cofre, ciclos econômicos, sequência
(streak), conquistas e liga. O código implementa moedas, pontos e
`cronograma → meta → tarefa`. São modelos de domínio diferentes, não versões do
mesmo. Mapa completo na seção 5.

### D-03 — O ciclo de recompensas do `CLAUDE.md` está aberto

`CLAUDE.md` define o loop Atividades/Jogos → XP/Pontos/Moedas → Loja →
Inventário. Hoje:

- `nivelService.creditarXp` existe e **ninguém a chama** — nenhum XP é creditado
  em lugar nenhum do sistema.
- `moedasService` só tem `debitar`. **Não existe `creditar`** — moeda só sai; a
  única entrada é o valor inicial do seed.
- `sessaoJogoRepository.js` está completo e **não é importado por nenhum
  arquivo**.
- `pontosService.creditar` é o único caminho de recompensa vivo, disparado por
  `tarefaService.concluir` (10 pontos fixos, constante no código).

O jogo, portanto, não fecha: dá para gastar mel, não para ganhar.

---

## 4. Divergências estruturais e documentais

| ID | Divergência | Evidência | Impacto |
|---|---|---|---|
| D-04 | Idioma dos identificadores contraditório entre documentos | `CLAUDE.md` lista entidades e tabelas em inglês (`GameSession`, `game_sessions`); banco e código usam português (`sessao_jogo`, `perfil`) | Resolvido neste checkpoint: vale a seção 7.1 do `PROMPT-MESTRE` — identificadores em inglês, comentários/docs/commits em português, termos de produto (`mel`, `favo`, `patrimonio`) preservados. `CLAUDE.md` é que será corrigido |
| D-05 | `CLAUDE.md` cita "Points" e "Coins" genéricos; os requisitos nomeiam **pólen** e **mel** | `docs/01`, seção 1.2 (glossário) × `CLAUDE.md`, seção Domain | O glossário do produto passa a valer; `CLAUDE.md` desatualizado |
| D-06 | Roadmap pede tarefas de E01/E02 que **já existem** | `scripts/migrate.js`, `scripts/seed.js`, `src/config/{env,database,logger,session}.js`, 7 middlewares, `errorHandler`, `/health`, `emTransacao` em `src/config/database.js:44` | Executar o roadmap ao pé da letra refaria trabalho pronto |
| D-07 | `ESTADO-DO-PROJETO.md` está desatualizado (sessão de 2026-08-12, anterior aos documentos de escopo) | Não menciona nenhum dos documentos `docs/01`–`04`, nem `beever.sql` na raiz, nem `PRODUCT.md`/`DESIGN.md` | Autorizado sobrescrever na T-00.4 |
| D-08 | `eslint.config.js` não ignora `.claude/` e `.github/` | 3242 erros, todos de scripts de plugin | `npm run lint` inutilizável como portão de CI enquanto não for corrigido |
| D-09 | Auditoria implementada como repository chamado direto pelos services | `auditoriaRepository.registrar` importado por 8 services | Funciona e respeita camadas, mas o roadmap (T-02.7) pede um `AuditService` com API única `record(actor, action, before, after)`. Decidir na E02 se converge ou se o roadmap se ajusta ao que existe |
| D-10 | Não existe workflow de CI | `.github/` só tem arquivos de plugin (`agents/`, `hooks/`, `skills/`); **não há `.github/workflows/`** | T-14.5 pendente; `Dockerfile` e `docker-compose.yml` existem |
| D-11 | `cors` instalado e nunca importado | zero ocorrências em `src/` | Dependência morta |
| D-12 | Cobertura de testes rasa para o que já existe | 4 arquivos: `test/unit/{migrate,nivelService,usuarioService}.test.js` e `test/integration/app.test.js`. Sem teste para `compraService`, `tarefaService`, `metaService`, `moedasService`, `pontosService` | Contraria a seção 8 do `PROMPT-MESTRE` (todo service com cálculo tem unitário) e o item de saldo obrigatório |
| D-13 | Área administrativa quase inexistente | `requireAdmin` existe e é usado em exatamente uma rota (`src/routes/users.js:40`) | E12 é praticamente do zero |
| D-14 | Seed não cobre o catálogo dos requisitos | `scripts/seed.js` tem 6 itens genéricos (chapéu, óculos, temas); a seção 6 de `docs/01` define catálogo por categoria econômica (valoriza, deprecia, gera renda, cosmético, consumível) | T-01.5 é reescrita, não ajuste |

---

## 5. Mapa etapa por etapa: o que já existe

Leitura para os checkpoints seguintes — evita rediscutir escopo a cada etapa.

| Etapa | Situação real | Observação |
|---|---|---|
| E00 Auditoria | **em curso** | este documento é a T-00.1 |
| E01 Banco | **refazer** | runner de migration e seed existem e são reaproveitáveis (T-01.4 pronta, T-01.5 a reescrever); schema alvo é novo. Faltam `reward_configs`, `economic_cycles`, `idempotency_keys`, favos/células |
| E02 Núcleo | **~80% feito** | falta `requireOnboarding` como middleware (hoje é checagem espalhada em controllers via `req.session.onboardingConcluido`), request-id no logger, decisão sobre `AuditService` (D-09) |
| E03 Autenticação | **feito, com lacunas** | falta consentimento do responsável (RNF-34) e os testes de brute force / sessão expirada |
| E04 Onboarding e metas | **parcial** | passos e persistência existem; **`GoalPlannerService` não existe** — metas são criadas manualmente, sem as regras RN-014/015 |
| E05 Conteúdo e trilha | **do zero** | não existe favo nem célula em lugar nenhum |
| E06 Motor de recompensas | **do zero, na prática** | ver D-03; só `pontosService` funciona, com valor fixo em constante em vez de `reward_configs` |
| E07 Jogos | **do zero** | há `jogo`/`conteudo` seedados ("Quiz da Poupança") e `sessaoJogoRepository` morto |
| E08 Metas e sequência | **parcial** | `meta`/`tarefa` funcionam com progresso manual; sem streak, sem geração automática, sem expiração |
| E09 Economia | **parcial** | loja, compra e inventário completos e verificados; sem patrimônio, cofre, ciclos econômicos, upgrades |
| E10 Colmeia | **parcial** | `painel.ejs` existe, mas não é a Colmeia especificada em RF-HOM |
| E11 Landing | **parcial** | `home.ejs` existe; tokens de design ainda não conferidos contra `docs/04` |
| E12 Admin | **do zero** | ver D-13 |
| E13 Conquistas e liga | **do zero** | P1, cortável |
| E14 Endurecimento | **do zero** | ver D-10 |
| E15 Documentação TCC | **do zero** | — |

---

## 6. Riscos registrados

- **R-01** — Janela de aplicação quebrada entre a E01 e o realinhamento das
  camadas (detalhado em D-01). Mitigação recomendada: manter
  `migrations/_legacy/` intacto e só remover o banco antigo do ambiente local
  depois que os repositories estiverem migrados.
- **R-02** — Sem os tools do grafo, toda auditoria de impacto desta e das
  próximas sessões é manual. Vale verificar por que o servidor MCP não sobe
  antes das etapas que mexem em código compartilhado.
- **R-03** — Nada commitado desde `5891668`. Todo o trabalho das fases 1–3 vive
  no working tree. Um `git checkout` acidental apaga semanas de trabalho.

---

## 7. Decisões registradas no checkpoint da T-00.1

1. **Base da E01:** `beever.sql` da raiz, reestruturado como DBA até atender às
   regras de negócio; `migrations/001` e `002` arquivados em
   `migrations/_legacy/`, sem apagar. Feito com a divergência D-01 conhecida.
2. **Escopo deste relatório:** inclui o gap contra os documentos `docs/01`–`04`
   (seção 5), além do exigido pela T-00.1.
3. **Nomenclatura:** vale a seção 7.1 do `PROMPT-MESTRE` — identificadores em
   inglês, comentários/documentos/commits em português, termos de produto
   (`mel`, `pólen`, `favo`, `patrimonio`) preservados como estão. `CLAUDE.md`
   será corrigido para refletir isso.

## 8. Próxima tarefa

**T-00.2** — inventário completo de rotas, controllers, services, repositories,
views, migrations e assets de identidade visual.
