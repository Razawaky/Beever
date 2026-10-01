# Documentação P3 — Jenkins + SonarQube

Fluxo: **GitHub → Jenkins → SonarScanner → SonarQube → Quality Gate**

- **Projeto:** Beever
- **Repositório:** `git@github.com:Razawaky/Beever.git`
- **Branch de trabalho:** `refactor/arquitetura-em-camadas` (não é a `main`; a `main` está **205 commits atrás** — último commit dela: `6eb084b`)
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
| 5 | Pipeline com análise | 3 | 🟡 Build #17 rodou o stage do Sonar e falhou no scanner; **corrigido em `dcae357`, build #18 em andamento** (ver seção 6) |
| 6 | Consultar painel | 4 | ⏸ Não iniciado — o painel ainda está **vazio** |
| 7 | Interpretar problemas | 4 | ⏸ Não iniciado |
| 8 | Corrigir ao menos 1 problema | 4 | ⏸ Não iniciado |
| 9 | Nova análise e comparação | 4 | ⏸ Não iniciado |

**Bloqueio anterior, já resolvido:** o `sonar-scanner` não era encontrado dentro
do agente (`exit code 127`). O `jenkins/agente.Dockerfile` apontava o symlink
para um diretório que o `unzip` não cria. Nada a ver com Sonar, Jenkins, Quality
Gate ou testes — a suíte já está verde. Detalhes e correção em `dcae357` na
seção 6.

**O SonarQube ainda não analisou nada.** `GET /api/project_analyses/search?project=beever`
devolve `total: 0`. O projeto `beever` existe no painel e o Quality Gate está
associado a ele, mas **nenhuma análise foi publicada**. Os passos 6 a 9 dependem
inteiramente de resolver a seção 6.

**Quality Gate `Beever`:** criado e associado ao projeto `beever`. Condições
(conferidas em `GET /api/qualitygates/show?name=Beever`):
- `new_security_rating` > 1
- `new_reliability_rating` > 1
- `new_maintainability_rating` > 1
- `new_duplicated_lines_density` > 3
- `new_security_hotspots_reviewed` < 100
- **Sem condição de cobertura** (decisão do grupo)

> O gate está com `caycStatus: "non-compliant"` — o *Clean as You Code* está
> desligado, então as cinco métricas acima são avaliadas sobre **o código todo**,
> não sobre *new code*. Isso muda a leitura do passo 9: a comparação antes/depois
> é entre duas análises completas, e não entre duas janelas de código novo.

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
A branch local está em `d9373e6`, igual a `origin/refactor/arquitetura-em-camadas`
— **não há nada pendente de push**.

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
1. Destravar a seção 6 e rodar a **análise base**; fotografar painel e Quality Gate
2. Ler **Bugs**, **Vulnerabilities** e **Code Smells** separadamente
3. Escolher 1 problema (de preferência Bug ou Vulnerability), corrigir com teste. Não marcar "false positive" sem justificar
4. Reanalisar e comparar os mesmos números

**Dica para a apresentação:** pipeline verde com Quality Gate vermelho é resultado normal e mostra que o portão tem dente.

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
O **build #18 está em andamento** para confirmar a correção de ponta a ponta.

---

## 7. Próximos passos

1. `git status` e conferir o que estiver sem commit
2. Esperar o **build #18** concluir e confirmar que o stage `Análise SonarQube` passou
3. Confirmar a primeira análise no painel: `GET /api/project_analyses/search?project=beever` deve deixar de devolver `total: 0`
4. Baseline do Sonar → escolher e corrigir 1 achado → reanalisar → comparar
5. Tirar os prints (seção 9)
6. Montar a entrega e enviar no **Teams** até o dia da P3

**Commits já feitos** (Conventional Commit em português, um por aluno):
1. `5d5745a` — `.env.example`, `Jenkinsfile`, `docker-compose.yml`, `jenkins/Dockerfile`, `jenkins/agente.Dockerfile`, `jenkins/casc.yaml`, `sonar-project.properties`, `package-lock.json` (Alunos 1, 2 e 3)
2. `e818371` — deploy key com verificação de host, phpMyAdmin para perfil próprio, apagar `#painel.ejs` (Aluno 2)
3. `d9373e6` — corrigir os 8 testes de design e a semana duplicada (Aluno 4)
4. `dcae357` — corrigir o symlink do SonarScanner e pôr `sonar-scanner --version` no `RUN` (Aluno 3)
5. Documentação — **este commit**

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

**Dificuldades boas para relatar:**
- `BEEVER_SCM_URL` não repassada ao contêiner
- `GIT_SSH_COMMAND` só no `casc.yaml`, e a varredura multibranch não enxergar propriedade de nó — falha silenciosa
- Chave SSH sem prefixo
- `vm.max_map_count`
- Tag inexistente do SonarQube
- O `sonar-scanner` apontando para um diretório que o `unzip` não cria, e o `ln -s` sair com código zero: a imagem ficou "verde" sem o executável (seção 6)

**Pergunta para quem avalia:** "o portão do Sonar bloqueia o merge ou só avisa?"
Resposta: bloqueia o build, porque o `Jenkinsfile` usa `waitForQualityGate abort: true`.

**Backup:** levar prints e gravação de tela (a demo depende do Docker ligado).

---

## 11. Checklist de entrega

- [x] Projeto no GitHub
- [x] Job Pipeline no Jenkins com SCM
- [x] `Jenkinsfile` no repositório
- [x] `sonar-project.properties` escrito **e versionado**
- [x] Suíte de testes verde no Jenkins (build #17)
- [ ] Execução da pipeline + Console Output com a análise (build #18 em andamento, seção 6)
- [x] SonarQube no ar (falta print)
- [ ] Resultado do Quality Gate
- [ ] Problemas encontrados e interpretados
- [ ] Ao menos 1 correção (vinda do Sonar)
- [ ] Nova análise + comparação antes/depois
- [ ] Envio no Teams
