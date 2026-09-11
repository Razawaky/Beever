# Auditoria da E16 — Ajustes antes da defesa

**Data:** 2026-09-09 · **Revisor:** o mesmo que escreveu parte da etapa, no papel
de revisor · **Suíte no fechamento:** 1134 testes passando.

## Como esta auditoria foi feita

A E16 é a primeira etapa com **aceite escrito antes de ser auditada**: *"as
quatro telas mais vistas abertas a 1440 px têm composição própria — grade, não
coluna de celular centralizada —, o celular a 320 px continua sem rolagem
horizontal, e apagar a conta remove de fato o dado pessoal, deixando a auditoria
anônima e íntegra."* Ressalva de processo: esse aceite foi escrito **durante** a
etapa, e não antes dela. É melhor que a E15, que não tinha nenhum, e ainda não é
aceite combinado de antemão.

Nada foi aceito por leitura. As chaves estrangeiras foram conferidas nas
migrations, os eventos de auditoria foram varridos service por service, e os 320
px foram medidos num navegador de verdade — não no HTML servido, que é o que a
varredura da T-14.7 consegue ler.

## Entregas

| Entrega | Status | Onde | Teste |
|---|---|---|---|
| T-16.1 composição de desktop | atendida e testada | `painel.ejs` e `cofre.ejs` em duas colunas no `lg`, `loja.ejs` em quatro no `xl`; a trilha ficou como estava, porque já tinha composição desde a T-10.4 | `composicaoDeDesktop.test.js` (9), os prints, e o gate de 320 px do `npm run evidencias` |
| T-16.2 apagamento definitivo | atendida e testada *(com um furo achado e corrigido nesta auditoria)* | `usersService.apagarDefinitivamente`, `usersRepository.removerPorId`, rota `POST /admin/usuarios/:id/definitivo` | `exclusaoDefinitiva.test.js` (7) |

## Requisitos

| Requisito | Status | Evidência |
|---|---|---|
| **RNF-20** composição própria no desktop | atendido e testado | grade a partir do `lg` nas três telas que precisavam |
| **RNF-20** 320 px sem rolagem horizontal | **atendido e agora medido** | as doze telas medidas em navegador: nenhuma rola. Duas têm elemento que passa da janela e é aparado por um ancestral, o que não é rolagem |
| **RF-PER-04 / RN-053** exclusão de verdade | atendido e testado | **todas as chaves estrangeiras para `users` são CASCADE** — conferido nas migrations, nenhuma é RESTRICT, então nada bloqueia o `DELETE` |
| **RN-053** auditoria anônima | **atendido depois da correção** — ver lacuna 1 | os cinco eventos de conta e de perfil deixaram de gravar apelido e e-mail |
| **RNF-17** auditoria imutável e íntegra | atendido | a trilha sobrevive à exclusão, sem chave estrangeira, por desenho |

Camadas, transação, validação e escape: nada a apontar. O SQL está no
repository, a regra no service, o controller só traduz, e a rota valida o
parâmetro. O apagamento registra **antes** do `DELETE`, que é a ordem certa —
depois, o id não existiria mais para ser registrado.

Sem migration e sem tela nova, os checklists da seção 8 do
`docs/03-BANCO-DE-DADOS-DBA.md` não se aplicam; o da seção 8 do
`docs/04-DESIGN-SYSTEM-E-LANDING.md` foi aplicado à T-16.1 e é o que o gate de
320 px passou a cobrir.

## Lacunas, em ordem de risco

1. **BLOQUEANTE, corrigida e commitada — a anonimização da trilha ficou pela
   metade.** A T-16.2 tirou o dado pessoal de `conta.criada`,
   `conta.atualizada` e `consentimento.registrado`, mas **`perfil.atualizado`
   gravava o apelido em `antes` e em `depois`, e `onboarding.concluido` gravava
   o apelido**. Como a trilha é imutável por gatilho e não tem chave estrangeira
   para `users`, esses dois sobreviveriam ao apagamento — o oposto do que a
   RN-053 promete e do que o aceite da etapa afirma.

   O agravante era a prova: a guarda `a trilha sobrevive inteira, sem nenhum
   dado pessoal` filtrava `WHERE entity_type = 'user'`, e os dois eventos são de
   `profile`. **Ela nunca olharia para eles.** Agora a consulta busca por
   `actor_id`, exige que existam linhas de perfil na conferência, e o teste
   edita o perfil antes de apagar — sem isso o evento consertado não seria
   exercitado. Conferido quebrando de propósito.

2. **BAIXO — a barra de progresso do favo é aparada a 320 px.** O
   `div.mt-2.h-2.w-40` da Colmeia passa da janela e fica cortado dentro do
   cartão. Não é rolagem, então não fere a RNF-20; é acabamento, e some com
   largura maior.

3. **BAIXO — o teste de composição confere classe, não layout.** Está escrito no
   cabeçalho do próprio arquivo. Quem julga se a tela ficou boa continua sendo o
   print e o olho humano; o teste garante que a grade não some sem ninguém ver.

4. **BAIXO — o aceite da etapa foi escrito durante ela.** Vale como lição para a
   E17: aceite combinado antes é conferência, aceite escrito depois é
   julgamento.

## O padrão que apareceu duas vezes

A lacuna 1 é a segunda ocorrência, em duas etapas seguidas, do mesmo erro: **a
guarda cobrindo menos do que o texto promete**. Na E15 foi o
`test/unit/tcc.test.js` que existia só no disco; aqui foi a consulta filtrando
por um tipo de entidade e deixando o outro passar. Nos dois casos o teste estava
verde e o requisito estava furado.

Houve ainda uma repetição da lição da E15 durante esta própria auditoria: a
correção da lacuna 1 ficou **uma hora no disco sem ser commitada**, com o HEAD
ainda gravando o apelido. Foi o usuário quem apontou. Conserto que não está no
histórico não existe, e essa frase já estava escrita no laudo da etapa anterior.

## Segunda varredura

A varredura de conferência achou quatro lacunas nas próprias correções, e as
quatro foram corrigidas e commitadas.

A mais importante repete o padrão desta etapa: a guarda da RN-053 tinha trocado
`entity_type = 'user'` por `actor_id` e, com isso, o buraco simétrico — linha
que **outra pessoa** escreve sobre a conta tem o ator dela, e `admin.promovido`,
`admin.rebaixado` e o `conta.apagada` feito pelo painel são exatamente essa
forma. Um filtro estreito trocado por outro estreito. A consulta virou a união
das duas pontas (`019d7d1`).

O gate de 320 px existia mas não era portão: `npm run evidencias` precisa de
servidor e navegador, e o CI não o rodava. Virou o job `rolagem` (`af084c2`),
com modo de medição sem prints, e o painel administrativo entrou na conta —
cinco rotas, com sessão de admin. A medição também passou a separar conteúdo
cortado de conteúdo que rola dentro do próprio contêiner: as tabelas do painel
usam `overflow-x-auto`, e a versão anterior as acusaria por engano.

A barra de progresso do favo ganhou `max-w-full` (`fde64c6`): 160 px fixos não
cabiam ao lado do hexágono a 320 px. E o próprio gate reprovava por um pixel,
porque a janela às vezes volta 321 px — agora tolera arredondamento e só reprova
quando ela abre bem maior que a pedida.

São dezessete telas medidas, nenhuma rola, e o único conteúdo cortado é o fundo
decorativo da landing, aparado de propósito.

## O que esta auditoria não prova

O gate de 320 px mede rolagem, e rolagem não é a mesma coisa que legibilidade:
uma tela pode caber e ainda assim estar apertada demais para uma criança usar.
Isso continua dependendo de olho humano, e é a parte da DT-22 que segue aberta.

A exclusão foi provada em banco de teste, com conta criada pelo próprio teste.
Ninguém exercitou o caminho de uma conta com meses de uso — inventário grande,
muitas partidas, liga —, que é onde a cascata teria mais o que levar.

## Veredito

**Pode avançar**, com a lacuna bloqueante corrigida e **commitada** durante a
auditoria (`004bbcb`), e o gate de 320 px commitado junto (`68b0df9`).

As lacunas 2 a 4 não impedem avançar: duas são acabamento e limite conhecido de
teste, e a quarta é lição de processo para a E17.
