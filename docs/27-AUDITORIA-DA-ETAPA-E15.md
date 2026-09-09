# Auditoria da E15 — Documentação do TCC

**Data:** 2026-09-09 · **Revisor:** o mesmo que escreveu a etapa, no papel de
revisor · **Suíte no fechamento:** 1111 testes passando; 1112 depois da correção
bloqueante, feita na mesma sessão.

## Como esta auditoria foi feita

A E15 é a primeira etapa **sem critérios de aceite escritos** no
`docs/02-ROADMAP-ETAPAS.md`: existe a tabela de entregas e nada além dela. O
aceite usado aqui foi inferido de duas fontes — as seis entregas da tabela e o
padrão que a própria etapa criou, de que documento de TCC vem com teste que o
impede de envelhecer. A T-15.1, a T-15.5 e a T-15.6 entregaram esse teste; a
conferência começou perguntando se as outras três também.

Nada foi aceito por leitura do que o estado do projeto afirma. Os números foram
recontados contra o disco: requisitos do `docs/01` contra códigos citados na
matriz, tabelas de `migrations/` contra a figura ER, comandos `npm run` do
manual contra o `package.json`, variáveis do `.env.example` contra o manual, e
`git ls-files` contra o que existe em `test/`. Foi assim que a lacuna
bloqueante apareceu — ela é invisível para quem só lê os arquivos.

## Entregas

| Entrega | Status | Onde | Teste |
|---|---|---|---|
| T-15.1 rastreabilidade | atendida e testada | `docs/RASTREABILIDADE.md`, 174 linhas cobrindo os 186 códigos do `docs/01` | `test/unit/rastreabilidade.test.js` (4) |
| T-15.2 diagramas | atendida e testada *(a guarda entrou na auditoria)* | `docs/22-DIAGRAMAS-DO-TCC.md`: ER, casos de uso, duas de classes e sequência | `test/unit/tcc.test.js` (7) |
| T-15.3 arquitetura | atendida e testada *(a guarda entrou na auditoria)* | `docs/23-ARQUITETURA-DO-SISTEMA.md`, 11 seções e a tabela decisão → alternativa → porquê | `test/unit/tcc.test.js` (4) |
| T-15.4 manual | **parcial** | `docs/24-MANUAL-DE-INSTALACAO-E-EXECUCAO.md`: os 15 comandos citados existem; faltam 7 das 18 variáveis de ambiente | `test/unit/tcc.test.js` (5) |
| T-15.5 evidências | atendida e testada *(estava quebrada, corrigida antes da auditoria)* | `docs/25-EVIDENCIAS-DE-TESTE.md` e `docs/evidencias/` | `test/unit/evidencias.test.js` (7) |
| T-15.6 trabalhos futuros | atendida e testada | `docs/26-TRABALHOS-FUTUROS.md` | `test/unit/trabalhos-futuros.test.js` (4) |

## Requisitos

| Requisito | Status | Onde | Teste |
|---|---|---|---|
| RNF-28 cobertura | atendido e testado | 100% de linha, 92,93% de ramo e 99,39% de função, contra pisos de 100, 92 e 99 | `scripts/cobertura.js` como portão; saída em `docs/evidencias/cobertura.txt` |
| RNF-31 Conventional Commits | atendido sem teste | os sete commits da etapa seguem o padrão em português | nenhum; a matriz já registra a ausência |
| RNF-32 documentação na mesma tarefa | **parcial** | vale para T-15.1, T-15.5 e T-15.6; três entregas passaram sem guarda versionada até esta auditoria | — |
| RNF-39 negociação de conteúdo | **parcial**, e o `docs/23` afirmava o contrário | `GET /conquistas` e `GET /liga` renderizam sem passar por `querJson`, conferido em `src/controllers/paginaController.js` | `test/integration/fluxoAutenticado.test.js` cobre as rotas que negociam |

Camadas, cálculo de recompensa, auditoria de saldo, transação e idempotência,
validação e escape: **nada a apontar, e nada a creditar** — a etapa não tocou
`src/`. Os únicos arquivos fora de `docs/` e `test/` foram `iniciar-proj.md`,
`.env.example`, `package.json` e `scripts/evidencias.js`, e este último não tem
SQL nem regra de negócio. Sem migration e sem view, os checklists da seção 8 do
`docs/03-BANCO-DE-DADOS-DBA.md` e da seção 8 do
`docs/04-DESIGN-SYSTEM-E-LANDING.md` não se aplicam.

## Lacunas, em ordem de risco

1. **BLOQUEANTE — `test/unit/tcc.test.js` nunca tinha sido commitado.** Quinze
   testes verdes que guardam a T-15.2, a T-15.3 e a T-15.4 existiam apenas no
   disco de uma máquina: `git ls-files` não os trazia. Metade das entregas da
   etapa estava sem a guarda que a própria etapa estabeleceu como padrão, e o
   portão de CI não rodava nenhum deles. O arquivo ainda carregava o único erro
   de lint do projeto, uma constante `ROADMAP` declarada e não usada, então
   entrar como estava reprovaria o portão. **Corrigida na auditoria** (DT-126).
2. **ALTO — a figura ER não era o mapa inteiro que o texto prometia.** O
   `docs/22` afirmava mostrar "o mapa inteiro do banco em uma só visão" e
   desenhava 55 de 60 tabelas. As cinco ausentes eram `goal_plan_rules`,
   `goal_target_rules`, `reward_modifiers`, `sessions` e
   `vault_transaction_types` — e as três primeiras são justamente as tabelas de
   calibragem que as decisões travadas e o `docs/23` destacam como o motivo de
   não existir valor mágico no código. **Corrigida na auditoria**, com guarda
   nova: toda tabela criada em `migrations/` precisa aparecer na figura.
3. **ALTO — dois documentos da mesma etapa se contradiziam.** O `docs/23`
   afirmava sem ressalva que os controllers respondem JSON, em dois pontos,
   enquanto a matriz registra a RNF-39 como parcial. **Corrigida na auditoria**,
   depois de conferir no `paginaController.js` que as duas rotas realmente não
   negociam.
4. **MÉDIO — o manual canônico não documenta 7 das 18 variáveis do
   `.env.example`**: `DB_PORT`, `DB_POOL_LIMIT`, `SESSION_MAX_AGE_MINUTES`,
   `LOG_LEVEL`, `UPLOAD_MAX_MB`, `BACKUP_CONTAINER` e `EVIDENCIAS_URL`. O teste
   existente cobre código ↔ `.env.example`; ninguém cobre `.env.example` ↔
   manual, que é por onde a lacuna passou. Registrada como DT-127.
5. **MÉDIO — "184 requisitos" é o número errado: são 186.** A frase está no
   próprio `docs/RASTREABILIDADE.md` e em três pontos do estado. O teste garante
   que nenhum requisito fique sem linha, e não o número escrito ao lado.
   Registrada como DT-128.
6. **BAIXO — o manual se declara fonte sobre "testes e seus comandos" e não cita
   `npm test`**, nem `carga`, `vendor:js` e `img:webp`. Anda junto da DT-127.
7. **BAIXO — `scripts/evidencias.js` traz `senha: 'beever123'` literal.** É a
   conta demo do seed, publicada de propósito no próprio manual, então não é
   vazamento — mas contraria a regra de segredo só por variável de ambiente, e o
   script já lê `EVIDENCIAS_URL` do ambiente, mostrando o caminho. Registrada
   como DT-129.
8. **BAIXO — a etapa não tem critérios de aceite no roadmap.** As anteriores
   têm, e sem eles a auditoria vira julgamento em vez de conferência.

## O que esta auditoria não prova

O laudo confere que os documentos são internamente consistentes, citam arquivos
que existem e não inventam requisito. Ele **não** confere que o texto é
verdadeiro sobre o comportamento do sistema: nenhum teste lê o `docs/23` e
compara a afirmação com o código. A lacuna 3 foi encontrada por leitura crítica,
não por execução, e uma afirmação errada do mesmo tipo passaria de novo.

O manual também nunca foi executado do zero por alguém que não conhece o
projeto, que é a única prova que interessa para um manual de instalação.

## Veredito

**Pode avançar**, com a lacuna bloqueante corrigida na mesma sessão da
auditoria: os testes dos três documentos entraram no repositório, e com uma
guarda a mais do que tinham. A lacuna 1 tocava o que a etapa inteira existe para
garantir — documento de TCC que não envelhece sozinho —, e era invisível para
quem lesse apenas os arquivos.

As lacunas 2 e 3 também foram corrigidas, embora não bloqueassem: eram
afirmações erradas em documento que a banca vai ler, e o custo de consertar
depois da defesa é maior que o de consertar agora.

As lacunas 4 a 8 não impedem avançar. As 4 e 6 cabem numa tarefa só; a 5 é
correção de número em quatro pontos; a 7 é higiene; e a 8 é lição para a E16,
que também está sem critérios de aceite escritos.
