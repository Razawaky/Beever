# Estado do projeto

Verdade operacional do Beever. Substitui a versão de 2026-08-12, escrita antes
dos documentos de escopo `docs/01` a `docs/04` existirem.

**Atualizado em:** 2026-08-17 · **Branch:** `refactor/arquitetura-em-camadas` ·
**Último commit:** `5891668` (2026-08-11)

---

## Leia isto primeiro

O projeto tem uma base em camadas funcionando (autenticação, onboarding, loja e
metas), mas ela implementa um produto **menor e diferente** do que os
documentos de escopo `docs/01`–`04` especificam. A **E00 está concluída**:
T-00.1 a T-00.5 entregues, com o ambiente confirmado por execução real, não por
leitura.

O próximo trabalho de código é a **E01 — banco de dados**, que reestrutura
`beever.sql` da raiz como schema novo e arquiva o schema atual em
`migrations/_legacy/`. Isso vai quebrar temporariamente os repositories, que
consultam tabelas em português (risco R-01, seção 5).

**Três coisas que mordem se forem esquecidas:** as fases 1–3 (loja, metas,
views) estão só no working tree, sem commit; `npm run lint` falha por causa de
scripts de plugin, não do código do projeto; e o servidor MCP do grafo não sobe.

---

## 1. Como subir o projeto

Passo a passo completo, com pré-requisitos e solução de problemas, em
[`iniciar-proj.md`](../iniciar-proj.md).

```
npm install
cp .env.example .env
docker compose up -d mysql
npm run migrate
npm run seed
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
| `npm run migrate` | "Nenhuma migration pendente"; segunda execução idêntica — **idempotente confirmado** |
| `npm run seed` | Reexecução cria 0 usuários, 0 admins, 0 perfis, 0 itens, 0 conteúdos, 0 jogos — **idempotente confirmado**. Imprime as contas de desenvolvimento |
| `npm run css:build` | Gera `src/public/css/app.css` (23,6 KB) em 136 ms |
| `npm run css:watch` | Mesmo build em modo observação (não executado) |
| `npm test` | 22 passam, 0 falham |
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
| Suíte de testes | `npm test` → **22 passam, 0 falham**, com MySQL no ar |
| Separação de camadas | Zero `SELECT`/`INSERT`/`UPDATE`/`DELETE` fora de `src/repositories/`; nenhum controller importa repository; nenhum repository importa service |
| Escape nas views | Nenhum `<%- %>` fora de `include` nas 9 páginas EJS |
| Ausência de `console.log` | Zero em `src/` (as duas ocorrências do grep estão dentro de comentários) |
| Auditoria ligada | `auditoriaRepository.registrar` chamado por 7 services, incluindo compra e conclusão de tarefa |
| Inventário completo | 26 endpoints, 11 controllers, 14 services, 12 repositories, 9 views, 2 migrations, 15 tabelas — em `docs/00-INVENTARIO.md` |
| Design tokens | Bloco `@theme` em `src/styles/tailwind.css` com paleta, raios e tipografia da identidade |

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
| Compatibilidade das 18 modificações não commitadas | O working tree tem 18 arquivos modificados e 46 novos desde `5891668`; a suíte passa, mas o conjunto nunca foi revisado como um todo |

---

## 4. Pendente

### Etapa atual

E00 concluída: T-00.1 a T-00.5 entregues. Falta a auditoria de aceite da etapa
antes de abrir a E01.

### Roadmap (`docs/02-ROADMAP-ETAPAS.md`)

| Etapa | Situação | O que falta |
|---|---|---|
| E01 Banco | refazer | Schema novo a partir de `beever.sql`; faltam `reward_configs`, `economic_cycles`, `idempotency_keys`, favos e células. Runner de migration aproveitável; seed a reescrever |
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
| DT-01 | Fases 1–3 não commitadas: 18 arquivos modificados, 46 novos, 1 removido desde `5891668` | R-03 | Commitar antes de começar a E01 |
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

- **R-01** — A E01 troca o schema; os repositories atuais consultam tabelas em
  português e vão quebrar. Entre a E01 e o realinhamento das camadas, a
  aplicação não sobe contra o banco novo. Manter `migrations/_legacy/` intacto
  e só limpar o banco local depois da migração das camadas.
- **R-02** — Servidor MCP `code-review-graph` não responde (`.mcp.json` aponta
  para `venv/bin/python3 -m code_review_graph`). Toda análise de impacto está
  sendo manual. Investigar antes das etapas que tocam código compartilhado.
- **R-03** — Ver DT-01: um `git checkout` acidental apaga o trabalho das fases
  1–3.

---

## 6. Decisões travadas

Não reabrir sem motivo novo.

| Decisão | Onde foi registrada |
|---|---|
| `beever.sql` da raiz é a base da E01, reestruturado como DBA; `migrations/001` e `002` vão para `migrations/_legacy/` sem serem apagados | T-00.1, D-01 |
| Identificadores em inglês, comentários/docs/commits em português, termos de produto (`mel`, `pólen`, `favo`, `patrimonio`) preservados — seção 7.1 do `PROMPT-MESTRE`. `CLAUDE.md` será corrigido, não o contrário | T-00.1, decisão 3 |
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

**Próxima tarefa:** T-00.5 — confirmar versões e scripts, e fechar a E00.
