# Jenkins local

O Beever tem dois portões automáticos que fazem a mesma coisa. O GitHub Actions
(`.github/workflows/ci.yml`) roda na nuvem a cada pull request e a cada push para
a `main`. O Jenkins roda na sua máquina, num contêiner feito a partir da imagem
oficial `jenkins/jenkins`, e testa cada commit local sem depender de internet nem
do GitHub. Ele não substitui o Actions: o `Jenkinsfile` da raiz repete as mesmas
etapas, na mesma ordem, e `test/unit/jenkins.test.js` reprova se as duas listas
se separarem.

## Acesso

| O quê | Valor |
|---|---|
| Endereço | `http://localhost:8080` |
| Usuário | `admin` |
| Senha | `beever-jenkins`, que é o `JENKINS_ADMIN_PASSWORD` do `.env.example` |
| Job | **Beever**, com uma linha por branch que tenha `Jenkinsfile` |

A senha padrão só é aceitável porque o Jenkins escuta apenas em `127.0.0.1`:
ninguém fora da sua máquina chega à porta 8080. Se o computador for
compartilhado, troque o valor no seu `.env` e recrie o contêiner. O Jenkins lê a
senha do ambiente a cada vez que sobe, então a nova passa a valer e a antiga
deixa de entrar. Esta senha nunca deve ser usada num servidor.

## Como subir e desligar

Copie para o seu `.env` as duas linhas do Jenkins que estão no `.env.example` e
acerte o `DOCKER_GID` com o número do grupo dono do socket do Docker:

```bash
getent group docker                          # docker:x:957:... → DOCKER_GID=957
docker compose --profile jenkins up -d --build
docker compose --profile jenkins stop jenkins
docker logs -f beever-jenkins                # acompanhar a subida
```

A primeira subida constrói a imagem e baixa os plugins, e leva alguns minutos.
Quando o log mostrar `Jenkins is fully up and running`, o endereço já responde.
O `docker compose up -d` de todo dia continua subindo só o MySQL e o Mailpit: o
Jenkins fica num perfil próprio para não pesar em quem não usa.

## Como ele é montado

Não existe assistente de instalação nem configuração por clique. A pasta
`jenkins/` descreve tudo, e apagar o contêiner não perde nada que não esteja lá
ou no volume. O `jenkins/Dockerfile` parte da imagem oficial LTS 2.568.3 e
acrescenta o CLI do Docker e seis plugins: Configuration as Code e Job DSL, que
leem a configuração, Pipeline e Git, que rodam o `Jenkinsfile`, Docker Pipeline,
que põe cada etapa num contêiner, e Pipeline Stage View, que desenha a tabela de
etapas na tela do build.

O `jenkins/casc.yaml` cria o usuário `admin` com a senha do ambiente, fecha o
acesso para quem não entrou, deixa um executor só e cria o job **Beever**. O
executor único é de propósito: a máquina de desenvolvimento não aguenta duas
suítes com MySQL ao mesmo tempo. O `jenkins/entrada.sh` roda antes do Jenkins e
recusa subir se a senha estiver vazia, o que o compose sozinho não conseguiria
fazer sem quebrar o `docker compose up` de quem nem usa o Jenkins.

O contêiner monta três coisas: o volume `beever-jenkins`, com o histórico de
builds e as áreas de trabalho, o socket do Docker do host, para criar os
contêineres das etapas, e o próprio repositório em `/repo`, só para leitura.

## Como um build começa

O job **Beever** é multibranch: de cinco em cinco minutos ele varre o
repositório em `/repo`, e toda branch com `Jenkinsfile` e commit novo ganha um
build. Um Jenkins local não recebe webhook do GitHub, e a varredura faz esse
papel. Para não esperar, entre no job e clique em **Scan Multibranch Pipeline Now**
(o nome muda com o idioma do navegador).

O Jenkins lê **commits**, não a pasta de trabalho. Mudança sem commit não entra
no build, e uma branch só aparece no job depois de o `Jenkinsfile` ser commitado
nela. Por isso a `main` ainda não aparece: o `Jenkinsfile` chega lá com o merge.

## As etapas

Cada etapa roda num contêiner do agente, feito do `jenkins/agente.Dockerfile`:
Node 22, a mesma versão do Actions, mais o Chromium e o curl. As etapas que
precisam de banco ganham um MySQL 8.4 novo, que o pipeline espera responder a
`mysqladmin ping` antes de começar e apaga no fim, então nenhum build herda dado
de outro. Os tempos são do build #6, o primeiro verde de ponta a ponta, com a
imagem do agente já em cache: uns 24 minutos no total.

| Etapa | O que faz | Por que existe | Tempo |
|---|---|---|---|
| Checkout SCM | Copia o commit da branch para a área de trabalho do build | É o código que vai ser julgado | 1 s |
| Dependências | Constrói a imagem do agente, só da primeira vez (uns 4 minutos), e roda `npm ci` | Instala exatamente o que o `package-lock.json` diz, como o Actions | 17 s |
| Lint e auditoria | `npm run lint` e `npm run audit`, que reprova vulnerabilidade alta nas dependências de produção | RNF-14 e a regra de CI do projeto: lint com erro ou dependência vulnerável reprovam | 15 s |
| Suíte contra MySQL | `npm run test:db` com um MySQL próprio e `PULAR_MEDICAO_DE_CARGA=1` | Os testes unitários e de integração. Com `test:db`, MySQL ausente vira falha em vez de teste pulado em silêncio | 8 min 39 s |
| Cobertura | `npm run test:cobertura` com outro MySQL | Portão da RNF-28: os services de cálculo não podem perder cobertura | 10 min 21 s |
| Rolagem a 320 px | Cria o banco `beever_rolagem`, roda migrations e seed, compila o CSS, sobe o servidor, espera o `/health` e roda `npm run rolagem`, que abre as telas no Chromium a 320 px | RNF-20: nenhuma tela pode rolar de lado no celular. Sem o CSS compilado tudo caberia, e a medição provaria nada | 57 s |
| Imagem Docker | `docker build --target runtime -t beever:jenkins .` | Prova que a imagem de produção ainda constrói | 26 s |

Quando uma etapa falha, as seguintes são puladas e o build fica vermelho. A
medição de carga (`test:carga`) fica de fora, como no Actions fora da `main`:
ela cronometra, e máquina de desenvolvimento é lenta e variável demais para
servir de portão.

## Como ler um build vermelho

Na tela do build, a tabela de etapas mostra em vermelho onde parou. Clique na
etapa e depois em **Logs**, ou abra **Console Output** para o log inteiro. Numa
falha da suíte, procure por `not ok`: logo abaixo vêm o arquivo do teste, o
esperado e o recebido. Numa falha do próprio pipeline, a mensagem útil está no
fim do log, antes da pilha do Java.

Os primeiros builds acharam dois defeitos que ninguém tinha visto, e os dois
também quebravam o Actions. Um teste dos documentos do TCC exigia no disco o
`src/public/css/app.css`, que sai do build e fica fora do git, e a medição de
320 px morria ao não achar o Brave, sem tentar o Chromium. Na máquina de quem
desenvolve os dois passavam; num checkout limpo, não. É para isso que um portão
com checkout limpo serve.

## Diferenças para o GitHub Actions

As etapas são as mesmas. O que muda é o resto. O Actions dispara por pull
request e push; o Jenkins, pela varredura de cinco minutos. O Actions roda os
jobs em paralelo, cada um em sua máquina; o Jenkins, um depois do outro, na sua.
O job de imagem do Actions também sobe o contêiner e confere o `/health`, e o
Jenkins só constrói. Por fim, o Actions não enxerga commit que você ainda não
empurrou, e o Jenkins enxerga.

## Segurança

Montar o socket do Docker entrega ao Jenkins poder de root sobre a máquina: ele
cria contêineres com qualquer volume do host. Por isso ele só escuta em
`127.0.0.1`, exige senha, sobe apenas pelo perfil `jenkins` e lê o repositório
só para leitura. É uma ferramenta de desenvolvimento e de demonstração, e não
deve ir para servidor compartilhado nem para produção.

## Problemas comuns

| Sintoma | Causa | O que fazer |
|---|---|---|
| O contêiner sai com "Defina JENKINS_ADMIN_PASSWORD" | O `.env` não tem a senha | Copie a linha do `.env.example` |
| `permission denied` em `/var/run/docker.sock` no build | `DOCKER_GID` diferente do grupo real do socket | Rode `getent group docker` e acerte o número |
| A branch não aparece no job | O `Jenkinsfile` não foi commitado nela | Faça o commit e clique em varrer |
| O build não roda a mudança que acabei de fazer | O Jenkins lê commits, não arquivos soltos | Faça o commit |
| A senha nova não entra | O contêiner ainda está com a senha antiga | `docker compose --profile jenkins up -d jenkins` recria com a nova |
| Build lento ou máquina travando | Jenkins, MySQL e Chromium juntos pesam em 5 GB de RAM | Feche o que não estiver usando; o executor único já impede dois builds ao mesmo tempo |
| Só o teste "o fechamento da partida continua dentro do teto de 1 s" falhou | Com a memória no fim a máquina usa swap e o relógio escorrega; no build #5 levou 2,3 s. É a DT-131 | Libere memória e rode o build de novo; se for só ele, não é defeito de código |
