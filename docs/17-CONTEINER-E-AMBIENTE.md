# Contêiner e ambiente — T-14.4

**Data:** 2026-08-31 · **Requisitos:** RNF-37 (Docker multi-stage e
docker-compose para desenvolvimento) e RNF-38 (aplicação stateless).

## Como subir

```
docker compose up -d                     só o MySQL, como sempre foi
docker compose --profile completo up     MySQL + migrations + aplicação
```

O perfil existe para não quebrar quem roda o Node fora do compose, que é como o
projeto foi desenvolvido até aqui. Sem o perfil, o comportamento é exatamente o
de antes.

São três serviços. O `mysql` sobe primeiro e os outros dois esperam ele ficar
saudável de verdade, e não apenas de pé. O `migrate` aplica as migrations e sai;
o `app` só começa depois que ele termina bem. Migrar num serviço separado, em vez
de no boot da aplicação, é o que permite subir mais de uma réplica depois — com
migração no boot, todas tentariam aplicar o mesmo arquivo ao mesmo tempo.

## O que a tarefa encontrou

A tarefa era revisar o que já existia, e o que existia tinha cinco defeitos.
Quatro deles só apareceriam dentro do contêiner, que é onde ninguém tinha
olhado ainda, porque a imagem nunca havia sido construída.

**A aplicação não estava no compose.** Só o MySQL subia, e a RNF-37 pede os dois.
Era o buraco principal da tarefa.

**O healthcheck do banco lia uma variável que não existe.** A linha pedia
`MYSQL_ROOT_PASSWORD`, que não é definida em lugar nenhum, e caía sempre no
padrão `root`. Quem trocasse a senha ficaria com o banco eternamente
`unhealthy`, sem nada explicando por quê. O nome certo é `DB_ROOT_PASSWORD`.

**O usuário `node` não conseguia escrever em `uploads/`.** A imagem troca de
usuário no fim, mas `/app` pertence ao root, e é ali que o painel administrativo
grava as ilustrações desde a T-12.3. O envio de imagem falharia só dentro do
contêiner, e só na primeira vez que um administrador tentasse.

**A imagem não subia fora de `production`.** O `logger.js` pedia o transporte
`pino-pretty`, que é dependência de desenvolvimento e some no `npm prune
--omit=dev` do estágio final. O erro que aparecia não falava em log nem em
dependência: dizia `unable to determine transport target`. Agora o transporte é
conferido antes de ser pedido, e sem ele o log sai em JSON puro.

**Não havia `.dockerignore`.** O contexto inteiro ia para o daemon a cada build,
incluindo `.env`, `node_modules` e `backups/` — que guarda dump real com hash de
senha. Nenhum `COPY` atual os levava para a imagem, mas bastaria um `COPY . .`
futuro para virar vazamento.

## O que mudou na imagem

O `npm ci` rodava duas vezes, uma no estágio de build e outra no de runtime, o
que baixava tudo e compilava o bcrypt duas vezes. Agora um estágio de
dependências instala uma vez, o build copia dali para compilar o CSS, e um
terceiro estágio poda as de desenvolvimento com `npm prune --omit=dev`. Podar é
mais barato que instalar de novo.

A imagem ganhou `HEALTHCHECK` batendo no `/health`, que existe desde a E02 e já
responde 503 quando o banco não atende. Sem ele, o orquestrador sabe que o
processo está de pé, mas não que ele funciona.

`--ignore-scripts` ficou de fora de propósito: o bcrypt tem binding nativo e
depende do script de instalação para baixar o binário pronto.

## O `.env.example` e o teste que o mantém honesto

O arquivo não documentava `DB_ROOT_PASSWORD` (a DT-15, aberta desde a T-00.5) nem
`BACKUP_CONTAINER` e `BACKUP_RETENCAO_DIAS`, que o `scripts/backup.js` lê desde
que existe. As três entraram.

O que impede a dívida de renascer é `test/unit/ambienteDeConteiner.test.js`: ele
varre `src` e `scripts` atrás de todo `process.env`, varre o compose atrás de
toda substituição, e reprova se qualquer nome ficar sem linha no exemplo.
Variável nova sem documentação passa a quebrar a suíte, em vez de aparecer só
quando alguém sobe o projeto do zero.

O mesmo arquivo cobra as invariantes da imagem — usuário não-root, healthcheck,
`uploads` com dono certo, runtime sem dependência de desenvolvimento — e as do
`.dockerignore`. É estático de propósito: roda em milissegundos e não exige
daemon Docker no CI da T-14.5.

## Conferência manual, feita nesta tarefa

O teste estático não prova que a imagem sobe. Isto foi verificado à mão, em
2026-08-31, com `docker compose --profile completo up --build` em portas
alternativas para não disputar com o MySQL da máquina:

As 23 migrations aplicaram num banco vazio e o `migrate` saiu com zero; a segunda
execução respondeu "nenhuma migration pendente", que é a idempotência. O `/health`
devolveu `conectado: true` com as 23 migrations contadas. A landing, o login e a
página de privacidade responderam 200, e o CSS compilado (44 KB) veio de dentro
da imagem. Um cadastro real devolveu 201, gravando no banco do compose. Os
cabeçalhos do helmet chegaram inteiros. O volume de uploads é gravável pelo
usuário `node`, e o healthcheck do contêiner chegou a `healthy`.

Imagem final: 430 MB.

## O que isto não é

**Não é receita de produção.** Falta o proxy reverso terminando TLS, a imagem é
construída na hora em vez de vir de um registro, e o compose sobe em
`development` por padrão. Ir para produção exige `NODE_ENV=production` mais um
`SESSION_SECRET` e um `CONTACT_EMAIL` de verdade — o `env.js` recusa subir com os
valores de exemplo nos dois casos, e recusa por bom motivo.

O `SESSION_SECRET` não tem valor padrão no compose de propósito: a stack se
recusa a subir e explica o que fazer, em vez de nascer com um segredo de sessão
que está escrito num repositório público.
