# Documentação P3 — Jenkins + SonarQube (GitHub → Jenkins → SonarScanner → SonarQube → Quality Gate)

> Este arquivo é o **diário de bordo e o ponto de retomada** da prova de DevOps.
> Se uma sessão acabar no meio, a próxima lê a seção 1 e continua.

**Última atualização:** 2026-10-01 · **Branch:** `refactor/arquitetura-em-camadas`
**Último commit do projeto:** `567b83a` — *Design painel e sidebars*
**Repositório:** `git@github.com:Razawaky/Beever.git` (remote `origin`)

> **Base do trabalho:** esta tarefa roda sobre a branch `refactor/arquitetura-em-camadas`,
> **não** sobre a `main`. A `origin/main` está **199 commits atrás** (último commit
> de lá: "Onboarding com BD") — é o código antigo, antes da arquitetura em camadas.
> Apontar o Jenkins para a `main` analisaria o Beever de outro tempo.

---

## 1. Onde a tarefa parou

### 1.1 Situação: **passos 1 a 3 concluídos** — sem bloqueio do usuário

> ⚠️ **Leitura de 2026-10-01:** o texto abaixo descreve o começo desta tarefa e foi
> deixado como registro do que já foi feito. O estado **atual** está em
> **1.1ter**; não siga o "único bloqueio" descrito aqui.

O bloqueio do Docker foi resolvido: **o próprio usuário ligou o daemon** nesta
sessão. Com Docker no ar, o SonarQube subiu e está `healthy`, e o Jenkins está de
pé com o plugin do SonarQube instalado. Nada mais depende de privilégio de root.

```
$ docker ps
beever-sonar      sonarqube:9.9.8-community        Up (healthy)
beever-jenkins    beever-jenkins                   Up
beever-mysql      mysql:8.4                        Up (healthy)
beever-mailpit    axllent/mailpit:v1.27            Up (healthy)
beever-phpmyadmin phpmyadmin/phpmyadmin            Up     ← ver 9.1

$ curl -s localhost:9000/api/system/status
{"id":"...","version":"9.9.8.100196","status":"UP"}
```

**Feito até aqui:**

| Passo | Estado |
|---|---|
| 1 — SonarQube instalado e no ar | ✅ concluído (seção 4) |
| 2 — Sonar integrado ao Jenkins | 🟡 plugin `sonar` instalado e Jenkins no ar; falta declarar servidor/credencial no JCasC e ligar o job no GitHub |
| 3 — Jenkins obtém o projeto via SCM | 🟡 chave SSH gerada; **falta cadastrar no GitHub** |
| 4 a 9 | ⏸ dependem do SCM estar ligado |

**Único bloqueio agora _(resolvido em 2026-10-01, ver 1.1ter)_:** a chave pública
de leitura ainda não foi cadastrada no GitHub, então o job não consegue clonar o
repositório remoto:

```
$ ssh -i ~/.ssh/beever-jenkins/id_ed25519 -T git@github.com
git@github.com: Permission denied (publickey).
```

O que o usuário precisa fazer está escrito em
[Dúvidas pendentes](#10-dúvidas-pendentes-para-o-usuário). Enquanto isso, a parte
que **não** depende do GitHub pode e deve advanced: JCasC (servidor Sonar,
credencial, tool do scanner) e os arquivos de scanner.

### 1.1bis Sincronização com o repositório (feito nesta sessão)

`git fetch` + `git pull --ff-only` na branch de trabalho: **três commits novos do
grupo entraram**, e a base da análise da P3 passa a ser `567b83a`.

| Commit | Conteúdo |
|---|---|
| `4e90464` | mudanças leves de design + **phpmyadmin** no `docker-compose.yml` |
| `04f9836` | design do painel e novas artes (6 imagens WebP da Beenie) |
| `567b83a` | design do painel e sidebars (4 partials novos, painel reescrito) |

O pull foi só *fast-forward* (local estava 0 commits à frente), então nada foi
sobrescrito. Árvore limpa, com só este arquivo de documentação sem commitear.

⚠️ **Um ponto do `4e90464` contraria a postura de segurança do projeto** — está
registrado em [seção 9.1](#91-achado-no-pull-phpmyadmin) e precisa de decisão
do grupo antes da apresentação, porque o professor vai perguntar.

### 1.1ter Sessão de 2026-10-01 — chave no GitHub resolvida, e o gargalo real

**O bloqueio do passo 3 saiu.** A chave foi cadastrada no GitHub como **deploy key
do repositório** e a autenticação foi conferida da máquina:

```
$ ssh -i ~/.ssh/beever-jenkins/id_ed25519 -o IdentitiesOnly=yes -T git@github.com
Hi Razawaky/Beever! You've successfully authenticated, but GitHub does not provide shell access.
```

`exit=1` nesse comando é o comportamento normal do GitHub em `ssh -T` — não é falha.

**Por que a primeira tentativa deu erro no formulário do GitHub:** a chave foi colada
sem o prefixo. O que estava no clipboard era

```
ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFgNWRnXTp/OZYr0Pc7dJa/qjphxtjqXwZz8OYYPB+48 jenkins-beever-p3
```

e o GitHub exige o tipo completo, `ssh-ed25519 AAAAC3...`. O formulário valida o tipo
e recusa `ed25519` como prefixo. A chave em disco sempre esteve correta — o par é
íntegro e **sem passphrase** (importante: o Jenkins precisa clonar sem interação).

**Gargalo encontrado depois disso — este é o ponto importante.** Com a chave no
GitHub, o job *ainda* não lia de lá. Era esta linha no log do Jenkins:

```
WARNING  Configuration import: Found unresolved variable 'BEEVER_SCM_URL'.
         Will default to empty string
```

Causa: o `.env` tinha `BEEVER_SCM_URL`, mas o `docker-compose.yml` **não repassava
a variável para dentro do contêiner**. O `environment:` do serviço Jenkins listava
`JENKINS_ADMIN_PASSWORD`, `SONAR_URL`, `SONAR_TOKEN` e `JAVA_OPTS` — e só. O
`${BEEVER_SCM_URL}` do `casc.yaml` não tinha de onde ser interpolado, virou string
vazia, e o `GitSCMSource` nasceu com `<remote/>` vazio: o job existia, mas não tinha
onde ler. É por isso que o passo seemed travado mesmo com a chave cadastrada.

**Corrigido** (uma linha no compose + o valor no `.env`):

| Arquivo | Mudança |
|---|---|
| `docker-compose.yml:147` | `BEEVER_SCM_URL: ${BEEVER_SCM_URL:-file:///repo}` no `environment:` |
| `.env:39` | passou de `file:///repo` para `git@github.com:Razawaky/Beever.git` |

Depois de `docker compose --profile jenkins up -d jenkins`, o aviso
`unresolved variable` sumiu, o `<remote>` gravado passou a ser
`git@github.com:Razawaky/Beever.git`, e a branch **`refactor/arquitetura-em-camadas`
foi descoberta pelo job vindo do GitHub**. Ou seja: o clone por deploy key funciona.

Só uma branch tem `Jenkinsfile` — as outras cinco (`main`, `backend`, `frontend`,
`feature/cadastro-usuario`, `mudando-pages`) não têm. Por isso a descoberta
multibranch pega exatamente a branch certa, sem precisar de filtro.

**Aí o build reprovou — e por um motivo legítimo, não de configuração.** Build #13
falhou com `ERROR: script returned exit code 1` no stage *Lint e auditoria*:

```
npm audit --omit=dev --audit-level=high
nodemailer <=10.0.8   Severity: high
  GHSA-g57g-f23g-4646  Quoted local-part -> destinatário malformado
  GHSA-v53p-9fqp-m79j  backtracking quadrático no addressparser -> DoS
  GHSA-prgh-xp8r-p3m5  O(n^2) em comentário de endereço -> DoS
```

`nodemailer` estava em 10.0.3. Como `--audit-level=high` só reprova por `high`, os
dois `moderate` (`ip-address`, via `express-rate-limit`; e `multer`) não derrubavam
o build — mas o grupo escolheu corrigir os três.

`npm audit fix` (decidido pelo grupo):

| pacote | antes | depois | tipo |
|---|---|---|---|
| `nodemailer` | 10.0.3 | 10.0.13 | direto |
| `multer` | 2.3.0 | 2.4.0 | direto |
| `ip-address` | 10.5.0 | 10.7.2 | transitivo, via `express-rate-limit` |

Resultado: `found 0 vulnerabilities`, `npm run lint` limpo. **`package.json` não
mudou** — os ranges declarados (`^10.0.3`, `^2.2.0`) já aceitavam as versões
corrigidas; só o `package-lock.json` andou, e encolheu (12 inserções, 69 remoções).

### ⚠️ Onde a sessão de 2026-10-01 parou de verdade

**Nada foi commitado.** O usuário autorizou commit e push, mas a sessão acabou antes.
Estas mudanças estão **só na árvore de trabalho**:

```
 .env.example              |  28 +++++++++++-
 Jenkinsfile               |  27 +++++++++++++
 docker-compose.yml        |  81 ++++++++++++++++++++++-
 jenkins/Dockerfile        |   5 ++-
 jenkins/agente.Dockerfile |  25 +++++++++--
 jenkins/casc.yaml         |  88 ++++++++++++++++++++++++----
 package-lock.json         |  81 +-------------
```

Mais dois arquivos **sem versionar**: `DOCUMENTACAO-PROVADEVOPS.md` (este) e
`sonar-project.properties`.

**A armadilha da próxima sessão — leia antes de commitar.** Como
`BEEVER_SCM_URL` agora aponta para o GitHub, o Jenkins executa o `Jenkinsfile` que
está **no repositório**, não o da árvore de trabalho. E o `Jenkinsfile` no GitHub
**não tem nenhuma menção a Sonar**:

```
$ git show origin/refactor/arquitetura-em-camadas:Jenkinsfile | grep -cE 'sonar|Sonar|withSonarQubeEnv'
0
```

O stage `Análise SonarQube` (com `withSonarQubeEnv('beever-sonar')` e
`waitForQualityGate abort: true`) existe **apenas no arquivo local**. Então enviar
só o `package-lock.json` faz o build ficar verde — mas verde **sem Sonar**, o que
não prova nada da P3. O que destrava a prova de verdade é subir **`Jenkinsfile`,
`jenkins/casc.yaml`, `jenkins/Dockerfile`, `jenkins/agente.Dockerfile`,
`docker-compose.yml`, `.env.example`, `sonar-project.properties`** junto.

Lembrete do combinado da seção 11: é **um commit por aluno**, com o papel no
Conventional Commit em português. Nada disso foi commitado ainda.

### 1.1quarto Três coisas que confundem quem volta

1. **Não há Nginx em lugar nenhum desta infra.** O usuário achou que tinha, mas não:
   `docker-compose.yml` expõe `127.0.0.1:8080:8080` direto, sem nada na frente,
   batendo com o `url: http://localhost:8080/` do `casc.yaml`. As menções a
   nginx/Caddy que existem no repositório são de **deploy futuro**, em
   `docs/31-OPCOES-DE-DEPLOY.md` e na RNF-12 — e ali a escolha apontada é o **Caddy**,
   não o nginx (`docs/ESTADO-DO-PROJETO.md:1607` ainda tem o nginx como alternativa
   em aberto, numa tarefa de roadmap que nem existe).
2. **A configuração global do Sonar NÃO fica no `config.xml`.** O plugin `sonar`
   grava em arquivo próprio, `/var/jenkins_home/hudson.plugins.sonar.SonarGlobalConfiguration.xml`.
   Procurar no `config.xml` dá zero e faz concluir (errado) que o JCasC não
   aplicou. Já está aplicado e conferido: instalação `beever-sonar` →
   `http://sonar:9000`, `credentialsId: beever-sonar-token`.
3. **`/var/jenkins_home/tools/` não existir não é erro.** O `sonarRunnerInstaller`
   baixa o scanner sob demanda, no primeiro uso. E o scanner que de fato roda a
   análise está na imagem do agente (`jenkins/agente.Dockerfile`), não no
   controlador.

### 1.2 Passos do desafio × situação

| # | Passo | Responsável | Situação | Onde fica a evidência |
|---|---|---|---|---|
| 1 | Instalar/executar o SonarQube | Aluno 1 | ✅ **Concluído** | serviço `sonar` no `docker-compose.yml`, contêiner `healthy` |
| 2 | Integrar SonarQube ao Jenkins | Aluno 2 | ✅ **Concluído** — JCasC aplicou instalação `beever-sonar` → `http://sonar:9000` e a credencial `beever-sonar-token`. Falta só subir os arquivos | `jenkins/Dockerfile`, `jenkins/casc.yaml` |
| 3 | Jenkins obtém o projeto via SCM | Aluno 2 | ✅ **Concluído** — deploy key cadastrada no GitHub, `ssh -T` autenticando, e o job já clona de `git@github.com:Razawaky/Beever.git` | `~/.ssh/beever-jenkins/`, `jenkins/casc.yaml`, `docker-compose.yml:147` |
| 4 | Preparar o projeto para análise | Aluno 3 | 🟡 **Escrito, não commitado** — `sonar-project.properties` está pronto e sem versionar (escopo definido em 3.6) | `sonar-project.properties` |
| 5 | Executar pipeline com análise | Aluno 3 | 🟡 **Parcial** — o stage `Análise SonarQube` está escrito no `Jenkinsfile` **local, não commitado**; sem subir, o pipeline roda sem Sonar | etapa `Análise SonarQube` no `Jenkinsfile` |
| 6 | Consultar o painel do SonarQube | Aluno 4 | ⏸ Não iniciado | `http://localhost:9000` |
| 7 | Interpretar os problemas | Aluno 4 | ⏸ Não iniciado | seção 7 deste arquivo |
| 8 | Corrigir ao menos 1 problema | Aluno 4 | ⏸ Não iniciado | seção 7 deste arquivo |
| 9 | Nova análise e comparação | Aluno 4 | ⏸ Não iniciado | seção 7 deste arquivo |

### 1.3 O que já existia no projeto antes desta tarefa (não é meu)

Nada aqui foi feito por mim — é o que o grupo já tinha e que a P3 vai reaproveitar.
Importante saber o que é anterior, para o relatório não atribuir ao grupo o que já
estava pronto.

| Peça | Onde | O que é |
|---|---|---|
| Jenkins local em contêiner | `jenkins/Dockerfile`, `docker-compose.yml:123` | imagem oficial LTS 2.568.3 + CLI do Docker + 6 plugins, perfil `jenkins`, só em `127.0.0.1:8080` |
| Jenkinsfile | `Jenkinsfile` | portão com 7 etapas, espelho do `.github/workflows/ci.yml` |
| Agente das etapas | `jenkins/agente.Dockerfile` | `node:22-bookworm-slim` + Chromium + curl |
| Job multibranch SCM | `jenkins/casc.yaml:26` | job **Beever**, branch source `file:///repo`, varredura de 5 em 5 min |
| Documentação do Jenkins | `docs/29-JENKINS.md` | acesso, processo, etapas, problemas comuns |

**Consequência para a P3:** os passos 2 e 3 do desafio estavam, na prática, ~70%
feitos quando comecei. Hoje o que falta de verdade é **ligar o job no GitHub**
(passo 3), a **etapa de análise** no pipeline (passos 4 e 5) e a
**leitura/correção** dos achados (passos 6 a 9).

### 1.4 Como retomar em outra sessão

1. Ler a seção 1 desta página — em especial **1.1ter** (o que a sessão de
   2026-10-01 descobriu e onde parou) — e a seção 10 (dúvidas pendentes).
2. `git status` — na última sessão havia **7 arquivos modificados** e **2 sem
   versionar**, tudo sem commit: `Jenkinsfile`, `jenkins/casc.yaml`,
   `jenkins/Dockerfile`, `jenkins/agente.Dockerfile`, `docker-compose.yml`,
   `.env.example`, `package-lock.json`, mais `sonar-project.properties` e este
   próprio arquivo.
3. Se o Docker estiver no ar (`docker ps` responde), seguir pela seção 2.
4. **Antes de commitar, ler o aviso em 1.1ter:** o `Jenkinsfile` do repositório não
   tem o stage do Sonar, então enviar só o lock deixa o build verde *sem Sonar*.
5. Depois de cada passo concluído, **atualizar a seção correspondente e a 1.1**
   antes de fechar a sessão. Este arquivo é a fonte da verdade, não a conversa.

---

## 2. Ambiente apurado nesta sessão

Medido na máquina, não deduzido de documento:

| Item | Valor | Por que importa |
|---|---|---|
| Docker CLI | 29.7.2 em `/usr/bin/docker` | idem ao daemon, mesma versão |
| Docker daemon | **ligado** (subiu quando o usuário-started nesta sessão) | desbloqueia os passos 1, 2, 3 e 5 |
| `sudo` | exige senha (`sudo -n` falha) | irrelevante agora: nada mais precisa de root |
| Java | **não instalado** na máquina | irrelevante: SonarQube e Jenkins rodam em contêiner com o JRE deles |
| Node | v22.22.3 (igual ao CI) | o agente do Jenkins usa a mesma versão |
| Memória total | 5,7 GB, com **1,1 GB disponível** (243 MB livres + 1,2 GB em cache) | ⚠️ aperto real — ver 3.4 |
| Disco `/` | 40 GB livres (83% usado) | ok para os dados do SonarQube |
| Grupo `docker` | `docker:x:957:dorte` | `DOCKER_GID=957` no `.env`; o `.env.example` ainda traz `999` como placeholder |
| `.env` | **completo**: `JENKINS_ADMIN_PASSWORD`, `DOCKER_GID`, `SONAR_URL`, `SONAR_TOKEN`, `SONAR_JAVA__OPTS` | arquivo é ignorado pelo Git (`.gitignore:5`), nada disso vai para commit |
| Internet | `registry.npmjs.org` e `github.com` respondem 200 | dá para baixar imagem, plugin e token |
| Imagem do SonarQube | `sonarqube:9.9.8-community`, reportando `9.9.8.100196` | tag **numérica** fixada no compose, para a demonstração ser reprodutível |

---

## 3. Decisões técnicas já tomadas (e o porquê de cada uma)

Estas decisões valem **independentemente** de o Docker estar no ar: são o desenho
do trabalho. Estão aqui para o grupo saber explicar na apresentação.

### 3.1 SonarQube em contêiner, dentro do `docker-compose.yml`, num perfil próprio

O SonarQube Community Build oficial (`sonarqube`) **trái o próprio Java**
(JRE embarcado), então não há dependência de instalar JDK na máquina. É a mesma
estratégia que o Jenkins local já usa, e dá para o grupo subir e derrubar a
ferramenta de prova com um comando.

```bash
docker compose --profile sonar up -d        # sobe
docker compose --profile sonar stop sonar   # derruba sem apagar os dados
```

**Por que num perfil e não no grupo padrão:** `docker compose up -d` de todo dia
hoje sobe só o MySQL e o Mailpit, em segundos, e roda em máquina de 5,7 GB. Se o
SonarQube entrasse no grupo padrão, ele subiria junto e derrubaria o ambiente de
desenvolvimento do dia a dia. O perfil `jenkins` já foi feito com esse mesmo
raciocínio e está comentado em `docker-compose.yml:120`.

### 3.2 Porta 9000 presa em `127.0.0.1`, nunca em todas as interfaces

O SonarQube novo sobe com `admin/admin`, e a RNF do projeto pede TLS e
credencial fora do repositório. Deixar `0.0.0.0:9000` exposto na rede da escola
publicaria um painel com todo o código-fonte indexado para quem estiver na mesma
rede. A mesma razão levou o Jenkins a `127.0.0.1:8080` (`docs/29-JENKINS.md`,
seção "Segurança") — é coerência com uma decisão já tomada, não invenção nova.

### 3.3 `SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true`

O SonarQube guarda os dados em um Elasticsearch embarcado, e o Elasticsearch
**recusa subir** se `vm.max_map_count` do host for menor que 262144. O valor
padrão do Linux costuma ser 65530.

```yaml
environment:
  SONAR_ES_BOOTSTRAP_CHECKS_DISABLE: 'true'
```

**Por que desligar a checagem em vez de corrigir o kernel:** o ajuste correto
seria `sudo sysctl -w vm.max_map_count=524288`, que exige privilégio de root —
e a máquina está sem sudo não-interativo. Desligar a checagem é a alternativa
documentada pela própria SonarSource para ambiente de desenvolvimento e funciona
com os valores padrão do host.

⚠️ **Limite honesto desta escolha:** desligar a checagem resolve a *recusa de
subir*, mas não muda o limite real do kernel. É aceitável para uma instalação de
aula; **não** é configuração para servidor. Se o Elasticsearch do SonarQube
cair por falta de memória mapeada durante a análise, a solução é o
`sysctl` acima — e aí é preciso do usuário rodando com sudo.

✅ **Empiricamente funcionou:** com o `vm.max_map_count` no padrão do host, o
contêiner do SonarQube subiu e ficou `healthy` nas três decisões acima.

### 3.4 Heap reduzido do SonarQube, por causa dos 5,7 GB da máquina

A máquina tem 5,7 GB totais e **1,1 GB disponíveis** no momento (com SonarQube,
Jenkins, MySQL, Mailpit e phpmyadmin no ar). O SonarQube Community Build sozinho
pede mais que isso (Elasticsearch + servidor + ceia de JVM), e o Jenkins, o MySQL
e o Chromium do build disputam o mesmo resto.

```yaml
environment:
  SONAR_JAVA__OPTS: '-Xmx512m -Xms512m'   # padrão do compose é 2 GB
```

**Por que 512 MB e não 1 GB:** com ~1 GB disponíveis, 1 GB de heap mais o
Elasticsearch já causaria swap durante a análise — e swap em máquina de build é o
mesmo problema que derrubou o build #5 do Jenkins (DT-131, teste de tempo que
reprova sem motivo). O preço é Analysis time mais longo. **Se travar, o caminho
é fechar o navegador, o VS Code e o app e subir para 1 GB** — registrado aqui
para a próxima sessão não descobrir do zero.

### 3.5 Token do SonarQube dentro do Jenkins Credentials, nunca no repositório

O scanner autentica no SonarQube com um token (não com `admin/admin`). Esse token
é o equivalente de senha e **não vai para commit** — regra 4 do enunciado e a
`CLAUDE.md` na seção "Security".

O caminho é: `jenkins/casc.yaml` lê o token do ambiente, o Jenkins Credentials
guarda a referência, e o `Jenkinsfile` nunca escreve o valor no `Console Output`.

**Estado:** o token **já foi gerado** por API, com o nome `jenkins-p3`, e está no
`.env` (ignorado pelo Git) — nunca no repositório. A criação foi por API em vez de
clique na tela porque o resultado é o mesmo e fica registrado num comando
repetível:

```bash
curl -u admin:admin -X POST \
  'http://localhost:9000/api/user_tokens/generate?name=jenkins-p3'
```

⚠️ A tela "My Account → Generate Token" do SonarQube mostra o valor **uma única
vez**. Se o grupo perder esse valor, o caminho é gerar outro token pelo mesmo
endpoint e atualizar o `.env` — não há como recuperar o antigo.

### 3.6 Escopo de análise: o que entra e o que fica de fora

Planejado para `sonar-project.properties`. Os números são **medidos** nesta
máquina, depois do pull:

| Propriedade | Valor planejado | Motivo |
|---|---|---|
| `sonar.projectKey` | `beever` | identificador estável — é a chave da pasta do projeto no painel e o que amarra a execução ao histórico |
| `sonar.projectName` | `Beever` | nome legível no painel |
| `sonar.sources` | `src,scripts` | **255 arquivos**: 246 em `src/` (código e templates) e 9 em `scripts/` (migrations, backup, carga) |
| `sonar.tests` | `test` | **153 arquivos** de teste. O Sonar conta cobertura de teste separado de linha de produção, e isso muda a leitura das métricas |
| `sonar.exclusions` | `**/public/js/vendor/**` | `src/public/js/vendor/lenis.min.js` é biblioteca de terceiro já minificada — analisá-la gera ruído, não achado |
| cobertura | `sonar.javascript.lcov.reportPaths` apontando para o `lcov.info` que o `npm run test:cobertura` já produz | reaproveita a medição que o projeto já faz, sem criar métrica nova |
| `sonar.exclusions` de cobertura | `**/views/**` | template EJS não é JavaScript analisável; conta como linha coberta sem ser código coberto, o que falseia o número |

**Sobre os 408 arquivos e o tempo de análise:** com ~1,1 GB disponíveis, um
scope grande custa caro em memória. Se a primeira análise travar ou o SonarQube
morrer, o corte de escopo é o **primeiro** ajuste a tentar (começar por `src/services`
e `src/repositories`, que é onde está a lógica) — melhor que subir o heap, que
disputa a mesma memória com o Elasticsearch.

**Regra que segue daí:** cobertura só entra no painel se o `lcov.info` existir no
build. Se o arquivo faltar, a análise de código continua e a de cobertura vira
"0% — sem relatório", que é pior que não medir. Por isso o pipeline vai rodar a
análise **depois** da etapa `Cobertura`, e não antes.

### 3.7 Onde a etapa de análise entra no `Jenkinsfile`

Última etapa, depois de `Imagem Docker`. **Por que no fim:** ela só precisa do
código-fonte e do `lcov.info`; deixar para o fim faz o build reprovar por
qualidade de código *depois* de todas as checagens caras, e o Console Output
fica mais fácil de ler na ordem "lint → testes → cobertura → Sonar".

**Por que não replicar no GitHub Actions:** o `test/unit/jenkins.test.js:28`
exige que o Jenkinsfile rode *toda* etapa do Actions, mas não o contrário —
uma etapa a mais no Jenkins não quebra o teste. A P3 é sobre Jenkins, e o Actions
segue sendo o portão de merge como está.

---

## 4. Aluno 1 — Instalação e execução do SonarQube

**Contribuição identificável:** serviço `sonar` no `docker-compose.yml`, volume
dedicado, perfil próprio, token de criação/admin gerado pela API e print do
painel.

- **Feito:** serviço `sonar` **escrito e rodando** no `docker-compose.yml`, com as
  decisões 3.1 a 3.4 aplicadas — perfil `sonar`, porta em `127.0.0.1`, bootstrap
  check desligado, heap de 512 MB, três volumes nomeados e `healthcheck`.
  Token de automação `jenkins-p3` gerado pela API.
- **Comandos usados e por quê:**
  - `docker compose --profile sonar up -d` — sobe só o SonarQube, sem pesar no
    ambiente de todo dia (3.1).
  - `curl -s localhost:9000/api/system/status` esperando `{"status":"UP"}` — o
    SonarQube responde HTTP 200 **antes** de ficar pronto, e análise contra ele
    nesse intervalo falha com `ServiceUnavailable`. É a armadilha clássica do
    primeiro "sonarqube is up". Aqui a espera levou ~1 min, porque o
    Elasticsearch e as migrations do banco interno demoram.
- **Erros encontrados e solução:**
  1. **Tag inexistente.** A primeira tentativa usou `sonarqube:26.9.0-community`
     (a versão da tag `community` no momento da pesquisa), que **não existe** no
     Docker Hub para a linha 9.x:
     ```
     failed to resolve reference "docker.io/library/sonarqube:26.9.0-community": not found
     ```
     A imagem da série 9 é a `9.9.8.100196`, publicada com a tag
     `9.9.8-community`. **Lição para a apresentação:** `sonarqube:community` é uma
     tag móvel e pode apontar para uma série que não existe no Hub com aquele
     formato de versão — por isso o compose fixa a tag numérica.
  2. **`healthcheck` com `curl`.** A imagem do SonarQube não tem `curl`, e o
     próprio healthcheck quebrava o contêiner:
     ```
     /bin/sh: 1: curl: not found
     ```
     Trocado por `wget -qO-`, que existe na imagem. O healthcheck ter sido testado
     de verdade importa: era ele que diria "pronto" para o passo 5.
- **Evidências:** o status por API e o log de inicialização eu tenho; **print da
  tela do painel eu não consigo gerar** (ver seção 10, item 3).

## 5. Aluno 2 — Jenkins, SCM, credenciais e conexão

**Contribuição identificável:** plugin `sonar` na imagem do Jenkins, servidor
Sonar no `jenkins/casc.yaml`, token guardado como credencial, e o job ligado ao
GitHub por chave SSH.

- **Feito:**
  - `jenkins/Dockerfile`: plugin **`sonar`** acrescentado aos seis existentes e
    **imagem reconstruída e verificada** (`sonar.jpi` presente dentro da imagem).
    A imagem do Jenkins local foi recriada e o contêiner responde em
    `http://localhost:8080`.
  - `.env` (ignorado pelo Git) com `JENKINS_ADMIN_PASSWORD=beever-jenkins` e
    `DOCKER_GID=957` — o `jenkins/entrada.sh:4` recusa subir sem a senha, e o
    grupo real do socket é 957, não o 999 que está no `.env.example`.
  - Chave SSH dedicada criada em `~/.ssh/beever-jenkins/` (`id_ed25519` +
    `known_hosts`), montada **somente leitura** em
    `/var/jenkins_home/ssh-github` pelo compose. Caminho isolado em diretório
    próprio justamente para o Jenkins não enxergar nenhuma outra chave da máquina.
  - Ferramentas verificadas dentro do contêiner: Git 2.47.3, OpenSSH 10, e o grupo
    957 presente — o que fecha o `permission denied` no socket do Docker.
- **O que falta e por quê:**
  - `jenkins/casc.yaml`: declarar o **servidor SonarQube** (URL `http://sonar:9000`,
    que é o nome do serviço dentro da rede do compose), a **credencial** do token
    e o **gerenciador de ferramentas** do SonarScanner. Sem o servidor declarado, o
    plugin não tem onde publicar a análise; sem o scanner instalado, a etapa
    `withSonarQubeEnv` não tem binário para rodar.
  - **SCM:** trocar `file:///repo` por `git@github.com:Razawaky/Beever.git` na
    branch `refactor/arquitetura-em-camadas`, com a credencial SSH e o
    `known_hosts`. Testado do host:
    ```
    $ ssh -i ~/.ssh/beever-jenkins/id_ed25519 -T git@github.com
    git@github.com: Permission denied (publickey).
    ```
    A chave é válida, mas **ainda não foi cadastrada no GitHub** — é o bloqueio
    atual (seção 10, item 1).
- **Erros encontrados e solução:**
  1. **Id de plugin errado.** `RUN jenkins-plugin-cli --plugins sonarqube`
     retornou 404 — o id no Plugin Manager é **`sonar`**, não `sonarqube`.
  2. **Build em background.** A reconstrução da imagem passou do timeout da
     ferramenta na primeira tentativa e foi retomada de forma desacoplada; o
     resultado foi conferido antes de seguir (plugin presente na imagem).
- **Evidências:** a configuração do Jenkins na tela eu não consigo fotografar
  (seção 10, item 3). O que me dá para provar por texto: versão do plugin dentro da
  imagem e o `casc.yaml` versionado no repositório.

## 6. Aluno 3 — Scanner e arquivos de configuração

**Contribuição identificável:** `sonar-project.properties` no repositório,
etapa de análise no `Jenkinsfile`, script `npm run sonar` no `package.json`.

- **Feito:** escopo de análise definido item a item (3.6) e posição da etapa
  definida (3.7). **Nenhum arquivo escrito ainda.**
- **Comandos/configs previstos e por quê:**
  - `sonar-project.properties` versionado — a análise é reproduzível por
    qualquer pessoa que clone o repositório; configuração fora do repositório
    seria configuração que só existe na máquina de quem montou.
  - Etapa no Jenkinsfile usando o plugin, com o scanner vindo do próprio plugin
    (baixa a versão que o SonarQube dictate) — mais simples e mais estável que
    fixar uma imagem do scanner à parte.
  - `npm run sonar` no `package.json`: `test/unit/jenkins.test.js:23` reprova
    qualquer `npm run X` do Jenkinsfile que não esteja declarado no
    `package.json`, então o script precisa existir.
- **Erros encontrados e solução:** nenhum ainda.
- **Evidências:** pendentes.

## 7. Aluno 4 — Interpretação dos resultados, correção e comparação

**Contribuição identificável:** lista de problemas interpretados, **um** commit de
correção no código, e as duas execuções lado a lado no relatório.

- **Feito:** nada. Depende inteiramente das execuções.
- **Roteiro previsto:**
  1. Análise base (build #1) → print do painel e do Quality Gate.
  2. Ler as três families do painel separadamente: **Bugs**, **Vulnerabilidades**
     e **Code Smells** — são coisas diferentes e a apresentação precisa dizer
     qual é qual.
  3. Escolher **um** problema, preferencialmente um *Bug* ou *Vulnerability*
     (valem mais na apresentação que um code smell de estilo), corrigir com
     teste, e **não** simplesmente marcar "false positive" sem justificar.
  4. Reexecutar (build #2) → comparação antes/depois com os mesmos números.
- **O que o Quality Gate vai provavelmente reprovar num projeto sem
  configuração:** cobertura baixa em "New Code", *code smells* acima do teto
  (o padrão do "Sonar way" é 5% em código novo) e duplicação. **Pipeline verde
  com Quality Gate vermelho é resultado normal e é bom para a apresentação** —
  mostra que o portão tem dente. O enunciado pede explicar o Quality Gate, e a
  explicação honesta é essa.
- **Erros encontrados e solução:** nenhum ainda.
- **Evidências:** pendentes.

---

## 8. Roteiro de fala da apresentação (rascunho, 10–15 min)

| Aluno | Tempo | Fala |
|---|---|---|
| 1 | 2 min | O que é o SonarQube (servidor que indexa o código e mede qualidade), como subiu em contêiner, por que no perfil `sonar` e por que preso em `127.0.0.1` |
| 2 | 3 min | Jenkins: job multibranch lendo o repositório, plugin do SonarQube, credencial guardada fora do repositório; por que o token nunca vai para o commit |
| 3 | 2 min | `sonar-project.properties`: o que entra na análise, o que fica de fora e por quê; onde a etapa entra no Jenkinsfile |
| 4 | 4 min | Os problemas que apareceram, o que significam, a correção, e a comparação dos dois Quality Gates. Fecha com a dificuldade relatada |
| Todos | — | A dificuldade do `vm.max_map_count` e a pergunta final para quem avalia: "o portão do Sonar impede merge ou só avisa?" |

**Backup:** levar os prints e uma gravação da tela, porque depende de Docker
ligado, que já caiu uma vez nesta sessão.

---

## 9. Checklist de entrega

- [x] Projeto integrador no GitHub — `origin` = `git@github.com:Razawaky/Beever.git`
- [ ] Job Pipeline no Jenkins com SCM — job existe e o plugin do Sonar está instalado; falta ligar no GitHub (chave SSH aguardando cadastro)
- [x] Arquivo da pipeline (`Jenkinsfile`) no repositório
- [ ] Configuração de análise (`sonar-project.properties`) — escopo definido, arquivo não escrito
- [ ] Execução da pipeline + Console Output
- [x] SonarQube no ar e respondendo `UP` (`http://localhost:9000`) — falta o **print** do painel
- [ ] Resultado do Quality Gate
- [ ] Problemas encontrados e interpretados
- [ ] Ao menos 1 correção no código
- [ ] Nova análise + comparação antes/depois

### 9.1 Achado no pull — phpmyadmin

O commit `4e90464` (do grupo, não meu) adicionou ao `docker-compose.yml`:

```yaml
phpmyadmin:
  image: phpmyadmin/phpmyadmin
  container_name: beever-phpmyadmin
  restart: always
  ports:
    - '3001:80'                    # ← escuta em todas as interfaces
  environment:
    PMA_HOST: mysql
    MYSQL_ROOT_PASSWORD: root      # ← senha do root escrita no arquivo
```

Três coisas contrariam a postura que o próprio projeto adotou, e nenhuma delas é
opinião minha: são as mesmas razões que colocaram o Jenkins em `127.0.0.1` e a
senha dele no `.env`.

1. **`'3001:80'` sem `127.0.0.1:`** publica uma tela de administração de banco
   — com a senha do root — para toda a rede em que a máquina estiver. O
   `docker-compose.yml:139` faz o oposto (`'127.0.0.1:8080:8080'`), e o motivo
   está escrito em `docs/29-JENKINS.md`, seção "Segurança".
2. **Sem perfil.** Com `restart: always` e sem `profiles:`, o phpmyadmin sobe em
   todo `docker compose up -d` do dia a dia — justamente o que o perfil `jenkins`
   existe para evitar (comentário em `docker-compose.yml:120`). Some com isso:
   também consome mais memória, o que piora o aperto registrado em 3.4.
3. **Senha do root no arquivo.** `.gitignore:5` ignora o `.env` justamente para
   não versionar segredo, e `jenkins/entrada.sh` recusa subir sem senha vinda do
   ambiente. Aqui a senha do root do banco está escrita e versionada.

**Decisão que tomei sozinho:** não mexi. Não é da minha tarefa e a
`CLAUDE.md` diz para nunca consertar de surpresa algo que não é do escopo.
**Decisão que precisa do grupo:** mostrar na apresentação o phpmyadmin em
`127.0.0.1` e atrás do perfil (linha de uma chave), ou manter como está? Se o
professor perguntar "isso está exposto?", a resposta honesta é que sim, e isso
custa pontos numa prova de DevOps.

---

## 10. Dúvidas pendentes para o usuário

**Bloqueio atual — nenhum que dependa do usuário.** O passo 3 fechou. O que trava a
P3 agora é trabalho de código e de versionamento, não uma ação manual na interface
do GitHub.

1. **Enviar o trabalho acumulado.** Tudo está **sem commit** (seção 11). O item
   crítico é que o `Jenkinsfile` do repositório **não tem o stage do Sonar**: enviar
   só o `package-lock.json` deixa o build verde *sem Sonar*, e aí a prova não prova.
   O usuário já autorizou commit e push; falta executar.

   Aviso técnico para quem forcommitar: se o Jenkins estiver com o build #13
   reprovado na tela, isso **não é** sintoma de problema novo — foi a vulnerabilidade
   high do `nodemailer`, já corrigida no `package-lock.json` local (seção 1.1ter).

**Resolvidos** (mantidos aqui só para o registro):

2. ~~Cadastrar a chave SSH no GitHub~~ — **resolvido em 2026-10-01**: deploy key do
   repositório, e `ssh -T git@github.com` responde
   `Hi Razawaky/Beever! You've successfully authenticated`. O erro no formulário era
   a chave colada sem o prefixo `ssh-`; o GitHub exige `ssh-ed25519`, não `ed25519`.
3. ~~O job continuar lendo `file:///repo`~~ — **resolvido**: `BEEVER_SCM_URL` não
   estava sendo repassada para o contêiner pelo `docker-compose.yml`, então o JCasC
   avisava `unresolved variable` e gravava o remote vazio. Uma linha no compose
   resolveu, e o job passou a clonar do GitHub.
4. ~~Build vermelho no `npm audit`~~ — **resolvido**: `nodemailer` 10.0.3 → 10.0.13,
   `multer` 2.3.0 → 2.4.0, `ip-address` 10.5.0 → 10.7.2. `found 0 vulnerabilities`,
   lint limpo, `package.json` intocado.
5. ~~Docker desligado~~ — **resolvido**: o usuário ligou o daemon.
6. ~~`.env` sem senha~~ — **resolvido**: `JENKINS_ADMIN_PASSWORD=beever-jenkins` e
   `DOCKER_GID=957` no `.env`.
7. ~~Tag do SonarQube~~ — **resolvido**: `sonarqube:9.9.8-community`.
8. **RAM apertada** — mantida em 512 MB de heap. Se a análise travar, o caminho é
   fechar navegador/VS Code/app e subir para 1 GB, ou derrubar o Jenkins durante a
   análise.
9. **phpmyadmin exposto** (9.1): continua **sem decisão do grupo**. Mostrar como
   está, ou corrigir para `127.0.0.1` + perfil antes da apresentação?
10. **Nginx na frente do Jenkins** — *tentativa de lembrete, sem pendência*: não há
    proxy reverso nenhum. Se alguém voltar falando disso, a resposta é `docker-compose.yml:149`,
    `127.0.0.1:8080:8080` direto.

**Perguntas de evidência** — eu não consigo gerar print de tela:

11. **Prints.** Eu produzo log de texto, mas **print de tela exige alguém com
    navegador**. O que cada um precisa fotografar, e quando:
    - **Aluno 1** — painel do SonarQube já aberto em `http://localhost:9000`
      (login `admin`/`admin`), com a lista de projetos e a aba **Quality Gate**.
    - **Aluno 2** — tela de configuração do Jenkins
      (`http://localhost:8080/manage/sonar`), a tela de **Credentials** e o job
      `Beever` lendo o GitHub.
    - **Aluno 4** — comparação dos dois Quality Gates (antes e depois), lado a
      lado ou em duas fotos com data/hora visível.
  Eu aviso no momento exato em que cada tela estiver no estado certo, para ninguém
  perder a janela.


---

## 11. Registro de commits desta tarefa

_(nenhum commit ainda — o combinado é um commit por aluno, com o papel no
Conventional Commit em português)_

**Atualizado em 2026-10-01.** Trabalho acumulado e ainda **sem commit**. O `git diff --stat`
agora dá 7 arquivos modificados, mais 2 sem versionar:

| Arquivo | Mudança | Aluno |
|---|---|---|
| `Jenkinsfile` | stage `Análise SonarQube` com `withSonarQubeEnv` + `waitForQualityGate abort: true` | 3 |
| `sonar-project.properties` | **(novo, sem versionar)** — escopo da análise, `projectKey` estável, exclusões | 3 |
| `jenkins/casc.yaml` | instalação `beever-sonar`, credencial `beever-sonar-token`, verificação de host key do GitHub, job multibranch lendo `${BEEVER_SCM_URL}` | 2 |
| `jenkins/Dockerfile` | plugin `sonar` | 2 |
| `jenkins/agente.Dockerfile` | JRE no agente, para o `sonar-scanner` rodar | 3 |
| `docker-compose.yml` | serviço `sonar` + perfil `sonar`; `SONAR_URL`; montagem da chave SSH; **`BEEVER_SCM_URL` no `environment:`** | 1 e 2 |
| `.env.example` | `JENKINS_SSH_DIR`, `SONAR_URL`, `SONAR_TOKEN` vazio, `SONAR_JAVA__OPTS`, `BEEVER_SCM_URL` | 2 |
| `package-lock.json` | `nodemailer` 10.0.13, `multer` 2.4.0, `ip-address` 10.7.2 — `0 vulnerabilities` | 4 |
| `DOCUMENTACAO-PROVADEVOPS.md` | este diário **(novo, sem versionar)** | todos |

A ordem de commit sugerida, para a prova ficar com histórico legível e um commit
por aluno: `package-lock.json` (4) → `docker-compose.yml` + `.env.example` +
`jenkins/Dockerfile` + `jenkins/casc.yaml` (1 e 2) → `Jenkinsfile` +
`jenkins/agente.Dockerfile` + `sonar-project.properties` (3) → este arquivo (todos).

O `.env` com a senha e o token **não entra em nenhum commit** — é ignorado pelo
Git de propósito.
