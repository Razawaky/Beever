# Auditoria da E14 — Endurecimento e entrega

**Data:** 2026-09-03 · **Revisor:** o mesmo que escreveu a etapa, no papel de
revisor · **Suíte no fechamento:** 1060 testes, 1060 passando, zero falhas,
259 s de execução, conferidos nesta auditoria com `npm run test:db` contra o
MySQL 8 real, e não pelo que o estado do projeto afirma.

## Como esta auditoria foi feita

A E14 não tem linha de aceite no `docs/02-ROADMAP-ETAPAS.md`: o aceite dela são
os requisitos que as sete tarefas prometem fechar, RNF-01, 02, 05 a 14, 19, 20 a
28, 37, 38 e 40. Cada um foi conferido no código e no teste que o sustenta, com
três medições feitas agora, e não relidas do laudo da tarefa: a suíte inteira, o
`npm run lint`, o `npm run audit`, e uma medição de cobertura própria sobre os
services que o portão da T-14.2 deixou de fora. O checklist visual da seção 8 do
`docs/04-DESIGN-SYSTEM-E-LANDING.md` foi aplicado às telas do jogador; o de banco
da seção 8 do `docs/03` não se aplica, porque a etapa não criou migration.

## Requisitos

| Requisito | Status | Onde | Teste |
|---|---|---|---|
| RNF-05 prepared statements | atendido e testado | nenhuma SQL fora de `src/repositories` — a única ocorrência fora é a classe CSS de um `<select>` em `public/js/listas.js` | `varreduraDeCodigo.test.js` (RNF-05) |
| RNF-06 validação em toda rota | atendido e testado | as 36 rotas de escrita têm validador; a única exceção declarada é `/logout` | `varreduraDeCodigo.test.js` — inclusive a guarda de que a varredura enxerga 36 rotas, e não um punhado |
| RNF-07 escape em view | atendido e testado | nenhum `<%- %>` fora de `include` | `varreduraDeCodigo.test.js`, `varreduraDeSeguranca.test.js` (XSS armazenado) |
| RNF-08 CSRF | atendido e testado | `middlewares/csrf.js` montado uma vez, antes das rotas, com comparação em tempo constante | `varreduraDeSeguranca.test.js` — nenhuma rota de escrita passa sem token, e token de outra sessão não vale |
| RNF-09 rate limit | atendido no código, **contestado na prática** | `middlewares/rateLimiters.js`, cinco baldes | `bruteForce.test.js` (4). Ver lacuna L1: o balde global reprova o cenário da RNF-02 |
| RNF-10 bcrypt e política de senha | atendido e testado | `usersService.js` com custo 10, `routes/users.js` com 8 caracteres, letra e número | `usersService.test.js`, `fluxoAutenticado.test.js` |
| RNF-11 helmet e CSP | atendido e testado | `src/app.js` | `varreduraDeSeguranca.test.js` — CSP sem `unsafe-inline`, sem `unsafe-eval`, `frame-ancestors 'none'` |
| RNF-12 cookies e TLS | **parcial** | `config/session.js` com `httpOnly` e `sameSite`; `secure` e `trust proxy` só em produção, e produção não existe | `varreduraDeSeguranca.test.js` cobre os dois primeiros. TLS segue sem dono (DT-114), e a política de privacidade já o afirma ao usuário — ver L3 |
| RNF-13 segredos e `.env.example` | atendido e testado | `config/env.js`, `.env.example` | `varreduraDeCodigo.test.js`, `ambienteDeConteiner.test.js` — variável lida sem linha no exemplo reprova |
| RNF-14 `npm audit` bloqueante | atendido e testado | `package.json`, job `lint` do CI | executado nesta auditoria: uma moderada em `qs`, abaixo do teto de `high`, portão verde |
| RNF-15 transação, RNF-16 idempotência, RNF-17 auditoria imutável | atendidos, herdados das etapas anteriores e não regredidos | todos os services que pagam mel importam `auditService` | suíte inteira verde |
| RNF-19 backup | atendido e testado | `scripts/backup.js`, `scripts/restaurar.js`, cron documentada no `iniciar-proj.md` | `backup.test.js` (12) mais a prova ponta a ponta do laudo 19. O cron nunca rodou em host (DT-119) |
| RNF-20 a RNF-23, RNF-25, RNF-26 acessibilidade | atendidos e testados no piso | regra de base `:focus-visible` no `tema.css`, altura mínima nos botões, rótulo no campo de arquivo, `h1` no onboarding | `acessibilidadeDasTelas.test.js` (15 casos sobre 30 telas). Ver L4: o piso provado é 320 px, e desktop não foi medido |
| RNF-24 linguagem da faixa | **não atendido** como prova | nada mede | não é automatizável; DT-121 reconhece |
| RNF-27 camadas | atendido e testado | zero SQL fora de repository, oito exportações mortas removidas na T-14.2 | `test:cobertura` reprova linha nunca executada |
| RNF-28 cobertura | **parcial** | `scripts/cobertura.js` mede 24 services, com 100% de linha e catraca de 91% de ramo | ver lacuna L2: o service que transforma resposta em erro está fora da lista, com 93,39% de linha |
| RNF-01 sob carga | atendido com folga curta | pool em 20 por medição | `cargaSimultanea.test.js`; 1924 ms de p95 na primeira visita (DT-113) |
| RNF-02 trinta simultâneos | **parcial** | `scripts/carga.js`, `DB_POOL_LIMIT=20` | ver L1 |
| RNF-37 Docker, RNF-38 stateless | atendidos, com a escala por provar | `Dockerfile` de quatro estágios, `docker-compose.yml`, `.dockerignore` | `ambienteDeConteiner.test.js` (19). Duas réplicas nunca subiram juntas (DT-115) |
| RNF-40 CI | **parcial** | `.github/workflows/ci.yml`, cinco jobs | `fluxoDeIntegracao.test.js` (10), todos estáticos. Ver L6 |
| RNF-32 documentação atualizada | **não atendido** | `docs/MODELO-DE-DADOS.md` não tem as colunas da migration 022 nem a tabela `league_prizes` da 023 | ver L5 |

## Lacunas, em ordem de risco

| | Lacuna | Por que importa |
|---|---|---|
| **L1** | **A RNF-02 foi medida com os limitadores desligados.** O `base` dos limitadores tem `skip: () => env.teste`, e a medição roda com `NODE_ENV=test`. A execução com eles ligados, registrada no próprio laudo 16, devolveu 120 respostas 429 em 600 requisições: o `limiteGlobal` conta 600 por IP a cada quinze minutos, e uma sala de aula sai de um IP só. O número que sustenta "trinta simultâneos" vem de uma configuração que não existe em produção, e o cenário da RNF-02 é literalmente a sala de aula. Está registrado como DT-112 e nenhuma tarefa da etapa de endurecimento o fechou | bloqueante |
| **L2** | **O portão da RNF-28 não mede o service que decide a nota.** `validadoresDeJogo.js`, 696 linhas, é quem transforma a resposta da criança em número de erros, que vira estrela pela RN-030 e daí vira XP, pólen e mel. Ele está fora da lista dos 24. Medido nesta auditoria: 93,39% de linha, 84,21% de ramo, 46 linhas nunca executadas, e todas elas são as guardas de entrada — exatamente a família de buraco que a T-14.2 fechou nos services de saldo. `usersService.js` fica em 93,80%, com o caminho inteiro de `inativar` sem teste nenhum | bloqueante |
| **L3** | **A política de privacidade promete duas coisas que o sistema não faz.** Ela afirma que "o tráfego é servido por conexão criptografada", e não há TLS em lugar nenhum (DT-114); e promete que, pedida a exclusão, "a conta e o progresso são apagados", quando o que existe é `DELETE /users/:id` chamando `inativar`, que só marca `is_active = 0` e não apaga nem anonimiza nada. A DT-79 previa a rotina de exclusão como tarefa da E14, e nenhuma das sete tarefas a pegou | decisão sua |
| **L4** | **A responsividade provada é só o piso.** A T-14.7 mede 320 px, contraste, foco e alvo de toque, e não mede desktop. Nas dez telas do jogador não há praticamente nenhuma regra `lg:` ou `xl:`: são colunas de celular centradas por `max-w-3xl` ou `max-w-5xl`, que é exatamente o que a seção 8 do `docs/04` recusa ("a versão desktop tem composição desenhada, não é a de celular centralizada"), e o Beever é para ser usável em PC também | decisão sua |
| **L5** | **O modelo de dados parou na E12.** Faltam `criterion_type` e `criterion_target` da migration 022 e a tabela `league_prizes` inteira da 023. É a RNF-32 aberta, e cai justo na T-15.2, que desenha os diagramas do TCC a partir desse documento | alta, barata |
| **L6** | **O portão nunca rodou.** O ramo está 153 commits à frente da `main`, que ainda tem o código antigo, e não há pull request aberto. O CI dispara em pull request e em push para `main`, então o YAML segue provado só por teste estático (DT-117), e a segunda metade da RNF-40, o push da imagem, não existe (DT-116) | alta |
| **L7** | Defeitos de texto: o laudo `docs/15` diz "sete services em 100%" e lista nove; a seção 4 do `docs/ESTADO-DO-PROJETO.md` ainda anuncia "Etapa atual: E13"; e a DT-79 afirma que excluir conta "só existe apagando no banco", quando existe a rota de inativação | baixa |
| **L8** | A RNF-03, LCP da landing em 4G, segue sem medição desde a E11 (DT-74). Não era tarefa da E14, e é a última RNF de desempenho sem número antes da defesa | baixa |

## O que foi conferido e está de pé

Camadas respeitadas, sem nenhuma SQL fora de repository. Cálculo de recompensa
só no servidor, com o cliente mandando resposta e nunca pontuação. Auditoria
gravada em toda mudança de mel, XP, pólen e compra, com retrato antes e depois, e
imutável por gatilho. Transação e idempotência em toda escrita de saldo. CSRF em
todas as 36 rotas de escrita, validação em todas menos a declarada, e escape em
toda view. O upload do painel guarda o arquivo em memória e só grava depois de o
`sharp` abrir, então nada que veio do navegador vira arquivo servível.

## Veredito

**Não podia avançar: dois itens bloqueantes.** A L1 e a L2 são as duas que
desmentem um requisito que a etapa dá por atendido, e as duas são baratas — a L2
é acrescentar dois nomes à lista do `scripts/cobertura.js` e escrever os testes
das guardas que faltam, e a L1 é decidir entre contar o limite global por sessão
nas rotas de leitura ou subir o teto por IP com número medido. A L3 e a L4 pedem
decisão sua antes de virar tarefa, porque mudam escopo. Fechadas L1 e L2, a E14
fecha de verdade e a E15 começa com a matriz de rastreabilidade contando a
verdade, que é o único jeito de a T-15.1 valer alguma coisa.

## O que foi corrigido na mesma sessão

**L1 fechada.** `chaveDoLimiteGlobal` passou a mandar a leitura de quem está
logado para um balde por sessão, deixando escrita e visitante anônimo no balde
por endereço, que é o que segura varredura em massa. A medição foi refeita com os
limitadores ligados: 600 requisições, `200×600`, nenhum 429, contra as 120
respostas 429 da execução anterior. Guardam a correção
`test/unit/limiteDeTurma.test.js` (3 casos sobre a chave) e
`test/integration/limiteGlobalPorSessao.test.js` (2 casos pelo HTTP, que também
travam a ordem de montagem: o limitador precisa vir depois da sessão, senão a
chave cai para o endereço sem ninguém perceber). De lado, o `.env` local ainda
tinha `DB_POOL_LIMIT=10`, de antes da T-14.3, e passou para os 20 medidos.

**L2 fechada.** `validadoresDeJogo` e `usersService` entraram na lista do
`scripts/cobertura.js`. Os dois foram a 100% de linha com
`test/unit/guardasDosValidadores.test.js` (11 casos, as 23 recusas de conteúdo e
de resposta) e `test/integration/guardasDaConta.test.js` (5 casos: senha nova sob
a mesma regra do cadastro, hash bcrypt gravado, auditoria sem a senha dentro,
inativação com antes e depois, e conta de terceiro recusada). São 26 services
medidos, e a catraca de ramo subiu de 91% para 93%.

**L3 pela metade, que era o combinado.** A página de privacidade parou de afirmar
o que o sistema não faz: saiu a frase do tráfego criptografado, e a promessa de
apagamento virou a descrição do que existe, que é a desativação da conta mais o
pedido por e-mail. O apagamento de verdade e o TLS continuam como tarefas
próprias, na DT-79 e na DT-114.

**L5 e L7 fechadas.** O `docs/MODELO-DE-DADOS.md` ganhou as duas colunas de
critério da migration 022 e a tabela `league_prizes` da 023; o laudo `docs/15`
deixou de dizer "sete" onde lista nove; e a seção 4 do estado do projeto passou a
anunciar a E15.

A suíte fechou em 1081 testes, 1081 passando, com o `npm run lint` e o `npm run test:cobertura` verdes na mesma execução.

**L6 fechada em 2026-09-04.** O pull request #1 rodou o portão pela primeira
vez e ele reprovou, o que era o ponto: `app.test.js` subia a aplicação sem criar
banco de teste, e o `/health` respondia pelo banco de desenvolvimento da máquina
de quem rodava — no runner, onde esse banco não existe, virou 503. A catraca de
ramo, que eu tinha subido para 93 colada nos 93,11% desta máquina, reprovou nos
92,82% do runner e desceu para 92. Os dois consertos foram ao ramo, e a DT-117
está paga: o YAML agora é provado por execução, e não por teste estático.

**Segue aberto:** L4 (composição de desktop) e L8 (LCP).
