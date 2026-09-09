# Arquitetura do sistema — T-15.3

Este documento registra as **decisões** de arquitetura do Beever e o porquê de
cada uma, no nível de quem precisa defender o TCC: uma escolha é o que se fez; a
arquitetura é o motivo pelo qual se fez assim e não de outro jeito.

A verdade de cada escolha é o código (`src/`) e os testes (`test/`), não este
texto. A figura das camadas está no diagrama de classes (seção 3 de
`docs/22-DIAGRAMAS-DO-TCC.md`), a rastreabilidade requisito → arquivo → teste
está em `docs/RASTREABILIDADE.md`, e cada seção aqui aponta para o requisito que
a sustenta.

---

## 1. Visão em uma figura

| Camada | Tecnologia | Onde mora | Por quê essa, e não outra |
|---|---|---|---|
| Cliente | Navegador, HTML renderizado no servidor | `src/views/`, `src/public/js/` | Interatividade de jogo só onde precisa; zero JavaScript como pré-requisito para a página abrir |
| Servidor HTTP | Node.js ≥ 20, Express 5 | `src/app.js`, `src/server.js` | Mesma linguagem da aplicação inteira; time pequeno mantém um ecossistema só |
| Regra de negócio | Services (módulos ES6) | `src/services/` | Testáveis sem servidor e sem banco |
| Persistência | MySQL 8, driver `mysql2`, prepared statements | `src/repositories/`, `migrations/` | Fonte da verdade relacional, CHECK/UNIQUE de verdade |
| Sessão de login | `express-session` com repositório MySQL | `src/config/session.js` | Sessão compartilhada entre instâncias = stateless (RNF-38) |
| Estilo | Tailwind CSS 4, CLI, gerado na build | `src/styles/`, `src/public/css/app.css` | Sem runtime de CSS no navegador; `app.css` é compilado e versionado fora do git |
| Auditoria operacional | `pino` + tabela `audit_logs` | `src/config/logger.js`, `migrations/006` | Log estruturado para operação; trilha auditável no banco para compliance (RN-010) |

Stack completa com versões em `package.json`. Contas: **não há contêiner de
serviço além do MySQL** — o Node roda como processo (desenvolvimento) ou dentro
do mesmo contêiner da aplicação (Docker, RNF-37).

---

## 2. Por que camadas (MVC + Service + Repository)

Fluxo único, em uma direção, sem atalhos:

```
route → controller → service → repository → MySQL
                  (view renderizada pelo controller)
```

- **Rota**: declara o verbo, o caminho e os middlewares (validação, sessão,
  limite). Não monta SQL, não calcula recompensa.
- **Controller**: traduz `(requisição, resposta)` em chamada de service e
  decide o formato — renderiza EJS ou devolve JSON conforme o cliente pedir
  (`middlewares/somentePagina.js`).
- **Service**: toda a regra de negócio, zero SQL. É aqui que XP, pólen e mel
  são decididos, nunca acima (RN-007, RNF-27).
- **Repository**: único lugar onde existe SQL, sempre com prepared statements
  e `pool.execute`.
- **MySQL**: o estado. As constraints — `CHECK`, `UNIQUE`, `FOREIGN KEY`,
  gatilhos — são a rede final que o código não pode furar.

A RNF-27 exige exatamente esse desenho, e ele é defendível por três motivos de
sênior:

1. **Testabilidade.** Service puro de cálculo é testado sem HTTP e sem banco —
   é o que permite a RNF-28 medir 100% de linha com confiança. Se a regra
   estivesse dentro do controller, o teste dependeria de `supertest` até para
   somar XP.
2. **Troca de cliente sem troca de negócio.** Controller pronto para devolver
   JSON na mesma rota que renderiza página significa que uma futura SPA ou
   aplicativo mobile reutilizam o backend inteiro sem reescrever uma linha de
   service.
3. **Conceito único de camada num time pequeno.** Quem entra no projeto lê a
   regra de onde os dados saem (repository) até onde a tela os mostra (view)
   sem surpresa — o diagrama de classes (seção 3 do `docs/22`) é a planta que
   bate com o código.

**A alternativa rejeitada:** colocar SQL no service (ou regra no controller).
Roda para o MVP, mas só até alguém precisar de segunda tela — aí a mesma regra
existe em dois lugares e passa a divergir. Foi o que o projeto encontrou no
código legado da E00 (`docs/00-AUDITORIA-DIVERGENCIAS.md`) e o que a
reestruturação eliminou.

---

## 3. Por que sem ORM

O Beever fala SQL direto, preparado na mão, com um runner de migrations
próprio (`scripts/migrate.js`). Decisão de RNF-27 e registrada como travada em
`CLAUDE.md` e na seção 6 do `ESTADO-DO-PROJETO`.

Por quê (sênior):

1. **O banco deste domínio faz escolhas que um ORM esconde.** Livros
   append-only com `balance_after` redundante de propósito, `SELECT ... FROM
   reward_reasons WHERE slug = ?` para nomear motivo de lançamento, `UPDATE
   wallets SET coins = coins - ? WHERE user_id = ? AND coins >= ?` para debitar
   só com saldo — tudo isso é SQL que expressa intenção contábil, não CRUD
   trivial. Um ORM genérico tornaria cada uma dessas operações uma luta contra a
   abstração.
2. **O custo de manutenção não aparece.** 23 migrations versionadas com
   checksum definem o estado do schema; o código de escrita é prepared
   statement puro, legível por leigo. Um ORM pouparia linhas de `INSERT`, mas
   custaria convenção nova (o mapeamento), e a equipe do TCC é pequena demais
   para manter duas linguagens.
3. **O código marca o que um ORM apagaria.** A guarda que rejeita nome de
   tabela/coluna vinda de fora (`walletsRepository.js`) e o limite seguro que
   impede `LIMIT ?` interpolar texto (`src/utils/limite.js`) mostram que a
   segurança de SQL é uma preocupação visível, não implícita.

**A alternativa rejeitada:** Sequelize/Prisma. Para o crescimento previsto
(seção 11), o ponto fraco do SQL na mão também não é o ponto crítico — e a
substituição de ORM seria a substituição menos arriscada do mundo, porque o
repositório é a fronteira exata onde ele viveria.

---

## 4. Por que EJS renderizado no servidor (e não SPA)

Defendendo a escolha:

1. **A página não espera JavaScript para existir.** A primeira pintura vem do
   servidor; o CSS é compilado e transportado; a criança abre a Colmeia e joga
   sem depender de um `bundle` baixar e executar. Grande parte das telas é
   literatura e botões — não há interatividade que justifique o custo de um
   framework de front-end.
2. **Os dois jogos interativos são ilhas JS de propósito.** Quiz, arrastar e
   classificar, listas suspensas e quadrinho são `public/js/` em páginas EJS
   comuns, com o gabarito fora do HTML (RN-007). Isso mantém o restante da
   aplicação simples e dá ao jogo a complexidade que ele já tinha.
3. **Escapamento por padrão.** `<%= %>` escapa tudo; o risco de XSS por
   conteúdo de usuário é uma escolha de template, não disciplina.
4. **Evolução preservada.** Como os controllers já respondem JSON (seção 2), a
   migração futura para SPA é adicionar consumo, não reescrever: a regra de
   recompensa nunca entra em template (proibição expressa do
   `docs/PROMPT-MESTRE.md`).

**A alternativa rejeitada:** React/Vue como renderizador primário. Sem backend
de API maduro, dobraria o tempo de construção do MVP para entregar valor
idêntico ao usuário final. Adiar não é negar: está em `docs/02-ROADMAP-ETAPAS.md`
(T-15.6) como trabalho futuro.

---

## 5. O banco desenhado para não deixar o código mentir

As três famílias de decisão de banco (detalhadas no `docs/03-BANCO-DE-DADOS-DBA.md`
e no `docs/MODELO-DE-DADOS.md`):

### 5.1 Livro é a verdade; saldo é cache

`xp_ledger`, `point_ledger` e `coin_ledger` são append-only: quem, quanto, por
quê, referência e **saldo depois** em cada linha. `wallets`, `user_levels` e
`vaults` são cache, atualizados na mesma transação do lançamento e conferidos
por `npm run db:reconcile` (sete conferências; RN-001, RN-010).

A consequência pedagógica e técnica é a mesma: **o extrato explica o saldo**.
Não existe "por que tenho 340 de mel?" — o caminho está no livro, linha por
linha.

### 5.2 Enum é tabela, não constante

`game_types`, `goal_types`, `reward_reasons`, `audit_actor_types`,
`inventory_statuses`, ... — acrescentar tipo ou estado é `INSERT`, nunca
migration destrutiva. O seed popula; o código valida contra o catálogo
(`walletsRepository.lancar` rejeita motivo sem a linha em `reward_reasons`).

### 5.3 A regra mora no banco quando dá

- `CHECK` barra mel, XP e pólen negativos; estrela fora de 0–3 (RN-030);
  duração de sessão fora do catálogo.
- `UNIQUE` torna a repetição detectável (`cell_progress.user_id + cell_id`) e a
  partida com token único inegável (`game_sessions.token` — RN-009).
- Gatilhos da migration `008` rejeitam `UPDATE`/`DELETE` em `audit_logs`
  (RNF-17) mesmo pelo root.
- Timezone e collation fixos em `database.js` para a virada do dia da RN-024
  sair certa.

---

## 6. O fluxo que não pode falhar (partida → três recompensas)

A conclusão de partida é o coração do sistema (diagrama de sequência, seção 4 do
`docs/22-`). Quatro garantias, cada uma com mecanismo e teste:

| Garantia | Mecanismo | Requisito | Teste |
|---|---|---|---|
| Nota calculada no servidor | gabarito do banco em `validadoresDeJogo`; navegador manda só respostas | RN-007 | `sessaoDeJogo.test.js` |
| Uma partida não credita duas vezes | `UNIQUE(token)` + chave de idempotência reservada na transação | RN-009, RNF-16 | `idempotencia.test.js` |
| As três recompensas caem juntas ou não caem | `emTransacao` (conexão emprestada percorre services) | RNF-15 | `sessaoDeJogo.test.js` |
| Toda alteração deixa rastro imutável | retrato antes/depois em `audit_logs`, gatilhos append-only | RN-010, RNF-17 | `auditoriaDeCreditos.test.js` |

A transação é implementada **passando a conexão emprestada de quem chama para o
service de saldo** (`consultarEm`, `emTransacao` em `src/config/database.js`) —
não existe "service de mel que abre a própria transação". É o que garante que
crédito parcial seja impossível: ou o `callback` inteiro commita, ou tudo
rola.

Sequência e conquistas ficam **fora** da transação de saldo de propósito: a
falha delas não deve desfazer o mel pago, e cada qual paga em transação própria
com `UNIQUE` do banco impedindo pagar duas vezes. A separação está explicitada
no `docs/06-AUDITORIA-DA-ETAPA.md`.

---

## 7. Segurança em profundidade (dentro do middleware, não na promessa)

| Ameaça | Defesa | Onde |
|---|---|---|
| Injeção SQL | prepared statements em tudo; `LIMIT` só por `limiteSeguro` | `src/config/database.js`, `src/utils/limite.js` |
| XSS | `<%= %>` (escape) em todo conteúdo de usuário; nunca `<%- %>` | `src/views/` |
| CSRF | `csrf` em toda rota de escrita (36 rotas conferidas) | `app.js`, varredura da T-14.1 em `docs/14` |
| Força bruta / abuso | cinco baldes de `express-rate-limit`, incluindo limite global por sessão na leitura (RNF-09) | `src/middlewares/rateLimiters.js` |
| Sessão roubada | cookie `httpOnly`/`secure`/`sameSite`; sessão em MySQL; `SESSION_SECRET` obrigatório | `src/config/session.js` |
| Dependência vulnerável | `npm audit` bloqueante no CI (RNF-14) + `overrides` de `mysql2` | `.github/workflows/ci.yml`, `package.json` |
| Cabeçalhos | `helmet` com CSP | `app.js` |
| Dado pessoal | coleta mínima (RNF-33), consentimento (RNF-34), hash de IP, mascaramento do dado pessoal na exibição, moeda fictícia (RNF-33 a 36) | `apelidoPublico.js`, `guardian_consents`, `mascararDadoPessoal` |

O laudo `docs/14-VARREDURA-DE-SEGURANCA.md` lista a varredura estática contra
interpolação em SQL, validador em rota de escrita e saída sem escape em view,
mais a varredura dinâmica das 36 rotas de escrita.

---

## 8. Entrega e operação

- **Stateless** (RNF-38): sessão no banco, uploads em volume, migrations num
  serviço separado do compose — a aplicação não guarda nada na memória, então
  réplica é `--scale`, não reescrita.
- **Docker multi-stage** (RNF-37): estágio de dependências instala uma vez,
  build compila o CSS, runtime poda as de desenvolvimento; usuário não-root,
  `HEALTHCHECK` no `/health`, `.dockerignore` para o contexto não vazar
  `.env`/`node_modules`/`backups/`. Detalhes e a conferência manual em
  `docs/17-CONTEINER-E-AMBIENTE.md`.
- **Configuração por variável de ambiente** com validação na inicialização
  (`src/config/env.js` recusa subir com segredo de exemplo em produção) e
  `.env.example` como contrato testado (`test/unit/ambienteDeConteiner.test.js`).
- **CI de cinco jobs** (RNF-40): lint + `npm audit`; suíte contra MySQL; 
  cobertura; carga só em `main`, sem reprovar; build da imagem conferindo o
  `/health`. `docs/18-INTEGRACAO-CONTINUA.md`.
- **Backup e restauração** diários com retenção que só apaga o que ela mesma
  cria, e restauração com simulador (`npm run db:restore -- --sim`).
  `docs/19-BACKUP-E-RESTAURACAO.md`.
- **Tempo de resposta (RNF-01) e 30 simultâneos (RNF-02)** medidos, não
  prometidos: pool em 20 por medição de carga. `docs/16-MEDICAO-DE-CARGA.md`.

O que ainda não é receita de produção está dito com o mesmo rigor: proxy reverso
com TLS é o passo seguinte, e a publicação de imagem em registro ficou para
depois do aceite (DT-116, `docs/17-` e `docs/18-`).

---

## 9. Como o sistema se prova (testes como evidência)

São 1081 testes na T-15.1 (número continua crescendo). A arquitetura decide *o
que* cada família prova:

| Família | Prova | Mecânica |
|---|---|---|
| Unitário de service | regra de cálculo correta (XP, pólen, mel, metas, patrimônio, juros, depreciação) | repository mockado; sem HTTP, sem banco |
| Integração de rota | o fluxo funciona de ponta a ponta, com sessão real | `supertest` contra servidor, banco de teste descartável |
| Cobertura da RNF-28 | **100% de linha** nos services de cálculo, catraca de ramo | `scripts/cobertura.js`, portão no CI |
| Concorrência | cinco conclusões paralelas da mesma partida pagam uma vez (RN-009); 30 jogadores simultâneos (RNF-02) | `idempotencia.test.js`, `cargaSimultanea.test.js` |
| Banco e schema | migrations idempotentes, reconcilição bate, auditoria imutável | `test/unit/rastreabilidade`, `test/integration/repositories/*`, `ambienteDeConteiner.test.js` |

Os testes de banco **nunca tocam o banco de desenvolvimento**: o arnês cria um
`beever_teste`, aplica migrations e seed, roda e apaga. Sem MySQL, a suíte pula
sozinha no modo local; o CI usa `npm run test:db`, que transforma ausência de
banco em falha.

Dei o veredito de arquitetura em `docs/15-COBERTURA-DE-TESTES.md`: quem
transforma resposta em número de erros (`validadoresDeJogo`) e quem guarda a
conta (`usersService`) estão dentro do portão, porque **service de cálculo é
quem produz o número, mesmo quando o número só vira recompensa uma camada
depois**.

---

## 10. Tabela de decisões (decisão → alternativa → porquê)

| Decisão | Alternativa rejeitada | Porquê |
|---|---|---|
| Camadas com repository único de SQL | SQL no service | testabilidade (RNF-28), troca de cliente sem reescrever, leitura única para time pequeno |
| Sem ORM, prepared statements na mão | Sequelize/Prisma | o domínio exige SQL contábil e guardas visíveis; a fronteira para trocar é exata |
| EJS server-rendered | SPA React/Vue | primeira pintura sem JS, escape por padrão, interatividade só onde precisa |
| Livro append-only como verdade | saldo como verdade | extrato explica saldo; `db:reconcile` confere o cache (RN-001, RN-010) |
| Enum é tabela | enum em constante | acrescentar valor é `INSERT`, nunca migration destrutiva |
| Transação por conexão emprestada | transação embutida no service de saldo | crédito parcial impossível (RNF-15) |
| Chave de idempotência + `UNIQUE(token)` | trava só em código | o banco não deixa nascer crédito duplo, mesmo no reset de bug (RN-009) |
| Auditoria imutável por gatilho | auditoria gravada por código | nem root apaga a trilha (RNF-17) |
| MySQL para sessão | sessão em memória | stateless compartilhado entre réplicas (RNF-38) |
| Sessão por sessão na leitura, IP na escrita | um balde só | sala de aula sai de um IP (RNF-02 medido com limitadores ligados) |
| Node.js + Express | NestJS hoje, Go amanhã | carga atual sobra para Express; adotar framework/convenção a mais agora é custo sem retorno |
| Tailwind na build, sem runtime | CSS manual ou lib de runtime | zero JavaScript para estilo; modelo de votos simples de CSS |

---

## 11. Por que isso escala sem reescrever

Cada escolha de hoje deixa uma porta aberta de amanhã (diretriz do
`CLAUDE.md`): a porta **não é construída** — só não é trancada.

- **SPA/mobile**: controllers já devolvem JSON; o backend de recompensa é
  reutilizado sem tocar.
- **NestJS na API**: se o Express deixar de dar conta, NestJS é a mesma
  linguagem e mesma base Express/Fastify — a troca reformula a casa, não muda o
  terreno.
- **Redis na sessão**: `express-session` troca de repositório; a lógica de login
  não muda.
- **Banco**: MySQL continua suficiente; o que cresce é o schema, e migrations
  versionadas mantêm o crescimento reprodutível.
- **Progresso do jogador**: IA de recomendação de conteúdo e painel do
  responsável são camadas novas sobre os mesmos dados — não exigem mudança nos
  book de saldo nem na auditoria.

Este documento justifica o que **foi** feito. O que fica do outro lado de cada
porta — custo, risco e o que já habilita cada frente — está em
`docs/26-TRABALHOS-FUTUROS.md`, e não é repetido aqui.

---

## Referências

- `docs/01-REQUISITOS-E-REGRAS.md` — os RF/RNF/RN citados acima
- `docs/02-ROADMAP-ETAPAS.md` — (E15, T-15.3 e T-15.6)
- `docs/03-BANCO-DE-DADOS-DBA.md` e `docs/MODELO-DE-DADOS.md` — o banco
- `docs/22-DIAGRAMAS-DO-TCC.md` — figuras: classes (3a e 3b) e sequência (4)
- `docs/26-TRABALHOS-FUTUROS.md` — o que fica do outro lado das portas da seção 11
- `docs/RASTREABILIDADE.md` — requisito → arquivo → teste
- `docs/06-AUDITORIA-DA-ETAPA.md`, `docs/15-COBERTURA-DE-TESTES.md`,
  `docs/16-MEDICAO-DE-CARGA.md`, `docs/17-CONTEINER-E-AMBIENTE.md`,
  `docs/18-INTEGRACAO-CONTINUA.md`, `docs/19-BACKUP-E-RESTAURACAO.md`
- `docs/ESTADO-DO-PROJETO.md` — decisões travadas (seção 6)
- `CLAUDE.md` — a mesma arquitetura em forma de regra