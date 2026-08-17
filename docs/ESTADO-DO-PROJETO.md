# Estado do projeto

Verdade operacional do Beever. Substitui a versão de 2026-08-12, escrita antes
dos documentos de escopo `docs/01` a `docs/04` existirem.

**Atualizado em:** 2026-08-17 · **Branch:** `refactor/arquitetura-em-camadas` ·
**Último commit:** `df9dfc9` + o fechamento da E01

---

## Como retomar o trabalho

Se a sessão anterior acabou no meio, comece por aqui:

1. Leia o **Resumo em 2 minutos**, logo abaixo.
2. `git log --oneline -15` — as mensagens de commit carregam o porquê de cada
   decisão, não só o quê.
3. A tabela de tarefas da etapa atual está na **seção 4**. A próxima tarefa não
   marcada é a próxima a fazer.
4. As decisões já tomadas estão na **seção 6**. Não reabra sem motivo novo.
5. `docker compose up -d mysql && npm test` confirma que o ambiente está de pé.

Nada de importante desta sessão vive só na conversa: o que foi decidido está
neste documento e nos commits; o que foi construído está no repositório.

---

## Resumo em 2 minutos

Se você só tem tempo para esta seção, ela basta. O resto do documento é a
evidência por trás dela.

**Onde estamos:** E00 (auditoria) e **E01 (banco de dados) concluídas e
auditadas**. O banco definitivo existe e roda: 8 migrations versionadas, 56
tabelas, 67 foreign keys, 39 `CHECK`, 43 `UNIQUE`, auditoria imutável por
gatilho, seeds com usuário demo jogável, e o ciclo `docker compose up` →
`db:migrate` → `db:seed` → `db:reconcile` funcionando do zero. O schema anterior
está arquivado em `migrations/_legacy/`, nada apagado.

**A aplicação está temporariamente fora do ar** — e isso era esperado. Os 12
repositories ainda consultam as tabelas em português do schema antigo, então o
login devolve 500 com `Table 'beever.usuario' doesn't exist`. É o risco R-01,
previsto desde a T-00.1 e aceito ao trocar o schema. O código das telas continua
lá (cadastro, login, onboarding, painel, loja com compra transacional,
inventário, metas e tarefas); o que falta é apontá-lo para os nomes novos, que é
a E02/E03. O dump do banco anterior está guardado, caso precise do app de pé
antes disso.

**O que está saudável:** arquitetura em camadas respeitada (nenhuma SQL fora de
repository), 62 testes passando — dos quais 21 batem num banco real —, `npm
audit` limpo, páginas que não consultam o banco respondendo em menos de 20 ms.

**O que não existe** e o escopo exige: favos, células, trilha, jogos, pólen,
patrimônio, cofre, ciclos econômicos, sequência (streak), conquistas, área
administrativa, CI. O código atual implementa um produto **menor e diferente**
do que os documentos `docs/01`–`04` especificam — o mapa etapa a etapa está na
seção 4.

**O buraco mais sério:** o loop de recompensa está cortado. `creditarXp` não é
chamada por ninguém e `moedasService` não tem `creditar`. Hoje **nenhum XP é
creditado** e mel só sai da carteira, nunca entra. Fecha na E06.

**O que vem agora:** **E02 em andamento.** A T-02.1 entregou a rede de teste com
banco real; a próxima tarefa é o realinhamento dos 12 repositories ao schema
novo, que é o que devolve a aplicação ao ar. O modelo
está documentado em [`MODELO-DE-DADOS.md`](MODELO-DE-DADOS.md) e o mapa de nomes
em [`00-MAPA-DE-NOMES-LEGADO.md`](00-MAPA-DE-NOMES-LEGADO.md). O risco R-01
**materializou-se como previsto**: os 12 repositories consultam tabelas em
português que não existem mais no schema novo, então a aplicação não sobe contra
ele até a E02/E03. O roteiro de correção, repository por repository, está em
[`00-MAPA-DE-NOMES-LEGADO.md`](00-MAPA-DE-NOMES-LEGADO.md), seção 4.

**Duas coisas que mordem:** `npm run lint` falha, mas só por causa de scripts de
plugin de IA — o código do projeto está limpo (DT-02). E o servidor MCP do grafo
não sobe, então toda análise de impacto está sendo manual (R-02).

| Em números | |
|---|---|
| Etapas do roadmap prontas | 2 de 16 (E00 e E01); E02 a ~80% de código escrito, mas desalinhado do schema novo |
| Endpoints · services · repositories | 26 · 14 · 12 |
| Testes | 62 passando · 7 services sem teste |
| Dívida técnica catalogada | 15 itens abertos (DT-02 a DT-17, menos a DT-16 resolvida) |
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
| `npm start` | Sobe na porta 3000; `/health` responde `{"status":"ok","banco":{"conectado":true,"migrationsAplicadas":7}}`. Rotas que consultam o banco devolvem 500 até a E02/E03 — ver R-01 |
| `npm run dev` | Mesmo `start` com `node --watch` (ver armadilha na seção 7) |
| `npm run db:migrate` | "Nenhuma migration pendente"; segunda execução idêntica — **idempotente confirmado** |
| `npm run db:seed` | Aplica os 6 arquivos de `scripts/seeds/`. Três execuções seguidas deixam as mesmas contagens — **idempotente confirmado**. Imprime o estado do banco e as contas de desenvolvimento |
| `npm run db:reset` | Recusa em produção; recusa sem `-- --sim`; com a confirmação, apagou as 57 tabelas do banco de teste |
| `npm run db:reconcile` | Sete conferências: mel, pólen, XP, cofre, nível contra a curva, próximo nível e progresso do favo. Sai com 1 em caso de divergência, para poder virar passo de CI |
| `npm run db:backup` | Dump completo em `backups/`, com retenção de 7 dias. Roda em produção, ao contrário do reset e do seed. Periodicidade documentada em `iniciar-proj.md` |
| `npm run css:build` | Gera `src/public/css/app.css` (23,6 KB) em 136 ms |
| `npm run css:watch` | Mesmo build em modo observação (não executado) |
| `npm test` | 62 passam, 0 falham. Sem MySQL, os 21 testes de banco se pulam com aviso |
| `npm run test:db` | Mesma suíte exigindo banco no ar — falha em vez de pular. É o comando do CI |
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
| Suíte de testes | `npm test` → **62 passam, 0 falham**, com MySQL no ar |
| **Integridade do banco, agora automatizada (DT-16)** | 21 testes de integração sobem um banco `beever_teste` do zero, aplicam migrations e seed, e exigem que o MySQL recuse as 13 gravações inválidas da E01. Verificado também o caminho sem banco (pula com aviso) e o do CI (`TESTES_DE_BANCO=1` falha) |
| **Auditoria imutável (RNF-17)** | Migration `008` põe dois gatilhos em `audit_logs`. Testado com o usuário da aplicação: `UPDATE` e `DELETE` recusados com mensagem citando a regra, `INSERT` continua funcionando. Não é mais convenção — é o banco recusando |
| **Requisito de admin sobrevive ao seed** | O `db:seed` limpa apenas os requisitos dos itens que ele próprio declara. Verificado: requisito criado à mão em `skin-dourada` continuou lá depois de reexecutar o seed |
| **Runner de migrations com checksum** | Editar uma migration já aplicada e rodar `db:migrate` **falha com mensagem clara**, testado de verdade: o arquivo foi alterado, o runner recusou, o arquivo foi restaurado e o runner voltou a passar |
| **Reconciliação livro × cache** | Uma divergência plantada à mão (carteira 100, livro 40) foi detectada e o script saiu com código 1; corrigido o cache, voltou a sair com 0 |
| **Seed completo** | Ciclo `db:reset` → `db:migrate` → `db:seed` → `db:reconcile` rodado do zero: 20 níveis, 3 faixas, 6 tipos de jogo, 54 configurações de recompensa, 37 itens, 16 requisitos de compra, 2 favos, 8 células, 8 conteúdos, 2 contas. Três execuções seguidas do seed dão as mesmas contagens |
| **Usuário demo jogável** | `ana@beever.dev` nasce com o primeiro favo 100% concluído, 5 sessões de jogo fechadas, patrimônio de 268 (19 de mel + 51 no cofre + patinete a 198), 1 meta concluída e 1 em andamento, 2 tarefas, sequência de 3 dias e um ciclo econômico processado. A reconciliação passa nos quatro livros |
| Separação de camadas | Zero `SELECT`/`INSERT`/`UPDATE`/`DELETE` fora de `src/repositories/`; nenhum controller importa repository; nenhum repository importa service |
| Escape nas views | Nenhum `<%- %>` fora de `include` nas 9 páginas EJS |
| Ausência de `console.log` | Zero em `src/` (as duas ocorrências do grep estão dentro de comentários) |
| Auditoria ligada | `auditoriaRepository.registrar` chamado por 7 services, incluindo compra e conclusão de tarefa |
| Inventário completo | 26 endpoints, 11 controllers, 14 services, 12 repositories, 9 views, 2 migrations, 15 tabelas — em `docs/00-INVENTARIO.md` |
| Design tokens | Bloco `@theme` em `src/styles/tailwind.css` com paleta, raios e tipografia da identidade |
| **Schema novo da E01** | Banco criado do zero em MySQL 8.4: 7 migrations aplicadas pelo runner sem erro, e reaplicadas sem erro (idempotência real, não presumida). 56 tabelas, 67 FKs, 39 `CHECK`, 43 `UNIQUE`, nenhuma coluna `FLOAT`/`DOUBLE`, nenhuma tabela fora de `utf8mb4_0900_ai_ci` |
| **Regras de negócio no banco** | 11 tentativas inválidas testadas contra o banco real, **todas rejeitadas pelo próprio MySQL**: saldo de mel negativo, saldo de cofre negativo, token de sessão repetido, mesmo ciclo econômico duas vezes, XP negativo, dia da semana repetido, total de compra que não bate com preço × quantidade, estrelas fora de 0–3, célula na mesma posição do favo, ledger apontando para usuário inexistente e tempo de sessão fora de 5/10/20. Uma compra válida passou |

| **Subida do zero (T-01.8)** | Volume do MySQL apagado e recriado. `docker compose up -d mysql` → `db:migrate` → `db:seed` → `db:reconcile` rodou limpo **sem nenhum `GRANT` manual** — o contêiner criou banco, usuário e permissão sozinho, que é o caminho de quem clona o projeto. 57 tabelas, 7 migrations com checksum registrado |
| **Exclusão de conta (RN-053)** | Conta descartável criada, apagada e conferida: carteira e disponibilidade foram junto por `CASCADE`, e a linha de `audit_logs` **sobreviveu** — que é exatamente o comportamento que a regra pede |

Verificado na sessão de 2026-08-12, **contra o schema antigo, que não existe
mais**. Fica como registro histórico do que funcionou até a E01; nada disso vale
como garantia sobre o banco atual:

- Fluxo ponta a ponta via curl: cadastro → onboarding → painel → loja → compra
  → metas → tarefa → pontos creditados.
- Débito de moedas atômico, com compra sem saldo bloqueada em 422.
- Conclusão de tarefa idempotente por `UPDATE ... WHERE progresso < 100`.

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

**E02 — núcleo da aplicação, reordenada.** O roadmap original mandava construir
config, logger, error handler e middlewares, que já existem desde a migração
para camadas (divergência D-06). A ordem real, decidida no checkpoint de
abertura da E02, está na tabela abaixo e também no próprio
`02-ROADMAP-ETAPAS.md`.

| Tarefa | Situação |
|---|---|
| T-02.1 Arnês de teste com banco real + asserções de integridade | **feita** (commit `b9d9f84`) |
| T-02.2 Realinhar os 12 repositories ao schema novo, com teste de integração para cada | **próxima** |
| T-02.3 Realinhar services e controllers que dependem deles | pendente |
| T-02.4 `requireOnboarding` como middleware (hoje é checagem espalhada em controllers) | pendente |
| T-02.5 Request-id no logger | pendente |
| T-02.6 `AuditService` com API única, gravando em `audit_logs` | pendente |
| T-02.7 Layout EJS base, hoje só partials incluídos à mão | pendente |

A T-02.2 é a que devolve a aplicação ao ar.

### Roadmap (`docs/02-ROADMAP-ETAPAS.md`)

| Etapa | Situação | O que falta |
|---|---|---|
| E01 Banco | **concluída e auditada** | T-01.1 a T-01.8 entregues, 12 de 12 no checklist de aceite, mais os 5 itens que a auditoria da etapa apontou: auditoria imutável, reconciliação completa, seed que não apaga trabalho de admin, `iniciar-proj.md` atualizado e script de backup (RNF-19). O que sobrou virou DT-16 (E02), DT-04 (E06) e DT-17 (E05), cada um com dono |
| E02 Núcleo | **em andamento, reordenada** | T-02.1 feita. Ver a tabela de tarefas logo acima — a etapa virou o realinhamento das camadas ao schema novo, mais o pouco que faltava do escopo original |
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
| DT-04 | **RN-006 ainda violada no código.** `reward_configs` existe e está semeada com 54 linhas, e `levels` tem a curva — mas `nivelService.js:9` segue com `XP_POR_NIVEL = 1000` e `pontosService.js:10` com `PONTOS_POR_TAREFA_CONCLUIDA = 10`. Criar a tabela não cumpre a regra; falta o service ler dela | C-03, auditoria da E01 (L-03) | **E06, com dono declarado.** Não pode chegar na entrega assim |
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
| DT-15 | `.env.example` não documenta `DB_ROOT_PASSWORD`, usada pelo `docker-compose.yml` | T-00.5 | Uma linha; formalizado na T-14.4 |
| ~~DT-16~~ | ~~Nenhum teste automatizado cobre o banco~~ | auditoria da E01, L-01 | **Resolvido na T-02.1**: 21 testes de integração com banco real. Segue verdade que nenhum teste cobre rota autenticada — isso volta com os repositories |
| DT-17 | Conteúdo semeado só na faixa A: B e C não têm favo próprio. Pela RN-029 eles veem o conteúdo das faixas anteriores, então não quebra — mas não dá para testar a segmentação por faixa | auditoria da E01, L-07 | E05 |

### Riscos abertos

- **R-01 — ativo desde 2026-08-17.** O banco de desenvolvimento foi recriado com
  o schema novo, e **a aplicação não funciona mais contra ele** até a E02/E03
  realinharem os 12 repositories. Sintoma medido: `/` e `/login` respondem 200
  (não consultam o banco), `/health` responde `ok` com 7 migrations, e o login
  devolve **500** com `Table 'beever.usuario' doesn't exist` no log — sem vazar
  stack trace para o cliente. O roteiro de correção está em
  `00-MAPA-DE-NOMES-LEGADO.md`, seção 4.
  **Para voltar ao app funcionando antes disso:** restaure o dump em
  `backups/beever-antes-da-E01-*.sql` (ver seção 7).
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
| Nível do usuário fica em `user_levels`, uma linha por usuário; `levels` continua sendo a curva versionada, porque a RN-003 proíbe calcular nível por fórmula | checkpoint da E01 |
| Conteúdo dos jogos em JSON validado pela aplicação, com `version` no registro — não uma tabela por tipo de jogo | checkpoint da E01 |
| `purchases.total_price` é armazenado, não derivado: é registro contábil, mesmo motivo de `price_at_purchase` | checkpoint da E01 |
| Livros append-only são a verdade do saldo; `wallets`, `user_levels` e `vaults` são cache, atualizados na mesma transação e conferidos por `db:reconcile` | E01, resposta ao L-03 da auditoria da E00 |
| **E02 reordenada**: vira o realinhamento das camadas ao schema novo, porque o escopo original dela já estava construído. Lista aprovada no checkpoint e registrada em `02-ROADMAP-ETAPAS.md` | checkpoint da E02 |
| Testes de banco pulam sozinhos sem MySQL, mas `TESTES_DE_BANCO=1` (o `npm run test:db`, comando do CI) faz a ausência do banco virar falha | checkpoint da E02 |
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
- `git status` antes de assumir que algo está salvo.
- **`audit_logs` não aceita `UPDATE` nem `DELETE`** — nem pelo root, sem
  desabilitar os gatilhos da migration `008` de propósito. É a RNF-17
  funcionando, mas surpreende na primeira vez: linha de auditoria criada em
  teste fica lá. Para limpar, só recriando o banco com `db:reset`.
- **O banco de desenvolvimento foi recriado do zero na E01.** O anterior está em
  `backups/beever-antes-da-E01-*.sql` (pasta ignorada pelo git, porque tem dados
  reais e hashes de senha). Para restaurar e ter o app de pé de novo:
  `docker compose exec -T mysql mysql -uroot -proot < backups/<arquivo>.sql`.
  Depois disso, `npm run db:migrate` volta a acusar migration pendente — o banco
  restaurado tem o histórico antigo em `schema_migrations`.

---

## 8. Documentos da E00

| Documento | Conteúdo |
|---|---|
| `docs/00-AUDITORIA-DIVERGENCIAS.md` | T-00.1 — 14 divergências, 3 riscos, mapa etapa a etapa |
| `docs/00-INVENTARIO.md` | T-00.2 — rotas, camadas, views, migrations, assets |
| `docs/00-CODIGO-MORTO-E-DUPLICADO.md` | T-00.3 — código morto, duplicação, desvios de camada |
| `docs/00-MAPA-DE-NOMES-LEGADO.md` | Decisão de checkpoint — nomes de tabela e coluna, legado → novo |
| `docs/01-AUDITORIA-DO-SCHEMA.md` | T-01.1 e T-01.2 — diferenças, riscos e conflitos do schema |
| `docs/MODELO-DE-DADOS.md` | T-01.7 — o banco explicado, com diagramas ER e rastreabilidade regra → tabela |

**Próxima tarefa:** T-00.5 — confirmar versões e scripts, e fechar a E00.
