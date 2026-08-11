# Estado do projeto e como retomar

Documento de continuidade: o que já foi feito na reestruturação, como subir o
projeto do zero e o que falta. A arquitetura de referência é o `CLAUDE.md` na
raiz; este arquivo só registra a execução.

Branch de trabalho: **`refactor/arquitetura-em-camadas`**, a partir de `6eb084b`
na `main`. Nada foi commitado ainda — todo o trabalho está no working tree.

---

## Como subir o projeto

O passo a passo completo, com pré-requisitos, comandos e solução de problemas,
está em **[`iniciar-proj.md`](../iniciar-proj.md)** na raiz.

Resumo: `npm install` → `cp .env.example .env` → `docker compose up -d mysql` →
`npm run migrate` → `npm run seed` → `npm run css:build` → `npm run dev`.

**Os testes de integração exigem MySQL no ar com as migrations aplicadas.** Sem
banco, 1 dos 22 testes falha (`/health`) e é só isso — não é regressão.

---

## O que foi feito

### Fundação (fases 1 e 2 do plano)

Projeto único na raiz, ESM (`"type": "module"`), Node >= 20. Antes eram dois
projetos npm desconexos (`client/` com Vite e `server/` com CommonJS).

- `src/config/env.js` — única porta de entrada para `process.env`, valida na
  inicialização e falha rápido. Nenhum outro arquivo lê `process.env`.
- `src/config/database.js` — pool singleton do `mysql2` mais o helper
  `emTransacao`. O código antigo abria e fechava uma conexão por consulta.
- `src/config/session.js` — `express-session` com store MySQL, cookie
  `httpOnly`/`sameSite`/`secure` em produção, id de sessão em UUID v4.
- `src/config/logger.js` — pino, com redaction de senha e cookie.
- Middlewares: `csrf` (synchronizer token na sessão), `errorHandler` (global,
  responde JSON ou EJS conforme o `Accept`, nunca vaza stack em produção),
  `notFound`, `rateLimiters` (global, autenticação e compra), `requireAuth`,
  `requireAdmin`, `validate` (express-validator).
- `src/app.js` monta o Express sem `listen`, para os testes usarem supertest;
  `src/server.js` sobe o servidor, agenda o cron e faz shutdown limpo.
- Views EJS com partials (`head`, `header`, `footer`); não há motor de layout,
  cada página inclui os partials.

### Migrations

`scripts/migrate.js` é um runner próprio (sem ORM, como o CLAUDE.md exige): lê
`migrations/*.sql` em ordem lexical, controla o aplicado em `schema_migrations`,
roda cada arquivo em transação e é idempotente.

`migrations/001_schema_inicial.sql` cria 15 tabelas com foreign keys e CHECK
constraints. O schema antigo (`docs/legacy/beever.sql`) não tinha **nenhuma**
foreign key. Decisões de modelagem, todas aprovadas:

| Decisão | Antes |
|---|---|
| `perfil.id_usuario` UNIQUE (1:1 com usuário) | 1:N, estilo Netflix, com senha por perfil |
| Tabela `admin` (`id_admin` + `user_id_user`) | Coluna `usuario.tipo_usuario` |
| `sessao_jogo` separada de `sessions` | Tabela `sessao` misturava as duas |
| `nivel.id_perfil` | `nivel.id_user` |
| Tabela `auditoria` única | 4 tabelas de log ad-hoc |
| Nomes em português | — |

`compra` grava `preco_unitario` e `preco_total` no momento da compra; o preço
nunca é recalculado a partir de `item.preco`.

### Migração do código antigo (as 7 etapas do `ALTERACAO.MD`)

Feita com `git mv` para preservar histórico. `server/models/*` viraram
repositories (não `src/models/`, porque só repositories podem tocar o banco);
`server/routes/*` foram para `src/routes/` mantendo só o wiring, com a lógica
extraída para controllers e services.

Três merges manuais: `db/conn.js` cedeu lugar ao pool; `middleware/sessao.js`
cedeu ao `config/session.js` novo, doando o `genid` UUID; `server.js` teve o
**cron de expurgo de contas inativas preservado** em
`src/services/limpezaService.js`.

`client/` e `server/` foram removidos após confirmação, com o CSS aproveitável
resgatado para `src/styles/tema.css` e `src/styles/trilha.css`, importados pelo
Tailwind. As 12 imagens estão em `src/public/img/`.

### Bugs do código antigo corrigidos na conversão

1. **Expurgo apagaria contas ativas.** O SQL do cron misturava `AND` e `OR` sem
   parênteses, então `ultimo_login IS NULL` valia sozinho — qualquer conta
   recém-criada seria apagada na primeira execução.
2. **Log de exclusão gravava nulos.** Lia `nome` e `email` de um `SELECT` que só
   trazia `id`.
3. **`GET /users` devolvia `{}`.** Faltava `await` na chamada do model.
4. **Login permitia enumerar e-mails.** Mensagens diferentes para e-mail
   inexistente e senha errada; agora é uma só.
5. **`.transition-all` sequestrava o utilitário do Tailwind.** Regra de mesmo
   nome no CSS resgatado, agora comentada em `src/styles/tema.css`.

Dois bugs meus, achados pelos testes: `erro.ejs` não compilava (comentário EJS
com tags aninhadas) e o `errorHandler` não checava `res.headersSent`.

---

## Situação atual da verificação

- `npm run lint` — **limpo** (era 254 erros antes da migração).
- `npm test` — **21 de 22**. O único que falha é `/health`, por falta de MySQL.
- Servidor sobe e responde: `GET /` 200, `/health` 503 (sem banco),
  `/sessao/check` 401, `/perfil/meu` 401, `/users` 401, estáticos 200.

### Nunca executado por falta de banco

O daemon do Docker está inativo nesta máquina e não há MySQL local. **Ao
retomar, comece por aqui:**

```bash
sudo systemctl start docker && docker compose up -d mysql
npm run migrate && npm run migrate   # a 2ª vez prova a idempotência
npm run seed
npm test                             # esperado: 22/22
```

Falta confirmar, tudo dependente do banco: as migrations aplicando de verdade,
as foreign keys em `information_schema`, o seed, o `/health` em 200 e o fluxo
completo de login (incluindo o CSRF aceitando um token válido — hoje só está
provado que ele bloqueia quem não manda token).

---

## O que falta implementar

1. **Telas em EJS.** As 10 páginas de `client/pages/` foram removidas e precisam
   ser reescritas como views. O JS de jogo (`desafios.js`, 726 linhas;
   `shop.js`, 469; `onboarding.js`, 285) guardava estado em `localStorage` e
   precisa passar a consumir os controllers. Tudo recuperável em
   `git show 6eb084b:client/...`.
2. **Domínio ainda sem código:** loja (`item`, `compra`, `inventario`),
   cronograma/meta/tarefa e jogo/sessão de jogo têm tabela e repository parcial,
   mas não têm service, controller nem rota. Ao implementar a loja, lembre que
   `pontosService` e `moedasService` devem ser criados separados do
   `nivelService` — o CLAUDE.md proíbe misturar XP, pontos e moedas.
3. **CI/CD.** Falta o workflow do GitHub Actions (lint + testes no PR, build e
   push da imagem no merge, `npm audit` bloqueante). O `Dockerfile` multi-stage
   e o `docker-compose.yml` já existem.
4. **Limpeza pendente:** `cors` está instalado (veio do `server/package.json` e
   foi mantido para não perder dependência) mas **não está ligado** — sem front
   separado não há outra origem. Pode sair.
5. **Rotas JSON e CSRF.** As rotas de API exigem `x-csrf-token`, mas nenhuma
   página expõe o token hoje. Resolve-se quando as views EJS renderizarem o
   campo `_csrf` nos formulários.

---

## Armadilhas a lembrar

- `npm test` precisa do glob **entre aspas** (`"test/**/*.test.js"`). Passar o
  diretório (`node --test test/`) falha com "Cannot find module".
- `src/public/css/app.css` é **gerado** e está no `.gitignore`. Rode
  `npm run css:build` depois de clonar, senão as páginas vêm sem estilo.
- O seed se recusa a rodar com `NODE_ENV=production`.
- Ao criar migration nova, mantenha o arquivo pequeno: o MySQL faz commit
  implícito em DDL, então o rollback do runner não desfaz tabelas já criadas.
