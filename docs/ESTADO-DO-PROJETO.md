# Estado do projeto

Verdade operacional do Beever. Substitui a versão de 2026-08-12, escrita antes
dos documentos de escopo `docs/01` a `docs/04` existirem.

**Atualizado em:** 2026-08-18 · **Branch:** `refactor/arquitetura-em-camadas` ·
**Último commit:** corrida do planejador fechada — a segunda passagem da
auditoria da E04 achou metas duplicadas pagando a mesma conquista, e a trava
entrou com teste que falha sem ela

---

## Como retomar o trabalho

Se a sessão anterior acabou no meio, comece por aqui:

1. Leia o **Resumo em 2 minutos**, logo abaixo.
2. `git log --oneline -15` — as mensagens de commit carregam o porquê de cada
   decisão, não só o quê.
3. A tabela de tarefas da etapa atual está na **seção 4**. A próxima tarefa não
   marcada é a próxima a fazer.
4. As decisões já tomadas estão na **seção 6**. Não reabra sem motivo novo.
5. `docker compose up -d mysql && npm test` confirma que o ambiente está de pé.

Nada de importante desta sessão vive só na conversa: o que foi decidido está
neste documento e nos commits; o que foi construído está no repositório.

---

## Resumo em 2 minutos

Se você só tem tempo para esta seção, ela basta. O resto do documento é a
evidência por trás dela.

**Onde estamos:** E00 (auditoria) e **E01 (banco de dados) concluídas e
auditadas**. O banco definitivo existe e roda: 13 migrations versionadas, 58
tabelas, 67 foreign keys, 39 `CHECK`, 43 `UNIQUE`, auditoria imutável por
gatilho, seeds com usuário demo jogável, e o ciclo `docker compose up` →
`db:migrate` → `db:seed` → `db:reconcile` funcionando do zero. O schema anterior
está arquivado em `migrations/_legacy/`, nada apagado.

**A aplicação voltou ao ar na T-02.3**, contra o schema novo, e o risco R-01
está encerrado. O fluxo inteiro foi percorrido com o servidor rodando —
cadastro, onboarding, painel, loja, tarefa, compra, meta, logout — e virou
teste automatizado, em vez de ficar como print numa conversa.

**O que está saudável:** arquitetura em camadas respeitada (nenhuma SQL fora de
repository), 272 testes passando — 205 deles contra um banco real, incluindo as
rotas autenticadas, o onboarding retomado em outra sessão, as metas geradas pelo
planejador e a semana editada sem perder progresso —, `npm audit` limpo,
`db:reconcile` fechando os quatro livros.

**O que não existe** e o escopo exige: favos, células, trilha, jogos, pólen,
patrimônio, cofre, ciclos econômicos, sequência (streak), conquistas, área
administrativa, CI. O código atual implementa um produto **menor e diferente**
do que os documentos `docs/01`–`04` especificam — o mapa etapa a etapa está na
seção 4.

**O buraco mais sério, agora menor:** o loop de recompensa estava cortado dos
dois lados. A T-02.3 religou um: `coinsService.creditar` passou a existir e
concluir tarefa paga mel e pólen de verdade, com os valores vindos de
`task_types`. O outro lado continua aberto — **nenhum XP é creditado em jogo**,
porque nenhuma recompensa do MVP declara XP. Isso é o motor da E06.

**O que vem agora:** **as 7 tarefas da E02 estão entregues.** A T-02.1 montou a
rede de teste com banco real, a T-02.2 realinhou os 13 repositories, a T-02.3
realinhou services, controllers e telas — devolvendo a aplicação ao ar —, a
T-02.4 tirou a checagem de onboarding de dentro dos controllers, a T-02.5 deu um
identificador a cada requisição, a T-02.6 pôs a auditoria atrás de uma porta só e
a T-02.7 deu um layout base às nove páginas.

**A auditoria da etapa aconteceu e reprovou a primeira versão.** Dois
bloqueantes, os dois na economia do jogo:

1. **Mel infinito.** Criar tarefa e concluir na sequência pagava a recompensa
   cheia sem cumprir nada, em laço. O teste de fluxo desta própria etapa
   explorava o buraco sem perceber, para juntar mel antes de comprar.
2. **Meta que não pagava.** Toda meta nascia com recompensa zero, e a tela
   chegava a anunciar "rendeu 0 de mel e 0 de pólen". A meta tinha ainda o mesmo
   atalho da tarefa — concluir sem ter alcançado —, que a auditoria não isolou e
   apareceu ao corrigir o primeiro.

Ambos corrigidos no commit `27bdc8b`, com o comportamento verificado contra o
servidor real. O terceiro item — erro sem stack em produção — virou teste
permanente (`test/integration/erroEmProducao.test.js`) em vez de uma subida
manual que ninguém repetiria.

**A E03 também foi auditada, e também reprovou na primeira versão.** Dois
bloqueantes e um alto, todos corrigidos no mesmo dia: qualquer conta logada
trocava e-mail e senha de qualquer outra por `PUT /users/:id` (autorização
faltando, não autenticação — a sessão era exigida, a posse não), a suíte
dependia do dia da semana e só passava às segundas, quartas e sextas, e as
barras de progresso do painel e das metas eram apagadas no navegador pela CSP,
porque escreviam a largura em atributo `style`. As três correções vieram com
teste que impede a volta. O relatório está em
[`03-AUDITORIA-DA-ETAPA.md`](03-AUDITORIA-DA-ETAPA.md).

O risco R-01 foi pago em duas parcelas e **está encerrado**: repositories na
T-02.2, camada de cima na T-02.3. O modelo está documentado em
[`MODELO-DE-DADOS.md`](MODELO-DE-DADOS.md) e o mapa de nomes em
[`00-MAPA-DE-NOMES-LEGADO.md`](00-MAPA-DE-NOMES-LEGADO.md).

**O que morde:** `npm run lint` falha, mas só por causa de scripts de plugin de
IA — o código do projeto está limpo (DT-02). O servidor MCP do grafo voltou a
responder e o grafo foi reconstruído, encerrando o R-02; a lição é que ele
envelhece calado, então vale reconstruir antes de confiar numa análise de
impacto.

| Em números | |
|---|---|
| Etapas do roadmap prontas | **5 de 16** — E00, E01, E02, E03 e E04, todas auditadas |
| Endpoints · services · repositories | 34 · 19 · 17 |
| Testes | **337 passando, 0 falhando** (255 contra banco real) — fluxo autenticado ponta a ponta, onboarding completo e retomado em outro navegador, metas geradas pela RN-014, semana editada de 5 para 2 dias sem perder progresso, erro em produção, recusas de autenticação, força bruta e autorização por dono da conta |
| Dívida técnica catalogada | 15 itens abertos — a T-04.4 abriu DT-31 e DT-32, a auditoria da E04 abriu DT-33, a correção de escopo abriu DT-34 e a T-05.2 abriu DT-35 |
| Riscos abertos | nenhum |

---

## 1. Como subir o projeto

Passo a passo completo, com pré-requisitos e solução de problemas, em
[`iniciar-proj.md`](../iniciar-proj.md).

```
npm install
cp .env.example .env
docker compose up -d mysql
npm run db:migrate
npm run db:seed
npm run css:build
npm run dev
```

### Ambiente confirmado por execução em 2026-08-17

| Componente | Versão | Onde está declarado |
|---|---|---|
| Node | **v22.22.3** instalado | `.nvmrc` = 22; `engines` pede `>=20`; `Dockerfile` usa `node:22-slim` nos dois estágios |
| Tailwind | **v4.3.3** (`tailwindcss` + `@tailwindcss/cli`) | Configuração por CSS em `src/styles/tailwind.css`; **não existe** `tailwind.config.js`, e na v4 é assim mesmo |
| MySQL | **8.4.11** rodando | `docker-compose.yml` fixa `mysql:8.4`. Os dumps legados vieram de 8.0.46 — atenção a diferenças de sintaxe ao derivar o schema novo na E01 |
| npm audit | **0 vulnerabilidades** | Com e sem dependências de desenvolvimento |

### Scripts do `package.json` — todos executados

| Script | Resultado |
|---|---|
| `npm start` | Sobe na porta 3000. Fluxo completo percorrido em 2026-08-17 contra o schema novo: cadastro, onboarding, painel, loja, tarefa, compra, meta e logout, todos respondendo |
| `npm run dev` | Mesmo `start` com `node --watch` (ver armadilha na seção 7) |
| `npm run db:migrate` | "Nenhuma migration pendente"; segunda execução idêntica — **idempotente confirmado** |
| `npm run db:seed` | Aplica os 6 arquivos de `scripts/seeds/`. Três execuções seguidas deixam as mesmas contagens — **idempotente confirmado**. Imprime o estado do banco e as contas de desenvolvimento |
| `npm run db:reset` | Recusa em produção; recusa sem `-- --sim`; com a confirmação, apagou as 57 tabelas do banco de teste |
| `npm run db:reconcile` | Sete conferências: mel, pólen, XP, cofre, nível contra a curva, próximo nível e progresso do favo. Sai com 1 em caso de divergência, para poder virar passo de CI |
| `npm run db:backup` | Dump completo em `backups/`, com retenção de 7 dias. Roda em produção, ao contrário do reset e do seed. Periodicidade documentada em `iniciar-proj.md` |
| `npm run css:build` | Gera `src/public/css/app.css` (26,9 KB) em cerca de 150 ms |
| `npm run css:watch` | Mesmo build em modo observação (não executado) |
| `npm test` | 337 passam, 0 falham. Sem MySQL, os 255 testes de banco se pulam com aviso |
| `npm run test:db` | Mesma suíte exigindo banco no ar — falha em vez de pular. É o comando do CI |
| `npm run lint` | **Falha** — 3242 erros, todos de `.claude/skills/**` e `.github/skills/**`; nenhum do código do projeto. Ver DT-02 |

Respostas medidas com o servidor no ar: `/` 18 ms, `/login` 11 ms, `/health`
13 ms, `/painel` sem sessão devolve 302. Bem dentro do RNF de 2 s.

Variáveis obrigatórias (`src/config/env.js:9`): `DB_HOST`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME`, `SESSION_SECRET`. As 11 variáveis lidas pelo projeto
estão todas no `.env.example`. Falta só `DB_ROOT_PASSWORD`, que o
`docker-compose.yml:10` usa — hoje funciona pelo valor padrão `root`, mas
deveria estar documentado (ver DT-15).

---

## 2. Feito e verificado

Verificado nesta sessão, por execução, não por leitura de documento.

| Item | Como foi verificado |
|---|---|
| **Consentimento do responsável (T-03.5)** | Contra o servidor real: criança sem autorização recebe 422 `CONSENTIMENTO_NECESSARIO` e nenhuma linha é criada; com autorização, a conta nasce com a linha em `guardian_consents`, e-mail do responsável e `ip_hash`; adulto se cadastra sem nada disso. Conferido no banco |
| **Recusas da autenticação (T-03.6)** | Dez casos automatizados: senha fraca nas três formas, e-mail repetido, credencial errada, conta inativa, sessão apagada do store, logout que invalida no servidor e força bruta com o rate limit ligado |
| **Layout base (T-02.7)** | Servidor no ar: as quatro páginas públicas e a de erro saem com doctype, folha de estilo e título próprios; o rodapé aparece só onde deve; o wizard de onboarding continua recebendo `perfil-id` e `csrf-token` pelo dataset do body |
| **Trilha de auditoria completa (T-02.6)** | Fluxo real percorrido com o servidor no ar: seis ações gravadas em `audit_logs` com ator, `ip_hash` (nunca o IP em claro) e um `request_id` distinto por requisição, que é o que liga a linha de auditoria ao log daquela requisição |
| **Rastro por requisição (T-02.5)** | Servidor no ar, um 404 provocado: o mesmo id apareceu no header `x-request-id`, no corpo JSON do erro e nas linhas de log da requisição. Com `x-request-id` vindo do cliente, o id do proxy foi preservado ponta a ponta |
| Suíte de testes | `npm run test:db` → **171 passam, 0 falham**, com MySQL no ar |
| **Fluxo autenticado ponta a ponta (T-02.3)** | `test/integration/fluxoAutenticado.test.js`: uma sessão só, do cadastro ao logout, contra banco real. Prova o onboarding gravando nível e agenda, a tarefa pagando mel e pólen uma vez só, a compra debitando o valor exato e congelando o preço, a compra sem saldo devolvendo 422 sem mexer no saldo, e os três livros fechando com o cache no fim |
| **Os 13 repositories contra o schema novo (T-02.2)** | 93 testes de integração em `test/integration/repositories/`, um arquivo por repository, batendo em banco real criado do zero. Cobrem o caminho feliz e as recusas do banco: total de compra que não fecha a conta, estrelas acima de 3, dia da semana fora de 0–6, alvo de tarefa zero, valor de inventário negativo, XP negativo e token de partida repetido |
| **Idempotência onde ela paga recompensa** | Concluir tarefa, concluir meta, fechar partida e vender item duas vezes: a segunda chamada devolve 0 linhas afetadas em todas. A checagem mora no `WHERE`, então não há janela entre ler e gravar |
| **Livro × cache, no código e não só no script** | Crédito e débito de mel, pólen e XP testados dentro de transação: o saldo e o lançamento andam juntos, e um `throw` no meio desfaz os dois |
| **Integridade do banco, agora automatizada (DT-16)** | 21 testes de integração sobem um banco `beever_teste` do zero, aplicam migrations e seed, e exigem que o MySQL recuse as 13 gravações inválidas da E01. Verificado também o caminho sem banco (pula com aviso) e o do CI (`TESTES_DE_BANCO=1` falha) |
| **Auditoria imutável (RNF-17)** | Migration `008` põe dois gatilhos em `audit_logs`. Testado com o usuário da aplicação: `UPDATE` e `DELETE` recusados com mensagem citando a regra, `INSERT` continua funcionando. Não é mais convenção — é o banco recusando |
| **Requisito de admin sobrevive ao seed** | O `db:seed` limpa apenas os requisitos dos itens que ele próprio declara. Verificado: requisito criado à mão em `skin-dourada` continuou lá depois de reexecutar o seed |
| **Runner de migrations com checksum** | Editar uma migration já aplicada e rodar `db:migrate` **falha com mensagem clara**, testado de verdade: o arquivo foi alterado, o runner recusou, o arquivo foi restaurado e o runner voltou a passar |
| **Reconciliação livro × cache** | Uma divergência plantada à mão (carteira 100, livro 40) foi detectada e o script saiu com código 1; corrigido o cache, voltou a sair com 0 |
| **Seed completo** | Ciclo `db:reset` → `db:migrate` → `db:seed` → `db:reconcile` rodado do zero: 20 níveis, 3 faixas, 6 tipos de jogo, 54 configurações de recompensa, 37 itens, 16 requisitos de compra, 2 favos, 8 células, 8 conteúdos, 2 contas. Três execuções seguidas do seed dão as mesmas contagens |
| **Usuário demo jogável** | `ana@beever.dev` nasce com o primeiro favo 100% concluído, 5 sessões de jogo fechadas, patrimônio de 268 (19 de mel + 51 no cofre + patinete a 198), 1 meta concluída e 1 em andamento, 2 tarefas, sequência de 3 dias e um ciclo econômico processado. A reconciliação passa nos quatro livros |
| Separação de camadas | Zero `SELECT`/`INSERT`/`UPDATE`/`DELETE` fora de `src/repositories/`; nenhum controller importa repository; nenhum repository importa service |
| Escape nas views | Nenhum `<%- %>` fora de `include` nas 9 páginas EJS |
| Ausência de `console.log` | Zero em `src/` (as duas ocorrências do grep estão dentro de comentários) |
| Auditoria ligada | `auditoriaRepository.registrar` chamado por 7 services, incluindo compra e conclusão de tarefa |
| Inventário completo | 26 endpoints, 11 controllers, 14 services, 12 repositories, 9 views, 2 migrations, 15 tabelas — em `docs/00-INVENTARIO.md` |
| Design tokens | Bloco `@theme` em `src/styles/tailwind.css` com paleta, raios e tipografia da identidade |
| **Schema novo da E01** | Banco criado do zero em MySQL 8.4: 7 migrations aplicadas pelo runner sem erro, e reaplicadas sem erro (idempotência real, não presumida). 56 tabelas, 67 FKs, 39 `CHECK`, 43 `UNIQUE`, nenhuma coluna `FLOAT`/`DOUBLE`, nenhuma tabela fora de `utf8mb4_0900_ai_ci` |
| **Regras de negócio no banco** | 11 tentativas inválidas testadas contra o banco real, **todas rejeitadas pelo próprio MySQL**: saldo de mel negativo, saldo de cofre negativo, token de sessão repetido, mesmo ciclo econômico duas vezes, XP negativo, dia da semana repetido, total de compra que não bate com preço × quantidade, estrelas fora de 0–3, célula na mesma posição do favo, ledger apontando para usuário inexistente e tempo de sessão fora da lista da RN-011. Uma compra válida passou |

| **Subida do zero (T-01.8)** | Volume do MySQL apagado e recriado. `docker compose up -d mysql` → `db:migrate` → `db:seed` → `db:reconcile` rodou limpo **sem nenhum `GRANT` manual** — o contêiner criou banco, usuário e permissão sozinho, que é o caminho de quem clona o projeto. 57 tabelas, 7 migrations com checksum registrado |
| **Exclusão de conta (RN-053)** | Conta descartável criada, apagada e conferida: carteira e disponibilidade foram junto por `CASCADE`, e a linha de `audit_logs` **sobreviveu** — que é exatamente o comportamento que a regra pede |

Verificado na sessão de 2026-08-12, **contra o schema antigo, que não existe
mais**. Fica como registro histórico do que funcionou até a E01; nada disso vale
como garantia sobre o banco atual:

- Fluxo ponta a ponta via curl: cadastro → onboarding → painel → loja → compra
  → metas → tarefa → pontos creditados.
- Débito de moedas atômico, com compra sem saldo bloqueada em 422.
- Conclusão de tarefa idempotente por `UPDATE ... WHERE progresso < 100`.

### Bugs do código antigo corrigidos na migração (evidência para o TCC)

1. O cron de expurgo apagaria contas ativas — `AND`/`OR` sem parênteses fazia
   `ultimo_login IS NULL` valer sozinho.
2. Log de exclusão gravava nulos: lia `nome` e `email` de um `SELECT` que só
   trazia `id`.
3. `GET /users` devolvia `{}` por falta de `await`.
4. Login permitia enumerar e-mails (mensagens distintas para e-mail inexistente
   e senha errada).
5. `.transition-all` no CSS resgatado sequestrava o utilitário do Tailwind.

### Defeitos encontrados pelos testes da T-02.2 (evidência para o TCC)

Nenhum destes tinha sintoma visível — todos foram achados por teste, que é o
argumento a favor da rede que a T-02.1 montou.

6. `LIMIT ?` com `execute` do `mysql2` derrubava três consultas: histórico de
   compras, histórico de partidas e a leitura da auditoria. O código antigo
   trazia o mesmo defeito em `sessaoJogoRepository`, nunca exercitado.
7. Crédito de mel, pólen ou XP com motivo inexistente subia o saldo e **não**
   gravava o lançamento: o `INSERT ... SELECT FROM reward_reasons` simplesmente
   não encontrava linha. A divergência só apareceria no `db:reconcile`, dias
   depois e longe da causa. Agora falha alto, e o rollback leva o saldo junto.
8. Auditoria com tipo de ator desconhecido sumia calada, pelo mesmo motivo —
   o oposto do que a RNF-17 promete.

---

## 3. Feito mas não verificado

| Item | Por que está aqui |
|---|---|
| Consentimento do responsável no registro (RNF-34) | Não existe; o registro atual não pede |
| Reconstrução do fluxo em navegador real | Toda a verificação até hoje foi por curl. Nenhuma tela foi aberta em navegador com sessão real desde as mudanças de view no working tree |
| Wizard de onboarding em navegador real (T-04.2 e T-04.3) | O comportamento está coberto por teste de integração — gravação por passo, retomada em sessão nova, catálogo no rascunho, barra com `.barra-N` e `aria-valuenow` na marcação —, e o rascunho servido foi conferido com o servidor de pé. O que **não** foi verificado com olho humano é o JavaScript rodando: montagem por API do DOM, as imagens dos avatares no passo do mascote, o passo de preferências avançando com tudo desmarcado, foco de teclado ao trocar de passo e a barra animando. Vale um passe junto da DT-22, na E11 |
| Comportamento sob concorrência | O débito atômico foi testado sequencialmente. Nunca houve teste com duas requisições simultâneas de verdade |
| Revisão do conjunto das fases 1–3 | Agora commitado em `a2e596b` (52 arquivos, +1525 linhas). A suíte passa, mas o conjunto nunca passou por revisão de código como um todo |

---

## 4. Pendente

### Etapa atual

**E05 — conteúdo e trilha.** A E04 está fechada e auditada em duas passagens.

| Tarefa | Situação |
|---|---|
| T-05.1 Repositories de favo, célula, conteúdo e progresso | **feita** — `hivesRepository`, `cellsRepository`, `contentsRepository` e `progressRepository`, com 21 testes contra banco real |
| T-05.2 `ContentService`: favos e células com estado, desbloqueio (RN-026/027/028) | **feita** — trilha, lista de células e abertura de célula, com o pré-requisito conferido no service e não só na tela |
| T-05.3 `ProgressService`: tentativa, erros, estrelas, percentual do favo | **feita** — RN-030 com dono único, tentativa e percentual na mesma transação, sem pagar nada |
| T-05.4 Views da trilha e da lista de células | **feita** — `/trilha` e `/trilha/:id`, hexágonos serpenteantes, favo travado com o motivo escrito |
| T-05.5 Filtro por faixa de idade | pendente — depende de semear as faixas B e C (DT-17) |
| T-05.6 Testes: célula travada não abre; 80% libera o favo seguinte; patrimônio respeitado | pendente |

**O que a T-05.1 entregou.** As seis tabelas de conteúdo existiam desde a
migration `002` e nenhuma tinha repository — a trilha era schema sem código.
Agora são quatro arquivos: favo, célula, conteúdo e progresso, este último com
`cell_progress` e `hive_progress` juntos, porque registrar uma tentativa mexe nas
duas e separá-las obrigaria o service a coordenar o que é uma escrita só.

Três decisões que valem lembrar:

1. **O filtro da RN-029 é SQL, não memória.** `listarPorFaixas` recebe as faixas
   visíveis e devolve só elas; lista vazia devolve lista vazia. Filtrar depois
   traria o catálogo inteiro para descartar, e vira problema quando as faixas B
   e C forem semeadas.
2. **`hive_progress` é cache, e o repository o reconta.** `recalcularFavo` faz
   `INSERT ... SELECT ... ON DUPLICATE KEY` a partir de `cell_progress`: nada
   escreve o percentual à mão, e recalcular duas vezes não duplica linha nem move
   a data de quando o favo fechou. Quando chamar é decisão do `ProgressService`
   (T-05.3), não do banco — por isso não virou trigger.
3. **Estrela e melhor pontuação só sobem.** `registrarTentativa` usa `GREATEST`,
   e a primeira conclusão é gravada uma vez só: é ela que vai separar estreia de
   repetição na hora de pagar (RN-008). Repetir a célula e ir pior soma tentativa
   e erros, mas não tira o que já foi conquistado.

Um defeito encontrado pelo próprio teste, e que vale como regra geral: a primeira
versão de `recalcularFavo` gravava na conexão da transação e lia pelo pool, então
devolvia `null` — a linha ainda não existia para ninguém de fora. Quem escreve em
transação e lê em seguida tem de ler pela mesma conexão.
**O que a T-05.2 entregou.** O `contentService` responde o que o jogador pode
abrir e por que não pode o resto. Cada favo e cada célula voltam com `estado` e
`motivo` prontos — `disponivel`, `concluido`, `travado-por-celula-anterior`,
`travado-por-percentual`, `travado-por-item`, `travado-por-patrimonio` —, então a
view da T-05.4 escolhe ícone e texto sem refazer regra, e a mesma resposta serve
para JSON.

Três decisões que valem lembrar:

1. **A sequência da RN-027 é dentro da faixa.** O primeiro favo de cada faixa
   visível abre livre, e o `unlock_percent` só olha o vizinho da mesma faixa.
   Sequência global prenderia quem entra na faixa C atrás de conteúdo infantil, e
   o schema já modela assim (`idx_hives_order (age_band_id, order_index)`).
2. **O pré-requisito é conferido no service, não na tela.** `abrirCelula` recusa
   célula travada mesmo quando o pedido chega direto, sem passar pela lista — é o
   critério de aceite da etapa ("impossível burlar pré-requisito via URL") e tem
   teste com esse nome.
3. **A ordem das checagens tem motivo.** Primeiro o percentual, depois item e
   patrimônio: quem ainda não jogou o favo anterior é avisado disso, e não de que
   lhe falta um item que ele nem precisaria comprar ainda.

**Patrimônio hoje conta só itens** — `inventoryRepository.valorTotalEmPatrimonio`
soma o inventário que a regra manda contar. A RN-045 diz que patrimônio "na
prática exige uso do cofre", e o cofre é E09: quando ele existir, a soma passa a
vir de dois lugares e o service tem de perguntar aos dois. É a **DT-35**. Nenhum
favo semeado exige patrimônio, então o caminho está testado com favo montado no
teste, não em produção às cegas.

**O que a T-05.3 entregou.** O `progressService` transforma "errou 2, concluiu"
em estrelas (RN-030), grava a tentativa e recalcula o percentual do favo na mesma
transação. Ele **não paga nada**: XP, mel e pólen são do motor de recompensas
(E06), e toda função aceita conexão de fora justamente para a E06 chamá-las de
dentro da transação que credita.

**A fronteira com a T-06.5 foi decidida aqui, e vale registrar.** O roadmap dá
"calcula estrelas" às duas tarefas. A regra da RN-030 ficou com este service, em
função pura e testada; a T-06.5 valida as respostas no servidor, descobre quantos
erros houve e chama daqui. Uma regra, um lugar — duas cópias da tabela de
estrelas seria a pior coisa a deixar para a etapa seguinte.

Três coisas que valem lembrar:

1. **Mandar resultado para célula travada é recusado.** A conferência da T-05.2
   protegia a leitura; sem esta, bastava enviar uma conclusão para destravar a
   trilha inteira. Tem teste com esse nome.
2. **Repetição é sinalizada, não cobrada.** O retorno traz `ehRepeticao`, que é o
   que a RN-008 vai usar para pagar 25% de XP e zero mel — a decisão de quanto
   pagar continua sendo da E06.
3. **O tempo de partida não entra em `cell_progress`.** A coluna
   `duration_seconds` já existe em `game_sessions`, junto do token e do
   `is_replay`, e quem a escreve é o `GameSessionService` (T-06.5). Acrescentar
   coluna de tempo aqui duplicaria dado que já tem lugar.


**O que a T-05.4 entregou.** A trilha tem tela: `/trilha` mostra os favos em
hexágonos serpenteantes e `/trilha/:id` lista as células do favo. A Colmeia
ganhou a porta de entrada, que não existia — a trilha estava pronta no back-end e
inalcançável pelo navegador.

Três escolhas de desenho:

1. **Favo travado aparece, e diz o que falta.** "Conclua 80% do favo anterior",
   "você precisa de 500 de patrimônio". Esconder tiraria a régua de progresso, e
   o design system já manda isso na loja: item bloqueado mostra o que falta,
   nunca só cadeado. Vale a RNF-25 junto — estado é ícone e palavra, não a cor
   cinza sozinha.
2. **O desktop tem composição própria.** Acima de `md` a trilha divide a tela com
   um painel fixo do favo atual, em vez do layout de celular centralizado que a
   L-6 da auditoria da E04 apontou na tela de perfil. No celular, o "Continuar"
   é um botão flutuante, para não se perder no fim da rolagem.
3. **Não havia ícone de cadeado nem de estrela** em `src/public/img/`. Foram
   desenhados em SVG inline, no traço do sistema — o documento proíbe substituir
   asset por emoji. Se o time trouxer arte própria, a troca é no
   `favo-card.ejs` e no `favo.ejs`.

**O que ficou de fora, e por quê:** a RF-CON-05 (tela de resultado com estrelas,
XP, mel e pólen) está na mesma seção de requisitos, mas XP e mel só existem
depois da E06, e a tela de jogo é E07. Entregar uma tela de resultado agora seria
mostrar zero em três dos quatro números. O link "Jogar" aponta para
`/trilha/:id/celula/:id`, que é onde a E07 vai montar o jogo.

**O que não foi verificado:** as telas não foram abertas em navegador real. O
checklist visual foi conferido por leitura — tokens, foco de teclado,
`prefers-reduced-motion`, ícone junto de cor —, mas 320 px sem rolagem
horizontal e contraste medido pedem navegador, e isso fica para a auditoria da
etapa.

---

**E04 — onboarding e planejador de metas** (concluída e auditada em duas
passagens, guardada aqui como histórico). A E02 e a E03 também estão concluídas
e auditadas; o que ficou delas está na tabela de dívida, cada item com etapa
marcada.

| Tarefa | Situação |
|---|---|
| T-04.1 Auditar o onboarding existente e decidir o que reaproveitar | **feita** (commit `07bf3db`) — laudo em `docs/04-AUDITORIA-DO-ONBOARDING.md`, dois bloqueantes corrigidos |
| T-04.2 Máquina de passos com progresso salvo a cada passo | **feita** (commit `07bf3db`) — passo gravado no servidor, retomada em outro navegador, DT-28 e DT-29 fechadas |
| T-04.3 Persistir disponibilidade, faixa, tempo de sessão, objetivo e avatar | **feita** (commit `fd37b7f`) — tempo por sessão, som e animação coletados e gravados; avatar e objetivo conferidos contra o catálogo; DT-20 e DT-27 fechadas |
| T-04.4 `GoalPlannerService` conforme RN-014/015 | **feita** (commit `a818e70`) — metas geradas ao concluir o onboarding, repostas ao concluir uma meta e completadas ao abrir o painel; decisão D-4 resolvida com tabela própria |
| T-04.5 `requireOnboarding` bloqueando o app até concluir | **feita na T-02.4** (commit `4e6020c`) |
| T-04.6 Edição de disponibilidade no perfil, com recálculo (RN-013) | **feita** (commit `d72b18d`) — tela de perfil com os dias da semana, recálculo pelo planejador e expiração preguiçosa das metas vencidas |
| T-04.7 Testes do planner: 1, 4 e 7 dias, e edição de 5→2 dias com meta em andamento | **feita** (commit `d72b18d`) — 1, 4 e 7 dias em `test/integration/planejadorDeMetas.test.js`; a edição de 5→2 dias com meta em andamento em `test/integration/disponibilidade.test.js` |

**O que a T-04.1 achou e corrigiu na hora:** o servidor aceitava concluir o
onboarding com a semana inteira vazia, contra a RF-ONB-03 — e semana vazia é a
entrada da RN-014, que não tem faixa para zero dias. E `PUT /perfil/:id` aceitava
tempo de sessão de 5 a 60 minutos, enquanto o banco só admite 5, 10 ou 20
(`ck_profiles_session_minutes`): erro de formulário chegava ao jogador como 500.
As duas correções têm regra no service, barreira na rota e teste.

**O que a T-04.1 achou e deixou como dívida:** DT-27 (slug inválido de avatar ou
objetivo aceito em silêncio), DT-28 (o wizard monta HTML com valor do usuário
sem escapar) e DT-29 (barra de progresso fora do padrão `.barra-N` e sem
`role="progressbar"`). **A T-04.2 fechou a DT-28 e a DT-29, e a T-04.3 fechou a
DT-27** — as três estão pagas. A decisão D-4 do laudo — onde mora a tabela "dias
da semana → quantas metas ativas" — precisa ser tomada na abertura da T-04.4,
antes de a implementação começar.

**O que a T-04.2 entregou.** O wizard virou máquina de passos de verdade: cada
resposta vai para o servidor assim que é dada, e a coluna
`profiles.onboarding_step` (migration 011) guarda onde o jogador parou. Fechar a
aba deixou de custar o começo de novo — e, porque o rascunho mora no servidor e
não no navegador (decisão D-2 do laudo), quem começa no computador da escola
retoma em casa, no passo certo e com as respostas anteriores preenchidas. Há
teste para exatamente esse cenário, com um segundo navegador logando do zero.

Três escolhas de desenho que valem lembrar:

1. **O nível inicial não tem gravação por passo.** Ele lança XP no livro e é
   irreversível, então gravá-lo antes do fim deixaria contas com nível e sem
   agenda se o jogador desistisse. É o passo final, e quem o grava é a transação
   de `salvarOnboarding`, como antes.
2. **Gravar passo não marca a conta como configurada.** A marca continua em
   `users.onboarding_completed_at`, escrita só na conclusão, então
   `requireOnboarding` segue barrando o app durante o preenchimento — que é o
   comportamento certo para um onboarding pela metade.
3. **O marcador só anda para frente** (`GREATEST` no `UPDATE`): revisar uma
   resposta com o botão "Voltar" regrava o campo, mas não devolve o jogador ao
   começo na próxima vez que ele abrir a tela.

A ordem dos passos passou a ser a da RN-011 — na T-04.2, apelido, dias,
objetivo, mascote e nível; a T-04.3 encaixou tempo por sessão depois dos dias e
preferências antes do nível, fechando sete passos. Sem faixa etária (decisão D-1:
ela vem da data de nascimento) e com o nível no fim (decisão D-3).

**O que a T-04.3 entregou.** O wizard tem sete passos e coleta, enfim, tudo que a
RN-011 e a RN-050 pedem: entraram **tempo por sessão**, na posição que a regra lhe
dá, e **preferências de som e animação**, antes do nível. As três colunas já
existiam em `profiles` desde a migration `001` e ficavam no padrão para sempre,
porque nenhuma tela as escrevia — era a DT-20, aberta desde a auditoria da E02.
Disponibilidade e faixa etária, que o título da tarefa também cita, já estavam
persistidas (a agenda desde a T-04.2, a faixa desde o cadastro, pela decisão D-1);
nesta tarefa elas ganharam cobertura de teste, não código novo.

Quatro coisas que valem lembrar:

1. **As durações de sessão passaram de três para cinco.** Eram 5, 10 e 20
   minutos; agora são 5, 10, 20, 30 e 45. Foi decisão de produto tomada no
   checkpoint de abertura desta tarefa — o jogador mais velho quer uma sessão de
   estudo inteira, não duas visitas ao app. Mexeu em quatro lugares: a migration
   `012_session_minutes_opcoes.sql` reabriu o CHECK do banco, o service e o
   validador da rota atualizaram a lista, e o texto da **RN-011 foi reescrito**
   em `docs/01-REQUISITOS-E-REGRAS.md`, com a mudança registrada ali. Fica o
   registro de que 45 minutos é sessão longa para a faixa A (6 a 8 anos): se um
   dia as durações longas tiverem de ser limitadas por faixa, o lugar é a E07.
2. **A DT-27 morreu com o `COALESCE`.** O repository resolvia avatar e objetivo
   por slug com `COALESCE(subconsulta, valor_atual)`, que confunde "não existe"
   com "não informado": slug inventado caía no valor anterior e a gravação
   passava por bem-sucedida — numa conta nova, sem valor anterior, o onboarding
   terminava "com sucesso" e o perfil ficava sem mascote e sem objetivo. Agora um
   `CASE` distingue os dois casos, e quem confere o slug é o service, contra o
   catálogo lido do banco. Na rota, `avatar` deixou de ser `optional()`: a
   RF-ONB-06 é obrigatória e a rota a tratava como opcional.
3. **As opções saíram do JavaScript e vieram do banco.** Avatar, objetivo, tempo
   e preferências viajam no rascunho, no mesmo `dataset` do body. Eram duas
   listas para manter em sincronia — a do wizard e a do servidor — e nenhuma
   delas era conferida ao gravar. Acrescentar um mascote agora é seed, não é
   mexer no front; o caminho da imagem vem junto, então a tela também não
   adivinha nome de arquivo.
4. **O passo de preferências aceita resposta vazia.** É o único: desmarcar tudo
   é uma escolha legítima — sem som e com a animação normal —, e tratá-la como
   "não respondeu" prenderia o jogador na tela. Tempo e preferências têm padrão
   no banco, então voltam sempre preenchidos no rascunho, com o padrão marcado.

**O que a T-04.4 entregou.** O `goalPlannerService` existe, e as metas deixaram
de depender de o jogador escrever uma à mão. Ao concluir o onboarding (RF-ONB-07)
ele recebe o conjunto que a RN-014 manda; ao concluir uma meta, outra nasce no
lugar (RN-016); e toda visita ao painel completa o que faltar, de modo que a
conta nunca fica sem meta ativa (RN-018).

**A decisão D-4, que estava travando a tarefa desde o laudo do onboarding, foi
resolvida a favor de tabela própria.** A migration `013` criou `goal_plan_rules`
— faixa de dias, quantidade de metas e a dificuldade correspondente — em vez de
pendurar colunas em `goal_difficulties`. As duas coisas parecem uma só hoje,
porque cada faixa de dias corresponde a exatamente uma dificuldade, mas são
assuntos diferentes: uma diz o que a dificuldade vale, a outra diz que ritmo de
jogo ela atende. Nenhum número da RN-014 ficou em código.

**Como o tamanho do alvo é decidido, e por quê.** O checkpoint pediu que a
escolha fosse calibrada pelo que plataformas infantojuvenis consagradas fazem, em
vez de um número inventado. Os princípios aplicados, e o que cada um virou:

| Princípio | O que virou no código |
|---|---|
| A meta é dimensionada pelo tempo que a pessoa **disse** ter | O alvo sai de `dias × minutos por sessão × semanas do prazo` — os dois campos que a T-04.3 passou a coletar |
| Nunca nasce já cumprida nem impossível | O alvo é absoluto e parte do valor de hoje; e só entra no sorteio o tipo que o sistema sabe medir |
| Alvo legível | Arredondamento para múltiplo de 25 no mel, degraus inteiros no nível |
| Piso e teto, para o desafio ficar na faixa em que a criança vence | `min_increment` e `max_increment` por tipo, em `goal_target_rules` |
| Calibragem se acerta jogando | Todos os números em seed; mudar o ritmo é rodar `db:seed`, não fazer deploy |

Na prática: 2 dias × 10 min recebe 1 meta de 28 dias pedindo 200 de mel; 6 dias ×
20 min recebe 3 metas de 7 dias, a primeira pedindo 300. Cada uma proporcional ao
que aquele jogador de fato joga, em vez da mesma meta para os dois.

**O sorteio pergunta antes de escolher.** Dos sete tipos de meta semeados, o MVP
sabe medir dois — mel acumulado e nível. Patrimônio, favo, células, sequência e
cofre chegam na E05, na E08 e na E09, e uma meta dessas hoje ficaria parada em
zero para sempre. O planejador cruza os tipos que têm régua de alvo com os que
têm fonte de progresso e sorteia só na interseção; quando as etapas seguintes
entregarem suas fontes, **o leque abre com uma linha de seed, sem tocar no
planejador**. A tabela de fontes saiu do `goalsService` para
`src/services/goalProgressSources.js`, porque agora duas partes a leem por
motivos diferentes.

Duas consequências que ficaram registradas como dívida, e não escondidas: a
calibragem dos alvos é um chute educado enquanto a economia de verdade (E06 e
E07) não existir — **DT-31** —, e a meta de nível só se torna alcançável quando
a E06 creditar XP em jogo, porque hoje nada credita — **DT-32**.

**O que a T-04.6 e a T-04.7 entregaram.** A semana deixou de ser uma resposta
dada uma vez só no onboarding. A tela `/perfil` mostra os dias marcados e as
metas de agora, e salvar uma semana nova passa pelo planejador (RF-ONB-09,
RN-013, RN-017). O caso que faltava nos testes do planner — reduzir de cinco
para dois dias com meta em andamento — está coberto em
`test/integration/disponibilidade.test.js`, junto com a tela renderizando, a
recusa de semana vazia, a meta vencida expirando sem pagar e o plano se
recompondo quando o jogador volta a marcar dias.

Duas decisões que o código carrega:

1. **Reduzir os dias não cancela meta nenhuma.** O jogador fica com mais metas do
   que a faixa nova pede, e elas seguem ativas, com o progresso intacto, até
   vencer; quem não concluir no prazo apenas não é recompensado. Cancelar seria
   punir quem mudou de ideia sobre a própria agenda, que é exatamente o que a
   RN-013 proíbe. Aumentar os dias completa o plano na hora.
2. **A expiração é a outra metade dessa decisão.** Sem ela, a meta excedente
   ficaria ativa para sempre e o plano nunca voltaria ao tamanho da faixa.
   `expirarVencidas` roda de forma preguiçosa — na visita ao painel e ao perfil,
   antes de o plano ser completado — em vez de depender de um agendador que o
   MVP não tem.

---

**E02 — núcleo da aplicação, reordenada** (concluída e auditada, guardada aqui
como histórico). O roadmap original mandava construir config, logger, error
handler e middlewares, que já existem desde a migração para camadas (divergência
D-06). A ordem real foi decidida no checkpoint de abertura da E02.

| Tarefa | Situação |
|---|---|
| T-02.1 Arnês de teste com banco real + asserções de integridade | **feita** (commit `b9d9f84`) |
| T-02.2 Realinhar os 13 repositories ao schema novo, com teste de integração para cada | **feita** (commits `c061fa7` e `2270762`) |
| T-02.3 Realinhar services e controllers que dependem deles | **feita** (commit `3680c31`) |
| T-02.4 `requireOnboarding` como middleware | **feita** (commit `4e6020c`) |
| T-02.5 Request-id no logger | **feita** (commit `8510dd3`) |
| T-02.6 `AuditService` com API única, gravando em `audit_logs` | **feita** (commit `0bedb04`) |
| T-02.7 Layout EJS base | **feita** (commit `c687c6f`) |
| Auditoria da etapa + correção dos bloqueantes | **feita** (commit `27bdc8b`) |

A T-02.3 devolveu a aplicação ao ar.

**O que a T-02.2 mudou de contrato**, e que a T-02.3 vai ter que absorver — não
é rename, é semântica:

1. **`inventory` perdeu a quantidade.** Uma linha por unidade, porque cada
   unidade tem valor atual, ciclos em atraso e venda próprios.
   `adicionarOuIncrementar` deixou de existir; agora é `adicionar`.
2. **`tasks` não pertence mais a uma meta.** É do usuário e nasce de um
   `task_type`, que carrega título, alvo e recompensa. Progresso é contagem até
   o alvo, não porcentagem — some `listarPorMeta`.
3. **`schedules` mudou de assunto.** Era o balde de metas, virou a
   disponibilidade semanal (dias 0–6). A meta aponta para o usuário direto, e o
   `cronogramaService` perde a razão de existir na forma atual.

### Roadmap (`docs/02-ROADMAP-ETAPAS.md`)

| Etapa | Situação | O que falta |
|---|---|---|
| E01 Banco | **concluída e auditada** | T-01.1 a T-01.8 entregues, 12 de 12 no checklist de aceite, mais os 5 itens que a auditoria da etapa apontou: auditoria imutável, reconciliação completa, seed que não apaga trabalho de admin, `iniciar-proj.md` atualizado e script de backup (RNF-19). O que sobrou virou DT-16 (E02), DT-04 (E06) e DT-17 (E05), cada um com dono |
| E02 Núcleo | **concluída e auditada** | T-02.1 a T-02.7, mais os dois bloqueantes que a auditoria encontrou. As lacunas não bloqueantes viraram dívida com etapa marcada |
| E03 Autenticação | **concluída e auditada** | T-03.1 a T-03.4 vieram prontas da E02; T-03.5 (consentimento do responsável, `c2f1eab`) e T-03.6 (dez casos de recusa e força bruta, `0a21cc9`) fecharam as tarefas. A auditoria (`docs/03-AUDITORIA-DA-ETAPA.md`) reprovou a primeira versão com dois bloqueantes e um alto — tomada de conta pelas rotas `/users/:id`, suíte presa ao dia da semana e barras de progresso apagadas pela CSP —, todos corrigidos |
| E04 Onboarding e metas | **concluída e auditada** | T-04.1 feita (`docs/04-AUDITORIA-DO-ONBOARDING.md`): requisito a requisito, veredito peça por peça e o contrato que o planner vai precisar ler. T-04.2 feita: máquina de passos com progresso salvo no servidor, na ordem da RN-011. T-04.3 feita: sete passos, tempo por sessão e preferências gravados, catálogo conferido. T-04.4 feita: **`GoalPlannerService`** gerando as metas da RN-014, com alvo dimensionado pelo tempo declarado. T-04.5 já veio pronta da T-02.4. T-04.6 e T-04.7 feitas (`d72b18d`): a semana virou editável no perfil, sem custar progresso, e o caso de 5→2 dias com meta em andamento está coberto. **As sete tarefas estão entregues e a auditoria (`docs/04-AUDITORIA-DA-ETAPA.md`) aprovou sem bloqueantes; três das oito lacunas já foram fechadas** |
| E05 Conteúdo e trilha | **em andamento** | T-05.1 feita: os quatro repositories da trilha. T-05.2 feita: `contentService` com os estados de desbloqueio. T-05.3 feita: `progressService` traduzindo erros em estrelas. T-05.4 feita: as duas telas da trilha, com porta de entrada na Colmeia. Faltam T-05.5 e T-05.6 |
| E06 Motor de recompensas | do zero na prática | Ver seção 5, dívida DT-03 |
| E07 Jogos | do zero | Base pronta: `jogo`/`conteudo` seedados e `sessaoJogoRepository` |
| E08 Metas e sequência | parcial | Sem streak, geração automática ou expiração |
| E09 Economia | parcial | Loja e inventário prontos; sem patrimônio, cofre, ciclos econômicos, upgrades |
| E10 Colmeia | parcial | `painel.ejs` existe, mas não é a Colmeia de RF-HOM |
| E11 Landing | parcial | Tokens existem; faltam as seções, animações e as fontes auto-hospedadas |
| E12 Admin | do zero | Uma única rota admin no sistema (`GET /users`) |
| E13 Conquistas e liga | do zero | P1, cortável |
| E14 Endurecimento | do zero | Sem `.github/workflows/` |
| E15 Documentação TCC | do zero | — |

---

## 5. Dívida técnica

Identificadores rastreiam os documentos da E00.

| ID | Dívida | Origem | Tratamento previsto |
|---|---|---|---|
| ~~DT-01~~ | ~~Fases 1–3 não commitadas~~ | R-03 | **Resolvido em 2026-08-17**: commits `c428ba3`, `a2e596b`, `a5f5e9b`, `4898fa3`. Working tree limpo |
| DT-02 | `npm run lint` falha com 3242 erros, **todos** de `.claude/skills/**` e `.github/skills/**` | D-08 | Uma linha de `ignores` no `eslint.config.js`. Bloqueia usar lint como portão de CI |
| DT-03 | Loop de recompensa pela metade: `coinsService.creditar` existe desde a T-02.3 e a tarefa concluída paga mel e pólen. Continua sem quem credite **XP em jogo** — nenhuma recompensa do MVP declara XP | M-02, D-03 | E06 |
| ~~DT-04~~ | ~~`XP_POR_NIVEL = 1000` e `PONTOS_POR_TAREFA_CONCLUIDA = 10` em constante~~ | C-03, auditoria da E01 (L-03) | **Resolvido na T-02.3**: a curva de nível é lida de `levels` e a recompensa da tarefa vem de `task_types`. Nenhuma das duas constantes existe mais. Falta ainda o consumo de `reward_configs` pelo motor de recompensas (E06) |
| ~~DT-05~~ | ~~Negociação de conteúdo copiada 9 vezes em 6 controllers~~ | P-01 | **Resolvido na T-02.3**: `querJson` em `src/utils/resposta.js` |
| DT-06 | Três padrões diferentes de contrato entre rotas equivalentes | C-03 | Padronizar na E02 |
| ~~DT-07~~ | ~~Dois guardas de autenticação com a mesma regra, um deles dentro de `src/routes/index.js`~~ | P-04, C-01 | **Resolvido por inteiro na T-02.4**: o guarda saiu do arquivo de rotas na T-02.3 e foi absorvido por `requireOnboarding`/`requireOnboardingPendente`, que respondem conforme o cliente — redirecionamento para HTML, código de erro para JSON |
| DT-18 | Compra não é idempotente: dois cliques rápidos criam duas compras e debitam duas vezes. `idempotency_keys` existe no schema, semeada, e não é usada por ninguém | auditoria da E02 | E06 — é onde o motor de recompensa e a economia ganham dono |
| DT-19 | `reward_configs` (54 linhas semeadas) não é lida por nenhum service. Ela é indexada por tipo de jogo, faixa e estrelas, então só ganha uso quando a célula existir | auditoria da E02 | E06/E07 |
| ~~DT-20~~ | ~~Onboarding não coleta tempo por sessão nem preferências de som e animação, que a RN-011 e a RN-050 pedem~~ | auditoria da E02 | **Resolvida na T-04.3**: os dois passos entraram no wizard e gravam em `session_minutes`, `is_sound_enabled` e `has_reduced_motion`. As durações passaram a ser cinco (5, 10, 20, 30 e 45) por decisão de produto tomada no checkpoint da tarefa, com migration `012` e reescrita da RN-011 |
| DT-21 | O passo manual de progresso de tarefa é ponte: o progresso de verdade vem de `cell_completed`, `vault_deposit` e `active_days`, que não existem. Enquanto isso, "deposite 50 de mel no cofre" se cumpre sem depositar nada | auditoria da E02 | E07/E08 |
| DT-23 | A virada do dia usa o relógio do servidor: `tasksService.garantirTarefasDoDia` chama `new Date()` cru, enquanto a RN-024 manda usar o fuso do perfil (`profiles.timezone`, já gravado no onboarding). Quem estiver em fuso diferente recebe as tarefas do dia na hora errada — e a sequência vai herdar o mesmo defeito, porque a RN-021 depende da mesma virada | dúvida levantada na revisão da E02 | **E08**, junto da sequência: as duas dependem da mesma noção de "dia do jogador" e devem ser resolvidas de uma vez |
| DT-22 | Nenhuma tela foi aberta em navegador real desde o layout base: 320 px, foco de teclado, contraste AA e 60 fps seguem não verificados | auditoria da E02 | E11 |
| DT-08 | Cobertura de service ainda indireta: `purchasesService`, `tasksService`, `goalsService`, `coinsService`, `pointsService`, `profilesService` e `authService` são exercitados pelo teste de fluxo, mas não têm teste próprio de caso de borda | D-12 | Contraria a seção 8 do `PROMPT-MESTRE`; cobrir junto de cada etapa |
| DT-09 | Dependência `cors` instalada e nunca importada | M-04 | Remover |
| DT-10 | Fontes Lilita One e Nunito não são servidas; ambos os papéis caem em `system-ui` | T-00.3, seção 5 | E11 |
| ~~DT-11~~ | ~~`header.ejs` e `footer.ejs` usados por 2 de 9 páginas; sem motor de layout~~ | T-00.2 | **Resolvida na T-02.7**: `views/layout.ejs` monta todas as páginas, sem dependência nova |
| DT-12 | Página de edição de perfil não existe; erro 422 de formulário cai na página de erro genérica em vez de voltar ao campo | herdado | E03/E04 |
| DT-13 | Sem workflow de CI (`.github/` só tem arquivos de plugin) | D-10 | E14 |
| DT-14 | Sem catálogo administrável de itens (criar/editar); catálogo vem do seed | herdado | E12 |
| DT-15 | `.env.example` não documenta `DB_ROOT_PASSWORD`, usada pelo `docker-compose.yml` | T-00.5 | Uma linha; formalizado na T-14.4 |
| ~~DT-16~~ | ~~Nenhum teste automatizado cobre o banco~~ | auditoria da E01, L-01 | **Resolvido por inteiro**: 21 testes de schema na T-02.1, 93 de repository na T-02.2 e o fluxo autenticado na T-02.3 |
| DT-24 | Rate limit de autenticação é por IP: numa sala de aula atrás de um IP só, dez erros de senha somados entre alunos diferentes trancam a turma por 15 minutos. O roadmap e o cabeçalho de `bruteForce.test.js` ainda descrevem `skipSuccessfulRequests` como se ele deixasse passar quem acerta a senha, e o próprio teste do arquivo prova o contrário | auditoria da E03 | E14 — junto do endurecimento; o texto errado sobre segurança sai antes |
| DT-25 | `PUT /users/:id` deixa o dono trocar senha e e-mail sem informar a senha atual. Uma sessão esquecida no computador da escola deixa de ser "mexeram no meu jogo" e vira "perdi a conta" | auditoria da E03 | E04 — junto da tela de edição de perfil (DT-12) |
| DT-26 | `normalizeEmail()` remove pontos e sufixos `+` de endereços do Gmail: dois e-mails reais e distintos podem colidir no 409 de duplicado, e o `guardian_email` guardado como prova de consentimento pode não ser o que o responsável digitou | auditoria da E03 | E14 |
| ~~DT-27~~ | ~~`profilesRepository.atualizar` resolve avatar e objetivo por slug com `COALESCE`: slug inexistente deixa a coluna `NULL` e o onboarding termina "com sucesso" sem avatar nem objetivo~~ | auditoria do onboarding (T-04.1) | **Resolvida na T-04.3**: o `CASE` distingue campo ausente de campo informado, o service confere o slug contra o catálogo antes de gravar, `avatar` deixou de ser opcional na rota (RF-ONB-06) e o comentário que afirmava que o banco recusava slug inválido saiu |
| ~~DT-28~~ | ~~O wizard monta cada passo com `innerHTML` interpolando o valor digitado~~ | auditoria do onboarding (T-04.1) | **Resolvida na T-04.2**: a tela é montada com a API do DOM (`createElement`, `textContent`, `setAttribute`), então o apelido digitado é texto e nunca marcação. Quem segura passou a ser o código, com a CSP atrás |
| ~~DT-29~~ | ~~A barra de progresso do onboarding é a única fora do padrão `.barra-N`, e sem `role="progressbar"`~~ | auditoria do onboarding (T-04.1) | **Resolvida na T-04.2**: a barra usa as classes `.barra-N` e anuncia `role="progressbar"`, `aria-valuenow`, `aria-valuemin` e `aria-valuemax`. Sobra a regra de arredondamento repetida no cliente, porque o navegador não importa `src/utils/barraDeProgresso.js` sem bundler — ver DT-30 |
| DT-30 | A regra de arredondamento da barra de progresso existe duas vezes: em `src/utils/barraDeProgresso.js`, para as páginas renderizadas no servidor, e em `src/public/js/onboarding.js`, para o wizard. São cinco caracteres de conta, mas duas cópias mesmo assim — o navegador não consegue importar de `src/utils` enquanto não houver bundler ou um módulo servido em `src/public` | T-04.2 | E11, junto do trabalho de front: ou um módulo compartilhado servido como estático, ou a barra do wizard passa a ser montada pelo servidor |
| DT-31 | A calibragem dos alvos das metas é um chute educado, não medição: `goal_target_rules` diz que uma sessão de 10 minutos vale 25 de mel, e as tarefas de hoje pagam mais ou menos isso — mas quem vai pagar de verdade são as células e os jogos, que ainda não existem. Uma meta escalada (a segunda ou a terceira do mesmo tipo no plano) pode estar acima do que a economia atual permite ganhar no prazo | T-04.4 | E07, quando os jogos pagarem; é editar seed e rodar, sem tocar em código |
| DT-32 | A meta de "atingir nível" é mensurável mas ainda inalcançável: nenhuma recompensa do MVP credita XP, então o nível não sobe e a meta fica parada. Ela não é meta impossível por desenho — é impossível por falta do motor de XP, que é o buraco conhecido da E06 | T-04.4 | E06, junto do motor de recompensa. Se atrasar, a saída é uma linha a menos em `goal_target_rules` |
| DT-33 | A RN-017 tem duas metades e só uma existe: a meta vencida entra em `expirada` sem punição, mas **a oferta de renovação — prazo estendido e recompensa reduzida em 50% — não foi construída**. Hoje a meta vencida simplesmente some das ativas e o planejador põe outra no lugar, então o jogador perde o trabalho já feito naquela meta específica sem a chance de retomá-la. É também a RF-MET-05 | auditoria da E04, L-2 | E06, junto do motor de recompensa, que é quem sabe calcular recompensa pela metade |
| DT-34 | O administrador não tem como calibrar o ritmo do jogo: `goal_plan_rules` e `goal_target_rules` só mudam rodando `db:seed`, que é deploy. É o poder que faz sentido dar ao admin sobre metas — **não** criar meta para um jogador específico, o que reabriria o furo da RN-014 pelo painel administrativo. Requisito ainda não escrito em `01-REQUISITOS-E-REGRAS.md` | correção de escopo da E04, 2026-08-18 | E12, junto do resto da área administrativa |
| DT-35 | O patrimônio que destrava favo (RN-028) conta só o inventário. A RN-045 diz que ele "na prática exige uso do cofre", e o cofre não existe: quando existir, `contentService` precisa somar as duas fontes, e um favo calibrado hoje ficará fácil demais | T-05.2 | E09, junto do cofre. A soma tem um lugar só — `contextoDoJogador` — então é mudança de uma linha |
| DT-17 | Conteúdo semeado só na faixa A: B e C não têm favo próprio. Pela RN-029 eles veem o conteúdo das faixas anteriores, então não quebra — mas não dá para testar a segmentação por faixa | auditoria da E01, L-07 | E05 |

### Riscos abertos

- ~~**R-01**~~ — **Encerrado em 2026-08-17.** A troca de schema derrubou a
  aplicação por duas tarefas, exatamente como previsto na T-00.1, e ela voltou
  na T-02.3 rodando contra o banco novo. O que fica de lição: o risco foi
  previsto, aceito e pago em parcelas anunciadas, sem surpresa — e a segunda
  parcela foi pior que a primeira (servidor sem subir, em vez de 500 numa
  rota), porque renomear arquivo quebra o carregamento inteiro do módulo.
  **Para voltar ao app funcionando antes disso:** restaure o dump em
  `backups/beever-antes-da-E01-*.sql` (ver seção 7).
- ~~**R-02**~~ — Encerrado em 2026-08-17: o servidor MCP `code-review-graph`
  respondeu normalmente na sessão da T-02.2, e o grafo foi reconstruído do zero
  (97 arquivos, 437 nós). O que fica de lição: o grafo envelhece em silêncio —
  ele estava seis dias e vários commits atrás do HEAD, e a resposta não avisa
  isso na cara. Reconstrua antes de confiar numa análise de impacto.
- ~~**R-03**~~ — Encerrado: as fases 1–3 estão commitadas.

---

## 6. Decisões travadas

Não reabrir sem motivo novo.

| Decisão | Onde foi registrada |
|---|---|
| `beever.sql` da raiz é a base da E01, reestruturado como DBA; `migrations/001` e `002` vão para `migrations/_legacy/` sem serem apagados | T-00.1, D-01 |
| Identificadores em inglês, comentários/docs/commits em português. Termos de produto (`mel`, `pólen`, `favo`, `patrimônio`) ficam no texto da interface e nos comentários, **não** nos nomes de tabela e coluna | T-00.1 decisão 3, detalhado em `00-MAPA-DE-NOMES-LEGADO.md` |
| Mapa completo `nome legado → nome novo`, tabela e coluna, para a E01 usar | `00-MAPA-DE-NOMES-LEGADO.md` |
| Nível do usuário fica em `user_levels`, uma linha por usuário; `levels` continua sendo a curva versionada, porque a RN-003 proíbe calcular nível por fórmula | checkpoint da E01 |
| Conteúdo dos jogos em JSON validado pela aplicação, com `version` no registro — não uma tabela por tipo de jogo | checkpoint da E01 |
| `purchases.total_price` é armazenado, não derivado: é registro contábil, mesmo motivo de `price_at_purchase` | checkpoint da E01 |
| Livros append-only são a verdade do saldo; `wallets`, `user_levels` e `vaults` são cache, atualizados na mesma transação e conferidos por `db:reconcile` | E01, resposta ao L-03 da auditoria da E00 |
| **E02 reordenada**: vira o realinhamento das camadas ao schema novo, porque o escopo original dela já estava construído. Lista aprovada no checkpoint e registrada em `02-ROADMAP-ETAPAS.md` | checkpoint da E02 |
| Testes de banco pulam sozinhos sem MySQL, mas `TESTES_DE_BANCO=1` (o `npm run test:db`, comando do CI) faz a ausência do banco virar falha | checkpoint da E02 |
| `docs/PROMPT-MESTRE.md` prevalece sobre `CLAUDE.md` em caso de conflito | esta sessão |
| Perfil é 1:1 com usuário; a tela de seleção de perfil estilo Netflix não é recriada | sessão de 2026-08-12 |
| Admin é tabela própria (`admin`), verificada por join, não coluna de tipo no usuário | migration `001` |
| `compra` guarda `preco_unitario` e `preco_total` do momento da compra; nunca recalcula | migration `001` |
| Sem ORM: runner de migration próprio, prepared statements na mão | `CLAUDE.md` |
| Código morto com destino conhecido (`sessaoJogoRepository`, `creditarXp`, assets do mascote) fica onde está | T-00.3 |
| O rascunho do onboarding mora no servidor (`profiles.onboarding_step` mais as colunas de cada campo), não em `localStorage`: rascunho no navegador não sobrevive a trocar de aparelho | T-04.1 decisão D-2, implementada na T-04.2 |
| A faixa etária **não** é passo do onboarding — vem da data de nascimento, porque decide regra econômica (RN-038) e segmentação de conteúdo (RN-029) e não pode ser autodeclarada | T-04.1 decisão D-1 |
| O passo "nível inicial" fica, embora a RN-011 não o preveja; quem precisa mudar é o documento de requisitos | T-04.1 decisão D-3 |
| As durações de sessão são cinco — 5, 10, 20, 30 e 45 minutos —, não as três originais. A RN-011 foi reescrita para refleti-lo, e o CHECK do banco foi reaberto pela migration `012` | checkpoint de abertura da T-04.3 |
| As opções de avatar, objetivo, tempo e preferências vêm do banco para a tela, no rascunho do onboarding; o wizard não guarda lista própria, e o service confere o que chega contra esse mesmo catálogo | checkpoint de abertura da T-04.3, fechando a DT-27 |
| **D-4 resolvida:** "dias da semana → quantas metas ativas" mora em tabela própria (`goal_plan_rules`), não em colunas de `goal_difficulties` nem em constante de código. As duas coisas coincidem hoje, mas respondem perguntas diferentes | checkpoint de abertura da T-04.4 |
| O alvo da meta é dimensionado pelo tempo que o jogador declarou (dias × minutos × prazo), é absoluto — "chegue a 300 de mel" — e vive preso entre um piso e um teto. Os números moram em `goal_target_rules`, para serem recalibrados depois do playtest sem deploy | checkpoint de abertura da T-04.4, a pedido do usuário, com os parâmetros usados por plataformas infantojuvenis |
| O planejador sorteia apenas entre tipos de meta que o sistema sabe medir. Abrir o leque conforme E05, E08 e E09 entregarem suas fontes é acrescentar linha em `goal_target_rules`, não mexer no planejador | T-04.4, implementando a RN-015 |
| Quando o jogador reduz a disponibilidade e passa a ter mais metas do que a faixa nova pede, **as excedentes não são canceladas nem apagadas: ficam ativas até vencer**. Quem não concluiu no prazo não é recompensado — o progresso feito é preservado, e a meta vencida apenas deixa de pagar, sem punição (RN-017). Isso é compatível com a RN-013, que proíbe perder progresso ao editar a semana | decisão do usuário na abertura da T-04.6 |

---

## 7. Armadilhas a lembrar

- `npm test` precisa do glob **entre aspas** (`"test/**/*.test.js"`). Passar o
  diretório falha com "Cannot find module".
- `src/public/css/app.css` é **gerado** e está no `.gitignore`. Sem
  `npm run css:build`, as páginas vêm sem estilo.
- **Nunca interrompa a suíte de banco com `kill -9`.** Aconteceu na T-04.2: o
  `node --test` foi morto no meio de um `CREATE DATABASE`, e o MySQL ficou com
  seis diretórios de schema em `/var/lib/mysql/beever_teste_*` sem registro no
  dicionário de dados. A partir daí, toda execução travava por minutos e
  terminava em `ER_SCHEMA_DIR_UNKNOWN` — "schema does not exist, but schema
  directory was found. This must be resolved manually". Dois agravantes: matar o
  processo pai deixa os **filhos** vivos (um por arquivo de teste), segurando os
  bancos; e o sintoma não parece erro, parece lentidão. Prefira `Ctrl+C`. Se já
  aconteceu, mate os filhos também
  (`ps -eo pid,cmd | grep "node test/"`) e remova as cascas vazias com
  `docker exec beever-mysql sh -c 'cd /var/lib/mysql && rmdir beever_teste_*'` —
  `rmdir`, nunca `rm -rf`, porque ele se recusa a apagar diretório com conteúdo.
- O seed se recusa a rodar com `NODE_ENV=production`.
- Migration nova deve ser pequena: o MySQL faz commit implícito em DDL, então o
  rollback do runner não desfaz tabelas já criadas.
- `npm run dev` usa `node --watch`, que às vezes **não recarrega
  controllers/services** depois de várias edições seguidas — views `.ejs`
  recarregam sempre, porque o EJS lê o arquivo do disco a cada render. Sintoma:
  404 ou `ReferenceError` numa rota que deveria funcionar. Solução: `Ctrl+C` e
  subir de novo. Dois `npm run dev` ao mesmo tempo não ajudam: só um fica na
  porta 3000, o outro morre calado (`ss -ltnp | grep 3000` mostra o dono).
- **Rota de página e rota JSON no mesmo path se escondem em silêncio** (404).
  Já foi bug real. Ao adicionar rota de página, conferir se o path não está
  montado duas vezes em `routes/index.js` — hoje `/loja` está, e só funciona
  pela ordem de declaração.
- **`LIMIT ?` não funciona com `execute` do `mysql2`.** O driver manda o
  parâmetro como texto e o MySQL responde `Incorrect arguments to
  mysqld_stmt_execute`. Use `limiteSeguro` de `src/utils/limite.js`, que devolve
  um inteiro com teto — é o único número que pode ir interpolado no texto do
  SQL, porque é gerado lá dentro e não vem de fora.
- **Testes de repository precisam de `test/helpers/ambiente.js` importado
  antes de qualquer módulo do projeto.** Ele aponta o pool para um banco de
  teste próprio do arquivo. Se os imports forem reordenados, o teste passa a
  escrever no banco de desenvolvimento.
- **O token de CSRF morre junto com a sessão regenerada.** Cadastro e login
  regeneram a sessão de propósito, então o token lido antes deles não vale
  depois. No navegador isso é invisível (a página seguinte traz o token novo);
  em script ou teste, é preciso reler de uma página após cada regeneração.
  Sintoma: 403 `Token CSRF inválido ou ausente` logo depois do cadastro.
- **Rota de página e rota JSON no mesmo caminho**: resolvido com
  `src/middlewares/somentePagina.js`, que faz a página passar a vez quando o
  cliente pede JSON. Ao criar uma página nova que também tem API no mesmo path,
  use-o — sem ele, uma das duas some sem erro nenhum.
- `git status` antes de assumir que algo está salvo.
- **`audit_logs` não aceita `UPDATE` nem `DELETE`** — nem pelo root, sem
  desabilitar os gatilhos da migration `008` de propósito. É a RNF-17
  funcionando, mas surpreende na primeira vez: linha de auditoria criada em
  teste fica lá. Para limpar, só recriando o banco com `db:reset`.
- **O banco de desenvolvimento foi recriado do zero na E01.** O anterior está em
  `backups/beever-antes-da-E01-*.sql` (pasta ignorada pelo git, porque tem dados
  reais e hashes de senha). Para restaurar e ter o app de pé de novo:
  `docker compose exec -T mysql mysql -uroot -proot < backups/<arquivo>.sql`.
  Depois disso, `npm run db:migrate` volta a acusar migration pendente — o banco
  restaurado tem o histórico antigo em `schema_migrations`.

---

## 8. Documentos da E00

| Documento | Conteúdo |
|---|---|
| `docs/00-AUDITORIA-DIVERGENCIAS.md` | T-00.1 — 14 divergências, 3 riscos, mapa etapa a etapa |
| `docs/00-INVENTARIO.md` | T-00.2 — rotas, camadas, views, migrations, assets |
| `docs/00-CODIGO-MORTO-E-DUPLICADO.md` | T-00.3 — código morto, duplicação, desvios de camada |
| `docs/00-MAPA-DE-NOMES-LEGADO.md` | Decisão de checkpoint — nomes de tabela e coluna, legado → novo |
| `docs/01-AUDITORIA-DO-SCHEMA.md` | T-01.1 e T-01.2 — diferenças, riscos e conflitos do schema |
| `docs/MODELO-DE-DADOS.md` | T-01.7 — o banco explicado, com diagramas ER e rastreabilidade regra → tabela |
| `docs/04-AUDITORIA-DO-ONBOARDING.md` | T-04.1 — onboarding requisito a requisito, veredito peça por peça e o contrato do `GoalPlannerService` |
| `docs/04-AUDITORIA-DA-ETAPA.md` | Auditoria da E04 — RF-ONB-01 a 09 e RN-011 a 018 com arquivo e teste que provam cada um, oito lacunas em ordem de risco, veredito "pode avançar" |

**Correção de escopo, 2026-08-18: o jogador não cria mais meta.** A tela de
metas tinha um formulário "Nova meta" — título, alvo em mel e prazo — herdado da
fase anterior ao planejador. Nenhum dos sete RF-MET dá esse poder ao jogador: os
requisitos falam em gerar pela disponibilidade, listar, acompanhar, pagar,
expirar, recalcular e historiar. Pior, escolher o próprio alvo e prazo furava a
RN-014 inteira — dificuldade, prazo e recompensa proporcional ao tempo
declarado. Sumiram o formulário, a rota `POST /metas`, o controller e
`goalsService.criar`; `goalsRepository.criar` fica, porque é o planejador que
grava. Dar esse poder ao admin **não** foi feito, e é decisão registrada: o que
falta ao administrador é calibrar as regras (DT-34), não criar meta para um
jogador.

**Próxima tarefa:** T-05.1 — os repositories de favo, célula, conteúdo e
progresso, que abrem a **E05 (conteúdo e trilha)**. É a primeira etapa que
constrói o que o jogador de fato joga: hoje favo e célula não existem em lugar
nenhum fora do seed.

A E04 está **concluída e auditada** (`docs/04-AUDITORIA-DA-ETAPA.md`), em duas
passagens. A primeira aprovou com oito lacunas; a segunda, feita depois das
correções e desta vez reproduzindo o defeito em vez de só ler o código, achou um
**bloqueante que a primeira deixou passar**: o planejador tinha corrida.

Vale guardar o defeito, porque o padrão vai se repetir na E05: `montarPlano` lia
quantas metas faltavam e só depois criava, sem trava entre as duas coisas. Quatro
visitas simultâneas ao painel — dois cliques rápidos bastam — criavam 12 metas em
vez de 3, várias com **alvo idêntico**. Como o progresso é lido do saldo, um
único acúmulo de 125 de mel completava as quatro cópias e cada uma pagava
recompensa inteira: uma conquista, quatro pagamentos, contra a RN-016. A correção
é `SELECT ... FOR UPDATE` na linha do usuário, releitura das ativas na mesma
conexão e criação só do que ainda falta.

As onze lacunas das duas passagens: sete corrigidas (L-1, L-2 como DT-33, L-3,
L-9, L-10, L-11 e a higiene do L-7) e quatro abertas, todas de risco baixo e com
etapa marcada no laudo — a lista de metas que só atualiza ao recarregar, o foco
de teclado das caixas de dia, a largura da tela de perfil desalinhada do
cabeçalho e o tempo por sessão editável sem replanejar (atrelado à DT-12).

Duas coisas que a E05 vai precisar saber sobre o que a E04 deixou pronto:

1. **O planejador pergunta antes de sortear.** Ele só cria meta de tipo que tem
   régua de alvo em `goal_target_rules` **e** fonte de progresso conhecida em
   `goalProgressSources`. Quando a E05 entregar favo e célula, o leque abre com
   uma linha de seed e uma fonte nova — sem tocar no planejador.
2. **A expiração é preguiçosa**, e acontece quando o jogador abre o painel, a
   tela de metas ou o perfil, e ao trocar a semana. Não há rotina diária neste
   MVP; quem depender de status atualizado precisa chamar
   `goalsService.sincronizarProgresso` ou `expirarVencidas` antes de contar.
