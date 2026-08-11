# Como iniciar o projeto Beever

Passo a passo para sair do zero até o servidor rodando. Se algo falhar, veja
**Problemas comuns** no fim.

---

## Pré-requisitos

| Ferramenta | Versão | Como conferir |
|---|---|---|
| Node.js | 20 ou superior (testado no 22) | `node --version` |
| npm | 10 ou superior | `npm --version` |
| Docker + Compose | qualquer versão recente | `docker --version` |

O Docker é usado só para o MySQL. Se você já tem um **MySQL 8 instalado na
máquina**, pode pular o passo 3 e apontar o `.env` para ele.

---

## Passo 1 — Instalar as dependências

```bash
npm install
```

Um único `package.json`, na raiz. Não existe mais `npm install` dentro de
`client/` ou `server/` — essas pastas foram removidas na reestruturação.

## Passo 2 — Criar o arquivo de configuração

```bash
cp .env.example .env
```

Abra o `.env` e ajuste dois valores:

- **`DB_PASSWORD`** — a senha do usuário `beever` no MySQL. Em desenvolvimento
  com Docker, use `beever` (é o valor que o `docker-compose.yml` assume por
  padrão).
- **`SESSION_SECRET`** — qualquer texto longo em desenvolvimento. Em produção,
  gere um de verdade com `openssl rand -base64 48`.

A aplicação **não sobe** se faltar `DB_HOST`, `DB_USER`, `DB_PASSWORD`,
`DB_NAME` ou `SESSION_SECRET`: a validação acontece na inicialização, de
propósito, para o erro aparecer na hora e não no meio de uma requisição.

## Passo 3 — Subir o banco de dados

```bash
docker compose up -d mysql
```

Se der erro de conexão com o daemon do Docker, ligue-o primeiro:

```bash
sudo systemctl start docker
```

Para conferir que o container está de pé e saudável:

```bash
docker compose ps
```

## Passo 4 — Criar o schema

```bash
npm run migrate
```

Aplica os arquivos de `migrations/` em ordem e registra o que já rodou na tabela
`schema_migrations`. É **idempotente**: rodar de novo não reaplica nada e não dá
erro — deve responder `Nenhuma migration pendente`.

## Passo 5 — Popular dados de desenvolvimento

```bash
npm run seed
```

Cria duas contas de teste, um perfil e um nível para cada, seis itens de loja,
um conteúdo e um jogo. Também é idempotente.

| Conta | E-mail | Senha |
|---|---|---|
| Comum | `ana@beever.dev` | `beever123` |
| Administrador | `admin@beever.dev` | `admin1234` |

O seed se recusa a rodar com `NODE_ENV=production` — as senhas acima são
públicas.

## Passo 6 — Compilar o CSS

```bash
npm run css:build
```

Gera `src/public/css/app.css` a partir de `src/styles/`. **Esse arquivo não está
no repositório** (é gerado, e está no `.gitignore`), então sem este passo as
páginas carregam sem estilo nenhum.

Durante o desenvolvimento, deixe rodando em outro terminal:

```bash
npm run css:watch
```

## Passo 7 — Subir o servidor

```bash
npm run dev
```

Abra <http://localhost:3000>. Para confirmar que a aplicação está falando com o
banco:

```bash
curl http://localhost:3000/health
```

A resposta deve trazer `"status": "ok"` e `"conectado": true`. Se vier
`"degradado"` com HTTP 503, o MySQL não está acessível — volte ao passo 3.

---

## Comandos disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor com `node --watch` na porta 3000 |
| `npm start` | Servidor sem watch (usado em produção) |
| `npm run migrate` | Aplica as migrations pendentes |
| `npm run seed` | Popula dados de desenvolvimento |
| `npm run css:build` | Compila o Tailwind uma vez |
| `npm run css:watch` | Compila o Tailwind em modo watch |
| `npm test` | Roda os testes unitários e de integração |
| `npm run lint` | ESLint no projeto inteiro |

---

## Rodar os testes

```bash
npm test
```

Os testes de integração **precisam do MySQL no ar com as migrations
aplicadas** — eles sobem o app de verdade e batem no banco. Sem banco, o teste
do `/health` falha e os demais passam.

---

## Problemas comuns

**`failed to connect to the docker API` no passo 3.**
O daemon do Docker está parado. Rode `sudo systemctl start docker` e tente de
novo.

**A página abre sem estilo, tudo desalinhado.**
Faltou o `npm run css:build`. O `app.css` é gerado e não vem no clone.

**`Variáveis de ambiente obrigatórias ausentes` ao subir o servidor.**
O `.env` não existe ou está incompleto. Refaça o passo 2.

**`/health` responde 503 e os testes de integração falham.**
O MySQL não está acessível. Confira `docker compose ps` e se as credenciais do
`.env` batem com as do `docker-compose.yml`.

**`ER_NO_SUCH_TABLE` em alguma consulta.**
As migrations não foram aplicadas nesse banco. Rode `npm run migrate`.

**Porta 3000 já em uso.**
Mude `PORT` no `.env`, ou derrube o processo antigo com
`pkill -f "node src/server.js"`.

**`Cannot find module` ao rodar os testes manualmente.**
O `node:test` precisa do glob **entre aspas**. Use
`node --test "test/**/*.test.js"`, não `node --test test/`.

---

## Onde continuar

- **`CLAUDE.md`** — a arquitetura de referência: camadas, regras de segurança e
  padrões que todo código novo deve seguir.
- **`docs/ESTADO-DO-PROJETO.md`** — o que já foi construído, o que ainda não foi
  verificado e o que falta implementar.
