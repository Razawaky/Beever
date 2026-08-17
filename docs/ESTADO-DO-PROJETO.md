# Estado do projeto

Verdade operacional do Beever. Substitui a versão de 2026-08-12, escrita antes
dos documentos de escopo `docs/01` a `docs/04` existirem.

**Atualizado em:** 2026-08-17 · **Branch:** `refactor/arquitetura-em-camadas` ·
**Último commit:** `4898fa3`

---

## Resumo em 2 minutos

Se você só tem tempo para esta seção, ela basta. O resto do documento é a
evidência por trás dela.

**Onde estamos:** E00 (auditoria) concluída e **E01 (banco de dados) em
andamento** — T-01.1, T-01.2 e T-01.3 entregues. O schema definitivo existe:
7 migrations versionadas, 56 tabelas, 67 foreign keys, 39 `CHECK`, 43 `UNIQUE`,
aplicadas do zero sem erro e reaplicáveis sem erro. O schema anterior está
arquivado em `migrations/_legacy/`, nada apagado.

**O que funciona hoje** (verificado contra MySQL real): cadastro, login, sessão,
onboarding, painel, loja com compra transacional, inventário, e o domínio
cronograma → meta → tarefa com crédito de pontos. Arquitetura em camadas
respeitada: nenhuma SQL fora de repository. 22 testes passando, `npm audit`
limpo, páginas respondendo em menos de 20 ms.

**O que não existe** e o escopo exige: favos, células, trilha, jogos, pólen,
patrimônio, cofre, ciclos econômicos, sequência (streak), conquistas, área
administrativa, CI. O código atual implementa um produto **menor e diferente**
do que os documentos `docs/01`–`04` especificam — o mapa etapa a etapa está na
seção 4.

**O buraco mais sério:** o loop de recompensa está cortado. `creditarXp` não é
chamada por ninguém e `moedasService` não tem `creditar`. Hoje **nenhum XP é
creditado** e mel só sai da carteira, nunca entra. Fecha na E06.

**O que vem agora:** T-01.5 (seeds) e T-01.7 (modelo de dados documentado). O
runner já falha se uma migration aplicada mudar de conteúdo, e existem
`db:reset` e `db:reconcile`. O risco R-01
**materializou-se como previsto**: os 12 repositories consultam tabelas em
português que não existem mais no schema novo, então a aplicação não sobe contra
ele até a E02/E03. O roteiro de correção, repository por repository, está em
[`00-MAPA-DE-NOMES-LEGADO.md`](00-MAPA-DE-NOMES-LEGADO.md), seção 4.

**Duas coisas que mordem:** `npm run lint` falha, mas só por causa de scripts de
plugin de IA — o código do projeto está limpo (DT-02). E o servidor MCP do grafo
não sobe, então toda análise de impacto está sendo manual (R-02).

| Em números | |
|---|---|
| Etapas do roadmap prontas | 1 de 16 (E00); E02 a ~80%, E03 e E09 parciais |
| Endpoints · services · repositories | 26 · 14 · 12 |
| Testes | 35 passando · 7 services sem teste |
| Dívida técnica catalogada | 14 itens abertos (DT-02 a DT-15) |
| Riscos abertos | 2 (R-01 schema, R-02 grafo) |

---

## 1. Como subir o projeto

Passo a passo completo, com pré-requisitos e solução de problemas, em
[`iniciar-proj.md`](../iniciar-proj.md).

```
npm install
cp .env.example .env
docker compose up -d mysql
npm run db:migrate
npm run db:seed
npm run css:build
npm run dev
```

### Ambiente confirmado por execução em 2026-08-17

| Componente | Versão | Onde está declarado |
|---|---|---|
| Node | **v22.22.3** instalado | `.nvmrc` = 22; `engines` pede `>=20`; `Dockerfile` usa `node:22-slim` nos dois estágios |
| Tailwind | **v4.3.3** (`tailwindcss` + `@tailwindcss/cli`) | Configuração por CSS em `src/styles/tailwind.css`; **não existe** `tailwind.config.js`, e na v4 é assim mesmo |
| MySQL | **8.4.11** rodando | `docker-compose.yml` fixa `mysql:8.4`. Os dumps legados vieram de 8.0.46 — atenção a diferenças de sintaxe ao derivar o schema novo na E01 |
| npm audit | **0 vulnerabilidades** | Com e sem dependências de desenvolvimento |

### Scripts do `package.json` — todos executados

| Script | Resultado |
|---|---|
| `npm start` | Sobe na porta 3000; `/health` responde `{"status":"ok","banco":{"conectado":true,"migrationsAplicadas":2}}` em 13 ms |
| `npm run dev` | Mesmo `start` com `node --watch` (ver armadilha na seção 7) |
| `npm run db:migrate` | "Nenhuma migration pendente"; segunda execução idêntica — **idempotente confirmado** |
| `npm run db:seed` | Reexecução cria 0 usuários, 0 admins, 0 perfis, 0 itens, 0 conteúdos, 0 jogos — **idempotente confirmado**. Imprime as contas de desenvolvimento |
| `npm run db:reset` | Recusa em produção; recusa sem `-- --sim`; com a confirmação, apagou as 57 tabelas do banco de teste |
| `npm run db:reconcile` | Confere carteira, pólen, XP e cofre contra os livros. Sai com 1 em caso de divergência, para poder virar passo de CI |
| `npm run css:build` | Gera `src/public/css/app.css` (23,6 KB) em 136 ms |
| `npm run css:watch` | Mesmo build em modo observação (não executado) |
| `npm test` | 35 passam, 0 falham |
| `npm run lint` | **Falha** — 3242 erros, todos de `.claude/skills/**` e `.github/skills/**`; nenhum do código do projeto. Ver DT-02 |

Respostas medidas com o servidor no ar: `/` 18 ms, `/login` 11 ms, `/health`
13 ms, `/painel` sem sessão devolve 302. Bem dentro do RNF de 2 s.

Variáveis obrigatórias (`src/config/env.js:9`): `DB_HOST`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME`, `SESSION_SECRET`. As 11 variáveis lidas pelo projeto
estão todas no `.env.example`. Falta só `DB_ROOT_PASSWORD`, que o
`docker-compose.yml:10` usa — hoje funciona pelo valor padrão `root`, mas
deveria estar documentado (ver DT-15).

---

## 2. Feito e verificado

Verificado nesta sessão, por execução, não por leitura de documento.

| Item | Como foi verificado |
|---|---|
| Suíte de testes | `npm test` → **35 passam, 0 falham**, com MySQL no ar |
| **Runner de migrations com checksum** | Editar uma migration já aplicada e rodar `db:migrate` **falha com mensagem clara**, testado de verdade: o arquivo foi alterado, o runner recusou, o arquivo foi restaurado e o runner voltou a passar |
| **Reconciliação livro × cache** | Uma divergência plantada à mão (carteira 100, livro 40) foi detectada e o script saiu com código 1; corrigido o cache, voltou a sair com 0 |
| Separação de camadas | Zero `SELECT`/`INSERT`/`UPDATE`/`DELETE` fora de `src/repositories/`; nenhum controller importa repository; nenhum repository importa service |
| Escape nas views | Nenhum `<%- %>` fora de `include` nas 9 páginas EJS |
| Ausência de `console.log` | Zero em `src/` (as duas ocorrências do grep estão dentro de comentários) |
| Auditoria ligada | `auditoriaRepository.registrar` chamado por 7 services, incluindo compra e conclusão de tarefa |
| Inventário completo | 26 endpoints, 11 controllers, 14 services, 12 repositories, 9 views, 2 migrations, 15 tabelas — em `docs/00-INVENTARIO.md` |
| Design tokens | Bloco `@theme` em `src/styles/tailwind.css` com paleta, raios e tipografia da identidade |
| **Schema novo da E01** | Banco criado do zero em MySQL 8.4: 7 migrations aplicadas pelo runner sem erro, e reaplicadas sem erro (idempotência real, não presumida). 56 tabelas, 67 FKs, 39 `CHECK`, 43 `UNIQUE`, nenhuma coluna `FLOAT`/`DOUBLE`, nenhuma tabela fora de `utf8mb4_0900_ai_ci` |
| **Regras de negócio no banco** | 11 tentativas inválidas testadas contra o banco real, **todas rejeitadas pelo próprio MySQL**: saldo de mel negativo, saldo de cofre negativo, token de sessão repetido, mesmo ciclo econômico duas vezes, XP negativo, dia da semana repetido, total de compra que não bate com preço × quantidade, estrelas fora de 0–3, célula na mesma posição do favo, ledger apontando para usuário inexistente e tempo de sessão fora de 5/10/20. Uma compra válida passou |

Verificado na sessão de 2026-08-12 e **não reexecutado desde então** — tratar
como confiável, mas reconfirmar antes de declarar entrega:

- Fluxo ponta a ponta via curl contra MySQL real (cookies, CSRF, redirects):
  cadastro → onboarding → painel → loja → compra → metas → tarefa → pontos
  creditados.
- Idempotência das migrations (segunda execução: "Nenhuma migration pendente")
  e do seed (reexecução cria 0 registros).
- Débito de moedas atômico: `UPDATE perfil SET moedas = moedas - ? WHERE id = ?
  AND moedas >= ?`, com compra sem saldo bloqueada em 422 sem gravar nada
  parcial.
- Conclusão de tarefa idempotente: `UPDATE ... WHERE progresso < 100` impede
  crédito duplo em clique repetido.

### Bugs do código antigo corrigidos na migração (evidência para o TCC)

1. O cron de expurgo apagaria contas ativas — `AND`/`OR` sem parênteses fazia
   `ultimo_login IS NULL` valer sozinho.
2. Log de exclusão gravava nulos: lia `nome` e `email` de um `SELECT` que só
   trazia `id`.
3. `GET /users` devolvia `{}` por falta de `await`.
4. Login permitia enumerar e-mails (mensagens distintas para e-mail inexistente
   e senha errada).
5. `.transition-all` no CSS resgatado sequestrava o utilitário do Tailwind.

---

## 3. Feito mas não verificado

| Item | Por que está aqui |
|---|---|
| Consentimento do responsável no registro (RNF-34) | Não existe; o registro atual não pede |
| Reconstrução do fluxo em navegador real | Toda a verificação até hoje foi por curl. Nenhuma tela foi aberta em navegador com sessão real desde as mudanças de view no working tree |
| Comportamento sob concorrência | O débito atômico foi testado sequencialmente. Nunca houve teste com duas requisições simultâneas de verdade |
| Revisão do conjunto das fases 1–3 | Agora commitado em `a2e596b` (52 arquivos, +1525 linhas). A suíte passa, mas o conjunto nunca passou por revisão de código como um todo |

---

## 4. Pendente

### Etapa atual

E00 concluída: T-00.1 a T-00.5 entregues. Falta a auditoria de aceite da etapa
antes de abrir a E01.

### Roadmap (`docs/02-ROADMAP-ETAPAS.md`)

| Etapa | Situação | O que falta |
|---|---|---|
| E01 Banco | **em andamento** | T-01.1 a T-01.4 e T-01.6 feitas. Faltam: T-01.5 (seeds: níveis, faixas, domínios, catálogo da seção 6, `reward_configs`, admin de teste), T-01.7 (`docs/MODELO-DE-DADOS.md` + diagrama ER), T-01.8 (subir do zero com `docker-compose` de ponta a ponta). **O `scripts/seed.js` atual ainda popula o schema antigo** e quebra contra o novo — é a T-01.5 |
| E02 Núcleo | ~80% feito | `requireOnboarding` como middleware, request-id no logger, decisão sobre `AuditService` |
| E03 Autenticação | feito com lacunas | Consentimento do responsável; testes de brute force e sessão expirada |
| E04 Onboarding e metas | parcial | **`GoalPlannerService` não existe** — metas são criadas à mão, sem RN-014/015 |
| E05 Conteúdo e trilha | do zero | Favo e célula não existem em lugar nenhum |
| E06 Motor de recompensas | do zero na prática | Ver seção 5, dívida DT-03 |
| E07 Jogos | do zero | Base pronta: `jogo`/`conteudo` seedados e `sessaoJogoRepository` |
| E08 Metas e sequência | parcial | Sem streak, geração automática ou expiração |
| E09 Economia | parcial | Loja e inventário prontos; sem patrimônio, cofre, ciclos econômicos, upgrades |
| E10 Colmeia | parcial | `painel.ejs` existe, mas não é a Colmeia de RF-HOM |
| E11 Landing | parcial | Tokens existem; faltam as seções, animações e as fontes auto-hospedadas |
| E12 Admin | do zero | Uma única rota admin no sistema (`GET /users`) |
| E13 Conquistas e liga | do zero | P1, cortável |
| E14 Endurecimento | do zero | Sem `.github/workflows/` |
| E15 Documentação TCC | do zero | — |

---

## 5. Dívida técnica

Identificadores rastreiam os documentos da E00.

| ID | Dívida | Origem | Tratamento previsto |
|---|---|---|---|
| ~~DT-01~~ | ~~Fases 1–3 não commitadas~~ | R-03 | **Resolvido em 2026-08-17**: commits `c428ba3`, `a2e596b`, `a5f5e9b`, `4898fa3`. Working tree limpo |
| DT-02 | `npm run lint` falha com 3242 erros, **todos** de `.claude/skills/**` e `.github/skills/**` | D-08 | Uma linha de `ignores` no `eslint.config.js`. Bloqueia usar lint como portão de CI |
| DT-03 | Loop de recompensa cortado: `nivelService.creditarXp` sem chamador, `moedasService` sem `creditar` | M-02, D-03 | E06. Hoje **nenhum XP é creditado** e mel só sai, nunca entra |
| DT-04 | Valores de regra fixos em código: `XP_POR_NIVEL = 1000`, `PONTOS_DE_PARTIDA`, `PONTOS_POR_TAREFA_CONCLUIDA = 10` | C-03 | Viram linhas de `reward_configs` na E06 |
| DT-05 | Negociação de conteúdo copiada 9 vezes em 6 controllers | P-01 | Helper único em `src/utils/`, na E02 |
| DT-06 | Três padrões diferentes de contrato entre rotas equivalentes | C-03 | Padronizar na E02 |
| DT-07 | Dois guardas de autenticação com a mesma regra; um declarado dentro de `src/routes/index.js` | P-04, C-01 | Unificar e mover para `src/middlewares/`, na E02 |
| DT-08 | Cobertura de testes rasa: sem teste para `compraService`, `tarefaService`, `metaService`, `moedasService`, `pontosService`, `perfilService`, `authService` | D-12 | Contraria a seção 8 do `PROMPT-MESTRE`; cobrir junto de cada etapa |
| DT-09 | Dependência `cors` instalada e nunca importada | M-04 | Remover |
| DT-10 | Fontes Lilita One e Nunito não são servidas; ambos os papéis caem em `system-ui` | T-00.3, seção 5 | E11 |
| DT-11 | `header.ejs` e `footer.ejs` usados por 2 de 9 páginas; sem motor de layout | T-00.2 | E02/E11 |
| DT-12 | Página de edição de perfil não existe; erro 422 de formulário cai na página de erro genérica em vez de voltar ao campo | herdado | E03/E04 |
| DT-13 | Sem workflow de CI (`.github/` só tem arquivos de plugin) | D-10 | E14 |
| DT-14 | Sem catálogo administrável de itens (criar/editar); catálogo vem do seed | herdado | E12 |
| DT-15 | `.env.example` não documenta `DB_ROOT_PASSWORD`, usada pelo `docker-compose.yml:10` | T-00.5 | Uma linha; formalizado na T-14.4 |

### Riscos abertos

- **R-01 — materializado em 2026-08-17.** O schema novo está em `migrations/` e
  os 12 repositories consultam tabelas que não existem mais nele. A aplicação
  **não sobe contra o banco novo** até a E02/E03 realinharem as camadas. O banco
  de desenvolvimento atual continua no schema antigo e a aplicação segue
  funcionando contra ele — só não migre o banco local antes de estar pronto para
  parar de usá-la. `migrations/_legacy/` está intacto.
- **R-02** — Servidor MCP `code-review-graph` não responde (`.mcp.json` aponta
  para `venv/bin/python3 -m code_review_graph`). Toda análise de impacto está
  sendo manual. Investigar antes das etapas que tocam código compartilhado.
- ~~**R-03**~~ — Encerrado: as fases 1–3 estão commitadas.

---

## 6. Decisões travadas

Não reabrir sem motivo novo.

| Decisão | Onde foi registrada |
|---|---|
| `beever.sql` da raiz é a base da E01, reestruturado como DBA; `migrations/001` e `002` vão para `migrations/_legacy/` sem serem apagados | T-00.1, D-01 |
| Identificadores em inglês, comentários/docs/commits em português. Termos de produto (`mel`, `pólen`, `favo`, `patrimônio`) ficam no texto da interface e nos comentários, **não** nos nomes de tabela e coluna | T-00.1 decisão 3, detalhado em `00-MAPA-DE-NOMES-LEGADO.md` |
| Mapa completo `nome legado → nome novo`, tabela e coluna, para a E01 usar | `00-MAPA-DE-NOMES-LEGADO.md` |
| `docs/PROMPT-MESTRE.md` prevalece sobre `CLAUDE.md` em caso de conflito | esta sessão |
| Perfil é 1:1 com usuário; a tela de seleção de perfil estilo Netflix não é recriada | sessão de 2026-08-12 |
| Admin é tabela própria (`admin`), verificada por join, não coluna de tipo no usuário | migration `001` |
| `compra` guarda `preco_unitario` e `preco_total` do momento da compra; nunca recalcula | migration `001` |
| Sem ORM: runner de migration próprio, prepared statements na mão | `CLAUDE.md` |
| Código morto com destino conhecido (`sessaoJogoRepository`, `creditarXp`, assets do mascote) fica onde está | T-00.3 |

---

## 7. Armadilhas a lembrar

- `npm test` precisa do glob **entre aspas** (`"test/**/*.test.js"`). Passar o
  diretório falha com "Cannot find module".
- `src/public/css/app.css` é **gerado** e está no `.gitignore`. Sem
  `npm run css:build`, as páginas vêm sem estilo.
- O seed se recusa a rodar com `NODE_ENV=production`.
- Migration nova deve ser pequena: o MySQL faz commit implícito em DDL, então o
  rollback do runner não desfaz tabelas já criadas.
- `npm run dev` usa `node --watch`, que às vezes **não recarrega
  controllers/services** depois de várias edições seguidas — views `.ejs`
  recarregam sempre, porque o EJS lê o arquivo do disco a cada render. Sintoma:
  404 ou `ReferenceError` numa rota que deveria funcionar. Solução: `Ctrl+C` e
  subir de novo. Dois `npm run dev` ao mesmo tempo não ajudam: só um fica na
  porta 3000, o outro morre calado (`ss -ltnp | grep 3000` mostra o dono).
- **Rota de página e rota JSON no mesmo path se escondem em silêncio** (404).
  Já foi bug real. Ao adicionar rota de página, conferir se o path não está
  montado duas vezes em `routes/index.js` — hoje `/loja` está, e só funciona
  pela ordem de declaração.
- `git status` antes de assumir que algo está salvo. Ver DT-01.

---

## 8. Documentos da E00

| Documento | Conteúdo |
|---|---|
| `docs/00-AUDITORIA-DIVERGENCIAS.md` | T-00.1 — 14 divergências, 3 riscos, mapa etapa a etapa |
| `docs/00-INVENTARIO.md` | T-00.2 — rotas, camadas, views, migrations, assets |
| `docs/00-CODIGO-MORTO-E-DUPLICADO.md` | T-00.3 — código morto, duplicação, desvios de camada |
| `docs/00-MAPA-DE-NOMES-LEGADO.md` | Decisão de checkpoint — nomes de tabela e coluna, legado → novo |

**Próxima tarefa:** T-00.5 — confirmar versões e scripts, e fechar a E00.
