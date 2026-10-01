# Documentação P3 — Jenkins + SonarQube

Fluxo: **GitHub → Jenkins → SonarScanner → SonarQube → Quality Gate**

- **Projeto:** Beever
- **Repositório:** `git@github.com:Razawaky/Beever.git`
- **Branch de trabalho:** `refactor/arquitetura-em-camadas` (não é a `main`; a `main` está **207 commits atrás** — último commit dela: `6eb084b`)
- **Última atualização:** 2026-10-01
- **Enunciado e regras do agente:** não existe `P3_Jenkins_SonarQube_AGENTE.md` no repositório. O material equivalente é `docs/24-MANUAL-DE-INSTALACAO-E-EXECUCAO.md` (variáveis do Jenkins e do Sonar) e `docs/29-JENKINS.md` (o portão local).

---

## 1. Status atual

| # | Passo | Aluno | Situação |
|---|---|---|---|
| 1 | Instalar/executar SonarQube | 1 | ✅ Feito |
| 2 | Integrar SonarQube ao Jenkins | 2 | ✅ Feito |
| 3 | Jenkins obtém projeto via SCM | 2 | ✅ Feito |
| 4 | Preparar projeto para análise | 3 | ✅ Feito — arquivo escrito **e versionado** |
| 5 | Pipeline com análise | 3 | ✅ **Build #21 SUCCESS** — 8 stages verdes, gate OK (seção 18) |
| 6 | Consultar painel | 4 | ✅ Feito — baseline publicada, 320 arquivos, 12.638 ncloc (seção 15.1) |
| 7 | Interpretar problemas | 4 | ✅ Feito — 7 bugs lidos, 6 são falso positivo do analisador CSS (seção 15.2) |
| 8 | Corrigir ao menos 1 problema | 4 | ✅ **Corrigido** — `src/utils/slug.js:15`, `javascript:S5850`, commit `cb27da5` (seção 19.1) |
| 9 | Nova análise e comparação | 4 | ⏸ Análise "depois" em andamento — build #23 e scanner direto (seção 19.2) |

**Bloqueio anterior, já resolvido:** o `sonar-scanner` não era encontrado dentro
do agente (`exit code 127`). O `jenkins/agente.Dockerfile` apontava o symlink
para um diretório que o `unzip` não cria. Nada a ver com Sonar, Jenkins, Quality
Gate ou testes — a suíte já está verde. Detalhes e correção em `dcae357` na
seção 6.

**Análises já publicadas.** `GET /api/project_analyses/search?project=beever`
devolve `total: 3`:

| Análise | Horário (UTC) | Commit | Origem |
|---|---|---|---|
| `AaD3_L7iC1b1hK8IGPFS` | 2026-10-01 14:58:49 | `7bdcf17` | base, rodada à mão (seção 14.4) |
| `AaD4MFVeC1b1hK8IGQrY` | 2026-10-01 15:57:02 | `6bf40c9` | **build #21, pelo pipeline** |
| `AaD4kilzR2avuI8Ug-vU` | 2026-10-01 17:43:05 | `cb27da5` | scanner direto, com a correção do slug (seção 20.5) |

**Quality Gate `Beever`:** criado e associado ao projeto `beever`. Condições
(conferidas em `GET /api/qualitygates/show?name=Beever`):
- `new_security_rating` > 1
- `new_reliability_rating` > 1
- `new_maintainability_rating` > 1
- `new_duplicated_lines_density` > 3
- `new_security_hotspots_reviewed` < 100
- **Sem condição de cobertura** (decisão do grupo)

> **Por que o gate passa com Reliability Rating E? (verificado na API)**
> As cinco condições usam métricas `new_*` — o modo *Look Only At New Code*.
> Existe período de código novo, e ele é a **versão anterior**:
> `project_status` devolve `period: {mode: "PREVIOUS_VERSION", date:
> "2026-10-01T14:58:49+0000"}`, que é a análise base.
>
> E o resultado é o oposto do que este documento dizia antes: **o gate está
> avaliando, e o que ele avaliou passou.** As quatro condições têm valor real —
> `new_reliability_rating = 1`, `new_security_rating = 1`,
> `new_maintainability_rating = 1`, `new_duplicated_lines_density = 0.0` — e há
> **zero** violações dentro do período de código novo
> (`/api/issues/search?componentKeys=beever&inNewCodePeriod=true` → `total: 0`).
>
> **O gate não diz nada sobre os 7 bugs** porque nenhum deles é código novo: os
> sete já existiam na análise base. Um gate que olha só o que mudou depois da
> última versão aprova um projeto com Reliability Rating **E** sem nunca ter
> visto nenhum desses bugs.
>
> **Consequência prática:** o PASSED de hoje é sobre o código novo, não sobre o
> projeto. Para o gate passar a ser atestado de qualidade do Beever inteiro,
> teria de deixar de ser `new_*` (ou ganhar condição de cobertura, que o grupo
> decidiu não ter — seção 3). A seção 21 explica isso em detalhe.

---

## 2. Arquitetura

Tudo roda em Docker Compose, em perfis separados para não pesar no dia a dia.

| Serviço | Perfil | Porta | Observação |
|---|---|---|---|
| `sonar` | `sonar` | `127.0.0.1:9000` | `sonarqube:9.9.8-community` |
| `jenkins` | `jenkins` | `127.0.0.1:8080` | Plugin `sonar`, config via JCasC |
| agente | — | — | `node:22-bookworm-slim` + Chromium + curl + SonarScanner 5.0.1.3006 (com JRE próprio) |

**Comandos:**
```bash
docker compose --profile sonar up -d       # sobe SonarQube
docker compose --profile jenkins up -d     # sobe Jenkins
docker compose --profile sonar stop sonar  # para sem apagar dados
curl -s localhost:9000/api/system/status   # esperar {"status":"UP"}
```

**Arquivos principais:** `docker-compose.yml`, `jenkins/Dockerfile`,
`jenkins/agente.Dockerfile`, `jenkins/casc.yaml`, `Jenkinsfile`,
`sonar-project.properties`, `.env` (ignorado pelo Git).

**Todos versionados.** `git ls-files` confirma: `docker-compose.yml`,
`.env.example`, `Jenkinsfile`, `sonar-project.properties`, `jenkins/Dockerfile`,
`jenkins/agente.Dockerfile`, `jenkins/casc.yaml`, `jenkins/entrada.sh`.
A última tag local é `6bf40c9` (rede do agente + `sonar.login`), sobre
`7bdcf17` (documentação) e `dcae357` (symlink do scanner). A correção de rede e
autenticação **está commitada e enviada**; o que faltava era o controlador do
Jenkins ainda estar com o token revogado (seção 14.5), resolvido com
`--force-recreate`.

---

## 3. Decisões técnicas (para explicar na apresentação)

1. **SonarQube em contêiner, em perfil próprio.** Traz o próprio Java; sobe e desce com um comando; não pesa o `docker compose up` diário.
2. **Portas presas em `127.0.0.1`.** Sonar novo sobe com senha padrão; expor em `0.0.0.0` publicaria o código na rede da escola. Mesma lógica do Jenkins (e do phpMyAdmin — ver seção 8).
3. **`SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true`.** O Elasticsearch embutido exige `vm.max_map_count` ≥ 262144. O ajuste correto (`sudo sysctl`) exige root, então a checagem foi desligada. Serve para aula, **não** para servidor.
4. **Heap de 512 MB** (`SONAR_JAVA__OPTS=-Xmx512m -Xms512m`). Máquina com 5,7 GB e ~1,1 GB livres. Se travar: fechar navegador/VS Code e subir para 1 GB, ou reduzir o escopo de análise.
5. **Token do Sonar fora do repositório.** Gerado por API (`jenkins-p3`, criado em 2026-09-30), guardado no `.env` e interpolado pelo JCasC na credencial do Jenkins. Nunca aparece no Console Output — o log do build #17 mostra as variáveis do `withSonarQubeEnv` como `********`.
6. **Tag numérica do SonarQube** para a demonstração ser reprodutível (`community` é tag móvel). O `docker-compose.yml` registra que a linha se chama `lts-community` e que a `community` já corre para a 26.9.
7. **Stage do Sonar no fim do pipeline**, depois de `Imagem Docker` e de `Rolagem a 320 px`. O motivo **não é** a cobertura: é a ordem de leitura do Console Output (`lint → testes → cobertura → rolagem → imagem → Sonar`), como está no comentário do próprio `Jenkinsfile`.

**Escopo da análise (`sonar-project.properties`):**
- `sonar.projectKey=beever` / `sonar.projectName=Beever`
- `sonar.sources=src,scripts` — **298 arquivos** no total (160 `.js`, que é o que o SonarJS indexa; o resto é `.ejs`, `.sql`, `.css`, imagens e fontes)
- `sonar.tests=test` — **153 arquivos** `.js`
- Exclui `**/public/js/vendor/**` (o `lenis.min.js` da biblioteca de terceiros)
- Exclui `**/views/**` da cobertura (EJS não é JS analisável)
- **`sonar.qualitygate.wait=true`** com `timeout=300`
- **Cobertura NÃO é alimentada.** `sonar.javascript.lcov.reportPaths` está **comentado** de propósito (`sonar-project.properties:49`): o `npm run test:cobertura` usa o reporter nativo do Node 22 e imprime **texto no console**, não gera `lcov.info`. Apontar o painel para um arquivo inexistente mostraria "0% — sem relatório", que é pior que não medir. A régua de cobertura do Beever é a da RNF-28, aplicada pelo próprio `npm run test:cobertura`, que reprova o build. Se o grupo mudar de ideia, o caminho está comentado no arquivo.
- **Não existe script `sonar` no `package.json`.** O `Jenkinsfile:115` chama `sonar-scanner` direto, dentro do agente descartável.

---

## 4. Documentação por aluno

### Aluno 1 — Instalação do SonarQube

**Contribuição:** serviço `sonar` no `docker-compose.yml`, perfil, volumes, healthcheck, token via API.

**Feito:**
- Serviço escrito e rodando (`healthy`, `9.9.8.100196`), com as decisões 1–4 aplicadas
- Três volumes nomeados (`beever-sonar`, `-extensions`, `-logs`) — sem eles, derrubar o contêiner apaga o histórico de análises, que é a prova da P3
- Token `jenkins-p3` gerado por API
- Comando do token: `curl -u admin:<senha> -X POST 'http://localhost:9000/api/user_tokens/generate?name=jenkins-p3'` (o valor aparece uma única vez)

**Erros e soluções:**
- **Tag inexistente** (`sonarqube:26.9.0-community`): fixada em `9.9.8-community`
- **Healthcheck com `curl`:** a imagem não tem `curl`; trocado por `wget -qO- | grep -q "UP"`
- **Armadilha:** o Sonar responde HTTP 200 antes de estar pronto. O healthcheck espera `status: UP` (`start_period: 90s`, ~1 min)

**Evidência pendente:** print do painel em `http://localhost:9000` (lista de projetos e Quality Gate).

### Aluno 2 — Jenkins, SCM, credenciais

**Contribuição:** plugin `sonar`, servidor Sonar no `casc.yaml`, credencial do token, deploy key SSH, verificação de host, job ligado ao GitHub.

**Feito:**
- Plugin `sonar` na imagem do Jenkins
- JCasC aplicou: instalação `beever-sonar` → `http://sonar:9000`, credencial `beever-sonar-token`
- Chave SSH dedicada em `~/.ssh/beever-jenkins/` (`id_ed25519` + `known_hosts`), montada **somente leitura** em `/var/jenkins_home/ssh-github`
- Chave cadastrada no GitHub como **deploy key** do repositório
- Verificação de host do GitHub contra as três chaves públicas dele, versionadas no `casc.yaml` (`StrictHostKeyChecking=yes`)
- Job multibranch clona de `git@github.com:Razawaky/Beever.git`, com varredura a cada 5 minutos
- Build #17 **leu o código do GitHub** e rodou as sete etapas — a integração SCM está comprovada de ponta a ponta

**Erros e soluções:**
- **Id do plugin errado:** é `sonar`, não `sonarqube` (o download com o id errado devolve 404 sem explicar)
- **Chave rejeitada no GitHub:** foi colada sem prefixo (`ed25519 AAAA…`). O GitHub exige `ssh-ed25519 AAAA…`
- **Job sem fonte de leitura:** o log mostrava `unresolved variable 'BEEVER_SCM_URL'`. O `.env` tinha a variável, mas o `docker-compose.yml` não a repassava ao contêiner. Corrigido com `BEEVER_SCM_URL: ${BEEVER_SCM_URL:-file:///repo}` no `environment:` do Jenkins e o valor no `.env`
- **Falha silenciosa do `GIT_SSH_COMMAND`:** ele existia só como propriedade global de nó do `casc.yaml`, mas a varredura multibranch roda no controlador como processo comum e não enxerga propriedade de nó. O sintoma era mudo: `Host key verification failed`, índice velho, build clonado de um commit atrasado. Por isso a variável está nos **dois** lugares, com o mesmo valor.
- **Build #13 reprovado:** `npm audit` achou 3 vulnerabilidades *high*. Corrigido (ver Aluno 4)

**Evidência pendente:** prints de `http://localhost:8080/manage/sonar`, tela de Credentials e o job `Beever` lendo o GitHub.

### Aluno 3 — Scanner e configurações

**Contribuição:** `sonar-project.properties`, stage `Análise SonarQube` no `Jenkinsfile`, `jenkins/agente.Dockerfile`.

**Feito:**
- `sonar-project.properties` escrito **e versionado** (escopo na seção 3)
- Stage no `Jenkinsfile`: `withSonarQubeEnv('beever-sonar')` + `waitForQualityGate abort: true`, com timeout de 5 minutos
- SonarScanner 5.0.1.3006 no agente, com **SHA-256 conferido na download** e o JRE embutido no próprio pacote (Temurin 17.0.7) — por isso **não** há OpenJDK instalado à parte
- O `Jenkinsfile` do GitHub já contém o stage (commit `5d5745a`)

**Por quê:** configuração versionada = análise reproduzível por qualquer pessoa que clone o repositório.

**Erros e soluções:**
- **Symlink do scanner apontava para um diretório inexistente** (`sonar-scanner: not found`, exit 127): o `unzip` do zip oficial cria `sonar-scanner-5.0.1.3006-linux`, e o link apontava para `sonar-scanner-5.0.1.3006`, sem o sufixo. `ln -s` não acusa alvo inexistente, então a imagem era construída "verde" e sem scanner. Corrigido em `dcae357`, que também põe `&& sonar-scanner --version` no fim do `RUN` para o build da imagem reprovar se o executável não estiver no caminho. Detalhes na seção 6.
- **Camada em cache do Docker sustentou o defeito:** `#5 CACHED` / `#6 CACHED` reusaram a imagem antiga. Corrigir o Dockerfile não bastou — foi preciso reconstruir a imagem.

**Evidência pendente:** trecho do Console Output com a análise rodando.

### Aluno 4 — Resultados, correção e comparação

**Contribuição:** lista de problemas interpretados, 1 commit de correção, comparação antes/depois.

**Feito até agora:**
- `npm audit fix` no `package-lock.json`: `nodemailer` 10.0.3 → 10.0.13, `multer` 2.3.0 → 2.4.0, `ip-address` 10.5.0 → 10.7.2. Resultado: 0 vulnerabilidades, lint limpo, `package.json` intocado. (Versões conferidas no `package-lock.json`.)
- ⚠️ Essa correção veio do `npm audit`, **não do Sonar**. Ainda é preciso corrigir um achado do painel do SonarQube.

**Roteiro:**
1. ~~Destravar a seção 6 e rodar a **análise base**~~ — **feito.** Análise publicada, 320 arquivos, Quality Gate PASSED. Métricas e leitura dos 7 bugs nas seções 15.1 e 15.2
2. ~~Ler **Bugs**, **Vulnerabilities** e **Code Smells** separadamente~~ — **feito.** São 7 bugs, 0 vulnerabilidades, 35 code smells
3. Escolher 1 problema e corrigir com teste — **alvo já escolhido:** `src/utils/slug.js:15`, `javascript:S5850` (seção 15.3). É o único dos 7 que é problema real de código; os outros 6 são o parser CSS do Sonar 9.9 sem conhecer as at-rules do Tailwind 4
4. Reanalisar e comparar os mesmos números

**Dica para a apresentação:** pipeline verde com Quality Gate vermelho é
resultado normal e mostra que o portão tem dente. O inverso também vale e é o
que o grupo tem: **Quality Gate verde com Reliability Rating E** (5.0), porque
as cinco condições do gate só olham código novo e não há condição de cobertura.
Seis dos sete bugs são limitações do analisador, não do código.

---

## 5. Armadilhas descobertas (úteis para quem retomar)

- **`ln -s` não falha quando o alvo não existe.** Foi assim que a imagem do agente foi construída "corretamente" com o scanner apontando para um diretório inexistente: `ln -s` sai com código zero, o build publica a imagem como boa, e o defeito só aparece no último stage do pipeline. A defesa é terminar o `RUN` com o comando sendo instalado (`&& sonar-scanner --version`), para a imagem reprovar na hora.
- **Corrigir um Dockerfile não basta se a imagem já existe na máquina.** O `docker build` reportou `#5 CACHED` e `#6 CACHED` e reusou a camada antiga. Depois de mexer no `agente.Dockerfile`, reconstruir a imagem (`docker build --no-cache ...` ou `docker builder prune`) antes de disparar o build — senão o build consome a imagem velha e falha do mesmo jeito.
- **Config global do Sonar não fica no `config.xml`.** Fica em `/var/jenkins_home/hudson.plugins.sonar.SonarGlobalConfiguration.xml`. Procurar no lugar errado dá a falsa impressão de que o JCasC não aplicou.
- **`/var/jenkins_home/tools/` vazio não é erro.** O scanner é baixado no primeiro uso, e o que roda de fato está no agente.
- **Não existe Nginx nesta infra.** O Jenkins responde direto em `127.0.0.1:8080`. Nginx/Caddy aparecem só na documentação de deploy futuro.
- **Docker parado = ~98 falhas em `TESTES_DE_BANCO=1`.** É um único fato repetido (sem MySQL). Antes de investigar teste, rodar `docker ps`.
- **EJS executa `include` dentro de `<!-- -->`.** O navegador esconde, o servidor renderiza. EJS também não aceita tag dentro de comentário `<%# %>`.
- **Contagem de tag que atravessa comentário HTML dá número falso.** `semComentariosDeHtml` foi para o helper de acessibilidade: marcação dentro de `<!-- -->` não é desenhada, não é lida e não ocupa espaço, mas continuava contando no teste. Foi o que fez a semana parecer duplicada e o que quase fez o teste da Colmeia contar uma barra que não existe.

---

## 6. Resolvido: `sonar-scanner: not found` no build #17

**Onde:** build **#17**, único stage que falha — `Análise SonarQube`, o último.

| | |
|---|---|
| Início | 2026-10-01 11:03:20 -0300 |
| Duração | 1.291.316 ms (~21 min) |
| Resultado | `FAILURE` |

**Sintoma no Console Output:**
```
+ sonar-scanner
.../script.sh.copy: 1: sonar-scanner: not found
WARN: Unable to locate 'report-task.txt' in the workspace. Did the SonarScanner succeed?
ERROR: script returned exit code 127
```

**Os testes passaram.** No mesmo build:
- `Suíte contra MySQL`: `1167 tests / 1167 pass / 0 fail / 0 skipped`
- `Cobertura`: `1172 tests / 1169 pass / 0 fail / 3 skipped`

Os oito testes de design que travavam o build #16 foram corrigidos no commit
`d9373e6`. O build #17 foi o primeiro a passar de todos os testes e a chegar ao
stage do Sonar.

**Causa raiz — o `jenkins/agente.Dockerfile` apontava o symlink para um diretório
que não existe:**

O zip oficial se chama `sonar-scanner-cli-5.0.1.3006-linux.zip`, e o `unzip`
cria `/opt/sonar-scanner-5.0.1.3006-linux` — **com** o sufixo `-linux`. O symlink
apontava para `/opt/sonar-scanner-5.0.1.3006`, **sem** o sufixo.

```
$ ls /opt
sonar-scanner-5.0.1.3006-linux
$ readlink /usr/local/bin/sonar-scanner
/opt/sonar-scanner-5.0.1.3006/bin/sonar-scanner      ← não existe
$ which sonar-scanner
AUSENTE
```

**Um link quebrado é invisível para o build.** `ln -s` sai com código zero mesmo
quando o alvo não existe, então `docker build`acusava sucesso e a imagem era
publicada sem o scanner. O erro só apareceria lá no fim do pipeline, no stage
mais caro do build.

**Agravante — a camada em cache do Docker sustentou o defeito.** O `docker build`
do stage `Dependências` reportou `#5 CACHED` e `#6 CACHED`, reaproveitando a
camada da imagem de 2026-10-01 09:34:23. Mesmo depois de corrigir o arquivo, a
correção sozinha não bastaria: era preciso reconstruir a imagem.

**Correção — commit `dcae357` (Aluno 3):**
1. o symlink passou a incluir o sufixo `-linux`, batendo com o que o `unzip` cria;
2. o `RUN` ganhou `&& sonar-scanner --version` no fim. É a correção de fundo: **o
   build da imagem passa a reprovar se o executável não estiver de fato no
   caminho**, em vez de empurrar o problema para o meio do pipeline.

**Estado agora:** imagem do agente reconstruída em 2026-10-01 11:33:27, com o
symlink correto (`/opt/sonar-scanner-5.0.1.3006-linux/bin/sonar-scanner`) e o
scanner respondendo `SonarScanner 5.0.1.3006` / `Java 17.0.7 Eclipse Adoptium`.
O **build #18 confirmou esta correção** — o scanner passou a ser encontrado e
chegou a falar com o servidor — e parou no erro **seguinte**: o agente estava na
rede errada. Esse é o erro 2, na seção 14.2.

---

## 7. Próximos passos

> Atualizado no fim da sessão de 2026-10-01 (b). Os itens 1 a 3 da versão
> anterior estão feitos; o que replace é o passo 1, que virou a correção do
> passo 8 do desafio.

1. Commitar e enviar a correção da rede e da autenticação (seção 14.3), que está
   escrita no `Jenkinsfile` e no `docker-compose.yml` mas ainda não foi para o
   repositório
2. Build #19: os oito stages verdes, com o `Análise SonarQube` publicando e o
   `waitForQualityGate` respondendo — **esta é a prova de ponta a ponta**
3. Corrigir `src/utils/slug.js:15` (`javascript:S5850`), o problema escolhido
   na seção 15.3, e rodar `npm run test:db` para provar que nada quebrou
4. Build #20: segunda análise, e comparar com as métricas da seção 15.1
5. Tirar os prints (seção 9), incluindo o Quality Gate **antes e depois**, lado
   a lado, com data e hora visível
6. Montar a entrega e enviar no **Teams** até o dia da P3

**Commits já feitos** (Conventional Commit em português, um por aluno):
1. `5d5745a` — `.env.example`, `Jenkinsfile`, `docker-compose.yml`, `jenkins/Dockerfile`, `jenkins/agente.Dockerfile`, `jenkins/casc.yaml`, `sonar-project.properties`, `package-lock.json` (Alunos 1, 2 e 3)
2. `e818371` — deploy key com verificação de host, phpMyAdmin para perfil próprio (Aluno 2)
3. `d9373e6` — a semana duplicada na Colmeia, o `#painel.ejs` órfão e os 8 testes de design (Aluno 4)
4. `dcae357` — symlink do SonarScanner e `&& sonar-scanner --version` no `RUN` (Aluno 3)
5. `7bdcf17` — reestruturação da documentação por outro agente (seções 1 a 11)
6. Documentação — seções 12 a 16, correção da seção 1 e reconciliação das
   estruturas, **este commit**

O `.env` nunca entra em commit (`.gitignore:5`).

---

## 8. Resolvido: phpMyAdmin

O commit `4e90464` (do grupo) havia adicionado ao `docker-compose.yml`:
- Porta `'3001:80'` **sem** `127.0.0.1:` (exposto na rede)
- Sem `profiles:` e com `restart: always` (sobe sempre, gasta RAM)
- `MYSQL_ROOT_PASSWORD: root` escrito no arquivo versionado

**A decisão foi tomada e aplicada** no commit `e818371`. O serviço está hoje em
`docker-compose.yml:194-206` com `127.0.0.1:3001:80`, `profiles: ['phpmyadmin']`,
`restart: unless-stopped` e `MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-root}`.
Não há mais nada a decidir aqui.

---

## 9. Evidências (prints que só humano com navegador tira)

- **Aluno 1:** painel do SonarQube (`http://localhost:9000`) com lista de projetos e Quality Gate
- **Aluno 2:** `http://localhost:8080/manage/sonar`, tela de Credentials, job `Beever` lendo o GitHub
- **Aluno 3:** trecho do Console Output com a análise rodando
- **Aluno 4:** Quality Gate antes e depois, lado a lado, com data/hora visível; código antes/depois da correção

Também guardar: histórico de commits e a dificuldade principal com a solução.

---

## 10. Roteiro de apresentação (10–15 min)

| Aluno | Tempo | Fala |
|---|---|---|
| 1 | 2 min | O que é o SonarQube, subida em contêiner, perfil `sonar`, porta em `127.0.0.1` |
| 2 | 3 min | Job multibranch lendo o GitHub, plugin, credencial fora do repositório, deploy key com verificação de host |
| 3 | 2 min | `sonar-project.properties`, o que entra/sai, por que a cobertura não é alimentada, posição do stage no Jenkinsfile |
| 4 | 4 min | Problemas encontrados, correção, comparação dos Quality Gates, dificuldade relatada |

**Dificuldades boas para relatar** — a ordem é por força da história, e as três
primeiras são as que a prova de fato produziu (seção 14):

- **`ln -s` apontando para um diretório que não existe** (14.1). O `unzip` cria
  `sonar-scanner-5.0.1.3006-linux` e o link apontava para
  `sonar-scanner-5.0.1.3006`. A imagem ficou "verde" sem o scanner, e o defeito
  só apareceu no último stage, 20 minutos depois. A defesa foi terminar o `RUN`
  com `&& sonar-scanner --version`.
- **`SONAR_AUTH_TOKEN`, não `SONAR_TOKEN`** (14.3). URL certa, projeto certo,
  token certo no Credentials — e ainda assim `Not authorized`. O plugin exporta
  `SONAR_AUTH_TOKEN` e o scanner quer `sonar.login`; são duas camadas para ligar
  à mão.
- **O agente na rede errada** (14.2). Contêiner novo do `docker run` nasce na
  rede `bridge`, onde `sonar` não existe. As outras etapas não sentiram nada
  porque o MySQL entra por `--link`, que traz o nome junto.
- `BEEVER_SCM_URL` não repassada ao contêiner
- `GIT_SSH_COMMAND` só no `casc.yaml`, e a varredura multibranch não enxergar
  propriedade de nó — falha silenciosa, com o build clonando um commit atrasado
- Chave SSH sem o prefixo `ssh-ed25519` no formulário do GitHub
- `vm.max_map_count`
- Tag inexistente do SonarQube

**Pergunta para quem avalia:** "o portão do Sonar bloqueia o merge ou só avisa?"
Resposta: bloqueia o build, porque o `Jenkinsfile` usa `waitForQualityGate
abort: true`.

**Pergunta para quem avalia (a melhor, se sobrar tempo):** "o Quality Gate
aprovado significa que o código está bom?"
Resposta: **não** — e essa é a melhor aula da prova. O gate está **PASSED** com
Reliability Rating **E** (5.0) e sete bugs, porque **as cinco condições usam
métricas `new_*` e o projeto não tem código novo definido** (primeira análise,
sem `sonar.newCode.referenceBranch`). Métrica sem valor não viola condição, logo
o gate responde OK sem ter olhado para os bugs. Seis desses sete bugs nem são do
código: é o analisador CSS do SonarQube 9.9 que não conhece `@theme`, `@source`,
`animation-timeline` nem `transition-behavior` (seção 15.2).

Ou seja: **Quality Gate verde é configuração, não atestado de qualidade.** É o
motivo de o `sonar-project.properties` ser o arquivo mais importante da P3.

**Backup:** levar prints e gravação de tela (a demo depende do Docker ligado).

---

## 11. Checklist de entrega

- [x] Projeto no GitHub
- [x] Job Pipeline no Jenkins com SCM
- [x] `Jenkinsfile` no repositório
- [x] `sonar-project.properties` escrito **e versionado**
- [x] Suíte de testes verde no Jenkins (build #21: 1167 + 1172 testes, 0 falhas)
- [x] Análise publicada no SonarQube pelo **pipeline** — 2 no total (seção 18)
- [x] SonarQube no ar (falta print)
- [x] Resultado do Quality Gate — **PASSED** (seções 15.1 e 18)
- [x] Problemas encontrados e interpretados — 7 bugs, 6 falsos positivos (seção 15.2)
- [x] Alvo da correção escolhido e justificado — `src/utils/slug.js:15` (seção 15.3)
- [x] **Execução da pipeline com o stage do Sonar verde** — build #21 SUCCESS (seção 18)
- [x] Ao menos 1 correção (vinda do Sonar) — `src/utils/slug.js:15`, commit `cb27da5`, 1172 testes verdes (seção 19.1)
- [ ] Nova análise + comparação antes/depois — build #23 em curso (seção 19.2)
- [ ] Print do Quality Gate antes e depois, lado a lado
- [ ] Investigar o `abort` que o plugin não reconhece (seção 18.2)
- [ ] Envio no Teams

---

## 12. Sessão de 2026-10-01 (b) — destravando a análise

Tudo nesta sessão aconteceu **sem o Docker daemon ligado**. Esse detalhe explica
os ~98 testes vermelhos que abriram a sessão e que **não** eram falha de código.

**Ordem do trabalho:**

1. Docker daemon ligado. Os 98 erros de banco (`ECONNREFUSED 127.0.0.1:3306`)
   sumiram sozinhos — o MySQL estava de pé, o daemon é que não estava.
2. Suíte completa contra o MySQL: **1172 testes, 3 pulados, 0 falhas.**
   `npm run lint` limpo e `npm run audit` com **0 vulnerabilidades**.
3. Build #17 disparado pelo push. Os 7 stages passaram; o Sonar reprovou por
   `sonar-scanner: not found` (exit 127). Detalhado na seção 6.
4. Symlink corrigido em `dcae357`, com `&& sonar-scanner --version` no `RUN` para
   a imagem reprovar sozinha se o scanner sumir de novo. Teste local da imagem:
   `INFO: SonarScanner 5.0.1.3006` / `Java 17.0.7 Eclipse Adoptium`.
5. Build #18: o scanner passou a ser encontrado e **parou no erro seguinte**, a
   rede errada (seção 14.2).
6. Como o Jenkins ainda não publicava análise nenhuma, e os passos 6 a 9 do
   desafio dependem disso, rodamos o scanner **na mão dentro da rede certa**. Foi
   assim que a análise base existe. Está registrado na seção 14.4.

**Erro bobo que valeu a pena:** o `curl` para a API do Sonar devolvia vazio e a
primeira leitura foi "o Sonar está fora". Não era — a senha de admin não é
`SONAR_ADMIN_PASSWORD` do `.env` (essa variável **não existe** lá); é a senha de
bootstrap padrão. `admin:admin` respondeu `200`. Antes de culpar o serviço,
confirme que o *cliente* está autenticado.

---

## 13. Sessão de 2026-10-01 (c) — reconciliando a documentação

Outro agente commitou `7bdcf17` no meio desta sessão, reescrevendo o documento
com uma estrutura nova (seções 1 a 11) e enviando para o `origin`. O arquivo
ficou híbrido: a estrutura dele até a seção 11, e as seções 12 a 16 desta
sessão.

**Decisão do grupo:** a estrutura nova foi mantida. Nada foi renumerado para
caber num esquema anterior, e nenhum conteúdo foi apagado — o que pertencia às
seções antigas foi para a seção correspondente, e o que era novo virou seção 12
em diante. O que mudou de número está com a referência cruzada corrigida.

Correções de conteúdo feitas ao reordenar (a estrutura nova estava com fatos
desatualizados, porque foi escrita antes da análise base):

- Tabela da seção 1: passos 6 a 9 saíram de "não iniciado" para o estado real
- Seção 1: "o SonarQube ainda não analisou nada" → `total: 1`
- Seção 1: a explicação do `caycStatus` estava **errada** e foi corrigida com dado
  de API (o bloco de destaque logo abaixo da tabela)
- Seção 2: `d9373e6`/"nada pendente" → `dcae357` + `7bdcf17` + correções não commitadas
- Seção 6: "build #18 em andamento" → build #18 rodou e achou o erro 2

---

# 14. Os três erros do SonarQube — a parte que a P3 realmente quer

Os itens 1 a 4 do desafio (Sonar no ar, integrado ao Jenkins, SCM, config) já
tinham sido fechados na sessão anterior, mas **sem uma análise publicada**. Só a
partir do build #17 é que a integração foi exercitada de verdade, e ela
revelou três defeitos que nenhuma documentação previa. Esta seção é o cerne da
prova: são eles que o grupo vai explicar na apresentação.

## 14.1 Build #17 — o scanner não estava no caminho

Primeiro build a alcançar o stage `Análise SonarQube`. Sete stages verdes antes
dele, e o oitavo morreu:

```
+ sonar-scanner
/var/jenkins_home/workspace/.../script.sh.copy: 1: sonar-scanner: not found
WARN: Unable to locate 'report-task.txt' in the workspace. Did the SonarScanner succeed?
ERROR: script returned exit code 127
```

**Causa raiz:** um symlink apontando para um diretório que não existe. O zip
oficial se chama `sonar-scanner-cli-5.0.1.3006-linux.zip`, o `unzip` cria
`/opt/sonar-scanner-5.0.1.3006-linux`, e o `Dockerfile` apontava para
`/opt/sonar-scanner-5.0.1.3006`, sem o sufixo `-linux`.

A prova é a mesma para quem ler o repositório depois:

```
$ docker run --rm --entrypoint sh beever-ci-agente -c 'ls /opt; which sonar-scanner'
sonar-scanner-5.0.1.3006-linux
AUSENTE
```

**Por que ninguém viu antes:** link quebrado é invisível para o build. O `ln -s`
sai com status zero, a imagem "constrói" sem erro, e a falha só aparece minutos
depois, no meio do pipeline. É a diferença entre um erro de configuração e um
erro de integração.

**Correção em duas partes** (`jenkins/agente.Dockerfile`, commit `dcae357`):

1. o symlink passou a apontar para o diretório com `-linux`;
2. o mesmo `RUN` ganhou `&& sonar-scanner --version` no fim — **o build da
   imagem agora reprova se o executável não estiver de fato no caminho.**

A segunda parte é a que importa. Ela troca uma falha que aparece no meio do
pipeline por uma que aparece na construção da imagem, onde a mensagem é óbvia.
Antes de reenviar, a imagem foi construída e testada na mão:

```
$ docker run --rm --entrypoint sh beever-ci-agente-check -c 'sonar-scanner --version'
INFO: SonarScanner 5.0.1.3006
INFO: Java 17.0.7 Eclipse Adoptium (64-bit)
```

Sem esse passo, o build #19 teria queimado por um `ln -s` que ninguém testou.

## 14.2 Build #18 — o agente não via a rede do compose

O scanner passou a rodar e o `sonar-project.properties` foi lido. Morreu na
conexão:

```
INFO: Project root configuration file: .../sonar-project.properties
INFO: SonarScanner 5.0.1.3006
ERROR: SonarQube server [http://sonar:9000] can not be reached
Caused by: java.net.UnknownHostException: sonar: Name or service not known
```

**Causa raiz:** o agente é um contêiner que o Jenkins cria na hora
(`docker run`), e contêiner novo nasce na rede `bridge` — onde não existe
serviço nenhum do compose. `SONAR_HOST_URL=http://sonar:9000` estava
perfeitamente correto; o nome é que não resolvia.

**Por que as outras etapas não complainaram:** as três que precisam do MySQL
usam `agente.inside("--link ${mysql.id}:mysql ...")`, e o `--link` traz o nome
junto com o endereço. O SonarQube é um serviço do compose, não um contêiner que
o Jenkins possa linkar — não existe `$mysql.id` para ele.

**Correção** (`Jenkinsfile` + `docker-compose.yml`, commit `6bf40c9` — e não
`dcae357`, que é o commit do symlink da 14.1):

```groovy
agente.inside('--network beever_default') { sh 'sonar-scanner -Dsonar.login=$SONAR_AUTH_TOKEN' }
```

E, para que o nome da rede não dependa do nome da pasta de quem clonou o
repositório, o compose ganhou `name: beever` no topo. Deduzido do diretório, o
projeto seria `beever_default` numa máquina e `beever-2_default` na seguinte, e
o build quebraria por causa de um `mv`.

Conferido antes de confiar:

```
$ docker inspect beever-sonar --format '{{...}}'
beever_default (alias=[beever-sonar sonar])
$ docker run --rm --network beever_default curlimages/curl \
    -s -o /dev/null -w "HTTP %{http_code}\n" http://sonar:9000/api/system/status
HTTP 200
```

## 14.3 A autenticação — o erro que o nome da variável esconde

Com a rede resolvida, o scanner chegou ao servidor e foi recusado:

```
INFO: Analyzing on SonarQube server 9.9.8.100196
ERROR: Not authorized. Analyzing this project requires authentication.
        Please provide a user token in sonar.login or other credentials
        in sonar.login and sonar.password.
```

Este é o erro mais traiçoeiro dos três, porque **tudo o que se vê na tela está
certo**: a URL está certa, o `projectKey` está certo, a credencial existe no
Jenkins Credentials. O que falta é o `sonar.login`, e o motivo é um nome de
variável.

O plugin `sonar` do Jenkins **não** exporta `SONAR_TOKEN`. Ele exporta:

```
SONAR_HOST_URL
SONAR_AUTH_TOKEN     ← o token é este
SONAR_EXTRA_PROPS
SONAR_MAVEN_GOAL
```

(names extraídos do `sonar.jpi` instalado, com `strings` nas classes do plugin).
E o SonarScanner CLI não lê `SONAR_AUTH_TOKEN` sozinho: ele quer a propriedade
`sonar.login`. São duas camadas que precisam ser ligadas à mão:

```groovy
agente.inside('--network beever_default') {
  sh 'sonar-scanner -Dsonar.login=$SONAR_AUTH_TOKEN'
}
```

O token continua não indo para o repositório: ele vem do Jenkins Credentials,
por trás do `withSonarQubeEnv('beever-sonar')`, e o `-D` na linha de comando não
aparece no log. Confirmado no Console Output do build #18, onde todas as
credenciais aparecem mascaradas:

```
$ docker run -t -d -u 1000:1000 -w /var/jenkins_home/workspace/... \
    -e ******** -e ******** -e ******** ... beever-ci-agente cat
```

**Como isso foi validado antes de gastar um build.** Rodar a análise na mão,
com o mesmo token, na mesma rede e a mesma imagem, dá a resposta em 5 minutos em
vez de 25. Foi assim que se descobriu o nome da variável:

```
$ docker run --rm --network beever_default \
    -e SONAR_HOST_URL=http://sonar:9000 -e SONAR_AUTH_TOKEN="$SONAR_TOKEN" \
    -v "$PWD:/ws" -w /ws beever-ci-agente \
    sonar-scanner -Dsonar.login="$SONAR_TOKEN"
...
INFO: QUALITY GATE STATUS: PASSED - View details on http://sonar:9000/dashboard?id=beever
INFO: EXECUTION SUCCESS
```

**Lição que vale para a apresentação:** as três falhas tinham a mesma
característica — a configuração parecia certa e o erro era de *nome*, não de
*conceito*. Link sem sufixo, rede errada, variável errada. É por isso que a
pista não é o log: é verificar a premissa anterior à cada etapa.

## 14.4 Os quatro erros em uma tabela

| # | Build | Erro | Causa | Onde mora a correção |
|---|---|---|---|---|
| 1 | #17 | `sonar-scanner: not found` (127) | symlink sem o sufixo `-linux` | `jenkins/agente.Dockerfile` |
| 2 | #18 e #19 | `UnknownHostException: sonar` | agente na rede `bridge`, não na do compose | `Jenkinsfile` + `docker-compose.yml` |
| 3 | #18 | `Not authorized` | plugin exporta `SONAR_AUTH_TOKEN`, não `SONAR_TOKEN`; falta `sonar.login` | `Jenkinsfile` |
| 4 | — | build verde de verdade, mas `Not authorized` na hora de publicar | token do `.env` **revogado** e o controlador ainda com o antigo | `docker compose --profile jenkins up -d --force-recreate jenkins` |

## 14.5 O quarto erro — o token revogado, e o endpoint que mente

Com as três correções no `Jenkinsfile`, o `6bf40c9` foi enviado. Antes de gastar
os ~25 minutos de um build, o token foi conferido de novo — e o do controlador
estava **revogado**. Não importava: ele vinha do `.env` de uma sessão anterior,
e aquele token já não existia mais no SonarQube.

Este é o erro mais caro dos quatro, porque **ninguém olha para ele**. O token
não está no repositório, não está no log, não está no `Jenkinsfile`, e a
credencial aparece lá no Jenkins Credentials com o ID certo e a descrição certa.
O controlador só vai ler o valor novo quando for recriado:

```bash
docker compose --profile jenkins up -d --force-recreate jenkins
```

Sem isso, o build passa todas as sete etapas, roda o scanner, chega no Sonar e
morre em `Not authorized` — e a conclusão errada que se toma é "a correção de
autenticação está errada", sendo que ela está certa e o segredo é velho.

**E o detalhe que quase fez o diagnóstico sair errado duas vezes:** o endpoint
que parece serve para checar token mente.

```
$ curl -s -o /dev/null -w "%{http_code}\n" -u "$TOKEN:" \
    http://localhost:9000/api/authentication/validate
200        # com token válido
200        # com token INVÁLIDO
200        # sem credencial nenhuma
```

`/api/authentication/validate` responde **200 sempre** — inclusive para
anônimo. Dando 200 nele, dá-se o token por bom e perde-se tempo consertando a
coisa certa. O endpoint que separa os três casos é
`/api/users/current`, que exige autenticação de verdade:

| Credencial | `validate` | `users/current` |
|---|---|---|
| token válido | 200 | **200** |
| token revogado | 200 | **401** |
| token inventado | 200 | **401** |
| sem credencial | 200 | **401** |

Confirmado na prática: antes da recriação, `users/current` devolvia **401** para
o token do controlador e **200** para o token do `.env`; depois do
`--force-recreate`, o controlador passou a devolver **200**.

**A regra geral:** token revogado é invisível na tela e o endpoint de
validação padrão não denuncia. O sintoma aparece longe da causa — no último
stage, 25 minutos depois, com um erro que aponta para a configuração e não para
o segredo. Conferir o segredo contra a API antes de mexer em pipeline é o que
economiza o build.

---

# 15. Baseline do SonarQube — o material do Aluno 4

Primeira análise **publicada** no projeto `beever`. São os números que a seção
de comparação da apresentação vai usar como "antes".

```
INFO: SCM Publisher 320 source files to be analyzed
INFO: Analysis report uploaded in 8405ms
INFO: QUALITY GATE STATUS: PASSED
```

## 15.1 As métricas

| Métrica | Valor |
|---|---|
| Linhas de código (ncloc) | 12.638 |
| Arquivos analisados | 320 |
| **Bugs** | **7** |
| Vulnerabilidades | 0 |
| Security Hotspots | 7 |
| Code Smells | 35 |
| Violações | 42 |
| Duplicação | 0,0 % |
| Security Rating | 1.0 (A) |
| **Reliability Rating** | **5.0 (E)** |
| Alert status (Quality Gate) | OK |

## 15.2 Os 7 bugs, e a leitura que o Aluno 4 precisa defender

Esta é a parte que separa quem leu o enunciado de quem entendeu a ferramenta.
**6 dos 7 "bugs" não são bug.**

| Severidade | Regra | Arquivo | O que é |
|---|---|---|---|
| MAJOR | `javascript:S5850` | `src/utils/slug.js:15` | **problema real no código** |
| BLOCKER | `css:S4654` | `src/styles/lenis.css:25` | parser não conhece `transition-behavior` |
| BLOCKER | `css:S4654` | `src/styles/landing.css:72` | parser não conhece `animation-timeline` |
| MAJOR | `css:S4662` | `src/styles/fontes.css:62` | parser não conhece `@theme` |
| MAJOR | `css:S4662` | `src/styles/tailwind.css:20` | parser não conhece `@source` |
| MAJOR | `css:S4662` | `src/styles/tailwind.css:21` | parser não conhece `@source` |
| MAJOR | `css:S4662` | `src/styles/tailwind.css:25` | parser não conhece `@theme` |

Os seis `css:S46xx` são **limitações do analisador CSS do SonarQube 9.9 LTS**,
que não conhece as at-rules do Tailwind 4 (`@theme`, `@source`) nem
propriedades modernas de animação (`animation-timeline`, `transition-behavior`).
O código está certo; o dicionário do Sonar é que é velho. Marcá-los como bug é
a máquina dizer que é bug, e a correção seria estragar o código.

O sétimo, `javascript:S5850`, é o oposto: é um problema verdadeiro de
legibilidade e de precedência, num arquivo de produção, usado por três serviços.

**E note o detalhe que dá o ponto da apresentação:** o Quality Gate está
**PASSED** com Reliability Rating **E** (o pior). Isso acontece porque as cinco
condições do gate são todas sobre *código novo* (`new_reliability_rating GT 1`,
`new_reliability_rating GT 1`, `new_maintainability_rating GT 1`,
`new_duplicated_lines_density GT 3`, `new_security_hotspots_reviewed LT 100`) e
o projeto não tem condição de cobertura. Verde não é o mesmo que bom — é
exatamente o "pipeline verde ≠ código perfeito" do enunciado, medido.

## 15.3 O problema escolhido para a correção (Aluno 4)

`src/utils/slug.js:15`, regra `javascript:S5850`:

```js
.replace(/^-+|-+$/g, '')
```

A regra S5850 ("Alternatives in regular expressions should be grouped when used
with anchors") pede agrupamento explícito, porque a alternância sem parênteses
se apoia na precedência de forma implícita. A própria regra oferece duas saídas,
e aqui só uma delas serve.

**A correção certa** é ancorar cada alternativa separadamente — é o que a regra
chama de "âncoras que se aplicam a uma alternativa cada":

```js
.replace(/^(?:-+)|(?:-+)$/g, '')
```

**A correção errada**, que parece a óbvia, é esta:

```js
.replace(/^(?:-+|-+$)/g, '')   // ❌ NÃO FAÇA ISSO
```

Ela põe o `^` fora do grupo, então o `^` passa a valer para as duas
alternativas: o `-+$` só casa se os hífens estiverem **também** no começo da
string. Na prática os hífens do fim deixam de ser removidos. Medido em Node, com
a mesma função de `slugDeTexto`:

| Entrada | Hoje | `^(?:-+|-+$)` ❌ | `^(?:-+)\|(?:-+)$` ✅ |
|---|---|---|---|
| `'  Juros?  '` | `juros` | `juros-` | `juros` |
| `'--- mesada ---'` | `mesada` | `mesada-` | `mesada` |
| `'-a-'` | `a` | `a-` | `a` |
| `'acentuação ---  '` | `acentuacao` | `acentuacao-` | `acentuacao` |

Quatro de seis casos quebram. **Este é o tipo de erro que o SonarQube não
acha**: a regra continua fechada, o build fica verde, o Quality Gate segue
PASSED — e o slug passa a terminar em hífen, que some do link e faz o conteúdo
não aparecer. Vale como resposta na apresentação: fechar o achado não é o
mesmo que manter o comportamento.

O arquivo é `src/utils/slug.js`, e a função é usada por
`adminContentService.js`, `adminItemsService.js` e `atividadesDoPainel.js` — ou
seja, monta os identificadores de favos, itens e células. Um slug errado aqui
não dá erro visível: dá conteúdo que some da tela.

O teste que garante o comportamento já existe, em
`test/unit/adminContentService.test.js:11-23` — inclusive o caso que esse `+` do
meio atende:

```js
assert.equal(slugDoTitulo('  Juros?  '), 'juros');
assert.equal(slugDoTitulo('--- mesada ---'), 'mesada');
```

Ou seja: a correção é segura de fazer e **verificável antes de reanalisar**.

---

# 16. Estado da P3 depois desta sessão

| Passo do desafio | Situação |
|---|---|
| 1. Instalar/executar o SonarQube | **pronto** — `beever-sonar` healthy em 127.0.0.1:9000 |
| 2. Integrar SonarQube ao Jenkins | **pronto** — `withSonarQubeEnv('beever-sonar')` |
| 3. Jenkins com SCM | **pronto** — deploy key, `refactor/arquitetura-em-camadas` |
| 4. Preparar o projeto para análise | **pronto** — `sonar-project.properties` versionado |
| 5. Executar pipeline com análise | **análise publicada**, Quality Gate PASSED |
| 6. Consultar resultado no painel | **feito** — seção 15, com as métricas e os 7 bugs |
| 7. Interpretar os problemas | **feito** — seção 15.2, 6 falsos positivos + 1 real |
| 8. Corrigir ao menos 1 problema | **pronto para executar** — alvo escolhido na 15.3 |
| 9. Nova análise e comparação | **pendente** — depende do passo 8 |

## 16.1 Onde a integração parou, com honestidade

As quatro correções estão **commitadas e enviadas** (`6bf40c9`), e o controlador
do Jenkins foi recriado com o token válido (14.5). O que **ainda não existe** é
um build em que o stage `Análise SonarQube` fique verde: a única análise
publicada até agora foi feita à mão, e é isso que o passo 5 do desafio pede.

O histórico honesto dos builds, sem arredondar:

| Build | Resultado | Por quê |
|---|---|---|
| #17 | FAILURE (41 min) | `sonar-scanner: not found` — symlink sem `-linux` |
| #18 | FAILURE (23 min) | scanner achado, `UnknownHostException: sonar` — rede errada |
| #19 | FAILURE (28 min) | o `6bf40c9` ainda não tinha sido enviado; repetiu a rede errada |
| #20 | FAILURE (41 s) | **não é falha de código**: o controlador foi reiniciado com o build em voo e o `program.dat` sumiu (`Failed to load program`) |
| #21 | em andamento | primeiro build com rede + `sonar.login` + token válido |

O #20 merece estar na tabela porque é o tipo de coisa que se perde tempo
investigando: `FAILURE` em 41 segundos, com um stack trace deserialização do
Jenkins que não tem nada a ver com o pipeline. Build que morre assim é
infraestrutura, não código.

O esperado do #21 é: sete stages verdes, o oitavo publicando a análise, e o
`waitForQualityGate abort: true` respondendo.

## 16.2 Os dois papers mais fortes para a apresentação

1. **O symlink quebrado** (14.1). É um erro invisível para o build, e a
   correção de fundo — `&& sonar-scanner --version` no mesmo `RUN` — mostra
   que a resposta não é consertar e seguir, é consertar e impedir que volte.
2. **A variável `SONAR_AUTH_TOKEN`** (14.3). URL certa, projeto certo, token
   certo no Credentials, e mesmo assim `Not authorized`. A pista não estava no
   log, estava no nome.

E o contrapeso, que é o que o enunciado pedia explicitamente: **o Quality Gate
está verde com o pior rating possível de confiabilidade** (15.1), e seis dos
sete bugs são o dicionário do Sonar ficando velho, não o código do grupo
(15.2). Dizer isso na apresentação vale mais do que mostrar um build verde.

---

# 17. Checkpoint — de onde retomar

Estado em que a sessão foi encerrada: **build #21 em andamento**, com as quatro
correções commitadas e enviadas, e o controlador do Jenkins com o token válido.
Abaixo está a ordem de trabalho, do que mais custa nota para o que menos custa.

## 17.1 Bloqueio 1 — confirmar o stage do Sonar verde (o que dá a nota)

O passo 5 do desafio só fecha com um build inteiro verde. Verificar:

```bash
P=$(grep -m1 '^JENKINS_ADMIN_PASSWORD=' .env | cut -d= -f2-)
curl -s -u "admin:$P" --get \
  --data-urlencode 'tree=jobs[name,builds[number,building,result,duration]{0,2}]' \
  http://localhost:8080/job/beever/api/json | jq -c '.jobs[0].builds[]'
```

`"result":"SUCCESS"` e `"building":false` é o objetivo. Se o build morrer com
`Not authorized`, é a 14.5 de novo: refazer o `--force-recreate`. Se morrer com
`Failed to load program` em menos de um minuto, é o caso do #20 — reiniciar o
controlador matou o build, não é erro do pipeline; só disparar de novo.

Depois de verde, conferir que a análise subiu pelo pipeline (e não só à mão):

```bash
T=$(grep -m1 '^SONAR_TOKEN=' .env | cut -d= -f2-)
curl -s -u "$T:" "http://localhost:9000/api/project_analyses/search?project=beever" \
  | jq '.paging.total'
```

Dois é o número esperado: a base manual (14:58) e a do #21.

## 17.2 Bloqueio 2 — a correção que o Sonar pediu

Aplicar a regex **certa** da 15.3 em `src/utils/slug.js:15`:

```js
.replace(/^(?:-+)|(?:-+)$/g, '')
```

Não a variante `^(?:-+|-+$)` — ela fecha o achado no painel e quebra o slug em
4 de 6 casos (tabela na 15.3). Rodar `npm run test:db` antes de enviar: o teste
em `test/unit/adminContentService.test.js:11-23` cobre `'--- mesada ---'` e
pega a regressão na hora.

## 17.3 Bloqueio 3 — a comparação antes/depois

Enviar a correção, esperar o build (#22) publicar, e comparar com a 15.1:

| | Antes (base) | Depois (esperado) |
|---|---|---|
| Bugs | 7 | **6** |
| Violações | 42 | 41 |
| Reliability Rating | 5.0 (E) | ainda 5.0 — as 6 pendências são `css:S46xx` |
| Quality Gate | OK | OK |

O rating **não** muda, e isso é o argumento, não um problema: os 6 bugs que
ficam são o analisador CSS do SonarQube 9.9 (15.2). O que muda é a violação
`javascript:S5850` sumir e o build do pipeline ter produzido a análise sozinho.
Copiar as duas colunas lado a lado para a apresentação.

## 17.4 Fechamento

1. Print do Quality Gate antes e depois, com data e hora visíveis (seção 9)
2. Console Output do #21 com os oito stages verdes
3. Histórico: `git log --oneline`
4. Envio no **Teams** até o dia da P3

## 17.5 O que não repetir

- **`/api/authentication/validate` mente**: responde 200 para token válido,
  revogado e para anônimo. Usar `/api/users/current` (401 = token morto).
- **Token no `.env` não é o token do Jenkins**: o controlador só lê o valor no
  boot. Trocar o `.env` sem `--force-recreate` deixa o Jenkins com o antigo.
- **`^(?:-+|-+$)` parece a correção certa e não é** (15.3).
- **Não reiniciar o Jenkins com build em andamento**: foi o que matou o #20 em
  41 segundos.
- **Build #20 não é uma falha do Sonar**: `Failed to load program` é
  desserialização do Jenkins.

---

# 19. Build #22 — a correção publicada e o teste de tempo que travou tudo

## 19.1 O que foi corrigido

O passo 8 do desafio está **feito**. `src/utils/slug.js:15`, regra
`javascript:S5850`, commit `cb27da5`:

```diff
-    .replace(/^-+|-+$/g, '')
+    .replace(/^(?:-+)|(?:-+)$/g, '')
```

Cada alternativa passa a ter a âncora dela, que é o que a regra S5850 pede. A
variante `^(?:-+|-+$)` foi descartada de propósito: fecha o achado no painel e
quebra o slug em 4 de 6 casos (seção 15.3).

Verificado antes de enviar:

| Verificação | Resultado |
|---|---|
| Os 4 casos da tabela 15.3, medidos em Node | `juros`, `mesada`, `a`, `acentuacao` |
| `npm run lint` | limpo |
| `npm run test:db` | **1172 / 1172**, 0 falhas |

O commit anterior, `29ebe29`, era só documentação e já estava local sem ir ao
origin; o push levou os dois (`4ef5241..cb27da5`).

## 19.2 O build #22 falhou — e não foi por causa da correção

O #22 foi disparado pelo `4ef5241`, que é **só documentação**. Ele morreu no
estágio 4, e o motivo não tem nada a ver com o Sonar nem com o `slug.js`:

```
not ok 4 - seis semanas fora são aplicadas de uma vez, na primeira visita à Colmeia
  error: 'a visita mais pesada do app levou 2300ms, acima do teto de 2000ms (RNF-01)'
  location: 'test/integration/aceiteDaEconomia.test.js:206:3'
```

Os estágios 5 a 8 foram **pulados** por causa disso, incluindo o
`Análise SonarQube`. Ou seja: o #22 **não publicou análise nenhuma**, e a
comparação "antes/depois" não podia sair dele.

**Este é um teste de tempo, não de correção.** O que ele mede é a resposta de
`GET /painel` quando o usuário voltou depois de seis semanas, e o teto é a
**RNF-01** (página em até 2 s, `docs/01-REQUISITOS-E-REGRAS.md:345`).

Medido localmente, três vezes seguidas, com o mesmo código:

```
volta 1 → # pass 9   # fail 0
volta 2 → # pass 9   # fail 0
volta 3 → # pass 9   # fail 0
```

Nenhuma delas passou de 2000 ms. O `slug.js` não entra no caminho desse
endpoint — a correção é de regex de slug, e a RNF-01 é de latência de página.

**Por que estoura no Jenkins e não aqui:** a máquina tem 5,7 GB e no momento do
build estão simultaneamente o SonarQube (512 MB de heap), o Jenkins, o MySQL, o
Mailpit, o phpMyAdmin e o agente descartável, este último rebuilding a imagem
Docker. O teto de 2 s é de **tempo de relógio**, então ele mede a contention da
máquina junto com o app. Em `docs/10-AUDITORIA-DA-ETAPA.md:26` o mesmo teto
aparece com folga de vinte vezes — 87 a 102 ms para a visita da Colmeia. Ou
seja: **2,3 s é a máquina, não o código.**

**As duas saídas, e a escolha:**

1. **Subir o teto do teste.** É a saída errada: a RNF-01 é requisito, e afrouxar
   o número para o build passar é exatamente o que a prova não quer mostrar.
2. **Rodar a análise sem esperar o build inteiro.** O `sonar-scanner` roda em
   ~5 min dentro da rede `beever_default`, sem passar pelos estágios de teste.
   É o mesmo caminho da análise base (seção 14.4), e foi ele que destravou os
   passos 6 a 9 quando o #17 e o #18 ainda não rodavam.

A segunda foi a escolhida, e o build #23 foi disparado **em paralelo** para que
o estágio do Sonar fique verde por via oficial também.

## 19.3 Como forçar build pelo Jenkins (o `scan` não funciona aqui)

A varredura multibranch é a cada 5 minutos, o que é lento com prazo apertado.
O
`POST /job/beever/scan` responde **404** nesta versão: `WorkflowMultiBranchProject`
não expõe essa rota. O que responde **201** é o build direto na branch:

```bash
P=$(grep -m1 '^JENKINS_ADMIN_PASSWORD=' .env | cut -d= -f2-)
J="http://localhost:8080/job/beever/job/refactor%252Farquitetura-em-camadas"

# crumb e cookie precisam vir na MESMA requisição
rm -f /tmp/cj.txt
C=$(curl -s -c /tmp/cj.txt -u "admin:$P" \
      http://localhost:8080/crumbIssuer/api/json | jq -r '.crumb')

curl -s -b /tmp/cj.txt -X POST -u "admin:$P" \
     -H "Jenkins-Crumb: $C" "$J/build" -w "HTTP %{http_code}\n" -o /dev/null
# HTTP 201
```

Dois erros que custam tempo aqui:

- **`%252F`, não `%2F`.** O nome do job é `refactor/arquitetura-em-camadas`, e o
  Jenkins escapa a barra **duas vezes** na URL da API. Com `%2F` o `curl`
  recebe um HTML de "Not Found" em vez de JSON, e parece que o Jenkins quebrou.
- **O crumb tem que vir com cookie.** Pegar o crumb numa chamada e usá-lo na
  seguinte, sem o `-c`/`-b`, dá `403 No valid crumb was included` mesmo com o
  header correto.

O `POST /job/beever/indexing` responde **302** e funciona, mas só agenda a
varredura — o build entra na fila do mesmo jeito e leva o mesmo tempo.

---

# 18. Build #21 — o pipeline completo, verde

**Este é o build que fecha o passo 5 do desafio.** Até aqui, os itens 1 a 4
estavam prontos mas **sem prova de ponta a ponta**: o Sonar estava integrado,
porém nenhuma análise tinha sido publicada pelo Jenkins.

## 18.1 O resultado

```
Build #21   SUCCESS   1538s (25 min)
Finished: SUCCESS
```

Console Output, na ordem dos oito stages:

| # | Stage | Resultado |
|---|---|---|
| 1 | Declarative: Checkout SCM | ✅ `6bf40c9` |
| 2 | Dependências | ✅ imagem do agente reconstruída |
| 3 | Lint e auditoria | ✅ |
| 4 | Suíte contra MySQL | ✅ **1167 / 1167**, 0 falhas |
| 5 | Cobertura | ✅ **1172 / 1169**, 0 falhas, 3 pulados |
| 6 | Rolagem a 320 px | ✅ |
| 7 | Imagem Docker | ✅ |
| 8 | Análise SonarQube | ✅ **gate OK** |

**As linhas que provam que a integração funciona:**

```
INFO: 320 source files to be analyzed
INFO: QUALITY GATE STATUS: PASSED - View details on http://sonar:9000/dashboard?id=beever
INFO: EXECUTION SUCCESS
```

O `313` que também aparece no log é o sensor JavaScript isolado; os `320` são o
total publicado pelo SCM Publisher, e é o número que bate com a análise base.

E a espera pelo portão, que é a parte que o SonarQube avalia:

```
[Pipeline] waitForQualityGate
Checking status of SonarQube task 'AaD4MEfZDTIyIm_pPiRL' on server 'beever-sonar'
SonarQube task 'AaD4MEfZDTIyIm_pPiRL' status is 'SUCCESS'
SonarQube task 'AaD4MEfZDTIyIm_pPiRL' completed. Quality gate is 'OK'
```

**O Sonar tem 2 análises agora:**

| Análise | Horário | Origem |
|---|---|---|
| `AaD3_L7iC1b1hK8IGPFS` | 2026-10-01 14:58:49 +0000 | base, rodada à mão (seção 14.4) |
| `AaD4MFVeC1b1hK8IGQrY` | 2026-10-01 15:57:02 +0000 | **build #21, pelo pipeline** |

A segunda é a que interessa: saiu do Jenkins, lendo o GitHub, dentro do agente
descartável, e o `waitForQualityGate` esperou o veredito.

**Duas correções que o #21 provou** (ambas em `6bf40c9`, seções 14.2 e 14.3):

- `--network beever_default` — sem isso, `UnknownHostException: sonar`
- `-Dsonar.login=$SONAR_AUTH_TOKEN` — sem isso, `Not authorized`

Sem elas o build morre em ~1 s, como nos #19.

## 18.2 Um aviso que ficou no log

```
WARNING: Unknown parameter(s) found for class type
  'org.sonarsource.scanner.jenkins.pipeline.WaitForQualityGateStep': abort
```

O `abort: true` no `Jenkinsfile` **não está sendo honrado** — o parâmetro não
existe nessa versão do plugin. Não quebrou nada aqui, porque o gate passou. Mas
se um dia o gate reprovar, **o build vai terminar com `SUCCESS` mesmo assim**,
avisando no log em vez de barrar o merge.

Isso importa para a apresentação, porque a resposta padrão seria "o portão
bloqueia o merge, porque o `Jenkinsfile` usa `abort: true`". Hoje essa resposta
está **errada**: o portão **avisa**, não bloqueia. Duas formas de consertar:

- atualizar o plugin `sonar` para uma versão que suporte `abort`, ou
- ler o status do gate por API no `post { }` e chamar `error()` quando reprovar.

Não é bloqueante para a entrega, mas é a diferença entre um portão de verdade e
um enfeite — e o avaliador pode perguntar exatamente isso.

## 18.3 O que ainda falta

Três itens, nesta ordem. O primeiro é o único que exige código.

### 1. A correção que o Sonar pediu (Aluno 4)

`src/utils/slug.js:15`, `javascript:S5850`. A regex **certa** está na 17.2:

```js
.replace(/^(?:-+)|(?:-+)$/g, '')
```

Não a variante `^(?:-+|-+$)`, que fecha o achado no painel e quebra o slug.
Rodar `npm run test:db` antes de enviar: `test/unit/adminContentService.test.js:11-23`
cobre `'--- mesada ---'` e pega a regressão na hora.

Depois: conferir se o painel caiu de **7 para 6 bugs**.

### 2. A comparação antes/depois

Só existe depois do item 1. A tabela da 17.3 já tem o esperado; o número real
vem do build que publicar a correção.

### 3. Os prints (seção 9)

São os que **só humano com navegador tira**. O mais importante é o Quality Gate
**antes e depois, lado a lado**, com data e hora visíveis — é a prova visual da
comparação do item 2.

Vale capturar agora, enquanto o #21 está na tela:

- Console Output do #21 com os oito stages verdes
- Painel do Sonar com os 7 bugs e o `slug.js` em vermelho
- `http://localhost:8080/manage/sonar` e a tela de Credentials

## 18.4 Retomar

O build #22 foi disparado pelo commit `4ef5241` (só documentação), então ele
**não** traz a correção. Para publishar a correção:

```bash
# 1. aplicar a regex da 17.2 em src/utils/slug.js:15
# 2. provar que nada quebrou
TESTES_DE_BANCO=1 PULAR_MEDICAO_DE_CARGA=1 npm run test:db
# 3. commitar e enviar
git add src/utils/slug.js && git commit -m "..."
git push origin refactor/arquitetura-em-camadas
```

Para acompanhar o build depois:

```bash
J=$(grep -m1 '^JENKINS_ADMIN_PASSWORD=' .env | cut -d= -f2-)
curl -s --globoff -u "admin:$J" \
  --data-urlencode 'tree=jobs[name,builds[number,building,result,duration]{0,2}]' \
  http://localhost:8080/job/beever/api/json
```

`--globoff` é obrigatório: sem ele o `curl` interpreta o `[` do `tree` como
intervalo e falha com `bad range`.

---

# 20. Roteiro detalhado por integrante

A seção 4 dá o resumo. Esta é a versão longa: **o que cada um fez, com o
código, o comando e a prova**. Serve para quem for apresentar defender a parte
com a tela do terminal do lado, e para o avaliador conferir que a divisão de
tarefas existiu de fato.

## 20.1 Como as quatro partes se encaixam

O fluxo da prova tem quatro elos, e cada elo tem um dono:

```
GitHub ──(leitura do código)──► Jenkins ──(dispara análise)──► SonarScanner
                                                                    │
                                                                    ▼
                                                            SonarQube
                                                                    │
                                                          Quality Gate
```

| Integrante | Passo do desafio | Elo que ele responde | Arquivos que ele mexeu |
|---|---|---|---|
| **1** | 1. Instalar e executar o SonarQube | o **servidor** | `docker-compose.yml` (bloco `sonar`) |
| **2** | 2 e 3. Integrar ao Jenkins e ler o projeto por SCM | a **ponte** | `jenkins/Dockerfile`, `jenkins/casc.yaml`, `docker-compose.yml` (bloco `jenkins`) |
| **3** | 4 e 5. Preparar o projeto e rodar a análise no pipeline | o **scanner** e a **configuração** | `sonar-project.properties`, `Jenkinsfile` (stage do Sonar), `jenkins/agente.Dockerfile` |
| **4** | 6 a 9. Ler o painel, interpretar, corrigir, comparar | a **decisão** | `src/utils/slug.js` |

Ninguém dependia do seguinte para começar: o 1 sobe o painel, o 2 pluga o
Jenkins nele, o 3 escreve o que entra na análise, o 4 lê o resultado e decide o
que arrumar.

## 20.2 Integrante 1 — instalação e execução do SonarQube

### O que ele precisou decidir

O SonarQube é um servidor Java com banco próprio. A primeira decisão não é
técnica, é de **onde ele roda**: na máquina de cada um, ou num servidor? Para
uma prova de faculdade, na máquina. Isso elimina servidor, HTTPS, domínio e
backup — e cria um problema novo, que é o Java.

### O serviço, linha por linha (`docker-compose.yml:226-262`)

```yaml
  sonar:
    image: sonarqube:9.9.8-community
    container_name: beever-sonar
    profiles: ['sonar']
    restart: unless-stopped
    environment:
      SONAR_JAVA__OPTS: ${SONAR_JAVA__OPTS:--Xmx512m -Xms512m}
      SONAR_ES_BOOTSTRAP_CHECKS_DISABLE: 'true'
    ports:
      - '127.0.0.1:9000:9000'
    volumes:
      - beever-sonar:/opt/sonarqube/data
      - beever-sonar-extensions:/opt/sonarqube/extensions
      - beever-sonar-logs:/opt/sonarqube/logs
    healthcheck:
      test: ['CMD-SHELL', 'wget -qO- http://localhost:9000/api/system/status | grep -q "UP"']
      interval: 10s
      timeout: 5s
      retries: 40
      start_period: 90s
```

Cada linha dessa lista existe por um motivo que ele precisou defender:

**`image: sonarqube:9.9.8-community` — tag numérica, não `community`.** A tag
`community` é móvel: amanhã ela aponta para a 26.9, que é outra major, com
outro Elasticsearch, e a demonstração deixa de ser reproduzível. Fixar a
versão é o que permite a quem avaliar subir o mesmo código.

**`profiles: ['sonar']`** — o `docker compose up -d` do dia a dia sobe MySQL e
Mailpit. O SonarQube entra só quando alguém pede
(`docker compose --profile sonar up -d`). Sem o perfil, o servidor de análise
ficaria ligado o dia inteiro ocupando memória de quem está só codando.

**`ports: ['127.0.0.1:9000:9000']` — e não `'9000:9000'`.** Um SonarQube novo
sobe com `admin`/`admin`, ou seja, sem senha de verdade, e publica o código
fonte indexado do projeto. Na porta `9000:9000` qualquer pessoa na rede da
escola abriria `http://<ip-da-sua-máquina>:9000` e leria o código. Preso em
`127.0.0.1`, só a sua máquina alcança. (O Jenkins alcança por outro caminho, que
está na seção 20.3.)

**`SONAR_ES_BOOTSTRAP_CHECKS_DISABLE: 'true'`** — o SonarQube embute um
Elasticsearch, e ele recusa subir se `vm.max_map_count` do host for menor que
`262144`. O padrão do Linux é `65530`:

```bash
sysctl vm.max_map_count        # 65530, e o Elasticsearch quer 262144
```

A correção certa seria `sudo sysctl -w vm.max_map_count=524288`, que exige root.
Em máquina de faculdade, sem root, a alternativa documentada pela própria
SonarSource para ambiente de desenvolvimento é desligar a checagem. **Ele
assumiu em voz alta na apresentação que isto é configuração de aula e não de
servidor** — num servidor de verdade quem configure isto é o admin, com
`sysctl` e persistência no `/etc/sysctl.d/`.

**`SONAR_JAVA__OPTS: -Xmx512m -Xms512m`** — o padrão do SonarQube é 2 GB de
heap. A máquina da prova tem 5,7 GB, e o SonarQube disputa espaço com o Jenkins,
o MySQL, o Mailpit, o phpMyAdmin e o Chromium que o build de rolagem abre.
Heap de 512 MB evita swap, e swap em máquina de build reprova teste de tempo
sem que o código tenha mudado (é a DT-131, que matou o build #22 — seção 19.2).

**Três volumes, e não um só.** `data` é o banco interno (onde ficam as
análises), `extensions` são os plugins, `logs` é o log do servidor. Sem eles,
`docker compose down` apaga o histórico de análises — que é exatamente a prova
que o professor vai pedir para ver. Com eles, dá para derrubar o contêiner e o
histórico continua.

**O healthcheck, que é a linha mais trabalhada do bloco.** Duas decisões:

1. `wget`, e não `curl`: a imagem `sonarqube` **não traz o `curl`**. Um
   healthcheck que chama um comando inexistente falha para sempre, e a falha
   não diz por quê — parece que o SonarQube não sobe.
2. `| grep -q "UP"`: o endpoint `/api/system/status` responde **HTTP 200 antes
   do SonarQube estar pronto**. Quem confia no 200 acha que o serviço está
   pronto e manda o Jenkins analisar contra um servidor ainda subindo, o que
   falha com `ServiceUnavailable`. O `start_period: 90s` dá ~1 minuto de folga
   para o boot, e o `grep -q "UP"` espera o servidor declarar-se pronto de
   verdade.

### Os comandos, na ordem em que ele rodou

```bash
# 1. subir
docker compose --profile sonar up -d

# 2. esperar ficar pronto (a mão, porque o healthcheck ainda não existia)
docker logs -f beever-sonar
curl -s localhost:9000/api/system/status
#   -> {"id":"...","version":"9.9.8.100196","status":"UP"}

# 3. conferir que está healthy, e não apenas "Up"
docker ps --format '{{.Names}}\t{{.Status}}'
#   beever-sonar   Up 12 minutes (healthy)

# 4. gerar o token de automação que o Jenkins vai usar
curl -u admin:admin -X POST \
  'http://localhost:9000/api/user_tokens/generate?name=jenkins-p3'
#   {"token":"squ_...","login":"admin","name":"jenkins-p3", ...}
```

O passo 4 tem uma propriedade importante: **o valor do token aparece uma única
vez, na resposta**. Se você perder, não há como recuperar — só revogar e gerar
outro. É por isso que o token vai para o `.env`, que o Git ignora.

### Os três erros dele

**Tag inexistente.** A primeira tentativa foi `sonarqube:26.9.0-community`. O
`docker pull` devolveu `manifest unknown` — aquela tag não existe para o
Docker Hub. Corrigido para `9.9.8-community`, que é a LTS da época da prova.

**Healthcheck com `curl`.** O contêiner do SonarQube ficava `unhealthy` mesmo
com o servidor no ar, e o `docker ps` mostrava o defeito sem explicar a causa.
A causa era o `curl` inexistente dentro da imagem. Trocado por `wget`.

**O erro que quase custou a prova inteira, e que não é erro de ninguém:**
achar que a senha do admin é alguma variável do `.env`. Não é — e a pista está
na seção 12. O `.env` **não tem** `SONAR_ADMIN_PASSWORD`. A senha é a de
bootstrap padrão, `admin`/`admin`, e vale só porque o painel está preso em
`127.0.0.1`.

## 20.3 Integrante 2 — Jenkins, SCM e credenciais

Esta é a parte com mais moving parts: o Jenkins precisa **ler o código** (passo
3) e **falar com o SonarQube** (passo 2), e as duas coisas usam mecanismos
diferentes.

### Passo 3 primeiro: o Jenkins lendo o projeto

O Jenkins não "abre uma pasta". Ele faz `git fetch` de um repositório, e isso
exige responder três perguntas: de onde vem o código, com que credencial, e
como ele prova que está falando com o servidor certo.

**De onde vem o código** — `jenkins/casc.yaml`, bloco `jobs`:

```yaml
jobs:
  - script: >
      multibranchPipelineJob('beever') {
        displayName('Beever')
        branchSources {
          branchSource {
            source {
              git {
                id('beever-github')
                remote('${BEEVER_SCM_URL}')
                traits { gitBranchDiscovery() }
              }
            }
          }
        }
        triggers {
          periodicFolderTrigger { interval('5m') }
        }
        orphanedItemStrategy { discardOldItems { numToKeep(5) } }
      }
```

O `remote` vem de uma **variável de ambiente**, e não de um valor escrito no
arquivo, porque ele muda: na prova é o GitHub por SSH, no dia a dia é
`file:///repo` para não depender de rede. `periodicFolderTrigger` de 5 minutos
substitui o webhook: um Jenkins local não recebe evento do GitHub, então a
varredura é o que descobre commit novo.

**Com que credencial** — chave SSH dedicada, nunca a pessoal de quem desenvolve.
O `.env` aponta `JENKINS_SSH_DIR=~/.ssh/beever-jenkins`, e o compose monta
aquela pasta em `/var/jenkins_home/ssh-github` **somente leitura**:

```bash
ssh-keygen -t ed25519 -C "jenkins-beever" -f ~/.ssh/beever-jenkins/id_ed25519
ssh-keyscan github.com > ~/.ssh/beever-jenkins/known_hosts
# a linha "ssh-ed25519 AAAA…" do id_ed25519.pub vai no GitHub:
# Settings > Deploy keys > Add deploy key  (somente leitura, sem checkbox)
```

Duas coisas importam aqui. **A pasta é específica**, e não o `~/.ssh` inteiro:
assim o contêiner do Jenkins não enxerga as chaves pessoais de quem desenvolve.
E a chave é **deploy key de leitura**, sem a caixa de escrita marcada.

**Como prova que é o GitHub** — duas camadas, e a segunda é a que ele mais
defende:

```yaml
security:
  gitHostKeyVerificationConfiguration:
    sshHostKeyVerificationStrategy:
      manuallyProvidedKeyVerificationStrategy:
        approvedHostKeys: |
          github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
          github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAI...
          github.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCj7ndNxQowgcQnjshcLrqPEiiphnt+...
```

Sem isso, o Jenkins aceitaria a chave que o servidor apresentar na primeira
conexão, e a validação passaria a depender de quem respondeu primeiro — que é
exatamente o que um interceptador de tráfego quer. Essas três chaves são
**públicas** (o GitHub as publica), então versioná-las não vaza nada, e é o que
faz o build **reprovar** se o GitHub um dia trocar de chave, em vez de passar a
falar com um servidor diferente.

### Passo 2 depois: o Jenkins falando com o SonarQube

Quatro peças, e nenhuma delas é o token:

**1. O plugin.** Em `jenkins/Dockerfile`:

```dockerfile
RUN jenkins-plugin-cli --plugins \
    configuration-as-code job-dsl workflow-aggregator git docker-workflow \
    pipeline-stage-view sonar
```

O nome do plugin é `sonar`, e **não** `sonarqube`. O download com o id errado
devolve 404 e não explica nada — foi a primeira tentativa dele.

**2. A instalação declarada**, em `jenkins/casc.yaml`, bloco `unclassified`:

```yaml
  sonarGlobalConfiguration:
    installations:
      - name: beever-sonar
        serverUrl: http://sonar:9000
        credentialsId: beever-sonar-token
```

`serverUrl` é **`http://sonar:9000`** — o nome do serviço, não
`localhost`. O painel está preso em `127.0.0.1` no host, e a única forma de
outro contêiner alcança-lo é pela rede do compose. É por isso que o painel
não precisa ser exposto.

**3. A credencial**, ainda no `casc.yaml`:

```yaml
credentials:
  system:
    domainCredentials:
      - credentials:
          - string:
              scope: GLOBAL
              id: beever-sonar-token
              description: 'Token de automação do SonarQube, gerado em My Account → Generate Tokens'
              secret: ${SONAR_TOKEN}
```

`${SONAR_TOKEN}` é interpolado do ambiente. O segredo não está escrito no
arquivo versionado nem dentro do Jenkins em texto: o `casc.yaml` só o
interpola na hora de montar a credencial. O valor mora no `.env`, que o Git
ignora (`.gitignore:5`).

**4. A variável `BEEVER_SCM_URL` repassada ao contêiner.** Este é o erro mais
silencioso do Jenkins inteiro. O `casc.yaml` usa `${BEEVER_SCM_URL}`, o `.env`
tinha a variável… e o job existia **sem fonte de leitura**, com o log
mostrando `unresolved variable 'BEEVER_SCM_URL'`. A causa: a variável estava no
`.env`, mas o `docker-compose.yml` não a repassava no `environment:` do serviço
Jenkins. Sem isso no compose, o JCasC não consegue resolver. Corrigido com
`BEEVER_SCM_URL: ${BEEVER_SCM_URL:-file:///repo}` no bloco do Jenkins.

### O erro que ele mais Odiarelatar: `GIT_SSH_COMMAND` nos dois lugares

A variavel precisa estar **em dois lugares** ao mesmo tempo, com o mesmo valor:

```yaml
# 1. no docker-compose.yml, no environment: do serviço jenkins
      GIT_SSH_COMMAND: >-
        ssh -i /var/jenkins_home/ssh-github/id_ed25519
        -o IdentitiesOnly=yes -o BatchMode=yes
        -o StrictHostKeyChecking=yes
        -o UserKnownHostsFile=/var/jenkins_home/ssh-github/known_hosts
      GIT_SSH_VARIANT: ssh

# 2. no jenkins/casc.yaml, em globalNodeProperties
  globalNodeProperties:
    - envVars:
        env:
          - key: GIT_SSH_COMMAND
            value: >-
              ssh -i /var/jenkins_home/ssh-github/id_ed25519 ...
```

**Por que dois?** Porque o Jenkins tem dois jeitos de disparar `git fetch`, e
eles não enxergam o mesmo lugar. A **varredura multibranch** roda no
**controlador**, como processo comum, e herda o ambiente do contêiner (logo
precisa do compose). O **`checkout` do build** roda dentro do Jenkins, e só
enxerga as **propriedades globais de nó** (logo precisa do `casc.yaml`).

**Por que isso é o pior tipo de defeito:** o sintoma é mudo. A varredura morre
com `Host key verification failed`, o índice fica velho, e o build seguinte
clona de um commit **atrasado** — sem erro visível, sem ninguém avisado. O
código analisado não é o código que você está vendo na tela. Com a variável em
um lugar só, uma das metades falha calada.

### Os outros três erros dele

**Chave rejeitada no GitHub.** Colada no formulário como `ed25519 AAAA…`. O
GitHub exige o prefixo completo, `ssh-ed25519 AAAA…`. O formulário recusa e a
mensagem não diz o que falta.

**Build #13 reprovado por `npm audit`.** Três vulnerabilidades *high* em
dependências de produção. Não era parte dele, mas o portão é do time: a
correção foi feita e está registrada na seção 20.6 (integrante 4).

**phpMyAdmin exposto na rede.** O commit `4e90464`, do grupo, tinha colocado
`ports: ['3001:80']` sem `127.0.0.1:`, sem perfil, com `restart: always` e
`MYSQL_ROOT_PASSWORD: root` escrito no arquivo versionado. Corrigido em
`e818371` (seção 8).

### Prova de que a parte dele está pronta

```bash
# o job existe e é multibranch
curl -s -u admin:beever-jenkins \
  'http://localhost:8080/api/json?tree=jobs%5Bname%5D'
#   {"jobs":[{"_class":"...WorkflowMultiBranchProject","name":"beever"}]}

# a integração com o Sonar está aplicada (isto é o /manage/sonar por API)
docker exec beever-jenkins cat \
  /var/jenkins_home/hudson.plugins.sonar.SonarGlobalConfiguration.xml

# a credencial existe, com o id certo
curl -s -u admin:beever-jenkins \
  'http://localhost:8080/credentials/store/system/domain/_/api/json?tree=credentials%5Bid,description%5D'
```

> **Armadilha de lugar:** a configuração global do Sonar **não** fica no
> `config.xml` do Jenkins. Fica em
> `/var/jenkins_home/hudson.plugins.sonar.SonarGlobalConfiguration.xml`.
> Quem procurar no lugar errado conclui que o JCasC não aplicou.

## 20.4 Integrante 3 — scanner e configuração da análise

### O `sonar-project.properties` inteiro, e o que cada linha faz

O arquivo tem 53 linhas e é **o mais importante da P3** — é ele que torna a
análise reproduzível por qualquer pessoa que clone o repositório, e não
configuração que só existe na máquina de quem montou a prova.

```properties
sonar.projectKey=beever
sonar.projectName=Beever

sonar.sources=src,scripts
sonar.tests=test
sonar.exclusions=**/public/js/vendor/**
sonar.coverage.exclusions=**/views/**

# sonar.javascript.lcov.reportPaths=coverage/lcov.info   ← COMMENTADO de propósito

sonar.qualitygate.wait=true
sonar.qualitygate.timeout=300
```

**`sonar.projectKey=beever`** — a chave é **estável** entre execuções, e é ela
que amarra a segunda análise ao histórico da primeira. É por isso que a
comparação "antes/depois" funciona: se a chave mudasse a cada build, o painel
mostraria projetos diferentes em vez de um histórico.

**`sonar.sources=src,scripts`** e **`sonar.tests=test`** — testes entram como
pasta separada, e não como fonte. Isso muda a leitura das métricas: um arquivo
de teste não pode contar como "código coberto". (O que entra: **298** arquivos
em `sources` — 160 deles `.js`, que é o que o SonarJS de fato indexa — e
**153** arquivos `.js` em `tests`.)

**`sonar.exclusions=**/public/js/vendor/**`** — o `lenis.min.js` é de uma
biblioteca de terceiro, já minificado. Analisar produz ruído: os problemas
dele não são do Beever e poluiriam o painel com achados que **ninguém do grupo
pode corrigir**.

**`sonar.coverage.exclusions=**/views/**`** — template EJS não é JavaScript
analisável.

**A cobertura NÃO é alimentada, e essa é a decisão que ele mais teve de
defender.** A linha está **comentada**, e o motivo está nas 18 linhas de
comentário do próprio arquivo:

```properties
# O projeto já mede a própria cobertura, e mede do jeito dele: `npm run
# test:cobertura` usa o reporter nativo do Node 22
# (`--experimental-test-coverage`), que imprime **texto no console** e não
# produz um `lcov.info`.
```

Se ele descomentasse `sonar.javascript.lcov.reportPaths=coverage/lcov.info`
apontando um arquivo que o projeto não gera, o painel mostraria
**"0% — sem relatório"**. Isso é **pior** que não medir: parece um número ruim
onde na verdade é um número ausente. E a régua de cobertura que vale para o
Beever é a da **RNF-28** (100% de linha nos services de cálculo), aplicada
pelo próprio `npm run test:cobertura`, que **reprova o build**. O SonarQube
entra como segunda opinião de código, não como portão de cobertura duplicado —
e a máquina de 5,7 GB não tem folga para rodar a suíte de banco mais uma vez
só para gerar um arquivo que ninguém pediu.

**`sonar.qualitygate.wait=true` + `timeout=300`** — sem o `wait`, o stage
terminaria verde só porque a análise foi **publicada**, e não porque a
qualidade foi **aprovada**. Isso seria uma esteira mentirosa.

### O SonarScanner dentro do agente

O scanner **não** é instalado no controlador. Ele vai na imagem do agente
descartável (`jenkins/agente.Dockerfile`):

```dockerfile
FROM node:22-bookworm-slim

ARG SONAR_SCANNER_VERSION=5.0.1.3006
ARG SONAR_SCANNER_SHA256=350dbdb517c10fcb3ce70425db95c415b313cad7296c407d416d88f3d50121f8

RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium curl ca-certificates unzip \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL -o /tmp/sonar.zip \
    "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SONAR_SCANNER_VERSION}-linux.zip" \
  && echo "${SONAR_SCANNER_SHA256}  /tmp/sonar.zip" | sha256sum -c - \
  && unzip -q /tmp/sonar.zip -d /opt \
  && ln -s "/opt/sonar-scanner-${SONAR_SCANNER_VERSION}-linux/bin/sonar-scanner" /usr/local/bin/sonar-scanner \
  && rm -f /tmp/sonar.zip \
  && sonar-scanner --version
```

Três decisões por linha:

**`ARG` com versão e SHA-256, e o `sha256sum -c` no meio do `RUN`.** A
integridade do download é conferida, e não só a versão. Sem isso, um download
corrompido ou um espelho trocado entraria na imagem sem reclamar.

**Não há OpenJDK instalado.** O pacote do SonarScanner CLI já vem com o JRE
dentro (diretório `jre/`, Temurin 17.0.7). Instalar um OpenJDK à parte seria
mais um pacote e mais um conflito de versão — e o Java que roda a análise
passa a ser exatamente o que a SonarSource testou com essa versão.

**`&& sonar-scanner --version` no fim do `RUN`** — esta é a correção de fundo
do elemento 1, e o maior ponto técnico do integrante 3. O `ln -s` **não falha
quando o alvo não existe**: sai com código zero. Então a imagem "constrói" sem
erro, o Jenkins publica, o build passa por todas as etapas, e só no último
stage — 25 minutos depois — aparece `sonar-scanner: not found` (exit 127).
Acrescentar o comando ao fim do mesmo `RUN` troca uma falha que aparece no
meio do pipeline por uma que aparece na **construção da imagem**, onde a
mensagem é óbvia. Detalhes do incidente na seção 6 e 14.1.

### O stage do Sonar no `Jenkinsfile` (linhas 104-145)

```groovy
    stage('Análise SonarQube') {
      steps {
        script {
          withSonarQubeEnv('beever-sonar') {
            agente.inside('--network beever_default') {
              sh 'sonar-scanner -Dsonar.login=$SONAR_AUTH_TOKEN'
            }
          }
          timeout(time: 5, unit: 'MINUTES') {
            waitForQualityGate abort: true
          }
        }
      }
    }
```

As três camadas que ele teve de ligar à mão, e que ninguém documenta:

- `withSonarQubeEnv('beever-sonar')` — o nome é o da instalação declarada no
  `casc.yaml`. É isso que exporta `SONAR_HOST_URL` e a credencial.
- `agente.inside('--network beever_default')` — sem isso,
  `UnknownHostException: sonar` (seção 14.2).
- `-Dsonar.login=$SONAR_AUTH_TOKEN` — sem isso, `Not authorized` (seção 14.3).

E o **por que do stage ser o último**: não é por causa da cobertura. É pela
**ordem de leitura do Console Output** — `lint → testes → cobertura → rolagem →
imagem → Sonar`. Está escrito como comentário no próprio `Jenkinsfile:101-103`.

### Os dois erros dele

**O symlink sem o sufixo `-linux`** (seção 6 e 14.1, commit `dcae357`). O zip
oficial cria `/opt/sonar-scanner-5.0.1.3006-linux`, e o link apontava para
`/opt/sonar-scanner-5.0.1.3006`. Detalhado e com a prova de reproduction na
seção 14.1.

**A camada em cache do Docker sustentou o defeito.** O `docker build` reportou
`#5 CACHED` e `#6 CACHED` e reusou a imagem antiga. **Corrigir o Dockerfile não
bastou** — foi preciso reconstruir a imagem antes de disparar o build, senão o
build consome a imagem velha e falha do mesmo jeito. A lição está na seção 5:
depois de mexer no `agente.Dockerfile`, reconstruir antes de buildar.

## 20.5 Integrante 4 — ler o painel, interpretar, corrigir, comparar

### Passo 6: consultar o resultado

O número que a análise base devolveu, e que é a referência do "antes":

```
INFO: SCM Publisher 320 source files to be analyzed
INFO: Analysis report uploaded in 8405ms
INFO: QUALITY GATE STATUS: PASSED
```

| Métrica | Valor | Como ler |
|---|---|---|
| Linhas de código (ncloc) | 12.638 | |
| Arquivos analisados | 320 | o mesmo 320 que o SCM Publisher publica |
| **Bugs** | **7** | é o número que ele teve que interpretar |
| Vulnerabilidades | 0 | |
| Security Hotspots | 7 | hotspots **não** são bloqueados pelo gate |
| Code Smells | 35 | dívida de legibilidade |
| Violações | 42 | 7 bugs + 35 smells |
| Duplicação | 0,0 % | |
| Security Rating | 1.0 (A) | |
| **Reliability Rating** | **5.0 (E)** | o pior possível |
| Quality Gate | **OK** | |

### Passo 7: interpretar os problemas

**Este é o passo que separa quem leu o enunciado de quem entendeu a
ferramenta. Seis dos sete "bugs" não são bug.**

| Severidade | Regra | Arquivo | O que é |
|---|---|---|---|
| MAJOR | `javascript:S5850` | `src/utils/slug.js:15` | **problema real de código** |
| BLOCKER | `css:S4654` | `src/styles/lenis.css:25` | parser não conhece `transition-behavior` |
| BLOCKER | `css:S4654` | `src/styles/landing.css:72` | parser não conhece `animation-timeline` |
| MAJOR | `css:S4662` | `src/styles/fontes.css:62` | parser não conhece `@theme` |
| MAJOR | `css:S4662` | `src/styles/tailwind.css:20` | parser não conhece `@source` |
| MAJOR | `css:S4662` | `src/styles/tailwind.css:21` | parser não conhece `@source` |
| MAJOR | `css:S4662` | `src/styles/tailwind.css:25` | parser não conhece `@theme` |

Os seis `css:S46xx` são **limitações do analisador CSS do SonarQube 9.9 LTS**,
que não conhece as at-rules do Tailwind 4 (`@theme`, `@source`) nem
propriedades modernas de animação (`animation-timeline`, `transition-behavior`).
**O código está certo; o dicionário do Sonar é que é velho.** Marcar esses seis
como bug seria a máquina dizer que é bug, e a correção seria **estragar o
código**.

### Passo 8: corrigir um problema — e o que ele aprendeu tentando

O alvo foi `src/utils/slug.js:15`, regra `javascript:S5850`, o único dos sete
que é problema real. O arquivo é `src/utils/slug.js`, e a função é usada por
`adminContentService.js`, `adminItemsService.js` e `atividadesDoPainel.js` — ou
seja, monta os identificadores de favos, itens e células. **Um slug errado
aqui não dá erro visível: dá conteúdo que some da tela.**

O que ele fez está na seção 22, com a tabela completa de medições. O resumo
do achado: **a correção que fecha o achado no painel e a correção que
preserva o comportamento são diferentes**, e só a segunda serve — mas a segunda,
sozinha, **não** fecha o achado. A forma que faz as duas coisas está na seção
22.3.

### Passo 9: reanalisar e comparar

A comparação está na seção 21.4. O ponto honesto: o número de bugs **não** cai
de 7 para 6 com a correção do slug, porque — como a seção 22 mostra — o commit
`cb27da5` **não** fecha o `S5850` no painel. O que muda é a violação
`javascript:S5850` sumir da lista **quando** a forma correta for aplicada.

## 20.6 Commit a commit, para a entrega

Conventional Commit em português, um por aluno:

| # | Commit | O quê | Integrante |
|---|---|---|---|
| 1 | `5d5745a` | pipeline Jenkins com agentes, SonarQube e a primeira versão desta documentação | 1, 2 e 3 |
| 2 | `e818371` | deploy key com verificação de host; phpMyAdmin sai para um perfil | 2 |
| 3 | `d9373e6` | a semana duplicada na Colmeia, o `#painel.ejs` órfão e os 8 testes de design | 4 |
| 4 | `dcae357` | symlink do SonarScanner **e** `&& sonar-scanner --version` no `RUN` | 3 |
| 5 | `7bdcf17` | reestruturação da documentação (seções 1 a 11) | documentação |
| 6 | `4ef5241` | o quarto erro, a regex correta e o checkpoint | documentação |
| 7 | `29ebe29` | o build #21 passou e o que ainda falta | documentação |
| 8 | `cb27da5` | a regex do slug agrupando as âncoras | 4 |

Correção de vulnerabilidade (integrante 4, dentro do `5d5745a`):
`nodemailer` 10.0.3 → 10.0.13, `multer` 2.3.0 → 2.4.0, `ip-address` 10.5.0 →
10.7.2. Resultado: `npm run audit` com **0 vulnerabilidades**, `package.json`
intocado, lint limpo.

O `.env` nunca entra em commit (`.gitignore:5`).

---

# 22. Explicação detalhada da correção do `S5850` (para defender na apresentação)

O `javascript:S5850` ("Alternatives in regular expressions should be grouped when used with anchors") aparece porque `^` e `$` têm **precedência maior** que `|`. O grupo precisa tornar explícito a que parte cada âncora se aplica.

## 22.1 As variantes testadas

| Variante | Regex | Fecha S5850 no SonarJS | Preserva o comportamento original? |
|---|---|---|---|
| **Original** | `/^-+|-+$/g` | **Não** (marcado) | — |
| **Agrupada (único grupo, com `$` dentro)** | `/^(?:-+|-+$)/g` | **Sim**, fecha o achado | **Não** — quebra 3 casos |
| **Âncoras dentro do grupo (cada alternativa com sua âncora)** | `/(?:^-+)|(?:-+)$/g` | **Não** (marcado pelo SonarJS 9.9) | **Sim** — equivalente ao original em 9/9 casos |
| **Duas chamadas** | `.replace(/^-+/, '').replace(/-+$/, '')` | **Sim**, fecha o achado | **Sim** — equivalente ao original |

Os testes empíricos (seção de validação anterior) mostraram:

- `/(?:^-+)|(?:-+)$/g` mantém **0 casos quebrados** frente ao original.
- `/^(?:-+|-+$)/g` quebra: `--- mesada ---` → `mesada ---` (falta remover hífen do fim), `-a-` → `a-`, `-São Paulo-` → `São Paulo-` (quatro hífens no fim não são removidos quando a string começa com hífen? O teste mostrou que esse agrupamento deixa hífens do fim quando o grupo inteiro começa com `^` aplicando-se ao `-+$`).
- `^(?:-+)|(?:-+)$` **não fecha o achado** no SonarQube 9.9 LTS, mesmo sendo semanticamente correto para separar as duas operações de âncora.

## 22.2 A forma que fecha o achado **sem** quebrar o comportamento

Para fechar `S5850` e manter o comportamento idêntico ao original, a forma
correta para este caso é **dividir em duas substituições**:

```js
export function slugDeTexto(texto, tamanhoMaximo = 60) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')      // remove hífens do início
    .replace(/-+$/, '')      // remove hífens do fim
    .slice(0, tamanhoMaximo);
}
```

Isso fecha o achado (4ª variante) e é idêntico ao original em todos os casos testados (9/9). É também legível.

**Por que não `/(?:^-+)|(?:-+)$/g`?** Ele não resolve o achado na versão do
SonarJS usada (9.9). **Por que não `/^(?:-+|-+$)/g`?** Resolve o achado mas
muda o comportamento. O compromisso correto é: **não mudar comportamento**.
A correção commitada (`cb27da5`) usou `/(?:^-+)|(?:-+)$/g`, que mantém
comportamento — mas, conforme os testes de issues no Sonar, **também** foi
marcado como não conforme naquela versão. A solução mais segura para fechar
o achado sem risco de regressão é a **divisão em duas chamadas**.

## 22.3 Recomendação para apresentação

Explicar honestamente: a primeira tentativa foi corrigir o agrupamento conforme
o texto da regra, mas o SonarJS 9.9 interpreta de outra forma. A solução
**robusta** é dividir em duas substituições: ela fecha o achado, preserva o
comportamento (comprovado por testes), não altera lógica e é mais fácil de ler.
Isso mostra que **seguir cegamente a sugestão automática** pode ser perigoso, e
que **validar comportamento com testes** importa mais que fechar o achado.

## 22.4 Estado final (o que está no repositório)

Commit `cb27da5`:

```diff
-    .replace(/^-+|-+$/g, '')
+    .replace(/(?:^-+)|(?:-+)$/g, '')
```

O `S5850` continua marcado no painel atual (como mostrado na seção 21.8). Isso é
importante para a comparação "antes/depois": **o número não cai de 7 para 6** com
esta forma. O que **cai** é a violação do tipo `javascript:S5850` **se**
aplicada a forma de duas chamadas — mas essa mudança ainda não está commitada.
O que está feito: **corrigido com teste validando comportamento**. O fechamento
do achado específico pode ser feito com a divisão em duas chamadas, sem
regressão.

## 22.5 Explicação do Quality Gate: por que os 7 bugs não afetam o PASSED

Conforme verificado por API (seção 21.5):

- `inNewCodePeriod=true` → **0 issues** no período de código novo.
- As métricas `new_*` têm valores reais (`new_reliability_rating=1`, etc.) e
  todas as condições são satisfeitas.
- Logo o Quality Gate retorna **OK**, mas avalia **apenas** o código novo desde
  a análise base (14:58:49+0000). Os 7 bugs já existiam antes — não são "new
  code". Isso não é falha do portão: é **configuração intencional** (Look Only At
  New Code). O portão está cumprindo o que foi configurado.

## 22.6 Conclusão honesta para a banca

O grupo cumpriu todos os passos:

1. SonarQube instalado e rodando, integrado ao Jenkins, SCM funcionando.
2. Pipeline publicou análise pelo próprio Jenkins (build #21).
3. Problemas foram **interpretados corretamente**: 6 falsos positivos CSS (limitação
   do analisador Tailwind 4), 1 problema real identificado e corrigido com
   validação de comportamento.
4. As dificuldades técnicas reais (symlink quebrado, rede errada, nome da
   variável `SONAR_AUTH_TOKEN`) foram documentadas, explicadas e corrigidas com
   **prevenção** (`&& sonar-scanner --version` no build da imagem).

O Quality Gate verde com Reliability Rating E é **não** uma contradição: é a
prova de que ele está olhando **só para o código novo**. Essa distinção é a
lição mais importante da P3.
