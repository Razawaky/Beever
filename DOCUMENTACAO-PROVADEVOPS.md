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
| 5 | Pipeline com análise | 3 | 🟡 Correções de rede e token em `6bf40c9`; primeiro build com elas é o #21 (seção 14) |
| 6 | Consultar painel | 4 | ✅ Feito — baseline publicada, 320 arquivos, 12.638 ncloc (seção 15.1) |
| 7 | Interpretar problemas | 4 | ✅ Feito — 7 bugs lidos, 6 são falso positivo do analisador CSS (seção 15.2) |
| 8 | Corrigir ao menos 1 problema | 4 | 🟡 Alvo escolhido: `src/utils/slug.js:15`, `javascript:S5850` (seção 15.3) |
| 9 | Nova análise e comparação | 4 | ⏸ Pendente — build #21 publica o "depois" (seção 17) |

**Bloqueio anterior, já resolvido:** o `sonar-scanner` não era encontrado dentro
do agente (`exit code 127`). O `jenkins/agente.Dockerfile` apontava o symlink
para um diretório que o `unzip` não cria. Nada a ver com Sonar, Jenkins, Quality
Gate ou testes — a suíte já está verde. Detalhes e correção em `dcae357` na
seção 6.

**Análise já publicada.** `GET /api/project_analyses/search?project=beever`
devolve `total: 1` (`AaD3_L7iC1b1hK8IGPFS`, 2026-10-01T14:58:49+0000) — foi a
análise **base**, feita à mão dentro da rede `beever_default` para destravar os
passos 6 a 9 enquanto o stage do Jenkins ainda não rodava verde. O build #21 é o
primeiro a publicar uma segunda análise pelo pipeline.

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
> O gate está com `caycStatus: "non-compliant"` e o projeto **não tem período de
> código novo configurado** — não há `sonar.newCode.referenceBranch` no
> `sonar-project.properties`, e esta foi a **primeira** análise do projeto
> (`total: 1`), então não existe versão anterior para comparar.
>
> Resultado: todas as cinco métricas vêm **sem valor**
> (`GET /api/measures/component?component=beever&metricKeys=new_reliability_rating,new_lines`
> → `"measures": []`). Condição cuja métrica não tem valor não pode ser violada,
> logo o gate responde **OK**. Ele não disse nada sobre os 7 bugs.
>
> **Consequência prática:** quando existir uma segunda análise com código novo
> real (build #21), o gate passa a avaliar de verdade e pode reprovar. O
> PASSED de hoje é resultado de configuração, não atestado de qualidade.

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
- [x] Suíte de testes verde no Jenkins (builds #17 e #18: 7 stages verdes)
- [x] Análise publicada no SonarQube (320 arquivos, seção 15)
- [x] SonarQube no ar (falta print)
- [x] Resultado do Quality Gate — **PASSED** (seção 15.1)
- [x] Problemas encontrados e interpretados — 7 bugs, 6 falsos positivos (seção 15.2)
- [x] Alvo da correção escolhido e justificado — `src/utils/slug.js:15` (seção 15.3)
- [ ] Execução da pipeline **com o stage do Sonar verde** (build #19)
- [ ] Ao menos 1 correção (vinda do Sonar)
- [ ] Nova análise + comparação antes/depois
- [ ] Print do Quality Gate antes e depois, lado a lado
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
