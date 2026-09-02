# Integração contínua — T-14.5

**Data:** 2026-08-31 · **Requisitos:** RNF-40 (lint e testes no pull request,
build no merge para main) e RNF-14 (`npm audit` reprova em vulnerabilidade alta).

## O portão

O arquivo é `.github/workflows/ci.yml` e dispara em todo pull request e em todo
push para `main`. Um pull request que recebe commit novo cancela a execução
anterior, que já não vale para nada e só ocuparia runner.

São cinco jobs, e eles rodam em paralelo. O `lint` roda o ESLint e a auditoria de
dependências. O `testes` sobe um MySQL 8.4 ao lado e roda a suíte inteira. O
`cobertura` mede os services de cálculo contra o piso da RNF-28. O `imagem`
constrói o Dockerfile e confere que a aplicação sobe e atende. O `carga` mede
trinta jogadores simultâneos, roda só em `main` e não reprova.

## O defeito que a tarefa achou antes de escrever qualquer job

O `.gitignore` ignorava `.github/` inteiro. A regra tinha motivo — as skills, os
agents e os hooks que moram ali são configuração local de ferramenta de IA e não
pertencem ao repositório —, mas ela também barra o único diretório que o GitHub
Actions lê. Qualquer workflow escrito ali seria um arquivo que nenhum runner
jamais executaria, e o sintoma seria o pior possível: a tarefa pareceria pronta,
o arquivo existiria no disco do desenvolvedor, e o portão simplesmente nunca
apareceria na tela do pull request.

A correção é uma exceção cirúrgica. A linha virou `.github/*` seguida de
`!.github/workflows/`, o que versiona o workflow e mantém tudo o mais de fora.
A negação precisa vir depois de um padrão com estrela, e não de `.github/`,
porque o git não desce em diretório excluído por inteiro — a forma anterior
deixaria a exceção sem efeito nenhum.

## Por que os jobs foram separados assim

**Cobertura longe dos testes.** A T-14.2 mediu que a instrumentação de cobertura
infla o tempo de execução, e o projeto tem testes que cronometram contra o teto
de dois segundos da RNF-01. Medir as duas coisas na mesma execução faz a
instrumentação reprovar o desempenho. São execuções diferentes por medição, não
por gosto.

**A carga fora do caminho do pull request.** O número de p95 depende da máquina,
e o runner do GitHub é compartilhado e irregular. Como portão, ele reprovaria
merge por lentidão de infraestrutura alheia; como acompanhamento de tendência em
`main`, com `continue-on-error`, ele é útil. O laudo que vale continua sendo o da
T-14.3, medido em máquina conhecida. A variável `PULAR_MEDICAO_DE_CARGA` é o que
tira essa medição da suíte comum sem precisar de duas listas de arquivos.

**A auditoria só do que vai para a imagem.** O `npm audit` roda com
`--omit=dev --audit-level=high`. Vulnerabilidade em dependência de
desenvolvimento não chega ao usuário, porque o `npm prune --omit=dev` do
Dockerfile a remove antes do estágio final; deixá-la reprovar travaria o projeto
por causa de ferramenta que nem é instalada em produção.

**`test:db` em vez de `test`.** Com `TESTES_DE_BANCO=1`, a ausência de MySQL vira
falha em vez de teste pulado. Sem isso, um runner sem banco daria verde tendo
provado quase nada, que é a pior forma de portão.

## O que fica para depois do aceite

A RNF-40 pede também o push da imagem para um registro no merge. A construção
está feita e provada a cada execução, mas a publicação ficou combinada para
depois do aceite do TCC, quando existir destino definido. Enquanto isso a imagem
é construída no runner e descartada — o que se prova é que ela ainda constrói e
ainda sobe, que era exatamente o buraco da T-14.4.

Fica registrado como **DT-116**: publicar a imagem em registro no merge para
`main`, fechando a segunda metade da RNF-40.

## O que o teste automático cobre

`test/unit/fluxoDeIntegracao.test.js` é estático e roda em milissegundos, sem
GitHub e sem daemon. Ele reprova se o workflow chamar um `npm run` que o
`package.json` não declara, se a exceção do `.gitignore` sumir, se algum dos
cinco scripts do portão for renomeado, se a auditoria deixar de reprovar em
nível alto, se faltar uma das variáveis obrigatórias do `src/config/env.js` nos
jobs, ou se os gatilhos de pull request e de `main` desaparecerem.

O que ele não cobre é a execução de verdade. Sintaxe de YAML aceita pelo GitHub,
disponibilidade de action e comportamento do serviço de MySQL do runner só se
provam no primeiro pull request real. Essa é a dívida honesta da tarefa, e é a
mesma lição da T-14.4: teste estático e execução real cobrem coisas diferentes.
