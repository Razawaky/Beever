## E00 — Alinhamento e auditoria do repositório
**Objetivo:** saber exatamente o que existe antes de escrever uma linha.

| Tarefa | Entrega |
|---|---|
| T-00.1 | Rodar protocolo de sessão; gerar relatório de divergências entre código real, `CLAUDE.md` e `ESTADO-DO-PROJETO.md` |
| T-00.2 | Inventariar o que já existe: rotas, controllers, services, repositories, views, migrations, assets de identidade visual |
| T-00.3 | Listar código morto / duplicado / fora de camada, sem apagar nada ainda |
| T-00.4 | Reescrever `docs/ESTADO-DO-PROJETO.md` no formato: **Feito e verificado / Feito mas não verificado / Pendente / Dívida técnica** |
| T-00.5 | Confirmar versão de Node, Tailwind (v3 ou v4), MySQL e scripts do `package.json` |

**Aceite:** um documento onde o usuário lê em 2 minutos o estado real do projeto.
**Decisões esperadas no checkpoint:** o que arquivar em `_legacy/`; padronizar nomes de tabela legados (ver E01).

---

## E01 — Banco de dados (papel: DBA sênior)
**Objetivo:** substituir o schema antigo pelo novo, versionado e alinhado às regras de negócio.
**Guia:** `docs/03-BANCO-DE-DADOS-DBA.md`. **Requisitos:** RN-001 a RN-053, RNF-15 a RNF-19.

| Tarefa | Entrega |
|---|---|
| T-01.1 | Ler o novo script SQL na raiz do projeto, comparar com o schema antigo em `migrations/` e produzir **relatório de diferenças + riscos** |
| T-01.2 | Auditar o novo script contra as regras de negócio: tipos de dinheiro, FKs, índices, campos faltantes, normalização, colisão `game_sessions` x sessão de login |
| T-01.3 | Mover o antigo para `migrations/_legacy/` (não apagar) e quebrar o novo em migrations versionadas em `migrations/` |
| T-01.4 | Criar `scripts/migrate.js` (runner próprio, sem dependência nova) com tabela de controle `schema_migrations` |
| T-01.5 | Criar `scripts/seed.js` + seeds: níveis, favos e células de exemplo, catálogo de itens (seção 6 dos requisitos), configuração de recompensas, admin de teste |
| T-01.6 | Criar tabelas de suporte: `audit_logs`, `reward_configs`, `economic_cycles`, `idempotency_keys` |
| T-01.7 | Documentar o modelo em `docs/MODELO-DE-DADOS.md` + diagrama ER |
| T-01.8 | Testar: subir do zero com `docker-compose`, rodar migrations + seed, validar constraints com inserts inválidos |

**Aceite:** `docker-compose up` + `npm run db:migrate` + `npm run db:seed` produzem um banco íntegro do zero, e um insert que viola regra de negócio **falha no banco**, não só no código.

---

## E02 — Núcleo da aplicação · **reordenada em 2026-08-17**
**Objetivo:** infraestrutura que todas as features vão usar.

> **Por que a lista mudou.** O escopo original desta etapa pedia `src/config/`,
> logger, error handler, middlewares, helper de validação e helper de transação
> — **tudo isso já existia** desde a migração para camadas (divergência D-06 da
> T-00.1). E a E01 trocou o schema, deixando os 12 repositories apontando para
> tabelas que não existem mais (risco R-01). A etapa passou a ser o
> realinhamento das camadas, mais o pouco que faltava do escopo original.
> A lista abaixo foi aprovada no checkpoint de abertura da E02.

| Tarefa | Entrega | Situação |
|---|---|---|
| T-02.1 | Arnês de teste com banco real (`test/helpers/banco.js`) + asserções de integridade do schema | **feita** — commit `b9d9f84` |
| T-02.2 | Realinhar os 13 repositories ao schema novo, com teste de integração para cada | **feita** — commits `c061fa7` e `2270762`, 93 testes de integração |
| T-02.3 | Realinhar services e controllers que dependem dos repositories. **É o que devolve a aplicação ao ar** | próxima |
| T-02.4 | `requireOnboarding` como middleware, em `src/middlewares/`; unificar com `exigirLoginPagina`, hoje declarado dentro de `src/routes/index.js` | pendente |
| T-02.5 | Request-id no logger estruturado | pendente |
| T-02.6 | `AuditService` com API única `record(actor, action, before, after)`, gravando em `audit_logs` | pendente |
| T-02.7 | Layout EJS base — hoje `header`/`footer` são incluídos à mão e só em 2 das 9 páginas | pendente |

**Já existiam antes da etapa, conferidos na T-00.2:** `src/config/{env,database,logger,session}.js`, error handler global com classes de erro em `src/utils/erros.js`, os 7 middlewares, helper de validação com express-validator, `emTransacao` em `src/config/database.js`, e o healthcheck `/health`.

**Aceite:** app sobe contra o schema novo, login funciona ponta a ponta, `/health` responde, erro proposital retorna JSON/página tratada sem stack trace, e a suíte cobre as rotas autenticadas.

---

## E03 — Autenticação
**Requisitos:** RF-AUT-01 a 05, RN-048 a 050, RNF-05 a 12.

| Tarefa | Entrega |
|---|---|
| T-03.1 | Repository de usuário e perfil |
| T-03.2 | `AuthService`: hash bcrypt, validação de senha, criação de usuário + perfil na mesma transação |
| T-03.3 | Rotas e controllers de registro/login/logout com validação e rate limit |
| T-03.4 | Views de registro e login com a identidade visual |
| T-03.5 | Consentimento do responsável no registro (RNF-34) |
| T-03.6 | Testes: senha fraca, e-mail duplicado, credencial errada, sessão expirada, brute force barrado |

**Aceite:** registrar → logar → acessar rota privada → sair. Sem senha em log.

---

## E04 — Onboarding e planejador de metas
**Requisitos:** RF-ONB-01 a 09, RN-011 a 018.

| Tarefa | Entrega |
|---|---|
| T-04.1 | Auditar o onboarding existente (incompleto) e decidir o que reaproveitar |
| T-04.2 | Máquina de passos do onboarding com progresso salvo a cada passo |
| T-04.3 | Persistir disponibilidade (`schedules`), faixa, tempo de sessão, objetivo e avatar |
| T-04.4 | **`GoalPlannerService`**: gera metas conforme RN-014/015; nunca gera meta impossível |
| T-04.5 | `requireOnboarding` bloqueando o app até concluir |
| T-04.6 | Edição de disponibilidade no perfil com recálculo preservando progresso (RN-013) |
| T-04.7 | Testes do planner: 1 dia, 4 dias, 7 dias, edição de 5→2 dias com meta em andamento |

**Aceite:** dois usuários com disponibilidades diferentes recebem conjuntos de metas coerentes com a tabela de RN-014, e reduzir dias não apaga progresso.

---

## E05 — Conteúdo e trilha
**Requisitos:** RF-CON-01 a 06, RN-025 a 029.

| Tarefa | Entrega |
|---|---|
| T-05.1 | Repositories de favo, célula, conteúdo e progresso |
| T-05.2 | `ContentService`: listar favos/células com estado, resolver desbloqueio (incluindo requisito de patrimônio/item) |
| T-05.3 | `ProgressService`: registrar tentativa, erros, estrelas, tempo; calcular % do favo |
| T-05.4 | Views da trilha (hexágonos) e da lista de células |
| T-05.5 | Filtro por faixa de idade |
| T-05.6 | Testes: célula travada não abre; 80% libera o favo seguinte; requisito de patrimônio respeitado |

**Aceite:** trilha navegável com estados corretos e impossível burlar pré-requisito via URL.

---

## E06 — Motor de recompensas
**Objetivo:** o coração do jogo. Feito **antes** dos jogos, para que todo jogo use o mesmo contrato.
**Requisitos:** RN-001 a 010, RNF-15 a 17.

| Tarefa | Entrega |
|---|---|
| T-06.1 | `reward_configs` em banco + repository (valor por tipo de atividade e faixa) |
| T-06.2 | `XpService` — calcula e credita XP, resolve subida de nível |
| T-06.3 | `PointsService` — calcula e credita pólen |
| T-06.4 | `CoinService` — calcula e credita mel, valida saldo, nunca negativo |
| T-06.5 | `GameSessionService` — abre sessão com token, fecha sessão validando respostas **no servidor**, calcula estrelas, orquestra os três services em **uma transação** |
| T-06.6 | Idempotência: token de sessão consumido uma única vez (`idempotency_keys`) |
| T-06.7 | Auditoria em todos os créditos |
| T-06.8 | Testes: dupla submissão credita uma vez; repetição dá 25% de XP e zero mel; cliente mentindo na pontuação é ignorado |

**Aceite:** um teste que envia a mesma conclusão 5 vezes em paralelo credita exatamente uma vez.

---

## E07 — Jogos interativos
**Requisitos:** RF-JOG-01 a 08. **Uma tarefa = um jogo completo** (view + JS na página + validação no servidor + teste).

| Tarefa | Entrega |
|---|---|
| T-07.1 | Contrato único de jogo: como o front envia respostas e como o servidor valida (documentar em `docs/CONTRATO-DE-JOGO.md`) |
| T-07.2 | **Quiz do Favo** |
| T-07.3 | **Arraste e Classifique** (com alternativa por clique/teclado — RNF-23) |
| T-07.4 | **Monte o Orçamento** |
| T-07.5 | **Cofre do Tempo** (juros compostos com gráfico simples) |
| T-07.6 | Tela de resultado unificada (estrelas, XP, mel, pólen, mascote) |
| T-07.7 | *(P1)* Mercado Esperto · Ordene a Prioridade · retomada de sessão |

**Aceite:** cada jogo roda em ≤1 s, funciona no celular, e a nota vem do servidor.

---

## E08 — Metas e Sequência
**Requisitos:** RF-MET, RF-SEQ, RF-TAR, RN-019 a 024, RN-046/047.

| Tarefa | Entrega |
|---|---|
| T-08.1 | `GoalService`: progresso automático por evento, conclusão única, expiração e renovação |
| T-08.2 | `StreakService`: avaliação preguiçosa na primeira requisição do dia, respeitando fuso e dias marcados |
| T-08.3 | Consumo automático do Escudo de Sequência |
| T-08.4 | Marcos de sequência com bônus |
| T-08.5 | `TaskService`: geração diária/semanal, no máximo 3 ativas |
| T-08.6 | Views: painel de metas, calendário semanal de sequência, lista de tarefas |
| T-08.7 | Testes com tempo simulado: dia neutro não quebra; dia marcado perdido quebra; escudo protege; virada de fuso |

**Aceite:** simular 3 semanas de uso e a sequência bater com a regra em todos os cenários.

---

## E09 — Economia: Loja, Inventário, Patrimônio, Cofre
**Requisitos:** RF-LOJ, RF-INV, RF-COF, RN-032 a 045.

| Tarefa | Entrega |
|---|---|
| T-09.1 | Repositories de item, compra, inventário e cofre |
| T-09.2 | `ShopService`: validação de requisitos, compra transacional com `price_at_purchase`, upgrades com desconto |
| T-09.3 | `PatrimonyService`: cálculo de patrimônio (carteira + cofre + bens), com cosmético fora da conta |
| T-09.4 | `VaultService`: depósito, saque, rendimento por ciclo, meta de cofre, projeção |
| T-09.5 | **`EconomicCycleService`**: processamento *lazy* de ciclos (valorização, depreciação com piso, custo fixo, renda passiva, inadimplência) — idempotente por ciclo |
| T-09.6 | Regras por faixa: desligar depreciação/custo/inadimplência na Faixa A (RN-038) |
| T-09.7 | Views: loja com saldo + patrimônio no topo, confirmação com impacto explicado, inventário separando bens x cosméticos, tela do cofre |
| T-09.8 | Aviso na Colmeia dos eventos do ciclo (RF-HOM-09) |
| T-09.9 | Testes: saldo insuficiente; compra dupla; 6 semanas offline processadas de uma vez; item vendido por inadimplência; patrimônio conferido no centavo |

**Aceite:** entrar após 6 semanas sem acessar aplica todos os ciclos uma única vez, com extrato claro e nada de saldo negativo.

---

## E10 — Colmeia (Home)
**Requisitos:** RF-HOM-01 a 09.

| Tarefa | Entrega |
|---|---|
| T-10.1 | `HomeService`/agregador: uma consulta agregada por bloco, sem N+1 (RNF-04) |
| T-10.2 | Cabeçalho: nível + barra de XP, saldo de mel, patrimônio, sequência |
| T-10.3 | Bloco da **meta mais próxima do vencimento**: título, %, dias restantes, mel de recompensa |
| T-10.4 | Trilha de favos em hexágonos com estados |
| T-10.5 | Tarefas do dia + eventos do ciclo |
| T-10.6 | Botão "Continuar" resolvendo a próxima célula pendente |
| T-10.7 | Testes de integração + medição de tempo da página (RNF-01) |

**Aceite:** a Colmeia carrega em ≤2 s com dados semeados de um usuário avançado (≥50 células, ≥10 itens).

---

## E11 — Landing page (papel: designer front-end sênior)
**Guia:** `docs/04-DESIGN-SYSTEM-E-LANDING.md`. **Requisitos:** RF-LAN, RNF-03, RNF-20 a 26.

| Tarefa | Entrega |
|---|---|
| T-11.1 | Design tokens no Tailwind (cores, raio, sombra, tipografia) + inventário dos assets do mascote |
| T-11.2 | Biblioteca de componentes EJS: botão 3D, card em favo, badge de mel, barra de progresso, chama de sequência |
| T-11.3 | Herói com mascote animado e favos em parallax |
| T-11.4 | Seções de conteúdo (problema, como funciona, trilha, jogos, loja/patrimônio, sequência) |
| T-11.5 | Sistema de animação de scroll: revelação por `IntersectionObserver`, parallax em `requestAnimationFrame`, smooth scroll |
| T-11.6 | Seção "para pais e escolas" + FAQ + CTA final + footer |
| T-11.7 | Ajuste de performance e acessibilidade: `prefers-reduced-motion`, contraste, foco, LCP |

**Aceite:** landing rodando a 60 fps no celular, sem *layout shift*, e completamente utilizável com animação desligada.

---

## E12 — Área administrativa
**Requisitos:** RF-ADM-01 a 05, RN-051 a 053.

| Tarefa | Entrega |
|---|---|
| T-12.1 | Autenticação e middleware de admin via join |
| T-12.2 | CRUD de favos, células e conteúdo |
| T-12.3 | CRUD de itens, preços e comportamento econômico |
| T-12.4 | Consulta de auditoria com filtros |
| T-12.5 | Métricas agregadas (P1) |

**Aceite:** usuário comum recebe 403 em toda rota admin; toda ação admin aparece na auditoria.

---

## E13 — Conquistas e liga *(P1, cortável se o prazo apertar)*
T-13.1 catálogo e regras de conquistas · T-13.2 desbloqueio automático por evento · T-13.3 liga semanal por pólen · T-13.4 views.

---

## E14 — Endurecimento e entrega
| Tarefa | Entrega |
|---|---|
| T-14.1 | Varredura de segurança: SQLi, XSS, CSRF, rate limit, headers, sessão |
| T-14.2 | Cobertura de testes conforme RNF-28 e correção das lacunas |
| T-14.3 | Teste de carga simples (30 usuários simultâneos) e ajuste do pool |
| T-14.4 | Dockerfile multi-stage + docker-compose revisados; `.env.example` completo |
| T-14.5 | GitHub Actions: lint + testes no PR; build/push no merge; `npm audit` bloqueante |
| T-14.6 | Script e rotina de backup documentados |
| T-14.7 | Revisão de acessibilidade e responsividade em todas as telas |

---

## E15 — Documentação do TCC
| Tarefa | Entrega |
|---|---|
| T-15.1 | `docs/RASTREABILIDADE.md`: requisito → arquivo → teste |
| T-15.2 | Diagramas: ER, casos de uso, classes, sequência do fluxo de recompensa |
| T-15.3 | Documento de arquitetura com justificativa das decisões (por que camadas, por que sem ORM, por que EJS) |
| T-15.4 | Manual de instalação e execução |
| T-15.5 | Evidências de teste (prints, relatório de cobertura) |
| T-15.6 | Seção de trabalhos futuros: SPA, mobile, painel do responsável, IA de recomendação de conteúdo |

---

## Fluxo do usuário (referência para todas as etapas)

```
LANDING (pública, animada)
   └─ CTA "Começar"
LOGIN / REGISTRO
   └─ registro → consentimento do responsável
ONBOARDING  (bloqueante)
   apelido → faixa de idade → DIAS DISPONÍVEIS → tempo por sessão
   → objetivo inicial → avatar → geração automática de metas
COLMEIA (Home)
   nível+XP · mel · patrimônio · sequência · meta mais próxima (%+prêmio)
   · trilha de favos · tarefas do dia · eventos do ciclo · [Continuar]
      ├─ FAVO → CÉLULA → JOGO → RESULTADO (estrelas, XP, mel, pólen)
      │     └─ volta para a Colmeia com progresso de meta atualizado
      ├─ LOJA (saldo + patrimônio no topo)
      │     └─ item → confirmação com impacto → compra → INVENTÁRIO
      ├─ INVENTÁRIO (bens x cosméticos, valor atual, renda/custo)
      ├─ COFRE (depositar, sacar, meta, projeção)
      └─ PERFIL (editar disponibilidade → recalcula metas)
```

**Fluxos adicionais recomendados** (a incluir no MVP):
1. **Fim de ciclo** — na primeira entrada da semana, uma tela curta de "resumo da semana": rendimento, custos, renda passiva, evolução do patrimônio. Fecha o ciclo pedagógico.
2. **Retorno após ausência** — quem volta depois de dias recebe uma tela acolhedora com o que aconteceu e uma meta ajustada, em vez de sequência zerada e nenhuma explicação.
3. **Primeira compra guiada** — na primeira visita à loja, o mascote explica em 3 passos a diferença entre item que valoriza, item que custa e item que gera renda. É o momento pedagógico mais importante do app.