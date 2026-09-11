# Como verificar as suítes e os builds

**Data:** 2026-09-10 · **Escopo:** conferir se os testes passam na sua máquina, no Jenkins local e no GitHub Actions, e o que fazer quando os três discordam

O mesmo portão roda em três lugares: no terminal, no Jenkins (`docs/29-JENKINS.md`) e no GitHub Actions (`docs/18-INTEGRACAO-CONTINUA.md`). Este documento é o passo a passo de conferência; como cada um é montado está naqueles dois.

## Os números de um portão verde

Estes são os números do build #10 do Jenkins, no commit `7688707`, e servem de referência. Teste a mais é normal quando alguém escreve teste novo; teste pulado a mais ou falha nunca é.

| Etapa | Resultado esperado |
|---|---|
| Lint e auditoria | ESLint sem erro e `found 0 vulnerabilities` |
| Suíte contra MySQL | `# tests 1167`, `# fail 0`, `# skipped 0` |
| Cobertura | `# fail 0` e `# skipped 3`. Os três pulados são os cronômetros da RNF-01, que não valem sob instrumentação. Linhas em 100%, ramos em 93,47%, funções em 99,40% |
| Rolagem a 320 px | Todas as telas com "cabe" |
| Imagem Docker | Constrói sem erro |

Um teste pulado a mais é o sinal mais traiçoeiro, porque o resumo continua sem falha. Quase sempre quer dizer que o MySQL não estava no ar e a suíte pulou os testes de banco em silêncio.

## Na sua máquina

Suba o MySQL com `docker compose up -d` e rode, na raiz do projeto:

```bash
npm run lint                 # ESLint
npm run audit                # vulnerabilidade alta nas dependências de produção
npm run test:db              # a suíte inteira; MySQL fora do ar vira falha
npm run test:cobertura       # a suíte com cobertura e o piso da RNF-28
```

Use `npm run test:db`, e não `npm test`, para conferir de verdade: o `npm test` pula os testes de banco quando não acha o MySQL, e o resumo sai sem falha. No fim da saída ficam as linhas `# tests`, `# pass`, `# fail` e `# skipped`; qualquer falha aparece antes, numa linha que começa com `not ok`, seguida do arquivo, do esperado e do recebido.

Para rodar um arquivo só, ou só os testes com uma palavra no nome:

```bash
env NODE_ENV=test TESTES_DE_BANCO=1 node --test test/integration/fluxoAutenticado.test.js
env NODE_ENV=test node --test --test-name-pattern="fuso" test/unit/diaDoJogador.test.js
```

O filtro por nome serve para os testes unitários. Nos testes de integração que seguem um fluxo, como o `fluxoAutenticado`, cada teste usa o login e os dados que o anterior deixou, e filtrados eles falham sem defeito nenhum; rode o arquivo inteiro.

Para ver o que o Jenkins e o Actions veem, que rodam em UTC, acrescente `TZ=UTC` antes do `node`. Foi assim que o defeito do build #8 apareceu: depois das 21h o dia em UTC já virou, e um teste que calculava a data pelo fuso da máquina passou a discordar do serviço.

A medição de 320 px precisa do servidor no ar com o CSS compilado. Sem CSS tudo cabe e a medição não prova nada:

```bash
npm run css:build
npm start                    # em outro terminal, e espere o /health responder
npm run rolagem
```

## No Jenkins

Abra http://localhost:8080 e entre com `admin` e a senha `beever-jenkins`. O Jenkins só lê commits, então commite antes de conferir; o push não faz diferença para ele. A cada cinco minutos ele procura commit novo, e vários commits entre duas varreduras viram um build só, do mais recente. Para não esperar, clique em **Scan Multibranch Pipeline Now** no job **beever**.

O caminho é **beever**, depois a branch, depois o número do build. A tabela de etapas mostra cada uma em verde ou vermelho, com o tempo; um build inteiro leva uns 15 minutos. Para conferir se o build é mesmo do seu commit, abra **Console Output** e procure `Checking out Revision`: o hash precisa ser o de `git log -1`. No mesmo log, procure `# fail` para os resumos, que aparecem duas vezes (primeiro a suíte, depois a cobertura), `not ok` para as falhas e `Rolagem lateral a 320 px` para a lista de telas. Para repetir um build sem commit novo, use **Build Now** na página da branch.

Pelo terminal, a API responde com o mesmo usuário e senha. A barra do nome da branch vai codificada duas vezes, como `%252F`:

```bash
JOB='http://localhost:8080/job/beever/job/refactor%252Farquitetura-em-camadas'
curl -s -u admin:beever-jenkins "$JOB/lastBuild/api/json?tree=number,result,building"
curl -s -u admin:beever-jenkins "$JOB/lastBuild/consoleText" | grep -E '^# (tests|fail|skipped)|^not ok|Checking out Revision'
```

O primeiro comando mostra o número do build, se ainda está rodando e o resultado, que é `SUCCESS` ou `FAILURE`. O segundo tira do log só as linhas que importam.

## No GitHub Actions

O Actions roda em todo pull request, a cada commit novo nele, e em todo push para a `main`. Push numa branch sem pull request aberto não dispara nada. Para ver, abra https://github.com/Razawaky/Beever/actions, escolha o workflow **CI** e a execução; dentro de um pull request, os mesmos resultados aparecem no quadro de verificações no fim da página.

Os jobs rodam em paralelo, cada um em sua máquina: **Lint e auditoria de dependências**, **Suíte contra MySQL**, **Cobertura dos services de cálculo**, **Rolagem lateral a 320 px** e **A imagem ainda constrói**, que também sobe o contêiner e confere o `/health`. A **Medição de carga** só roda na `main` e nunca reprova. Clicando num job e depois num passo, o log abre no ponto da falha. Para repetir, use **Re-run failed jobs**.

Pelo terminal, o `gh` faz o mesmo. Instale com `sudo pacman -S github-cli` e entre com `gh auth login`:

```bash
gh run list --branch refactor/arquitetura-em-camadas --limit 5
gh run watch                 # acompanha a execução em andamento
gh run view --log-failed     # só o log dos passos que falharam
gh pr checks                 # as verificações do pull request da branch atual
gh run rerun --failed        # repete só o que falhou
```

## Quando os três discordam

| O que acontece | Causa provável | O que fazer |
|---|---|---|
| Passa na sua máquina e falha no Jenkins e no Actions | Arquivo que existe no seu disco e não está no git, como o CSS compilado, ou dependência do seu fuso horário | Rode com `TZ=UTC` e confira o `git status` |
| Passa no Jenkins e o Actions não roda | O commit não foi enviado, ou não há pull request aberto | `git push` e abra o pull request |
| Só um teste de tempo falhou | Máquina sem memória livre e usando swap (DT-131) | Feche o que não estiver usando e repita o build |
| `ECONNREFUSED` no MySQL no meio da suíte, seguido de `script returned exit code -1` | O computador ou o Docker reiniciou durante o build, como no #7 | Repita o build; não é defeito de código |
| O resumo não tem falha, mas `# skipped` subiu | A suíte não achou o MySQL e pulou os testes de banco | Rode `npm run test:db`, que transforma a ausência do banco em falha |
