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
npm run db:migrate
```

Aplica os arquivos de `migrations/` em ordem e registra o que já rodou na tabela
`schema_migrations`, junto com o checksum de cada arquivo. É **idempotente**:
rodar de novo não reaplica nada e não dá erro — deve responder
`Nenhuma migration pendente`.

São oito migrations, que criam 56 tabelas. O schema anterior do projeto está
arquivado em `migrations/_legacy/` e **não é aplicado** — está lá como
referência histórica. O modelo completo está explicado em
[`docs/MODELO-DE-DADOS.md`](docs/MODELO-DE-DADOS.md).

Se o runner recusar com *"Migration já aplicada foi alterada depois"*, é
proteção: alguém editou um arquivo que o banco já tinha aplicado, o que faria
ambientes divergirem em silêncio. Ou você cria uma migration nova com a
correção, ou recria o banco (ver "Recomeçar do zero", mais abaixo).

## Passo 5 — Popular dados de desenvolvimento

```bash
npm run db:seed
```

Aplica os arquivos de `scripts/seeds/` em ordem: curva de níveis, tabelas de
domínio, o catálogo de 37 itens da loja, a configuração de recompensas, dois
favos de exemplo com oito células, e as duas contas abaixo. Também é
idempotente — rodar três vezes seguidas deixa o banco igual.

A conta comum nasce **jogável**: primeiro favo concluído, um item no
inventário, mel no cofre, uma meta em andamento e sequência ativa. É o que
permite abrir o app e ver algo além de tela vazia.

| Conta | E-mail | Senha |
|---|---|---|
| Comum | `ana@beever.dev` | `beever123` |
| Administrador | `admin@beever.dev` | `admin1234` |

O seed se recusa a rodar com `NODE_ENV=production` — as senhas acima são
públicas.

Para conferir que os saldos batem com os livros:

```bash
npm run db:reconcile
```

Os três livros de recompensa (mel, pólen, XP) são a verdade; `wallets`,
`user_levels` e `vaults` são cache. O script compara os dois lados nas sete
conferências e sai com erro se algum divergir. Deve responder
`Livros e saldos em cache batem`.

### Recomeçar do zero

```bash
npm run db:reset -- --sim
npm run db:migrate
npm run db:seed
```

`db:reset` apaga **todas** as tabelas do banco configurado, sem backup. Recusa
rodar com `NODE_ENV=production` e recusa sem o `-- --sim`. Use quando uma
migration já aplicada precisar mudar.

### Backup

```bash
npm run db:backup
```

Grava um dump completo em `backups/` (pasta ignorada pelo git, porque contém
dados reais e hashes de senha), com o nome `beever-AAAAMMDD-HHMM.sql`. Ao
contrário do reset e do seed, **este roda em produção** — é lá que ele importa.

A retenção apaga os dumps com mais de 7 dias, e apaga **só os que ela mesma
cria**: arquivo com outro nome é marco guardado de propósito e nunca é tocado.
Para guardar um dump antes de uma mudança grande, renomeie-o.

Periodicidade recomendada: **diária, fora do horário de uso, com retenção de 7
dias**. Em um host com cron:

```
0 3 * * *  cd /caminho/do/beever && /usr/bin/npm run db:backup >> /var/log/beever-backup.log 2>&1
```

Ajuste a retenção com `BACKUP_RETENCAO_DIAS`.

### Restauração

```bash
npm run db:restore -- --sim              # o dump mais recente
npm run db:restore -- --sim arquivo.sql  # um dump específico
```

Sobrescreve as tabelas do banco com o conteúdo do dump. Como apaga dados, tem as
mesmas guardas do reset: recusa `NODE_ENV=production` e exige o `--sim`.

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
| `npm run db:migrate` | Aplica as migrations pendentes |
| `npm run db:seed` | Popula dados de desenvolvimento |
| `npm run db:reset -- --sim` | Apaga todas as tabelas (só desenvolvimento) |
| `npm run db:reconcile` | Confere se os saldos batem com os livros |
| `npm run db:backup` | Dump em `backups/`, com retenção de 7 dias |
| `npm run db:restore -- --sim` | Restaura o banco a partir de um dump (só desenvolvimento) |
| `npm run test:db` | Como `npm test`, mas **exige** MySQL no ar. É o comando do CI |
| `npm run css:build` | Compila o Tailwind uma vez |
| `npm run css:watch` | Compila o Tailwind em modo watch |
| `npm test` | Roda os testes unitários e de integração |
| `npm run lint` | ESLint no projeto inteiro |

---

## Rodar os testes

```bash
npm test
```

Os testes de integração precisam do MySQL no ar. **Sem banco, eles se pulam
sozinhos** com um aviso dizendo o porquê — quem acabou de clonar não leva erro
incompreensível.

Isso é conveniência local, não permissão para entregar código sem testar o
banco. No CI, o comando é outro:

```bash
npm run test:db
```

Ele exige o banco: se o MySQL não estiver de pé, a suíte falha em vez de pular.

Os testes de banco **não usam o seu banco de desenvolvimento**. O arnês em
`test/helpers/banco.js` cria um `beever_teste` do zero, aplica migrations e
seed, roda as asserções e apaga o banco no fim. O `beever` não é tocado.

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
As migrations não foram aplicadas nesse banco. Rode `npm run db:migrate`.

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
