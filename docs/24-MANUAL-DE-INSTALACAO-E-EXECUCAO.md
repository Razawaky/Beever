# Manual de instalação e execução — T-15.4

Manual canônico do Beever: instalação do zero, execução, testes, banco de
dados, Docker e o caminho até produção. O quickstart `iniciar-proj.md`, na
raiz, agora aponta para cá.

Cada comando citado existe em `package.json` ou em `scripts/` — se um comando
deste manual não existir, o manual está mentindo e o erro é dele.

---

## 1. Pré-requisitos

| Ferramenta | Versão | Como conferir |
|---|---|---|
| Node.js | 20 ou superior (padronizado no 22 — `.nvmrc`, CI) | `node --version` |
| npm | 10 ou superior | `npm --version` |
| Docker + Compose | qualquer versão recente | `docker --version` |
| MySQL 8 | opcional (o Docker é o caminho padrão) | `mysql --version` |

O Docker atende **só o MySQL**. Se você já tem um MySQL 8 instalado, pode pular
a seção 3.2 e apontar o `.env` para ele — o projeto foi desenvolvido dos dois
jeitos.

---

## 2. Obter o código e instalar dependências

```bash
git clone <url-do-repositório> beever
cd beever
npm install
```

Há um único `package.json` na raiz — não existe instalação dentro de `client/`
ou `server/`. O `npm install` baixa as dependências de desenvolvimento também
(ESLint, Tailwind), porque é com elas que se roda lint, CSS e testes.

---

## 3. Configurar o ambiente

### 3.1 Criar o `.env`

```bash
cp .env.example .env
```

Ajuste no mínimo dois valores:

- **`DB_PASSWORD`** — senha do usuário `beever` no MySQL. Com o Docker da
  seção 3.2, o valor padrão do compose é `beever`; mantenha-o ou mude os dois
  lados.
- **`SESSION_SECRET`** — em desenvolvimento, qualquer texto longo. Em produção,
  gere de verdade:
  ```bash
  openssl rand -base64 48
  ```

A aplicação **recusa subir** sem `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
ou `SESSION_SECRET`: a validação acontece na inicialização
(`src/config/env.js`), para o erro aparecer na hora e não no meio de uma
requisição. O `.env` nunca vai para o repositório — e existem duas camadas de
defesa: o `.gitignore` e o `.dockerignore`.

> O `.env.example` é um **contrato coberto por teste**
> (`test/unit/ambienteDeConteiner.test.js`): variável nova que o código passe a
> ler e não for documentada ali reprova a suíte.

### 3.2 Subir o MySQL (Docker)

```bash
docker compose up -d mysql
```

Conferir que está de pé e saudável:

```bash
docker compose ps
```

Se der `failed to connect to the docker API`, o daemon está parado:

```bash
sudo systemctl start docker
```

O contêiner sobe com fuso em UTC e `log-bin-trust-function-creators` — os dois
são necessários (migration 008 cria gatilho na auditoria, e a RN-024 depende da
virada do dia em UTC). **Não remova essas linhas do compose.**

---

## 4. Criar o schema e popular dados de desenvolvimento

```bash
npm run db:migrate
npm run db:seed
```

- `db:migrate` aplica os 23 arquivos de `migrations/` em ordem e registra cada
  um na tabela `schema_migrations` com o checksum. É **idempotente**: rodar de
  novo responde `Nenhuma migration pendente`.
- `db:seed` popula curva de níveis, catálogo de itens, configuração de
  recompensas, dois favos de exemplo e duas contas. Também é idempotente.

O seed cria uma conta comum **jogável** (favo concluído, item no inventário,
mel no cofre, meta em andamento e sequência ativa) — é o que permite abrir o
app e ver algo além de tela vazia.

| Conta | E-mail | Senha |
|---|---|---|
| Comum | `ana@beever.dev` | `beever123` |
| Administrador | `admin@beever.dev` | `admin1234` |

O seed **recusa rodar com `NODE_ENV=production`**: as senhas acima são
públicas.

Conferindo que a verdade bate com o cache:

```bash
npm run db:reconcile
```

Deve responder `Livros e saldos em cache batem`. Se algum dia não bater, os
três livros (mel, pólen, XP) são a verdade; `wallets`, `user_levels` e `vaults`
são cache (ver `docs/23-ARQUITETURA-DO-SISTEMA.md` seção 5.1).

---

## 5. Compilar o CSS

```bash
npm run css:build
```

Gera `src/public/css/app.css` a partir de `src/styles/tailwind.css`. **Este
arquivo não está no repositório** (é gerado; está no `.gitignore`). Sem este
passo as páginas abrem sem estilo nenhum.

Em desenvolvimento, deixe o Tailwind ouvindo em outro terminal:

```bash
npm run css:watch
```

---

## 6. Subir o servidor

```bash
npm run dev          # com node --watch (recarrega ao salvar)
npm start            # sem watch (o modo de produção usa este)
```

Abra <http://localhost:3000>. O `/health` responde com o diagnóstico:

```bash
curl http://localhost:3000/health
```

- `"status": "ok"`, `"conectado": true` — aplicação falando com o banco.
- HTTP 503, `"status": "degradado"` — o MySQL não está acessível. Volte à
  seção 3.2.

---

## 7. Executar a suíte de testes, lint e auditoria

```bash
npm test                 # unitário + integração (sem exigir banco)
npm run test:db          # a mesma suíte, EXIGINDO MySQL (é o comando do CI)
npm run test:carga       # 30 jogadores simultâneos (precisa de banco)
npm run test:cobertura   # portão da RNF-28: 100% de linha nos services
npm run lint             # ESLint no projeto inteiro
npm run audit            # npm audit --omit=dev, bloqueia em alta
npm run evidencias       # prints das telas para o laudo de evidências
```

O que esperar:

- **`npm test` sem MySQL não falha**: os testes de banco se pulam sozinhos com
  um aviso explicando por quê. Isso é conveniência local — não é desculpa para
  entregar sem testar o banco. O CI usa `test:db`, que transforma a ausência
  de MySQL em falha.
- Os testes de banco **não tocam o banco de desenvolvimento**: o arnês cria um
  `beever_teste` do zero, aplica migrations e seed, roda e apaga.
- `test:cobertura` e `test:carga` eram comandos do CI; rodam na máquina local
  quando o MySQL está no ar. O `test:carga` cronometra — runner compartilhado
  tende a ficar lento.
- `npm run audit` só olha o que vai para a produção (`--omit=dev`).

---

## 8. Comandos úteis, um só lugar

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor com watch, porta 3000 |
| `npm start` | Servidor sem watch (produção) |
| `npm run db:migrate` | Aplica migrations pendentes (idempotente) |
| `npm run db:seed` | Dados de desenvolvimento (idempotente) |
| `npm run db:reset -- --sim` | Apaga todas as tabelas (só dev; exige o `--sim`) |
| `npm run db:reconcile` | Confere livros × cache |
| `npm run db:backup` | Dump em `backups/` com retenção de 7 dias |
| `npm run db:restore -- --sim [arquivo.sql]` | Restaura a partir de dump (só dev; exige o `--sim`) |
| `npm run css:build` / `css:watch` | Compila o Tailwind |
| `npm test` | Suíte completa, sem exigir banco |
| `npm run test:db` | Suíte completa, exigindo MySQL (CI) |
| `npm run test:carga` | 30 simultâneos, não reprova |
| `npm run test:cobertura` | Portão de cobertura da RNF-28 |
| `npm run lint` / `npm run audit` | Portões de qualidade/segurança |
| `npm run evidencias` | Refaz os prints das telas em `docs/evidencias/telas/` (precisa do servidor de pé e de um navegador) |

---

## 9. Banco de dados — operações de rotina

### 9.1 Nova migration

Crie `migrations/NNN_descricao.sql` seguindo a numeração existente. Regras
conferidas pelo runner:

- Aplicada em ordem; **nunca edite um arquivo já aplicado** — o checksum barra
  com *"Migration já aplicada foi alterada depois"*. Corrija com uma migration
  nova ou com `db:reset`.
- Migration deve ser pequena: o MySQL faz `COMMIT` implícito em DDL, então o
  rollback do runner não desfaz tabelas já criadas.

### 9.2 Recomeçar do zero (desenvolvimento)

```bash
npm run db:reset -- --sim
npm run db:migrate
npm run db:seed
```

`db:reset` apaga **todas** as tabelas do banco configurado, sem backup. Recusa
`NODE_ENV=production` e exige o `--sim`. Use quando uma migration já aplicada
precisar mudar.

### 9.3 Backup e restauração

```bash
npm run db:backup                       # dump beever-AAAAMMDD-HHMM.sql em backups/
npm run db:restore -- --sim              # o dump mais recente
npm run db:restore -- --sim arquivo.sql  # um dump específico
```

- `backups/` é ignorado pelo git (contém hashes de senha e dados reais).
- A retenção apaga dumps com mais de `BACKUP_RETENCAO_DIAS` (padrão 7) e **só o
  que ela mesma cria**: arquivo renomeado é marco e nunca é tocado.
- `db:restore` sobrescreve tabelas, então tem as mesmas guardas do reset.
- Este comando **roda em produção** — é lá que ele importa. Periodicidade
  recomendada: diária, fora do horário de uso:
  ```
  0 3 * * *  cd /caminho/do/beever && /usr/bin/npm run db:backup >> /var/log/beever-backup.log 2>&1
  ```

---

## 10. Ambiente completo com Docker

O compose é configurado para o desenvolvimento local. Subir só o MySQL é o
padrão; subir **MySQL + migrations + aplicação** num comando só:

```bash
docker compose --profile completo up --build
```

Três serviços: `mysql` primeiro, `migrate` aplica as migrations e sai, e `app`
só começa depois que o `migrate` termina bem (`depends_on` com
`service_completed_successfully`). Migrar num serviço separado permite réplicas
depois — com migração no boot, várias instâncias disputariam o mesmo arquivo.

Diferenças em relação ao Node fora do compose (todas automáticas):

- `DB_HOST` vira `mysql` (o nome do serviço), não `localhost`.
- `UPLOADS_DIR` vira um volume nomeado — ilustrações não somem no deploy.
- `NODE_ENV` assume `development`; `SESSION_SECRET` **não tem padrão** — o
  compose recusa subir sem ele, de propósito.

A conferência manual dessa subida (23 migrations num banco vazio, `/health`
verde, cadastro real gravando, CSS servido da imagem) está em
`docs/17-CONTEINER-E-AMBIENTE.md`.

---

## 11. Produção — o mínimo verificável

**Este compose não é receita de produção.** Para levar ao ar, o checklist
começa em:

1. `NODE_ENV=production` — e então `SESSION_SECRET` e `CONTACT_EMAIL` com valor
   real, senão o `env.js` recusa subir (por bom motivo).
2. Credenciais de banco reais (`DB_USER`/`DB_PASSWORD`/`DB_ROOT_PASSWORD`).
3. Um proxy reverso (nginx/Caddy) na frente terminando TLS — é o passo que
   fecha a exigência de tráfego cifrado; ainda não há receita dele no
   repositório (DT-114).
4. Publicação da imagem em um registro (GHCR, por exemplo), hoje só o build é
   exercitado no CI (DT-116).
5. Backup cronado (seção 9.3), volume de uploads, e monotestes do `/health`
   no orquestrador.

O que já é prova, não promessa, para produção: aplicação stateless (RNF-38),
sessão no MySQL, `HEALTHCHECK` no `/health`, runtime da imagem sem dependência
de desenvolvimento, usuário não-root, e `.dockerignore` impedindo o contexto de
carregar segredo.

---

## 12. CI (para quem vai defender o portão)

`.github/workflows/ci.yml` roda em todo pull request e todo push para `main`,
com cinco jobs:

| Job | O que prova |
|---|---|
| lint | ESLint + `npm audit` bloqueante (RNF-14) |
| testes | `npm run test:db` contra MySQL 8.4 de serviço |
| cobertura | `npm run test:cobertura` — portão da RNF-28 |
| carga | `test:carga` só em `main`, sem reprovar |
| imagem | Docker build e o contêiner respondendo no `/health` |

Comentários em `docs/18-INTEGRACAO-CONTINUA.md`.

---

## 13. Problemas comuns

**`failed to connect to the docker API` (seção 3.2).**
O daemon do Docker está parado. `sudo systemctl start docker` e repita.

**A página abre sem estilo, tudo desalinhado.**
Faltou o `npm run css:build`. O `app.css` é gerado e não vem no clone.

**`Variáveis de ambiente obrigatórias ausentes` ao subir o servidor.**
O `.env` não existe ou está incompleto. Refaça a seção 3.1.

**`/health` responde 503 e os testes de integração falham.**
O MySQL não está acessível. Confira `docker compose ps` e se as credenciais do
`.env` batem com o `docker-compose.yml`.

**`ER_NO_SUCH_TABLE` em alguma consulta.**
As migrations não foram aplicadas nesse banco. `npm run db:migrate`.

**Porta 3000 já em uso.**
Mude `PORT` no `.env`, ou derrube o processo antigo:
`pkill -f "node src/server.js"`. Para ver quem está na porta:
`ss -ltnp | grep 3000`.

**`Cannot find module` ao rodar os testes manualmente.**
O `node:test` precisa do glob entre aspas: `node --test "test/**/*.test.js"`,
não `node --test test/`.

**`node --watch` parou de recarregar uma rota recém-edita.**
É comportamento conhecido do watch em projetos Node quando muitos arquivos
mudam (armadilha registrada no `ESTADO-DO-PROJETO`). `Ctrl+C` e suba de novo.

**`Migration já aplicada foi alterada depois`.**
Alguém editou um arquivo já aplicado. Ou faça uma migration nova, ou
`db:reset` (desenvolvimento).

---

## Referências

- `docs/23-ARQUITETURA-DO-SISTEMA.md` — por que a stack é assim
- `docs/17-CONTEINER-E-AMBIENTE.md` — o contêiner, a conferência manual, o que
  não é produção
- `docs/18-INTEGRACAO-CONTINUA.md` — os cinco jobs do CI
- `docs/19-BACKUP-E-RESTAURACAO.md` — backup/restore na prática
- `docs/ESTADO-DO-PROJETO.md` — armadilhas conhecidas (seção 7)
- `CLAUDE.md` — a arquitetura em forma de regra