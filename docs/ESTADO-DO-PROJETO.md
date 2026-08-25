# Estado do projeto

Verdade operacional do Beever. Substitui a versão de 2026-08-12, escrita antes
dos documentos de escopo `docs/01` a `docs/04` existirem.

**Atualizado em:** 2026-08-25 · **Branch:** `refactor/arquitetura-em-camadas` ·
**Último commit:** T-09.7 — a economia ganhou tela: a loja mostra patrimônio e
mel no topo e agrupa por categoria, a compra passa por uma confirmação que diz
para onde vai o patrimônio, o inventário separa bens de enfeites e o cofre tem
página com depósito, saque, meta, extrato e projeção. Árvore limpa, 634 testes
passando.
**Próximo passo: T-09.8 — aviso na Colmeia dos eventos do ciclo (RF-HOM-09)**

**Commit anterior:** T-09.6 — a Faixa A ganhou economia sem punição: custo fixo,
depreciação e inadimplência desligados por interruptor em `age_bands`, lidos num
ponto só (`profilesService.regrasEconomicasDoUsuario`) pelo ciclo e pela loja.

**Commit de antes:** T-09.5 — a semana passou a acontecer: `economicCycleService`
conta os ciclos pelo calendário do jogador e aplica os que faltam de uma vez, na
Colmeia, cada um na própria transação — valor, renda, custo fixo, venda forçada
por inadimplência e rendimento do cofre, nessa ordem.

**Antes disso:** T-09.4 — o cofre abriu: `vaultService` guarda e devolve mel
com extrato, rende 2% por ciclo sem pagar sobre o que foi sacado, paga o bônus
da meta e projeta as semanas à frente. A tarefa `depositar-no-cofre` foi
reativada (DT-43 paga).

**Antes disso:** T-09.3 — o patrimônio ganhou dono: `patrimonyService` soma
carteira, cofre e bens na hora (RN-039), com cosmético de fora, e apareceu no
topo da loja, na prévia da compra e no inventário.

**Antes disso:** T-09.2 — a loja virou service: `shopService` monta a vitrine
e a prévia da compra, e o upgrade passou a abater o valor do bem entregue,
gravando `price_at_purchase` e `discount_applied` na mesma transação.

**Antes disso:** T-09.1 — os repositories da economia abriram o schema que a
E01 já tinha: cofre com extrato, ciclo econômico idempotente, foto do
patrimônio, comportamentos do item e as operações de ciclo no inventário.

**Antes disso:** auditoria da E08 — o laudo está em
`docs/08-AUDITORIA-DA-ETAPA.md` e **as três lacunas de maior risco foram
corrigidas na mesma sessão**: o fuso do MySQL passou a ser fixado em UTC, três
tipos de meta ganharam fonte de progresso e a avaliação da sequência passou a
travar o jogador, para dois acessos simultâneos não queimarem dois escudos no
mesmo dia.

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
| Etapas do roadmap prontas | **6 de 16** — E00, E01, E02, E03, E04 e E05, todas auditadas |
| Endpoints · services · repositories | 34 · 19 · 17 |
| Testes | **349 passando, 0 falhando** (267 contra banco real) — fluxo autenticado ponta a ponta, onboarding completo e retomado em outro navegador, metas geradas pela RN-014, semana editada de 5 para 2 dias sem perder progresso, erro em produção, recusas de autenticação, força bruta e autorização por dono da conta |
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
| `npm test` | 349 passam, 0 falham. Sem MySQL, os 267 testes de banco se pulam com aviso |
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
| As telas de jogo em navegador real | O caminho inteiro do navegador foi percorrido na T-07.3 com a aplicação de pé e o usuário demo — página, `dataset`, token de CSRF, abertura da partida e pagamento —, e foi assim que os dois bugs do `dataset` apareceram. O mesmo caminho foi refeito na T-07.4, com a divisão do orçamento aceita e paga. O caminho foi refeito de novo na T-07.5 e na T-07.6, sempre com o servidor de pé — e foi ele que achou o botão "Jogar" mentindo e a regra errada da próxima célula. O que **ainda não** foi visto por olho humano é o gesto e o desenho: arrastar a carta com o mouse e com o dedo, o realce da caixa sob o cursor, a alternativa selecionada no quiz, o foco de teclado trocando de pergunta, **o gráfico do cofre** com suas barras e a linha da meta, **as estrelas do resultado aparecendo uma a uma** — e as quatro telas de jogo a 320 px, onde o orçamento de faixa C é o mais apertado, com cinco categorias, dois botões e um número por linha. É a DT-22 e a L-10 do laudo da E06 |
| O calendário da semana em navegador real (T-08.6) | A marcação está coberta por teste pelo HTTP — os sete dias no painel e nas metas, com data e desfecho em cada `aria-label` — e a legenda escrita foi conferida na resposta. O que **não** foi visto por olho humano é o desenho: o anel do dia de hoje sobre o mel do painel, a borda tracejada do dia que ainda vem, a faixa compacta a 320 px ao lado do nível e o contraste do ícone branco sobre o vermelho do dia perdido. Vale o mesmo passe da DT-22 |
| As quatro telas da economia em navegador real (T-09.7) | A marcação está coberta por teste pelo HTTP — patrimônio no topo, categorias, as frases do comportamento, o impacto da compra, bens separados de enfeites, depósito e meta pelo formulário — e o caminho inteiro foi percorrido com o servidor de pé e a conta demo. O que **não** foi visto por olho humano é o desenho: a rosca da composição e a linha da projeção pintadas no `canvas`, a vitrine a 320 px com três colunas virando uma, e o foco de teclado passeando pelos formulários do cofre. Vale o passe da DT-22 |
| A frase da faixa na loja (T-09.6) | A vitrine e a prévia da compra devolvem custo zero, `perdeValor` falso e a frase que explica para a Faixa A, com teste contra banco real. Como as telas da loja ainda estão no formato antigo (DT-57), nada disso chega à criança nem foi visto por olho humano: entra junto das views da T-09.7 |
| Os eventos do ciclo econômico (T-09.5) | Os seis ciclos de quem volta depois de seis semanas, a inadimplência, a venda forçada por 50% e o rendimento do cofre estão cobertos por teste contra banco real, e o resumo de cada ciclo é gravado em JSON. O que não existe é tela: nada disso aparece para a criança até a T-09.8 escrever o aviso na Colmeia, então o jogador hoje só vê o saldo mudar sem explicação |
| O duplo clique na loja, em navegador real | A idempotência da compra é provada por teste de service, com a mesma chave enviada duas vezes. O campo escondido do formulário e o comportamento do botão sob clique duplo de verdade não foram vistos em navegador |
| Valores de recompensa vistos na tela | O `rewardConfigsRepository` devolve XP, pólen e mel com teste contra banco real, mas nada credita ainda: a primeira tela a mostrar esses números é a de resultado, na E07 |
| Revisão do conjunto das fases 1–3 | Agora commitado em `a2e596b` (52 arquivos, +1525 linhas). A suíte passa, mas o conjunto nunca passou por revisão de código como um todo |

---

## 4. Pendente

### Etapa atual

**E09 — economia: loja, inventário, patrimônio e cofre.** É a etapa que fecha o
laço do jogo: o mel ganho na trilha passa a ter onde ser gasto, guardado e
perdido. O aceite é entrar depois de seis semanas sem acessar e receber todos os
ciclos de uma vez, com extrato claro e nada de saldo negativo.

| Tarefa | Situação |
|---|---|
| T-09.1 Repositories de item, compra, inventário e cofre | **feita** — o schema da economia já existia desde a E01 e estava sem porta: entraram `vaultsRepository`, `economicCyclesRepository` e `patrimonyRepository`, mais os comportamentos do item e as operações de ciclo no inventário |
| T-09.2 `ShopService`: requisitos, compra transacional com `price_at_purchase`, upgrades com desconto | **feita** — `shopService` responde a vitrine e a prévia de impacto, os requisitos passaram a ser avaliados em lote e a compra aceita a entrega de uma unidade como desconto |
| T-09.3 `PatrimonyService`: carteira + cofre + bens, com cosmético fora da conta | **feita** — a soma é feita na hora a cada chamada, a foto diária virou só gráfico, e o patrimônio entrou na vitrine, na prévia da compra, no inventário e no requisito `patrimonio-minimo` |
| T-09.4 `VaultService`: depósito, saque, rendimento por ciclo, meta e projeção | **feita** — depósito e saque numa transação com o cofre travado, extrato com saldo depois de cada linha, rendimento que desconta o sacado no ciclo, bônus de meta vindo de `reward_modifiers` e projeção como conta pura |
| T-09.5 `EconomicCycleService`: ciclos preguiçosos e idempotentes | **feita** — o número do ciclo sai do calendário do jogador, cada ciclo é uma transação com a marca antes dos efeitos, e a Colmeia processa o que ficou pendente antes de mostrar saldo |
| T-09.6 Regras por faixa: depreciação, custo fixo e inadimplência desligados na Faixa A | **feita** — os interruptores moram em `age_bands`, `regrasEconomicasDoUsuario` é o ponto único de leitura, e a inadimplência não ganhou coluna porque é consequência do custo fixo |
| T-09.7 Views: loja, confirmação com impacto explicado, inventário e cofre | **feita** — quatro telas: vitrine por categoria com patrimônio no topo, confirmação com endereço próprio, inventário separando bens de enfeites e a página do cofre inteira, todas funcionando sem JavaScript |
| T-09.8 Aviso na Colmeia dos eventos do ciclo | pendente |
| T-09.9 Testes: saldo insuficiente, compra dupla, seis semanas offline, item vendido por inadimplência, patrimônio no centavo | pendente |

---

**E08 — metas e sequência** (concluída e auditada, guardada aqui como histórico). A etapa junta três assuntos que dependem da mesma
noção de "dia do jogador": meta, sequência e tarefa. O aceite é simular três
semanas de uso e a sequência bater com a regra em todos os cenários.

| Tarefa | Situação |
|---|---|
| T-08.1 `GoalService`: progresso por evento, conclusão única, expiração e renovação | **feita** — três das quatro metades já existiam desde a E06; esta tarefa entregou a renovação (RN-017, RF-MET-05, dívida DT-33) e fechou um vazamento: meta fora de `ativa` não paga mais |
| T-08.2 `StreakService`: avaliação preguiçosa na primeira requisição do dia, com fuso e dias marcados | **feita** — três desfechos por dia (cumprido, perdido, neutro), avaliação idempotente por evento de dia, e a DT-23 paga junto: o dia do jogador sai de `profiles.timezone` |
| T-08.3 Consumo automático do Escudo de Sequência | **feita** — o dia perdido vira `protegido` quando há escudo, a unidade sai do inventário como `consumido` e o teto de dois da RN-022 é recusado antes de tirar mel |
| T-08.4 Marcos de sequência com bônus | **feita** — cinco conquistas seedadas, pagamento e desbloqueio na mesma transação, e a `UNIQUE (user_id, achievement_id)` como trava contra pagar duas vezes |
| T-08.5 `TaskService`: geração diária e semanal, no máximo 3 ativas | **feita** — expiração preguiçosa, teto de 3 ativas contando o que sobrou, progresso lido do evento e fim do passo manual (DT-21) |
| T-08.6 Views: painel de metas, calendário semanal de sequência, lista de tarefas | **feita** — `resumoDaSemana` entrega os sete dias prontos, o calendário é um partial usado nas duas telas, e cada desfecho vem com ícone e palavra, nunca só cor |
| T-08.7 Testes com tempo simulado: dia neutro, dia marcado perdido, escudo e virada de fuso | **feita** — o aceite da etapa virou um roteiro de 21 dias com o instante injetado, e o `nomeDoDia` que a T-08.6 criou ganhou teste próprio |
| Auditoria da etapa (`docs/08-AUDITORIA-DA-ETAPA.md`) | **feita** — veredito "pode avançar, zero bloqueantes"; as lacunas L-1, L-2 e L-3 foram corrigidas na mesma sessão e as sete restantes viraram dívida (DT-44 a DT-49) |

---

**E07 — jogos interativos** (concluída e auditada, guardada aqui como histórico).

A regra da etapa era uma tarefa por jogo, e cada jogo só ficava pronto com tela,
JavaScript na página, validação no servidor e teste. O laudo está em
`docs/07-AUDITORIA-DA-ETAPA.md`.

| Tarefa | Situação |
|---|---|
| T-07.1 Contrato único de jogo (`docs/CONTRATO-DE-JOGO.md`) | **feita** — as três funções de um validador viraram assinatura, e o quiz ganhou 12 testes unitários; paga as lacunas L-5 e L-8 do laudo da E06 |
| T-07.2 Quiz do Favo | **feita** — rota, tela, `quiz.js` e 8 testes pelo HTTP; o botão "Jogar" passou a ser por célula |
| T-07.3 Arraste e Classifique (com alternativa por clique e teclado) | **feita** — validador, seed com três células, `arraste.js` com arrastar de verdade, e a casca da tela virou parte comum; 7 testes unitários e 7 pelo HTTP |
| T-07.4 Monte o Orçamento | **feita** — validador com regra por categoria, cinco células nas três faixas, `orcamento.js` com botões − e +; 7 testes unitários e 6 pelo HTTP |
| T-07.5 Cofre do Tempo | **feita** — validador com juro composto, quatro células, gráfico em SVG sem dependência; 8 testes unitários e 6 pelo HTTP. Achou e corrigiu o botão "Jogar" que prometia célula com conteúdo de demonstração |
| T-07.6 Tela de resultado unificada | **feita** — parcial própria, `resultado.js`, estrelas animadas em CSS e "Continuar" para a próxima célula; 4 testes pelo HTTP |
| T-07.7 (P1) Mercado Esperto, Ordene a Prioridade e retomada de sessão | **feita**, em três commits — o Mercado Esperto com gabarito calculado, o Ordene a Prioridade contando par invertido, e a retomada com a migration 015 e a quarta função do contrato |

**O que a T-07.1 entregou.** O contrato existe em dois lugares que se sustentam:
o documento explica o ciclo da partida e o formato, e o código o impõe. Todo
validador é um objeto com `conferirForma`, `paraJogar` e `validar`, indexado pelo
slug de `game_types`.

Três coisas que valem lembrar:

1. **`conteudoParaJogar` deixou de usar o validador de respostas para conferir
   forma.** Era a L-8: chamar `validar(corpo, [])` só para provocar o erro
   funcionava por acidente, e quebraria no primeiro jogo com validação cara.
2. **`conferirForma` do quiz ficou rigoroso**: recusa pergunta com menos de duas
   alternativas e resposta certa fora da lista. É o tipo de conteúdo torto que a
   área administrativa da E12 vai poder cadastrar.
3. **O validador enfim tem teste próprio**, sem banco (L-5). Dois casos merecem
   destaque: resposta a mais é ignorada em vez de virar acerto, e
   `conteudoParaJogar` não altera o conteúdo original — entregar o gabarito por
   referência seria a falha mais silenciosa possível.

**O que a T-07.2 entregou.** A primeira tela de jogo do projeto. A página
`/trilha/:idFavo/celula/:idCelula` é uma casca: o `quiz.js` abre a partida por
`POST /partidas`, recebe token e perguntas juntos, mostra uma pergunta por vez e
manda as respostas em `POST /partidas/:token/resultado`.

Quatro decisões que valem lembrar:

1. **`GET` não cria partida.** A tela pede a partida por `fetch`, então atualizar
   a página não deixa partida aberta para trás — que era o preço da alternativa
   de renderizar token e perguntas no HTML.
2. **O botão "Jogar" é por célula.** O `contentService` devolve `temJogo`
   perguntando ao `tiposJogaveis()`, e a constante `JOGO_DISPONIVEL` saiu do
   `paginaController`. Ligar um interruptor geral ofereceria jogo em 18 células
   que o servidor recusaria.
3. **O resultado é provisório e mora na própria página.** Mostra estrelas, XP,
   pólen, mel e a subida de nível, tudo vindo pronto do servidor. A T-07.6 troca
   a apresentação, não a origem do dado.
4. **O JavaScript é externo e o CSRF vai no cabeçalho.** A CSP é
   `script-src 'self'`, então não existe script inline nem JSON embutido; o
   `x-csrf-token` já era aceito pelo middleware desde a E02.

**Três testes da E05 foram reescritos, e não é regressão.** Eles afirmavam "a
tela de jogo é da E07" e "nenhum link para `/celula/`" — exatamente o que esta
tarefa entregou. As asserções passaram a checar o contrato novo: só a célula de
quiz oferece link, e a travada continua sem nenhum.

O estado salvo da RF-JOG-07 ficou **descrito e não implementado**: o contrato
reserva o lugar dele, para que os quatro jogos da E07 não inventem cada um o seu
jeito de guardar progresso parcial antes da T-07.7.

---

**E06 — motor de recompensas** (concluída e auditada, guardada aqui como
histórico).

**As oito tarefas foram entregues; a auditoria está em
`docs/06-AUDITORIA-DA-ETAPA.md` e o resumo da etapa em
`docs/06-RESUMO-DA-ETAPA.md`.** A E05 está fechada e auditada em duas passagens. O roadmap
manda fazer esta etapa **antes** dos jogos, para que todo jogo use o mesmo
contrato de recompensa.

| Tarefa | Situação |
|---|---|
| T-06.1 `reward_configs` em banco e repository | **feita** — `rewardConfigsRepository`, mais a tabela `reward_modifiers` para os fatores da RN-008, com 7 testes contra banco real |
| T-06.2 `XpService`: calcula e credita XP, resolve subida de nível | **feita** — o dono do XP é o `levelsService`, que ganhou o cálculo pela tabela, o corte da repetição e o bônus de mel do degrau; 8 testes novos |
| T-06.3 `PointsService`: calcula e credita pólen | **feita** — `calcularPolenDaCelula` e `creditarPorCelula`, no mesmo desenho do XP; repetir paga zero pólen |
| T-06.4 `CoinService`: calcula e credita mel, valida saldo, nunca negativo | **feita** — `calcularMelDaCelula`, `creditarPorCelula` e `creditarBonusDeNivel`; repetir paga zero mel e o débito além do saldo é recusado sem rastro |
| T-06.5 `GameSessionService`: abre e fecha sessão validando respostas no servidor, orquestra os três em uma transação | **feita** — `abrir`/`fechar`/`abandonar`, validador de quiz, trava `FOR UPDATE` no token e 8 testes; fecha a RF-CON-04 |
| T-06.6 Idempotência: token de sessão consumido uma única vez | **feita** — `idempotencyService.executarUmaVezSo`, usado pela partida e pela compra; **DT-18 paga** |
| T-06.7 Auditoria em todos os créditos | **feita** — `retratoDoSaldo` e `registrarRecompensa`; a partida e o XP do onboarding ganharam linha, tarefa e meta ganharam o saldo |
| T-06.8 Testes: dupla submissão, repetição, cliente mentindo na pontuação | **feita** — `aceiteDoMotor.test.js`, com cinco conclusões e cinco compras em paralelo; passou de primeira, e o arquivo foi rodado três vezes para descartar sorte |

**O que a T-06.1 entregou.** A metade "em banco" da tarefa já existia — a tabela
`reward_configs` vem da migration `003` e as 54 linhas do seed `04`. O que
faltava era leitor: nenhum service lia a tabela, que é a **DT-19, agora paga**.
`rewardConfigsRepository.buscarConfiguracao` responde quanto vale uma célula por
tipo de jogo, faixa e estrelas.

Três decisões que valem lembrar:

1. **A busca é por slug e código, não por id.** É o vocabulário que os services
   já falam — o `contentService` trabalha com códigos de faixa. Pedir id obrigaria
   a uma consulta antes da consulta.
2. **Combinação sem linha devolve `null`.** O que fazer com configuração faltando
   é decisão do service: recusar o crédito ou pagar zero e registrar. Repository
   não faz política.
3. **O corte da repetição virou dado, na tabela `reward_modifiers`** (migration
   `014`). Os 25% de XP da RN-008 são valor de recompensa, e a RN-006 proíbe
   valor de recompensa no código. `reward_configs` não servia: ela é indexada por
   tipo de jogo, faixa e estrelas, e o corte não varia por nenhum dos três. Sem
   a tabela, o número apareceria escrito à mão em três services.

**O que a T-06.2 entregou.** Metade da tarefa já existia: `levelsService`
creditava XP e resolvia o nível pela curva do banco desde a T-02.3. O que
faltava era o "calcula" — ninguém ligava `reward_configs` ao crédito. Agora
`calcularXpDaCelula` lê a tabela e aplica o corte da repetição, e
`creditarPorCelula` credita com motivo `conclusao-celula`.

**O `XpService` do roadmap é o `levelsService` do código.** Criar um arquivo
novo com o nome do roadmap deixaria duas portas para a mesma recompensa. O
roadmap nomeia responsabilidade, não arquivo.

Três decisões que valem lembrar:

1. **A faixa que define o valor é a da célula, não a do jogador.** O seed dizia
   "quem está na faixa mais avançada", que é ambíguo. Pela faixa do jogador, um
   adolescente refazendo conteúdo infantil ganharia 1,5× por material fácil;
   pela faixa da célula, quem paga mais é o conteúdo mais difícil.
2. **Este service não paga mel.** `levels.reward_coins` estava semeado desde a
   E01 e ninguém o lia; agora `creditarXp` devolve `bonusDeMelPorNivel`, e quem
   credita é o `coinsService`, chamado pela T-06.5 na mesma transação. Mel entra
   por uma porta só.
3. **Configuração faltando paga zero e vira alarme no log**, em vez de estourar
   — o mesmo princípio já escrito no `auditService`: buraco de administração não
   derruba a partida da criança. Crédito zero também não vira linha no livro.

**Um defeito corrigido no caminho, e que vale como regra geral:** `creditarXp`
lia `user_levels` pelo pool enquanto escrevia pela transação. Inofensivo
enquanto ninguém creditava XP; agora que a célula credita, dois créditos
simultâneos leriam o mesmo `xp_total` e o cache perderia um — livro certo, cache
torto, e o `db:reconcile` acusando longe da causa. Quem escreve em transação lê
pela mesma conexão, de novo.

**O que a T-06.3 entregou.** O pólen da célula, no mesmo desenho do XP:
`calcularPolenDaCelula` lê `points_amount` da configuração e aplica o fator da
repetição, que para o pólen é zero. `pointsService.creditar` já existia e é usado
por tarefa e meta desde a E02 — o que faltava era só o cálculo da célula.

**A duplicação entre os três services é consciente.** Ler a configuração, aplicar
o fator e arredondar se repete em XP, pólen e mel, e não virou helper comum: a
regra de cada recompensa diverge — XP resolve nível, mel valida saldo, pólen não
faz nem um nem outro —, e o projeto proíbe abstração além de MVC +
Service/Repository. O que é comum de verdade já mora no repository.

Nenhuma meta mede pólen hoje: não há `progress_source` de pólen entre os sete
tipos semeados, então creditar pólen não mexe em meta nenhuma. Se a E08 quiser
"acumular pólen" como meta, é linha nova em `goal_types` mais fonte em
`goalProgressSources`.

Os testes das três recompensas moram num arquivo só,
`test/integration/recompensaDaCelula.test.js` (era `xpDeCelula.test.js`): a
partida é uma só, e montar usuário, carteira, nível e célula três vezes seria o
mesmo cenário copiado.

**O que a T-06.4 entregou.** O mel da célula, fechando as três recompensas:
repetir uma célula rende 25% de XP, zero pólen e zero mel. E o
`creditarBonusDeNivel`, que paga o que a curva de `levels` promete a cada degrau
— valor calculado pelo `levelsService` desde a T-06.2 e até agora sem dono.

O motivo `subida-de-nivel` fica **fixado dentro da função**, e não a cargo do
chamador: motivo vira `reason_id` no livro, e é assim que um extrato ganha
lançamento com o rótulo errado.

A validação de saldo da RN-004 já existia desde a E02 e não foi reescrita —
`walletsRepository.debitarMel` faz checagem e desconto na mesma instrução, sem
janela entre conferir e debitar. O que a tarefa acrescentou foi o **teste** de
que gastar mais do que se tem é recusado com `MEL_INSUFICIENTE` e não deixa
lançamento para trás.

Duas coisas que ficaram de fora, cada uma com lugar marcado: `is_economy_enabled`
continua sem quem o leia, porque as três faixas têm a economia ligada e guarda
que nunca reprova esconde a intenção (a RN-038 é E09); e a **DT-18** continua
aberta, para a T-06.6 resolvê-la com o mecanismo de `idempotency_keys` em vez de
uma solução paralela.

**O que a T-06.5 entregou.** A partida virou fato registrado. `abrir` confere a
célula pelo `contentService`, gera o token (UUID do servidor) e devolve o
conteúdo **sem o gabarito**; `fechar` conta os erros contra o gabarito do banco,
grava a tentativa e paga XP, pólen e mel na mesma transação, com o bônus do
degrau por último. A duração vem do banco (`TIMESTAMPDIFF`), nunca do cronômetro
do navegador — é o que fecha a **RF-CON-04**, que estava aberta desde a E05.

Quatro decisões que valem lembrar:

1. **A trava é `SELECT ... FOR UPDATE` no token.** Duas conclusões simultâneas
   viram uma: a segunda espera, encontra a partida fechada e devolve o resultado
   dela. Sem a trava, as duas leriam "aberta" e as duas creditariam — que é
   exatamente o critério de aceite da etapa.
2. **Reenvio recebe o resultado, não um erro.** Navegador que reenvia por
   conexão ruim merece a tela de resultado. É o comportamento que a T-06.6 vai
   formalizar com `idempotency_keys`.
3. **O gabarito não vai para a tela.** `conteudoParaJogar` devolve as perguntas
   sem o campo `correta`: mandar a resposta certa ao navegador tornaria a
   validação no servidor teatro.
4. **Conteúdo sem gabarito recusa abrir**, em vez de pagar por conteúdo vazio.
   Das 24 células semeadas, só a primeira de "primeiros passos" tem quiz de
   verdade; as outras são de demonstração e ganham jogo na E07. Recusar cedo
   evita partida aberta que ninguém consegue fechar.

**Os validadores moram em módulo próprio**, `src/services/validadoresDeJogo.js`,
indexados pelo slug de `game_types` — mesmo padrão do `goalProgressSources`. A
T-07.1 formaliza o contrato de jogo e as tarefas da E07 acrescentam os outros
cinco no mesmo mapa.

**O que a T-06.6 entregou.** Um mecanismo só de "isto roda uma vez só":
`idempotencyService.executarUmaVezSo` reserva a chave **dentro** da transação da
operação e chama `aoRepetir` quando a chave já existe. Usam-no a conclusão de
partida e a compra.

Quatro decisões que valem lembrar:

1. **A reserva é `INSERT IGNORE`, não "consultar e depois gravar".** Entre a
   consulta e a escrita cabe a segunda requisição, e aí as duas se achariam a
   primeira.
2. **A chave é gravada na transação da operação.** Rollback leva a chave junto:
   chave registrada de operação que falhou impediria a retentativa legítima.
3. **A tabela guarda hash, não resposta** (`response_hash`, 64 caracteres). Por
   isso o reenvio é respondido pela tabela de domínio: a partida por
   `game_sessions`, a compra pela última compra daquele item. Está documentado
   nos dois lugares, porque é o tipo de coisa que confunde quem chega depois.
4. **Chave repetida com pedido diferente é recusada** com `CHAVE_REUTILIZADA`
   (409). Tratar como repetição engoliria em silêncio a compra que a pessoa de
   fato pediu.

**Na compra, a chave vem do formulário** — um UUID por renderização da loja, em
campo escondido. Dois cliques no mesmo botão compram uma vez; recarregar a loja
traz chave nova, então comprar o mesmo item de propósito continua possível. Envio
repetido responde 200 em vez de 201, porque nada foi criado desta vez. **A DT-18
está paga.**

**Na partida, a chave é o próprio token** (`partida:<token>`), sem pedir nada ao
cliente. O pedido fica fora do hash de propósito: quem reenvia com respostas
diferentes recebe o resultado gravado, porque o crédito já aconteceu e trocar a
resposta depois não o desfaz.

**Uma correção de documento:** este arquivo dizia que `idempotency_keys` estava
"semeada". Não estava — nenhum seed a tocava, e ela só passou a ter linhas agora,
escritas pela aplicação.

**O que a T-06.7 entregou.** Crédito sem rastro é crédito que ninguém consegue
explicar depois, e havia dois: **a partida não gerava linha nenhuma** e o **XP
inicial do onboarding** tampouco. Agora `auditService.retratoDoSaldo` lê mel,
pólen, XP e nível, e `registrarRecompensa` grava o antes, o depois e o que a
operação rendeu.

Quatro decisões que valem lembrar:

1. **Uma linha por partida**, ação `partida.concluida`, entidade `game_session`.
   Três linhas — uma por recompensa — descreveriam o detalhe e perderiam o fato.
2. **O retrato é lido do banco nos dois momentos**, e não calculado como
   "depois menos o que foi pago": conta feita de cabeça vira mentira no primeiro
   crédito concorrente.
3. **A linha é escrita depois do commit**, como a compra já fazia. O
   `auditService` engole a própria falha de propósito: rastro perdido vira
   alarme no log, e não recompensa desfeita na cara da criança.
4. **Reenvio idempotente não gera linha**, porque nada mudou.

Tarefa e meta já registravam o antes/depois **da entidade**; agora carregam
também o saldo, que é o que a RN-010 pede de um crédito. Nenhum campo antigo
saiu — o que existia continua, ao lado do retrato.

**O que a T-06.8 entregou.** O critério de aceite da etapa, exercido como o
roadmap escreve: cinco `fechar` do mesmo token disparados juntos. As cinco
terminam sem erro, exatamente uma credita, e a prova é tripla — os três livros
somam um crédito, `game_sessions` tem uma linha fechada e `audit_logs` tem uma
única `partida.concluida`. Junto dele, cinco compras simultâneas com a mesma
chave, que é a DT-18 sob concorrência e não só em duplo clique sequencial.

**Nada precisou ser corrigido**, e o motivo está na ordem montada na T-06.6: a
perdedora espera na UNIQUE da chave, porque a vencedora segura a linha até o
commit; quando é liberada, a reserva falha e a resposta vem da partida já
fechada. O arquivo foi rodado três vezes seguidas para descartar teste que passa
por sorte.

**Isto tira "comportamento sob concorrência" da lista de não verificados**, onde
estava desde a E02.

**Uma decisão de produto tomada aqui:** a RN-008 fala de XP e mel, e cala sobre
pólen. O seed zera o pólen na repetição também — pólen repetido à vontade é o
mesmo farming que a regra quer impedir. Se o produto discordar, é um `UPDATE`
numa linha do seed, sem deploy.

---

**E05 — conteúdo e trilha** (concluída e auditada em duas passagens, guardada
aqui como histórico).

| Tarefa | Situação |
|---|---|
| T-05.1 Repositories de favo, célula, conteúdo e progresso | **feita** — `hivesRepository`, `cellsRepository`, `contentsRepository` e `progressRepository`, com 21 testes contra banco real |
| T-05.2 `ContentService`: favos e células com estado, desbloqueio (RN-026/027/028) | **feita** — trilha, lista de células e abertura de célula, com o pré-requisito conferido no service e não só na tela |
| T-05.3 `ProgressService`: tentativa, erros, estrelas, percentual do favo | **feita** — RN-030 com dono único, tentativa e percentual na mesma transação, sem pagar nada |
| T-05.4 Views da trilha e da lista de células | **feita** — `/trilha` e `/trilha/:id`, hexágonos serpenteantes, favo travado com o motivo escrito |
| T-05.5 Filtro por faixa de idade | **feita** — faixas B e C semeadas, filtro também na célula, três jogadores testados |
| T-05.6 Testes: célula travada não abre; 80% libera o favo seguinte; patrimônio respeitado | **feita** — os três critérios num percurso único, e o limite de 80% enfim exercido com dado real |

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

**O que a T-05.5 entregou.** O filtro da RN-029 já existia desde a T-05.2, mas
nunca tinha sido exercido com dado real: só a faixa A tinha favo, e o teste
provava que a faixa B devolvia zero — verdade sem valor. Agora as três faixas têm
dois favos de quatro células, e o teste cadastra três jogadores de 7, 10 e 14
anos e confere que cada um vê 2, 4 e 6 favos. A faixa vem da data de nascimento,
como a decisão D-1 mandou, então o teste percorre o cadastro de verdade em vez
de escrever a faixa no perfil. **A DT-17 está paga.**

Uma brecha foi encontrada e fechada no caminho: a **RN-029 fala de célula**, não
só de favo, e a lista de células não filtrava por faixa. O schema permite célula
de faixa diferente da do favo, e sem o filtro ela não só apareceria para quem é
mais novo como entraria no denominador do percentual — deixando o favo impossível
de fechar e travando o seguinte para sempre pela RN-027. Agora o filtro vale para
a lista, para a contagem e para o recálculo do cache, e o caso tem teste próprio.

O conteúdo das faixas B e C é **de demonstração**, como o da faixa A: dá para
navegar a trilha inteira, mas material pedagógico aprovado vem da área
administrativa (E12).

**O que a T-05.6 entregou.** Os três critérios de aceite num percurso único —
cadastro, trilha, favo, células, desbloqueio — em vez de espalhados. E um buraco
que só apareceu ao escrever este teste: **os 80% da RN-027 nunca tinham sido
exercidos com dado real.** Os favos semeados têm quatro células, então o
percentual pulava de 75% direto para 100%, e o limite exato só existia no teste
unitário, com número montado à mão. O teste de aceite dá ao favo uma quinta
célula: 3 de 5 são 60% e não abrem o seguinte; 4 de 5 são exatamente 80% e abrem
— com o favo atual ainda por fechar, que é o ponto da regra.

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
| E05 Conteúdo e trilha | **concluída e auditada** | T-05.1 feita: os quatro repositories da trilha. T-05.2 feita: `contentService` com os estados de desbloqueio. T-05.3 feita: `progressService` traduzindo erros em estrelas. T-05.4 feita: as duas telas da trilha. T-05.5 feita: conteúdo nas três faixas. T-05.6 feita: os três critérios de aceite testados de ponta a ponta. A auditoria (`docs/05-AUDITORIA-DA-ETAPA.md`) aprovou sem bloqueantes; das sete lacunas, duas foram corrigidas na hora |
| E06 Motor de recompensas | **concluída e auditada** | T-06.1 feita: `rewardConfigsRepository` e a tabela `reward_modifiers`, que tira da frente a DT-19. T-06.2 feita: o XP de célula sai da tabela, com o corte da repetição e o bônus de nível calculado — **DT-03 paga**. T-06.3 e T-06.4 feitas: pólen e mel no mesmo desenho, mais o bônus de nível enfim pago. T-06.5 feita: a partida abre, fecha validando no servidor e paga tudo numa transação. T-06.6 feita: idempotência da partida e da compra, com a DT-18 paga. T-06.7 feita: todo crédito deixa rastro com saldo antes e depois. T-06.8 feita: o aceite da etapa passou, com cinco conclusões e cinco compras em paralelo. **As oito tarefas estão entregues; falta auditar a etapa.** Ver também DT-18 |
| E07 Jogos | **concluída e auditada** | As sete tarefas entregues e o laudo em `docs/07-AUDITORIA-DA-ETAPA.md`: pode avançar, zero bloqueantes. As duas lacunas de risco médio foram corrigidas; oito de risco baixo ficam abertas |
| E08 Metas e Sequência | **concluída e auditada** | T-08.1 feita: a meta vencida pode ser retomada, e meta fora de `ativa` parou de pagar. T-08.2 feita: a sequência avalia sozinha os dias fechados, no fuso do jogador, e a DT-23 foi paga. T-08.3 feita: o escudo é consumido automaticamente e o inventário ganhou o estado `consumido`. T-08.4 feita: os marcos pagam mel e conquista uma vez só. T-08.5 feita: a tarefa avança pelo evento e o teto de 3 ativas passou a valer. T-08.6 feita: a sequência aparece na tela, com calendário da semana no painel e nas metas. T-08.7 feita: três semanas de relógio simulado provam a regra em todos os cenários. **Auditada em `docs/08-AUDITORIA-DA-ETAPA.md`: pode avançar, zero bloqueantes, com as três lacunas de maior risco corrigidas na mesma sessão** |
| E09 Economia | **em andamento** | T-09.1 feita: os repositories da economia abriram o schema que a E01 já tinha — cofre com extrato, ciclo econômico idempotente por número, foto do patrimônio, comportamentos do item e as operações de ciclo no inventário (valor com piso e teto, inadimplência que conta ciclos). T-09.2 feita: a loja ganhou service próprio, com vitrine respondida por jogador, prévia de impacto e upgrade com desconto pelo bem entregue. T-09.3 feita: `patrimonyService` responde carteira mais cofre mais bens, com cosmético fora, e o requisito de patrimônio mínimo deixou de ser um aviso. T-09.4 feita: o cofre guarda, devolve, rende e projeta, e a tarefa `depositar-no-cofre` voltou ao catálogo. T-09.5 feita: o ciclo semanal acontece, contado pelo calendário do jogador e aplicado de uma vez na volta, com resumo por ciclo em JSON. T-09.6 feita: a Faixa A vive a economia sem punição, por interruptor em `age_bands` lido num ponto só. T-09.7 feita: as quatro telas da economia existem e funcionam sem JavaScript. Falta o aviso do ciclo na Colmeia |
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
| ~~DT-03~~ | ~~Loop de recompensa pela metade: ninguém creditava **XP em jogo**~~ | M-02, D-03 | **Resolvida na T-06.2**: `levelsService.creditarPorCelula` calcula o XP pela tabela e credita. Falta o chamador, que é a T-06.5 |
| ~~DT-04~~ | ~~`XP_POR_NIVEL = 1000` e `PONTOS_POR_TAREFA_CONCLUIDA = 10` em constante~~ | C-03, auditoria da E01 (L-03) | **Resolvido na T-02.3**: a curva de nível é lida de `levels` e a recompensa da tarefa vem de `task_types`. Nenhuma das duas constantes existe mais. Falta ainda o consumo de `reward_configs` pelo motor de recompensas (E06) |
| ~~DT-05~~ | ~~Negociação de conteúdo copiada 9 vezes em 6 controllers~~ | P-01 | **Resolvido na T-02.3**: `querJson` em `src/utils/resposta.js` |
| DT-06 | Três padrões diferentes de contrato entre rotas equivalentes | C-03 | Padronizar na E02 |
| ~~DT-07~~ | ~~Dois guardas de autenticação com a mesma regra, um deles dentro de `src/routes/index.js`~~ | P-04, C-01 | **Resolvido por inteiro na T-02.4**: o guarda saiu do arquivo de rotas na T-02.3 e foi absorvido por `requireOnboarding`/`requireOnboardingPendente`, que respondem conforme o cliente — redirecionamento para HTML, código de erro para JSON |
| ~~DT-18~~ | ~~Compra não é idempotente: dois cliques rápidos criam duas compras e debitam duas vezes~~ | auditoria da E02 | **Resolvida na T-06.6**: `idempotencyService.executarUmaVezSo` com a chave vinda do formulário, uma por renderização da loja. A tabela `idempotency_keys` nunca esteve semeada, ao contrário do que este documento dizia; agora ela é escrita pela aplicação |
| ~~DT-19~~ | ~~`reward_configs` (54 linhas semeadas) não é lida por nenhum service~~ | auditoria da E02 | **Resolvida na T-06.1**: `rewardConfigsRepository` lê a tabela por slug do jogo, código da faixa e estrelas, com os 54 combos conferidos em teste. Quem vai consumir são os services da T-06.2 a T-06.4 |
| ~~DT-20~~ | ~~Onboarding não coleta tempo por sessão nem preferências de som e animação, que a RN-011 e a RN-050 pedem~~ | auditoria da E02 | **Resolvida na T-04.3**: os dois passos entraram no wizard e gravam em `session_minutes`, `is_sound_enabled` e `has_reduced_motion`. As durações passaram a ser cinco (5, 10, 20, 30 e 45) por decisão de produto tomada no checkpoint da tarefa, com migration `012` e reescrita da RN-011 |
| ~~DT-21~~ | ~~O passo manual de progresso de tarefa é ponte: o progresso de verdade vem do evento, que não existe~~ | auditoria da E02 | **Resolvida na T-08.5** para as três fontes que existem (`cell_completed`, `active_days`, `hive_completed`): o progresso é relido do evento e a rota do passo manual foi removida. `vault_deposit` continua sem fonte, e a tarefa do cofre nasce inativa até a E09 |
| ~~DT-23~~ | ~~A virada do dia usa o relógio do servidor, enquanto a RN-024 manda usar o fuso do perfil~~ | dúvida levantada na revisão da E02 | **Resolvida na T-08.2**: `src/utils/diaDoJogador.js` resolve o dia a partir de `profiles.timezone`, e tanto a geração de tarefas quanto a sequência passaram a usá-lo. O horário de verão foi coberto: `inicioDoDia` confere o deslocamento duas vezes |
| DT-22 | Nenhuma tela foi aberta em navegador real desde o layout base: 320 px, foco de teclado, contraste AA e 60 fps seguem não verificados | auditoria da E02 | E11 |
| ~~DT-43~~ | ~~A tarefa do cofre (`depositar-no-cofre`) nasce inativa no seed porque `vault_deposit` não tem fonte antes do cofre~~ | T-08.5 | **Resolvida na T-09.4**: `vault_deposit` mede os depósitos da janela e a tarefa nasce ativa |
| DT-44 | Tarefa expirada com o alvo já batido ainda paga: `tasksService.concluir` não confere o status e o `WHERE` do `tasksRepository.concluir` exige `completed_at IS NULL` e alvo cumprido, mas não `status = 'ativa'`. O `goalsService.concluir` faz essa checagem | auditoria da E08 (L-4) | Uma condição no `WHERE`, na E09 |
| DT-45 | A fonte `cell_completed` conta partidas, não células distintas: repetir três vezes a célula mais fácil cumpre "Conclua 3 células hoje". O crédito da partida já reduz a repetição pela RN-008, a tarefa não | auditoria da E08 (L-5) | Contar `DISTINCT cell_id`, na E09 |
| DT-46 | `gameSessionService` chama `registrarDiaCumprido(idUsuario)` sem passar o instante, então o caminho que o jogador percorre de verdade não é simulável no tempo: o aceite de três semanas exercita o `streakService` direto | auditoria da E08 (L-6) | Propagar o instante da partida, quando houver motivo de tocar no arquivo |
| DT-47 | A auditoria da quebra de sequência grava uma linha por varredura, com o `antes` do início dela: quem some duas semanas, quebra, emenda e quebra de novo deixa uma linha só, com o número errado | auditoria da E08 (L-7) | Uma linha por quebra, na E09 |
| DT-48 | `achievementsService` grava `motivo: 'marco-de-sequencia'` para qualquer conquista. Hoje só a sequência desbloqueia, então nada está errado no livro; a primeira conquista de favo entra rotulada errado | auditoria da E08 (L-8) | Motivo vindo da conquista, quando a segunda família de conquista existir |
| DT-49 | O calendário da semana marca o dia de hoje com `ring-2 ring-tinta`, que é contorno preto em badge, vetado pelo checklist da seção 8 do design system; os números dos dias não usam `tabular-nums` | auditoria da E08 (L-9) | Junto com a passagem por navegador da DT-22 |
| DT-50 | O cabeçalho de `tasksService.js` ainda diz que a geração automática das tarefas é a E08 e que ali existe a criação avulsa: a geração existe desde a T-08.5 e a criação avulsa foi removida | auditoria da E08 (L-10) | Reescrever o bloco, quando o arquivo for tocado |
| ~~DT-52~~ | ~~A vitrine ainda não devolve o patrimônio que a RF-LOJ-01 manda mostrar no topo da loja~~ | T-09.2 | **Resolvida na T-09.3**: a vitrine e a prévia da compra devolvem a composição inteira |
| ~~DT-61~~ | ~~O banco de desenvolvimento não aceita `db:migrate`: as migrations `004` e `007` foram editadas depois de aplicadas, nas T-08.3 e T-08.4, e o runner recusa por checksum~~ | T-09.6 | **Resolvida na mesma sessão**: o banco foi recriado com `db:reset -- --sim`, e o ciclo `db:migrate` (16 migrations), `db:seed` e `db:reconcile` rodou limpo do zero |
| DT-62 | A tela do cofre mostra o prazo da meta e o formulário aceita a data, mas o campo não vem preenchido com o prazo já gravado: salvar de novo sem tocar na data apaga o prazo. É irmão da DT-58, que decide o que fazer quando o prazo vence | T-09.7 | Resolver junto da DT-58, quando o produto decidir o comportamento do vencimento |
| DT-59 | O ciclo econômico só é processado no `/painel`. Quem entra direto na loja, no inventário ou no cofre vê o saldo de antes das contas da semana, até passar pela Colmeia | T-09.5 | Subir a chamada para um middleware das telas autenticadas, junto das views da T-09.7 |
| DT-60 | Acima de doze ciclos por visita, os mais antigos são marcados como processados sem efeito: quem some por um ano não paga o custo fixo nem recebe a renda daquele tempo. É escolha de produto, para a volta não zerar o inventário na primeira tela | T-09.5 | Rever quando houver jogador real sumindo por tanto tempo |
| DT-58 | O prazo da meta do cofre (`goal_due_at`) é guardado e devolvido, mas nada acontece quando ele vence: a meta não expira nem avisa. A RN-044 fala em meta com prazo, sem dizer o que fazer ao vencer | T-09.4 | Decidir com o produto, junto da tela do cofre na T-09.7 |
| DT-55 | A vitrine soma o patrimônio duas vezes por chamada: uma no `shopService` e outra dentro de `requisitosNaoCumpridosDosItens`, que precisa dele para o requisito de patrimônio mínimo. São consultas pequenas e a loja abre bem dentro do RNF, mas é trabalho repetido | T-09.3 | Passar o patrimônio já calculado, se a loja começar a pesar |
| DT-56 | A foto diária do patrimônio só é gravada quando o jogador abre alguma tela que soma o patrimônio. Quem passa o dia sem entrar não tem ponto no gráfico — o que é fiel ao uso, mas deixa buracos na curva | T-09.3 | Continua aberta: a T-09.5 grava uma foto no fim do processamento, então quem volta depois de semanas ganha um ponto na volta, e não um por semana. Fechar quando a curva tiver leitor, na T-09.7 |
| ~~DT-57~~ | ~~As views de `/loja` e do inventário continuam no formato antigo: `paginaController` usa `listarCatalogo` e `listarAgrupadoPorItem`, sem patrimônio no topo, sem separação de bens e cosméticos e sem a composição~~ | T-09.3 | **Resolvida na T-09.7**: a loja passou a ler o `shopService`, o inventário ganhou página própria e o patrimônio aparece no topo das duas |
| DT-53 | A venda voluntária por 60% (RF-LOJ-08, RN-040) não existe: o único caminho que tira um bem do inventário é a entrega no upgrade. É P1, mas `marcarComoVendido` já está pronto para ela | T-09.2 | Quando os P1 da loja entrarem |
| DT-51 | A suíte completa falhou uma vez em quatro execuções na T-09.1, com quatro casos, e passou nas três seguintes. A saída não foi guardada, então nem os nomes dos casos se sabe. É o mesmo sintoma da DT-37, agora com mais bancos descartáveis disputando o MySQL | T-09.1 | Rodar com `--test-concurrency=1` e guardar a saída na próxima ocorrência |
| DT-42 | A contagem de escudos vive em dois lugares: as unidades ativas em `inventory` (a verdade) e o espelho `streaks.shields_available` (que carrega o `CHECK` do teto). Os dois são escritos na mesma transação, então divergir exige falha fora do banco — mas `scripts/reconcile.js` ainda não confere esse par, como já confere o `hive_progress` | T-08.3 | Acrescentar a conferência ao `reconcile.js` na E09, junto do resto da economia |
| DT-36 | `npm run lint` roda `eslint .` e acusa 3242 erros, **todos** em `.github/skills/impeccable/scripts/` e `.claude/skills/impeccable/scripts/`, que são plugin e não código do projeto. Nenhum arquivo de `src/`, `test/` ou `scripts/` tem erro. Como está, o CI reprova a pipeline por código que não é nosso | T-07.3 | Acrescentar `.claude/` ao `ignores` do `eslint.config.js`, antes de a E13 ligar o CI |
| DT-37 | `test/integration/seguranca.test.js` falhou uma vez em três execuções da suíte completa, no caso "o dono continua alterando a própria conta", e passa sempre quando o arquivo roda sozinho (três de três). Não reproduzi o erro, então não sei se é o limitador de tentativas de login, contenção de banco sob execução paralela ou tempo. Teste que falha de vez em quando é pior do que teste que falha sempre: ensina a ignorar vermelho | T-07.6 | Rodar a suíte com `--test-concurrency=1` para isolar, e só então corrigir a causa |
| DT-38 | Partida aberta em uma célula nunca é fechada quando o jogador vai jogar outra: a retomada é por célula, então dá para acumular partidas penduradas. Não paga nada indevido, porque cada partida exige o próprio token | L-5 do laudo da E07 | E08, junto do índice da DT-39 |
| DT-39 | Falta índice `(user_id, cell_id)` em `game_sessions`; `buscarAbertaDaCelula` e `contarConcluidasNaCelula` filtram por essas colunas e o índice existente é `(user_id, started_at)` | L-6 do laudo da E07 | E08 |
| DT-40 | O salvamento de progresso é falador: o orçamento grava a cada toque no `−` e no `+`, então uma partida de faixa C pode gerar dezenas de requisições. Cabe no limite global e não quebra nada, mas é desperdício | L-10 do laudo da E07 | Agrupar os toques antes de salvar; trabalho pequeno, sem urgência |
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
| DT-32 | **Meio caminho andado na T-06.2**: o XP de célula já é calculado e creditado, então o nível sobe assim que a T-06.5 fechar a sessão de jogo. A meta de "atingir nível" é mensurável mas ainda parada até lá. Ela não é meta impossível por desenho — é impossível por falta do motor de XP, que é o buraco conhecido da E06 | T-04.4 | E06, junto do motor de recompensa. Se atrasar, a saída é uma linha a menos em `goal_target_rules` |
| ~~DT-33~~ | ~~A RN-017 tem duas metades e só uma existe: a meta vencida entra em `expirada` sem punição, mas a oferta de renovação não foi construída~~ | auditoria da E04, L-2 | **Resolvida na T-08.1**: a meta vencida mostra "Retomar esta meta", e retomar preserva o progresso, dá prazo novo pelo plano de hoje e paga metade — o fator 0,5 é linha em `reward_modifiers`, não número no código |
| DT-34 | O administrador não tem como calibrar o ritmo do jogo: `goal_plan_rules` e `goal_target_rules` só mudam rodando `db:seed`, que é deploy. É o poder que faz sentido dar ao admin sobre metas — **não** criar meta para um jogador específico, o que reabriria o furo da RN-014 pelo painel administrativo. Requisito ainda não escrito em `01-REQUISITOS-E-REGRAS.md` | correção de escopo da E04, 2026-08-18 | E12, junto do resto da área administrativa |
| DT-35 | O patrimônio que destrava favo (RN-028) conta só o inventário. A RN-045 diz que ele "na prática exige uso do cofre", e o cofre não existe: quando existir, `contentService` precisa somar as duas fontes, e um favo calibrado hoje ficará fácil demais | T-05.2 | E09, junto do cofre. A soma tem um lugar só — `contextoDoJogador` — então é mudança de uma linha |
| ~~DT-17~~ | ~~Conteúdo semeado só na faixa A~~ — **paga na T-05.5**: as faixas B e C ganharam dois favos de quatro células cada, e a segmentação passou a ter teste com três jogadores reais | auditoria da E01, L-07 | fechada |

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

**Próximo passo: auditar a E08.** As sete tarefas estão entregues e o aceite da
etapa passou, então o que falta é o laudo, no mesmo molde das etapas anteriores:
requisito a requisito, com as lacunas classificadas por risco. Vale entrar nele
sabendo que a tela da sequência ainda não foi vista em navegador (DT-22) e que a
tarefa do cofre continua inativa até a E09 (DT-43).

Duas dívidas da E07 continuam esperando a E08: o índice `(user_id, cell_id)` em
`game_sessions` (DT-39) e as partidas abertas que ninguém fecha (DT-38).

A E06 foi **auditada e aprovada, com as três lacunas de risco médio corrigidas**
(L-1, L-2 e L-3). Ficaram abertas sete de risco baixo, listadas no laudo.

A E05 está **concluída e auditada** (`docs/05-AUDITORIA-DA-ETAPA.md`): pode
avançar, zero bloqueantes. A auditoria teve **duas passagens**: a primeira aprovou com sete lacunas, e a
segunda — que aplicou o checklist de banco esquecido na primeira e foi olhar o
HTML renderizado — achou mais duas, ambas visíveis para o jogador. Das nove,
**cinco foram corrigidas** nesta sessão: o botão "Jogar" que levava a 404 (L-1),
a rota sem validação de parâmetro (L-3), o "0 de ? células" da primeira tela da
trilha (L-8), o código morto que resolvia esse total (L-4) e o 422 "verifique os
campos" para endereço torto (L-9). Ficam abertas quatro, de risco baixo.

Duas lições registradas, porque valem para as etapas seguintes: **o roteiro de
auditoria tem sete passos e pular um custa** — foi assim que o seed quase ficou
sem conferência de idempotência (roda duas vezes e as contagens não mudam:
6 favos, 24 células, 24 conteúdos). E **imprimir a página acha em minutos o que
reler o service não acha** — as duas lacunas da segunda passagem saíram do HTML,
não do código.

**Uma suspeita que a auditoria mediu e descartou**, e que vale lembrar antes de
otimizar qualquer coisa na E06: o caminho de `registrarTentativa` dispara mais de
uma dúzia de consultas, o que parecia risco de desempenho. Medido com banco real:
6,3 ms para montar a trilha e 21,7 ms para registrar uma tentativa. É
redundância, não lentidão.

Três coisas que a E06 vai precisar saber sobre o que a E05 deixou pronto:

1. **`progressService.registrarTentativa` aceita conexão de fora** e devolve
   `estrelas`, `ehRepeticao` e o progresso do favo. É por ele que a T-06.5 grava
   o resultado dentro da transação que credita — a regra da RN-030 já tem dono e
   não deve ser reescrita lá.
2. **O tempo de partida continua sem quem o grave** (L-2 do laudo). A coluna
   `game_sessions.duration_seconds` existe desde a migration `003`, e é a T-06.5
   que a preenche; a RF-CON-04 só fecha então.
3. **A tela de jogo é a chave do botão "em breve".** A constante
   `JOGO_DISPONIVEL`, em `paginaController`, vira `true` quando a E07 entregar a
   rota `/trilha/:idFavo/celula/:idCelula`.


---

## 9. Onde paramos — sessão de 2026-08-18

Sessão encerrada com a **árvore limpa** e tudo commitado em
`refactor/arquitetura-em-camadas`. Para retomar, basta
`docker compose up -d mysql && npm test` — devem passar 349, zero falhas.

**O que esta sessão fez, em ordem:** fechou a E04 (T-04.6 e T-04.7 estavam
escritas mas não commitadas), auditou-a em duas passagens, tirou do jogador a
criação manual de meta — que nenhum RF-MET autoriza — e entregou a E05 inteira,
das seis tarefas à auditoria, também em duas passagens.

**Commits desta sessão**, do mais antigo ao mais novo:

| Commit | O que é |
|---|---|
| `d72b18d` | T-04.6 e T-04.7 — edição da disponibilidade no perfil |
| `54f539f` | Corrida do planejador: trava, transação da semana, limitador |
| `2f66c22` | Meta é gerada, não digitada — some a criação manual |
| `220e2d2` | T-05.1 — os quatro repositories da trilha |
| `4382f93` | T-05.2 — `contentService` e os estados de desbloqueio |
| `d443f9a` | T-05.3 — `progressService`, erros viram estrelas |
| `39925a7` | T-05.4 — telas da trilha e da lista de células |
| `16a86a5` | T-05.5 — conteúdo nas três faixas, filtro também na célula |
| `84aa1fa` | T-05.6 — aceite da etapa, com os 80% enfim exercidos |
| `264b656` | Últimas correções do laudo da E05 |

Mais os `docs:` de auditoria e de estado no meio do caminho.

**Como retomar:** `/proxima-tarefa` já cai na T-06.1. Antes de escrever código,
vale ler as três notas da seção anterior sobre o que a E05 deixou pronto — em
especial que a **regra das estrelas (RN-030) já tem dono** e não deve ser
reescrita na T-06.5.

**O que ficou aberto, e onde está escrito:**

| Item | Onde |
|---|---|
| Quatro lacunas baixas da E05 (tempo da RF-CON-04, página de erro do favo travado, leitura repetida de perfil/faixas, checklist visual em navegador) | `docs/05-AUDITORIA-DA-ETAPA.md`, seções 3 e 5 |
| Quatro lacunas baixas da E04 (lista de metas que não atualiza, foco de teclado, largura da tela de perfil, tempo por sessão sem replanejar) | `docs/04-AUDITORIA-DA-ETAPA.md` |
| 15 itens de dívida catalogada, com etapa marcada | seção 5 deste documento |

**A única coisa que exige atenção antes da entrega, e não da E06:** o checklist
visual nunca foi conferido em navegador de verdade. Nenhuma das telas novas foi
aberta em um — 320 px sem rolagem horizontal e contraste medido pedem isso, e é
o tipo de coisa que só aparece na apresentação.

---

### Sessão de 2026-08-19

Entregue a **T-06.1**, primeira tarefa da E06. Suíte em **356 testes, zero
falhas** (349 antes), reconciliação dos livros OK.

| Arquivo | O que é |
|---|---|
| `migrations/014_reward_modifiers.sql` | tabela dos fatores que reduzem recompensa (RN-006 e RN-008) |
| `scripts/seeds/07_reward_modifiers.sql` | a linha `repeticao-de-celula`: XP ×0,250, mel ×0, pólen ×0 |
| `src/repositories/rewardConfigsRepository.js` | leitor de `reward_configs` e `reward_modifiers` |
| `test/integration/repositories/rewardConfigs.test.js` | 7 testes contra banco real |

Duas coisas para a T-06.2 saber:

1. **Os fatores voltam como número**, e não como o texto que o driver devolve
   para `DECIMAL` — eles existem para multiplicar. Os valores em mel continuam
   inteiros, e quem arredonda é o service.
2. **As duas funções aceitam conexão de fora**, para a T-06.5 lê-las de dentro
   da transação que credita.

`npm run lint` continua acusando 3242 erros, **todos** de `.claude/skills/**` e
`.github/skills/**` — é a DT-02, não código do projeto. Os arquivos desta tarefa
passam limpos.

---

### Sessão de 2026-08-19, continuação: T-06.2

Suíte em **364 testes, zero falhas** (356 antes), reconciliação OK.

| Arquivo | O que mudou |
|---|---|
| `src/services/levelsService.js` | `calcularXpDaCelula`, `creditarPorCelula` e `bonusDeMelEntreNiveis`; `creditarXp` devolve o bônus do degrau e lê o nível pela conexão da transação |
| `src/repositories/userLevelsRepository.js` | `buscarPorUsuario` aceita conexão, como as demais |
| `test/integration/xpDeCelula.test.js` (renomeado para `recompensaDaCelula.test.js` na T-06.3) | 5 testes: estreia, repetição a 25%, zero sem estrela, cache batendo com o livro, bônus de nível sem tocar na carteira |
| `test/unit/levelsService.test.js` | 3 testes do bônus por degrau, com curva sintética |

Para a T-06.3 e a T-06.4 saber:

1. **O molde já está pronto.** Pólen e mel repetem o desenho do XP: ler
   `points_amount` / `coins_amount` da mesma configuração, aplicar o fator de
   `reward_modifiers` e creditar pelo service que já existe. Os dois fatores da
   repetição são zero, então a repetição não paga nem pólen nem mel.
2. **O bônus de mel do nível espera a T-06.5.** `creditarXp` devolve
   `bonusDeMelPorNivel` e não credita; quem paga é o `coinsService`, com o motivo
   `subida-de-nivel` já semeado em `reward_reasons`.

---

### Sessão de 2026-08-19, continuação: T-06.3

Suíte em **367 testes, zero falhas** (364 antes), reconciliação OK.

| Arquivo | O que mudou |
|---|---|
| `src/services/pointsService.js` | `calcularPolenDaCelula` e `creditarPorCelula`, no molde do XP |
| `test/integration/recompensaDaCelula.test.js` | renomeado de `xpDeCelula.test.js` e com 3 casos de pólen: estreia, repetição pagando zero, cache batendo com `point_ledger` |

Para a T-06.4 saber:

1. **O molde é o mesmo, e a diferença é o débito.** Mel também sai da carteira, e
   a RN-004 exige que nunca fique negativo — `walletsRepository.debitarMel` já
   resolve isso com `WHERE coins >= ?` na mesma instrução do desconto, sem janela
   entre conferir e debitar.
2. **O bônus de nível espera lá.** `creditarXp` devolve `bonusDeMelPorNivel` desde
   a T-06.2 e ninguém o paga; o motivo `subida-de-nivel` já está semeado em
   `reward_reasons`. Quem credita é o `coinsService`, chamado pela T-06.5.

---

### Sessão de 2026-08-19, continuação: T-06.4

Suíte em **372 testes, zero falhas** (367 antes), reconciliação OK. As três
recompensas da célula estão calculadas e creditadas; falta quem as chame.

| Arquivo | O que mudou |
|---|---|
| `src/services/coinsService.js` | `calcularMelDaCelula`, `creditarPorCelula` e `creditarBonusDeNivel` |
| `test/integration/recompensaDaCelula.test.js` | 5 casos de mel: estreia, repetição pagando zero, bônus do degrau com motivo `subida-de-nivel`, cache batendo com `coin_ledger` e débito além do saldo recusado sem rastro |

Para a T-06.5 saber:

1. **Nada de recalcular estrelas.** A RN-030 tem dono desde a T-05.3
   (`progressService.registrarTentativa`), que devolve `estrelas`, `ehRepeticao`
   e o progresso do favo, e aceita conexão de fora.
2. **A ordem do crédito é livre, a transação não.** Os três `creditarPorCelula`
   recebem a mesma conexão; o bônus de nível só é conhecido depois do crédito de
   XP, então ele é o último a ser pago, pelo `coinsService`.
3. **O tempo de partida ainda não tem quem o grave.** `duration_seconds` existe
   em `game_sessions` desde a migration `003` e é a T-06.5 que fecha a RF-CON-04.

---

### Sessão de 2026-08-19, continuação: T-06.5

Suíte em **380 testes, zero falhas** (372 antes), reconciliação OK. O ciclo do
jogo existe do começo ao fim, menos a tela.

| Arquivo | O que é |
|---|---|
| `src/services/gameSessionService.js` | `abrir`, `fechar` e `abandonar` — o único orquestrador das três recompensas |
| `src/services/validadoresDeJogo.js` | validação por slug de `game_types`; hoje só `quiz-do-favo`, e o conteúdo vai à tela sem o gabarito |
| `src/repositories/gameSessionsRepository.js` | `bloquearAbertaPorToken`, com `FOR UPDATE` |
| `test/integration/sessaoDeJogo.test.js` | 8 testes: célula travada, token e conteúdo sem gabarito, pagamento das três recompensas, reenvio, cliente mentindo, repetição, jogo sem validador, partida de outro jogador |

Para a T-06.6 e a T-06.8 saber:

1. **A defesa de hoje é a trava mais o `finalizar`.** `bloquearAbertaPorToken`
   serializa conclusões simultâneas e `finalizar` só fecha partida aberta. A
   T-06.6 acrescenta o mecanismo geral de `idempotency_keys`, que a **compra**
   também precisa (DT-18).
2. **O aceite da etapa ainda não foi exercido.** "Cinco conclusões em paralelo
   creditam uma vez" é a T-06.8; o que existe hoje é o reenvio sequencial.
3. **A RF-CON-04 fechou.** `duration_seconds` é gravado pelo banco no
   `finalizar`, e a lacuna L-2 do laudo da E05 está paga.

---

### Sessão de 2026-08-19, continuação: T-06.6

Suíte em **384 testes, zero falhas** (380 antes), reconciliação OK. **DT-18 paga.**

| Arquivo | O que é |
|---|---|
| `src/services/idempotencyService.js` | `executarUmaVezSo`, com a reserva da chave dentro da transação da operação |
| `src/repositories/idempotencyKeysRepository.js` | `reservar` por `INSERT IGNORE` e `buscar` |
| `src/repositories/purchasesRepository.js` | `buscarUltimaDoItem`, para o reenvio responder com a compra que existe |
| `src/services/purchasesService.js` | `comprar` aceita `chaveDeIdempotencia`; o corpo da transação virou `registrarCompra` |
| `src/services/gameSessionService.js` | `fechar` roda pelo mecanismo; o corpo virou `creditarPartida` |
| `src/controllers/paginaController.js`, `src/views/pages/loja.ejs`, `src/routes/loja.js`, `src/controllers/purchasesController.js` | uma chave por renderização da loja, validada como UUID na rota |
| `test/integration/idempotencia.test.js` | 4 testes da compra |

Para a T-06.7 e a T-06.8 saber:

1. **A partida tem duas defesas, não uma.** A trava `FOR UPDATE` serializa
   conclusões simultâneas e a chave impede a segunda execução. O aceite da etapa
   — cinco conclusões em paralelo creditando uma vez — é a T-06.8, e é ele que
   vai provar as duas juntas sob concorrência de verdade.
2. **A compra sem chave continua funcionando**, para quem chama a API direto. É
   escolha consciente: a proteção fica com quem chama, e a tela sempre manda a
   chave.

---

### Sessão de 2026-08-19, continuação: T-06.7

Suíte em **388 testes, zero falhas** (384 antes), reconciliação OK.

| Arquivo | O que mudou |
|---|---|
| `src/services/auditService.js` | `retratoDoSaldo` (mel, pólen, XP e nível) e `registrarRecompensa` |
| `src/services/gameSessionService.js` | linha `partida.concluida`, uma por partida, sem linha no reenvio |
| `src/services/profilesService.js` | linha `xp.ponto-de-partida` — o XP inicial creditava sem rastro |
| `src/services/tasksService.js`, `src/services/goalsService.js` | o antes/depois passou a carregar o saldo, além da entidade |
| `test/integration/auditoriaDeCreditos.test.js` | 4 testes, incluindo a imutabilidade da trilha |

Para a T-06.8 saber:

1. **O aceite é concorrência de verdade.** "Cinco conclusões em paralelo
   creditam uma vez" nunca foi exercido: o que existe é reenvio sequencial. As
   duas defesas a provar juntas são a chave de idempotência e a trava
   `FOR UPDATE` no token.
2. **A auditoria serve de prova.** Uma partida creditada uma vez tem exatamente
   uma linha `partida.concluida`; contá-las é um jeito direto de o teste
   verificar que não houve crédito duplo.

---

### Sessão de 2026-08-19, continuação: T-06.8 — E06 entregue

Suíte em **392 testes, zero falhas** (388 antes), reconciliação OK. **As oito
tarefas da E06 estão feitas**; falta a auditoria da etapa.

| Arquivo | O que é |
|---|---|
| `test/integration/aceiteDoMotor.test.js` | 4 testes: cinco conclusões em paralelo, cinco compras em paralelo, repetição a 25% e cliente mentindo |

O que a etapa deixou pronto, em uma frase cada:

1. **Todo valor de recompensa vem do banco** — `reward_configs` para a célula e
   `reward_modifiers` para o corte da repetição.
2. **Três services de crédito, um por recompensa**, e nenhum deles paga o que é
   do outro: o XP calcula o bônus do degrau, e quem o credita é o mel.
3. **A partida é o único orquestrador**, com a nota saindo do gabarito do banco
   e a duração saindo do `TIMESTAMPDIFF`.
4. **Idempotência com dono**: chave reservada dentro da transação, e o reenvio
   respondido pela tabela de domínio.
5. **Todo crédito deixa rastro** com o saldo antes e depois, em trilha imutável.

O que a E06 **não** entregou, e está registrado: nenhuma tela mostra recompensa
(rota e tela de jogo são E07), e cinco dos seis tipos de jogo seguem sem
validador, por decisão da T-06.5.

---

### Sessão de 2026-08-19, encerramento da E06

A etapa foi auditada (`docs/06-AUDITORIA-DA-ETAPA.md`) e as **três lacunas de
risco médio foram corrigidas antes de abrir a E07**. Suíte em **395 testes, zero
falhas** (392 antes), reconciliação OK.

| Lacuna | Correção |
|---|---|
| L-1 | `compra.realizada` passou a carregar o saldo antes e depois — a T-06.7 enriqueceu quatro operações e esqueceu justamente a única que tira mel |
| L-2 | `is_replay` é corrigido no `finalizar`, com `COALESCE`: ausente quer dizer "não sei", e o valor da abertura fica |
| L-3 | Partida abandonada é recusada com erro de validação, em vez de devolver resultado zerado |

**Uma lição que vale para as próximas etapas:** a primeira versão da L-2
sobrescrevia `is_replay` com o padrão e apagava a informação de quem fecha
partida sem calcular recompensa. Quem pegou foi um teste de repository escrito na
E01, meses antes de o problema existir — teste de camada baixa continua pagando
aluguel muito depois de escrito.

Ficam abertas sete lacunas de risco baixo, cada uma com etapa marcada na seção 3
do laudo.

---

### Sessão de 2026-08-19, abertura da E07: T-07.1

Suíte em **407 testes, zero falhas** (395 antes).

| Arquivo | O que é |
|---|---|
| `docs/CONTRATO-DE-JOGO.md` | o ciclo da partida, as três funções de um validador, o quiz como exemplo e o passo a passo para acrescentar um jogo |
| `src/services/validadoresDeJogo.js` | cada validador virou objeto com `conferirForma`, `paraJogar` e `validar`; `tiposJogaveis()` diz quais existem |
| `test/unit/validadoresDeJogo.test.js` | 12 testes sem banco |

Para a T-07.2 saber:

1. **O servidor já está pronto.** `gameSessionService.abrir` devolve token e
   conteúdo sem gabarito; `fechar` recebe `{ respostas }` e paga tudo. A tela não
   precisa saber nada sobre recompensa.
2. **A rota é `/trilha/:idFavo/celula/:idCelula`**, que a E05 já aponta no botão
   "Jogar", hoje desligado pela constante `JOGO_DISPONIVEL` em `paginaController`.
3. **A tela de resultado é a T-07.6**, então o quiz precisa de um destino
   provisório ao terminar, e vale decidir isso no checkpoint em vez de improvisar.

---

### Sessão de 2026-08-19, T-07.2: a primeira tela de jogo

Suíte em **415 testes, zero falhas** (407 antes).

| Arquivo | O que é |
|---|---|
| `src/views/pages/celula.ejs` | a casca da tela: carregando, jogo, erro e resultado provisório |
| `src/public/js/quiz.js` | abre a partida, mostra uma pergunta por vez, manda as respostas |
| `src/controllers/gameSessionsController.js` e `src/routes/partidas.js` | `POST /partidas`, `/:token/resultado` e `/:token/abandono`, só JSON |
| `src/services/contentService.js` | `temJogo` por célula, no lugar da constante geral |
| `test/integration/quizDoFavo.test.js` | 8 testes pelo HTTP |

Para a T-07.3 saber:

1. **A casca é quase genérica.** `celula.ejs` só tem de específico os ids do quiz
   e o `scripts: ['/js/quiz.js']`. Antes de escrever o segundo jogo, vale decidir
   o que vira parte comum — no terceiro já será tarde.
2. **O Tailwind é compilado.** Classe nova em view exige `npm run css:build`, ou
   ela simplesmente não existe no CSS servido.
3. **A barra de progresso usa `.barra-N` de cinco em cinco**, porque a CSP não
   permite largura em `style`.

---

### Sessão de 2026-08-19, T-07.3: o segundo jogo, e dois bugs que só o navegador acha

Suíte em **429 testes, zero falhas** (415 antes).

| Arquivo | O que é |
|---|---|
| `src/services/validadoresDeJogo.js` | validador de `arraste-e-classifique`: caixas, cartas e gabarito por `id` |
| `src/public/js/arraste.js` | o jogo: arrastar de verdade, e o mesmo caminho por clique e teclado |
| `src/public/js/partida.js` | a parte igual em todo jogo: abrir partida, erro, barra e resultado |
| `src/views/pages/celula.ejs` e `src/views/partials/jogos/` | a casca genérica e a área de cada jogo |
| `scripts/seeds/05_demo_content.sql` | conteúdo real nas três células de arrastar |
| `test/integration/arrasteEClassifique.test.js` | 7 testes pelo HTTP |

**O jogo.** O corpo do conteúdo é
`{ tipo, enunciado, categorias: [{ id, nome }], cartas: [{ texto, categoria }] }`,
e a resposta é a lista de `id` de caixa, uma por carta, na ordem enviada. É o
primeiro jogo cuja resposta é texto, e não número: o contrato nunca prometeu
número, prometeu uma decisão por item na ordem em que o conteúdo foi enviado.
Carta deixada fora de qualquer caixa conta erro, como a pergunta em branco do
quiz.

**A acessibilidade não é um segundo jogo.** Arrastar e clicar acabam na mesma
função: quem arrasta dispara o mesmo `colocar` que o botão "Colocar aqui"
dispara. Cada jogada é anunciada em região `aria-live`, e o foco volta para a
carta depois de a tela ser redesenhada — sem isso, quem joga pelo teclado
perderia o foco a cada jogada.

**Os dois bugs que só apareceram com a aplicação de pé.** Vinham da T-07.2 e
matavam o jogo em qualquer navegador, apesar de a suíte inteira passar:

1. **A página não mandava o token de CSRF.** O `quiz.js` lia
   `document.body.dataset.csrfToken`, que nunca existiu na tela de célula, então
   todo `POST /partidas` responderia 403. Os testes não pegaram porque pegavam o
   token de outra tela e mandavam no cabeçalho.
2. **`data-celulaId` não vira `dataset.celulaId`.** Atributo de HTML não guarda
   maiúscula: o navegador lê `data-celulaid` e o `dataset` só monta o nome em
   camelo a partir de `data-celula-id`. O id chegava `NaN`.

Os dois estão corrigidos, e o teste que os prova abre a partida usando **só** o
token que veio da própria página.

Para a T-07.4 saber:

1. **Teste pelo HTTP não é teste de navegador.** A suíte passava com o jogo
   quebrado. Vale sempre subir a aplicação e percorrer o caminho como o
   navegador percorre — foi isso, e só isso, que achou os dois bugs acima.
2. **A casca é comum de verdade agora.** Um jogo novo não escreve cabeçalho,
   carregando, erro, barra nem resultado: importa o `partida.js` e escreve só a
   área do meio.
3. **O `<script>` do layout virou `type="module"`**, porque as telas de jogo
   importam a parte comum. Módulo já é adiado, então o `defer` saiu.

---

### Sessão de 2026-08-19, T-07.4: o terceiro jogo, e a trilha com buracos

Suíte em **442 testes, zero falhas** (429 antes).

| Arquivo | O que é |
|---|---|
| `src/services/validadoresDeJogo.js` | validador de `monte-o-orcamento`: faixa por categoria e total exato |
| `src/public/js/orcamento.js` | os botões − e +, o restante à vista e o envio da divisão |
| `src/views/partials/jogos/orcamento.ejs` | a área do jogo dentro da casca comum |
| `scripts/seeds/05_demo_content.sql` | cinco células de orçamento, uma por favo, das três faixas |
| `test/integration/monteOOrcamento.test.js` | 6 testes pelo HTTP |

**O jogo.** O corpo é
`{ tipo, enunciado, total, passo, categorias: [{ id, nome, minimo, maximo, dica }] }`,
e a resposta é a lista de números, um por categoria. Erro é categoria fora da
faixa, mais um erro quando a soma não fecha com o total, então o `total` do
contrato é o número de categorias mais um — errar uma categoria ainda vale três
estrelas, e errar tudo vale uma (RN-030).

**Duas decisões que valem lembrar.** A primeira: este é o único jogo **sem
gabarito escondido**. A regra de cada categoria vai inteira para a tela, porque
ela é o enunciado — esconder o mínimo não deixaria o jogo mais honesto, deixaria
o jogo impossível. A segunda: o `conferirForma` recusa orçamento cujas regras não
fecham, isto é, soma dos mínimos acima do total ou soma dos máximos abaixo dele.
Sem isso existiria conteúdo em que nenhuma divisão zera os erros, e a criança
perderia estrela por um defeito do conteúdo.

**O botão + para no que sobra, e não no máximo da categoria.** Não dá para
distribuir mel que não existe, mas dá para passar do máximo de uma categoria:
esse é um erro que o jogador pode cometer de propósito, e travá-lo esconderia o
jogo em vez de ensiná-lo.

**A trilha tem buracos, e eles são da etapa.** Com três dos seis tipos de jogo
implementados, várias células ficam inalcançáveis jogando: quem é da faixa B
esbarra na segunda célula do primeiro favo, que é `mercado-esperto` (P1, T-07.7),
e a faixa C esbarra no `cofre-do-tempo` da terceira célula. Não é defeito de
regra — a RN-026 está fazendo o que deve —, é a etapa pela metade. Fecha com a
T-07.5 e a T-07.7. Enquanto isso, o teste do orçamento libera as células
anteriores pelo `progressService`, como o teste da trilha já fazia.

Para a T-07.5 saber:

1. **Rodar a aplicação virou parte da tarefa.** Depois dos dois bugs da T-07.3,
   toda tarefa de jogo termina com o servidor de pé e a partida percorrida como
   o navegador percorre — página, `dataset`, token, abertura, resultado.
2. **A lista do orçamento é montada uma vez e só atualizada.** Redesenhar a cada
   toque destruiria o botão recém-clicado e o teclado perderia o foco no meio da
   conta. O Cofre do Tempo, que muda números o tempo todo, tem o mesmo problema.
3. **Gráfico sem dependência e sem `style`.** A CSP não permite largura em
   atributo, e é por isso que a barra de progresso usa `.barra-N`. O gráfico do
   cofre precisa nascer com essa restrição em mente — SVG servido pela própria
   página resolve.

---

### Sessão de 2026-08-19, T-07.5: o cofre, e o botão que prometia demais

Suíte em **458 testes, zero falhas** (442 antes). Com esta tarefa, **os quatro
jogos obrigatórios da E07 existem**.

| Arquivo | O que é |
|---|---|
| `src/services/validadoresDeJogo.js` | validador de `cofre-do-tempo` e a função `saldoDoCofre` |
| `src/public/js/cofre.js` | um ciclo por vez, gráfico em SVG e histórico em tabela |
| `src/views/partials/jogos/cofre.ejs` | a área do jogo dentro da casca comum |
| `scripts/seeds/05_demo_content.sql` | quatro células de cofre, das três faixas |
| `test/integration/cofreDoTempo.test.js` | 6 testes pelo HTTP |

**O jogo.** O depósito entra no começo do ciclo e o rendimento cai no fim, com
arredondamento para baixo a cada ciclo. É essa ordem que faz guardar cedo render
mais do que guardar tarde, e existe teste com esse nome: os mesmos 50 de mel
batem a meta quando guardados nos dois primeiros ciclos e não batem quando
guardados nos dois últimos. Erro é ciclo fora da regra, mais um se a meta não
vier. Ciclo inválido perde o depósito, mas o tempo passa — o que já estava
guardado rende assim mesmo.

**A taxa é do conteúdo, não do código.** A célula de faixa A rende 10% por
semana, para a curva ser visível em quatro ciclos; a de faixa C rende os 2% da
RN-042, com o vocabulário do cofre de verdade. Este jogo é simulação e **não
encosta na tabela `vaults`**: o Cofre real é da etapa da economia.

**O gráfico não custou dependência.** É um `<svg>` montado na página, com barras
posicionadas por atributo de geometria e cor por `currentColor` — a CSP não
permite `style` inline, e biblioteca de gráfico para quatro barras seria peso
sem motivo. Abaixo dele, a mesma informação aparece em tabela, que é o que o
leitor de tela lê (RNF-25).

**O bug que a verificação achou, e que não era desta tarefa.** Com a aplicação de
pé, o botão "Jogar" aparecia em célula cujo conteúdo ainda é de demonstração, e o
clique morria em `422 Esta célula ainda não é jogável`. Vinha da T-07.2:
`temJogo` só perguntava se o **tipo de jogo** tinha validador, nunca se **aquele
conteúdo** era jogável. Agora a trilha carrega o corpo de cada célula e pergunta
ao `conferirForma`; célula com conteúdo de demonstração volta a dizer "em breve".
É o mesmo defeito da L-1 da auditoria da E05, em outra roupa, e agora tem teste
que troca o conteúdo por um placeholder e confere que o botão some.

Para a T-07.6 saber:

1. **O resultado já está pronto no servidor.** Estrelas, XP, pólen, mel, subida
   de nível e bônus chegam do `POST /partidas/:token/resultado`. A tela nova
   troca a apresentação; nenhum número precisa ser recalculado.
2. **O painel provisório mora no `partida.js`**, e é ele que os quatro jogos
   chamam em `concluirPartida`. Mudar lá muda nos quatro de uma vez.
3. **A trilha tem menos buracos.** Faltam validadores só para `mercado-esperto` e
   `ordene-a-prioridade`, os dois P1 da T-07.7. As células de quiz que ainda têm
   conteúdo de demonstração agora aparecem honestamente como "em breve".

---

### Sessão de 2026-08-19, T-07.6: um fim de partida só

Suíte em **462 testes, zero falhas** (458 antes). Com esta tarefa, **tudo o que
é obrigatório na E07 está entregue**.

| Arquivo | O que é |
|---|---|
| `src/views/partials/jogo-resultado.ejs` | a tela de resultado, servida em qualquer jogo |
| `src/public/js/resultado.js` | preenche a tela, e é o único lugar que escolhe o mascote |
| `src/services/contentService.js` | `proximaCelulaJogavel`, para o botão saber para onde ir |
| `src/styles/tema.css` | as estrelas aparecendo uma a uma, desligadas por `prefers-reduced-motion` |
| `test/integration/telaDeResultado.test.js` | 4 testes pelo HTTP |

**O fim empurra para o próximo jogo.** O resultado passou a devolver
`proximaCelula`, e o botão principal leva a ela quando existe e está aberta. Se
a próxima estiver travada, sem conteúdo ou for de um jogo que ainda não existe,
o botão volta a ser "Voltar ao favo" — nunca um beco. A pergunta é feita depois
do crédito, porque é a conclusão desta célula que abre a seguinte.

A primeira versão dessa regra estava errada, e quem achou foi a aplicação de pé:
célula já concluída tem estado `concluido`, não `disponivel`, então exigir
`disponivel` fazia o "Continuar" sumir para quem repetia uma célula. O certo é
recusar só a travada — concluída não é beco. Tem teste com esse nome.

**A arte do mascote tem um ponto de troca só.** O mapa `MASCOTES` no
`resultado.js` guarda imagem, texto alternativo e título de cada desfecho. A
arte de hoje é provisória e será substituída por desenho próprio; quando isso
acontecer, muda-se ali e em nenhum outro arquivo. A animação está presa à classe
do tema, não à imagem, então um desenho novo entra sem reescrever a tela.

**A animação obedece à RNF-26.** As três estrelas aparecem com atraso escalonado
por classe — a CSP não permite `style`, o mesmo motivo das `.barra-N` —, e o
bloco de `prefers-reduced-motion` acende a estrela ganha sem animar nada.

**Um teste falhou uma vez e não repetiu** (DT-37). Foi em
`test/integration/seguranca.test.js`, fora do escopo desta tarefa, na execução
completa da suíte; sozinho, o arquivo passa três de três. Não consertei sem
saber a causa: está registrado como dívida, com o próximo passo escrito.

Para a T-07.7 saber:

1. **O painel de resultado não existe mais dentro do `partida.js`.** Quem
   apresenta é o `resultado.js`; o `partida.js` só manda as respostas e entrega
   os dados. Jogo novo não precisa saber que a tela existe.
2. **A retomada de sessão tem lugar reservado no contrato**, e nenhum dos quatro
   jogos ocupou esse lugar por conta própria.
3. **`proximaCelulaJogavel` já sabe recusar beco**, e serve a qualquer tela que
   precise perguntar "e agora, para onde?".

---

### Sessão de 2026-08-19, T-07.7: a E07 fecha

Suíte em **491 testes, zero falhas** (462 antes). Três commits, na ordem em que
foram feitos: Mercado Esperto, Ordene a Prioridade e retomada de sessão.

| Arquivo | O que é |
|---|---|
| `src/public/js/mercado.js` e `partials/jogos/mercado.ejs` | o quinto jogo |
| `src/public/js/ordene.js` e `partials/jogos/ordene.ejs` | o sexto jogo |
| `migrations/015_estado_de_partida.sql` | a coluna `saved_state` em `game_sessions` |
| `src/services/validadoresDeJogo.js` | dois validadores e a quarta função do contrato |
| `test/integration/{mercadoEsperto,ordeneAPrioridade,retomadaDePartida}.test.js` | 16 testes pelo HTTP |

**O Mercado Esperto não guarda gabarito.** A melhor compra é a de menor preço
por unidade, calculada a partir dos dois números — conteúdo nenhum consegue
declarar uma "melhor compra" que a conta desmente. Em troca, o `conferirForma`
recusa empate no primeiro lugar, que daria duas respostas certas.

**O Ordene a Prioridade conta par invertido, e não posição.** Com quatro itens
são seis pares: trocar dois vizinhos custa um erro, inverter tudo custa seis.
Contar por posição faria mover um item empurrar todos os outros, e uma bobagem
viraria nota zero — o oposto da RN-030.

**A retomada ocupou o lugar que o contrato reservava desde a T-07.1.** Quem abre
uma célula que já tem partida aberta recebe **aquela** partida, com o estado, em
vez de uma nova: fechar a aba deixou de custar o progresso, e voltar à célula
parou de encher a tabela de partidas órfãs. O estado é rascunho e nunca nota —
há teste que salva duas respostas certas, manda duas erradas no fim e confere
que valeram as do fim.

**O estado mora no servidor, e não no navegador.** É a mesma razão do rascunho
do onboarding: o Beever é web multiplataforma, e quem começa no computador da
escola precisa continuar no celular de casa.

**Dois testes foram reescritos, e a razão é boa:** eles afirmavam existir "célula
de jogo que ainda não existe", e não existe mais. Passaram a cobrir o que restou
— conteúdo que não dá para jogar, e o fim do favo.

Para a auditoria saber:

1. **Nenhuma célula semeada ficou sem jogo.** Os seis tipos de `game_types` têm
   validador. O que ainda aparece como "em breve" é célula cujo **conteúdo** é de
   demonstração — cinco células de quiz —, e isso é conteúdo a escrever, não
   código a fazer.
2. **O aceite da etapa tem duas metades não medidas**: "roda em até 1 s" e
   "funciona no celular". A DT-22 cobre as duas.
3. **A DT-37 continua aberta** e é o risco mais chato de todos: teste que falha
   de vez em quando ensina a ignorar vermelho.

---

### Sessão de 2026-08-19, T-08.1: a meta vencida deixou de ser um beco

Suíte em **498 testes, zero falhas** (492 antes).

A tarefa era menor do que o nome sugeria. Três das quatro metades da T-08.1 já
existiam desde a E06: progresso automático, conclusão única e expiração. O que
faltava era a **renovação** — a DT-33, aberta desde a auditoria da E04, que é
metade da RN-017 e toda a RF-MET-05.

| Arquivo | O que é |
|---|---|
| `src/services/goalsService.js` | `renovar` e `listarRenovaveis` |
| `src/services/goalPlannerService.js` | `planoAtual`, para a renovada ganhar o prazo de hoje |
| `src/repositories/goalsRepository.js` | `listarExpiradasRenovaveis` e `marcarRenovada` |
| `src/views/pages/metas.ejs` | três desfechos, três ações |
| `test/integration/renovacaoDeMeta.test.js` | 6 testes pelo HTTP |

**A renovação não custou banco.** A coluna `renewed_from_goal_id` e o status
`renovada` já existiam desde a E01, e o fator de 50% é linha em
`reward_modifiers` — o mesmo lugar do corte da repetição de célula. Zero
migration.

**O progresso sobrevive.** A meta retomada herda tipo, título, alvo **e o
quanto já foi feito**; ganha prazo novo pelo plano de hoje e paga metade.
Recomeçar do zero tiraria justamente o trabalho que a renovação existe para
salvar, e "meta vencida não é punida" ficaria sem sentido.

**Um vazamento de recompensa fechado no caminho.** O `concluir` nunca conferiu o
status: meta **vencida** com o alvo batido ainda podia ser cobrada. Com a
renovação isso viraria pagamento dobrado — a renovada herda o progresso, então a
mesma meta pagaria duas vezes. Agora só meta `ativa` paga, no service e no
`WHERE` do `UPDATE`.

**Uma decisão do checkpoint foi cumprida pela metade, e é deliberado.** A ideia
era a renovação ocupar a vaga de uma meta gerada pelo planejador, para respeitar
o teto da RN-014. Implementar isso exigia apagar uma linha de meta ou inventar um
status para "meta que ninguém quis" — os dois piores do que o problema. A
renovação passou a poder deixar o jogador com uma meta a mais do que o teto, e
isso se corrige sozinho: o planejador não cria enquanto estiver acima da conta. O
teto da RN-014 é o alvo do planejador, não uma trava sobre o que o jogador pode
carregar.

Para a T-08.2 saber:

1. **A expiração é preguiçosa** e roda quando o jogador abre a tela, sem rotina
   diária. A sequência vai precisar do mesmo padrão, e da DT-23 resolvida: a
   virada do dia ainda usa o relógio do servidor, não o fuso do perfil.
2. **`planoAtual` já existe** e devolve dias, metas ativas, prazo e dificuldade
   do plano de hoje — serve a qualquer regra que precise do plano.
3. **O `ck_goals_dates` do banco recusa `due_at <= starts_at`.** Quem for
   fabricar meta vencida em teste precisa mover as duas datas, não só o prazo.

---

### Sessão de 2026-08-19, T-08.2: o dia passou a ser o do jogador

Suíte em **512 testes, zero falhas** (498 antes).

A tarefa tinha duas metades, e a segunda era a dívida DT-23, aberta desde a
revisão da E02. Sem ela a sequência nasceria torta: quem não estivesse em São
Paulo perderia o dia na hora errada.

| Arquivo | O que é |
|---|---|
| `src/utils/diaDoJogador.js` | o dia no fuso do perfil: data, início e fim de dia e de semana, soma e diferença |
| `src/repositories/streaksRepository.js` | `streaks` e `streak_events` |
| `src/services/streakService.js` | `avaliar` e `registrarDiaCumprido` |
| `src/repositories/gameSessionsRepository.js` | `listarConclusoesNoIntervalo` |
| `src/services/tasksService.js` | a virada do dia deixou de usar o relógio do servidor |
| `src/services/gameSessionService.js` | a sequência avança quando a célula é concluída |
| `src/controllers/paginaController.js` | avaliação preguiçosa no painel e nas metas |
| `test/unit/diaDoJogador.test.js` e `test/integration/sequencia.test.js` | 7 + 7 testes |

**Zero migration.** `streaks`, `streak_events` e os quatro slugs de desfecho já
existiam desde a E01, com a `UNIQUE (user_id, event_date)` que serve de
idempotência da avaliação. Nada de banco novo.

**O horário de verão pediu duas passagens.** A primeira versão de `inicioDoDia`
pegava o deslocamento do meio-dia e errava a meia-noite do dia em que o fuso
muda — Lisboa, 29 de março. Agora a função chuta e confere no instante certo, e
o teste cobre os dois dias da virada.

**A sequência anda um dia por dia.** `registrarDiaCumprido` avalia os dias
fechados antes de somar o de hoje: sem isso, quem perdeu ontem somaria em cima
de uma sequência que já devia estar zerada. E o dia que já tem evento não conta
de novo, por mais células que a criança jogue.

**A fonte do dia cumprido é `game_sessions`**, não `cell_progress`. A tabela de
progresso guarda uma linha por célula e só a última conclusão: repetir a mesma
célula amanhã apagaria o dia de hoje do histórico.

Para a T-08.3 saber:

1. **O gancho do escudo está marcado** em `streakService.desfechoDoDia`, no
   caminho entre "dia marcado" e `perdido`.
2. **A sequência ainda não aparece em tela nenhuma.** O número existe e é
   avaliado; mostrar é a T-08.6, e é lá que ele vai ser visto pela primeira vez.
3. **Quem for testar tempo usa `agora` injetado**, não relógio de sistema:
   `avaliar` e `registrarDiaCumprido` recebem a data como parâmetro, e é assim
   que os sete testes de integração viajam no tempo.

---

### Sessão de 2026-08-19, T-08.3: o escudo se gasta sozinho

Suíte em **518 testes, zero falhas** (512 antes).

O escudo já existia como item de loja desde a E01 — `escudo-de-sequencia`, 400
de mel, `is_consumable = 1` — e o desfecho `protegido` já estava no seed. O que
faltava era quem gastasse: nenhum consumível do catálogo tinha consumo até
aqui, e `inventory_statuses` só conhecia ativo, inadimplente e vendido.

| Arquivo | O que é |
|---|---|
| `src/services/streakService.js` | `escudosDisponiveis`, `sincronizarEscudos` e `consumirEscudo` |
| `src/repositories/inventoryRepository.js` | `contarAtivosDoItem`, `bloquearUnidadeAtivaDoItem`, `marcarComoConsumido` |
| `src/repositories/streaksRepository.js` | `definirEscudos`, o espelho da contagem |
| `src/services/purchasesService.js` | o teto de dois, recusado antes do débito |
| `scripts/seeds/02_age_bands_domains.sql` | o estado `consumido` |
| `test/integration/escudoDeSequencia.test.js` | 6 testes |

**Consumir não é vender.** O estado novo `consumido` entrou porque marcar o
escudo gasto como `vendido` inventaria uma venda e um valor de venda que
ninguém pagou — e o relatório de patrimônio da E09 leria isso como dinheiro que
voltou. O estado serve aos outros três consumíveis do catálogo, que ainda vão
precisar dele: dica extra, passe de revisão e mel dobrado.

**"Em mãos" mudou de sentido.** `listarPorUsuario`, `contarDoItem` e o cálculo
de patrimônio filtravam só o vendido; agora excluem os dois estados finais. Sem
isso, o escudo gasto continuaria na tela do inventário e ainda valeria como
pré-requisito de item na loja.

**O escudo não é queimado à toa.** Só é gasto quando há sequência para salvar
(`diasAtuais > 0`), e o dia protegido não avança a sequência — ele apenas
impede a quebra, e `last_counted_date` fica onde estava.

**O consumo trava a unidade.** `bloquearUnidadeAtivaDoItem` usa `FOR UPDATE` e o
`marcarComoConsumido` confere o status no próprio `WHERE`: duas avaliações
simultâneas não gastam o mesmo escudo duas vezes.

Uma divergência pequena corrigida no caminho: o comentário da migration `004`
dizia que o desfecho protegido tinha slug `protegido_por_escudo`, mas o seed
grava `protegido`. O seed é a verdade; o comentário foi corrigido.

Para a T-08.4 saber:

1. **`avaliar` devolve `protegidos`**, a lista de dias salvos por escudo, além
   de `diasAtuais` e `melhorDias` — é por `diasAtuais` que o marco vai ser
   reconhecido.
2. **O bônus do marco precisa sair de banco** (RN-006). O padrão da casa é
   `reward_configs` ou `reward_modifiers`, como o corte da repetição e o fator
   da meta renovada.
3. **A tabela `achievements` existe desde a migration `007`**, que já a descreve
   como o par natural de `streaks`.

---

### Sessão de 2026-08-19, T-08.4: o marco paga uma vez na vida

Suíte em **524 testes, zero falhas** (518 antes).

A tabela `achievements` existia desde a migration `007` e estava vazia: nenhum
seed, nenhum repository, ninguém desbloqueando nada. O motivo de lançamento
`marco-de-sequencia` já estava em `reward_reasons` desde a E01.

| Arquivo | O que é |
|---|---|
| `scripts/seeds/08_achievements.sql` | as cinco conquistas, com o bônus em `reward_coins` |
| `src/repositories/achievementsRepository.js` | `buscarPorSlug`, `desbloquear`, `listarDoUsuario` |
| `src/services/achievementsService.js` | desbloqueia e paga na mesma transação |
| `src/services/streakService.js` | `conferirMarco` quando a sequência avança |
| `migrations/007_gamification.sql` | cabeçalho corrigido |
| `test/integration/marcoDeSequencia.test.js` | 6 testes |

**A conquista deixou de ser cortável.** O cabeçalho do `007` dizia que a
migration inteira era escopo P1 e podia não ser aplicada. A RF-SEQ-04 é M e paga
o marco a partir daquelas tabelas, então `achievements` e `user_achievements`
entraram no MVP; a liga continua P1 e continua cortável.

**A escala do bônus é 100, 200, 400, 800 e 1500**, decidida no checkpoint contra
o que já existe no jogo: meta simples paga 100, meta alta 200, subir de nível
paga de 50 a 275, e o Escudo de Sequência custa 400 — o marco de 30 dias compra
exatamente um escudo.

**Pagar duas vezes é impedido pelo banco, não por consulta.** O `INSERT IGNORE`
em `user_achievements` devolve zero linhas quando o jogador já tem a conquista, e
o crédito nem chega a acontecer. Quebrar a sequência e voltar aos sete dias não
paga de novo — marco é história, não renda.

**O valor vem do banco e o teste cobra isso**: um dos casos troca o
`reward_coins` da conquista de 30 dias para 777 e exige que a carteira receba
777.

Para a T-08.5 saber:

1. **`registrarDiaCumprido` e `avaliar` devolvem `marcos`**, a lista de marcos
   pagos na chamada, junto de `protegidos`, `diasAtuais` e `melhorDias`.
2. **A geração de tarefas já usa o dia do jogador** desde a T-08.2, então o teto
   diário e semanal pode ser escrito em cima de `dataDoDia` sem tocar em fuso.
3. **A DT-21 continua aberta** e agora tem fonte: `cell_completed` existe desde a
   E07, e o progresso de tarefa ainda é um passo manual.

---

### Sessão de 2026-08-19, T-08.5: a tarefa deixou de andar por clique

Suíte em **531 testes, zero falhas** (524 antes).

Duas coisas estavam erradas ao mesmo tempo. O teto de 3 ativas da RN-047 não era
respeitado, porque ninguém expirava tarefa vencida — `expirarVencidas` existia no
repository sem nenhum chamador, e as ativas se acumulavam. E o progresso andava
por clique em "Avancei um passo", que era a DT-21 aberta desde a auditoria da
E02: "conclua 3 células" se cumpria com três cliques, sem jogar nada.

| Arquivo | O que é |
|---|---|
| `src/services/taskProgressSources.js` | as três fontes que existem, medidas na janela da tarefa |
| `src/services/tasksService.js` | expiração preguiçosa, teto de 3 e `sincronizarProgresso` |
| `src/repositories/tasksRepository.js` | `expirarVencidasDoUsuario`, `contarAtivas`, `definirProgresso` |
| `src/repositories/progressRepository.js` | `contarFavosConcluidosNoIntervalo` |
| `src/controllers/tasksController.js`, `src/routes/tarefas.js`, `src/views/pages/metas.ejs` | a rota e o botão do passo manual saíram |
| `scripts/seeds/02_age_bands_domains.sql` | `depositar-no-cofre` nasce inativo |
| `test/integration/tarefasDoDia.test.js` | 7 testes |

**A tarefa mede dentro de uma janela**, diferente da meta. "Conclua 3 células
hoje" conta o que foi feito entre a criação da tarefa e o prazo dela, não o total
da vida do jogador — por isso `taskProgressSources` recebe janela, e
`goalProgressSources` não.

**O progresso é valor absoluto e só sobe.** `definirProgresso` grava com
`LEAST(GREATEST(...))`: quem conta é a consulta do evento, e uma contagem menor
não desfaz o que já foi cumprido.

**Tarefa impossível não é proposta.** `vault_deposit` não tem fonte antes do
cofre, então a tarefa dele nasce com `is_active = 0` e o gerador ainda filtra por
fonte mensurável — a mesma regra que o planejador de metas já aplica (RN-015).

**Dois testes existentes mudaram porque o comportamento mudou.** O do repository
trocou `registrarProgresso` por `definirProgresso`; o do fluxo autenticado passou
a cumprir a tarefa gerando o evento em vez de clicar três vezes. No mesmo
arquivo, o teste da compra passou a receber mel por lançamento no livro
(`ajuste-administrativo`): com o teto de 3 tarefas por dia elas não pagam mais o
item mais barato, e creditar direto na carteira quebrava o teste que confere
carteira contra o livro.

**Uma correção de numeração:** a dívida do espelho de escudos, registrada na
T-08.3 como DT-40, colidia com a DT-40 do laudo da E07. Ela virou **DT-42**, e a
dívida nova da tarefa do cofre entrou como **DT-43**.

Para a T-08.6 saber:

1. **`sincronizarProgresso` roda no painel e nas metas**, junto da sincronização
   de meta e da avaliação da sequência.
2. **A lista de tarefas na tela já não tem botão de avanço**; sobrou "Receber
   recompensa" quando a tarefa está cumprida e "Em andamento" antes disso.
3. **O calendário da semana precisa de `streak_events`**, que guarda um evento por
   dia avaliado com um dos quatro desfechos.

---

### Sessão de 2026-08-20, T-08.6: a sequência ficou visível

A E08 tinha construído quatro tarefas de motor sem que nada disso chegasse ao
jogador: a sequência avaliava, o escudo se gastava, o marco pagava, e a criança
não via nenhum dos três. Esta tarefa não acrescentou regra nenhuma, só expôs o
que já era calculado.

**O resumo da semana é do service, não da view.** `streakService.resumoDaSemana`
devolve os sete dias de domingo a sábado, cada um com data, nome, se é dia
marcado na agenda, o desfecho gravado em `streak_events`, se é hoje e se ainda
está no futuro — mais dias seguidos, melhor marca e escudos guardados. Cruzar
agenda com evento é conta, e conta no EJS é o que impede o mesmo dado de virar
JSON para um cliente futuro. O nome do dia veio junto: `schedulesService` ganhou
`nomeDoDia`, porque a convenção de 0 a 6 é daquele service e o array de nomes não
podia se repetir na tela.

**Um partial, duas telas.** `src/views/partials/ui/calendario-semana.ejs` recebe
o resumo pronto e um `compacto`. Em `/metas` ele aparece inteiro, com legenda; no
`/painel` vira faixa ao lado do nível, linkando para a tela cheia. A sequência é
o gancho diário, e escondê-la atrás de um clique era metade do efeito perdido.

**O estado nunca é só a cor.** Cada dia tem ícone próprio — visto, xis, escudo ou
o número do dia —, `aria-label` com dia, data e desfecho por extenso, e a versão
cheia traz a legenda escrita. É a RNF-25, a mesma regra que o favo bloqueado já
seguia.

**Duas coisas menores foram junto.** Os marcos desbloqueados passaram a aparecer
na tela de metas, lendo o `achievementsService.listarDoUsuario` que a T-08.4 já
tinha deixado pronto, e os dois títulos que a T-08.5 deixou sobrando sobre a
mesma lista de tarefas viraram um só.

Para a T-08.7 saber:

1. **`resumoDaSemana` aceita `agora` injetado**, como `avaliar` e
   `registrarDiaCumprido`, então o teste com tempo simulado não precisa mexer no
   relógio do processo.
2. **`test/integration/telaDeSequencia.test.js` já fixa uma semana** de 08 a 14 de
   março de 2026 e planta os quatro desfechos direto pelo repository; é o molde
   mais curto para os cenários que faltam.
3. **A tela é a única parte não verificada** desta tarefa: a marcação tem teste,
   o desenho não foi aberto em navegador (DT-22).

---

### Sessão de 2026-08-20, T-08.7: três semanas num relógio de mentira

O aceite da E08 nunca foi provar cada regra sozinha — isso as tarefas anteriores
já tinham feito, cada uma na sua janela de um ou dois dias. Era simular três
semanas de uso e a sequência bater com a regra em todos os cenários. Nenhum teste
fazia isso, e uma regra que só é exercitada em janelas curtas não prova que os
desfechos se encadeiam.

`test/integration/tresSemanasDeSequencia.test.js` roda vinte e um dias seguidos,
de 1 a 21 de março de 2026, com o instante de cada dia passado por parâmetro em
vez de lido do relógio da máquina. O roteiro é uma tabela: para cada data, se a
criança jogou, o desfecho que aquele dia acabou tendo e quantos dias seguidos ela
tem no fim do dia. O teste percorre a tabela chamando `avaliar` — que é o que a
abertura de uma página faz — e `registrarDiaCumprido` nos dias jogados, conferindo
a sequência dia a dia e, no fim, a lista inteira de eventos gravados.

O jogador mora em Nova York de propósito. Em 8 de março de 2026 o relógio de lá
adianta uma hora, então a corrida atravessa um dia de vinte e três horas, que é
a virada de fuso que a RN-024 manda respeitar e que nenhum teste de integração
tinha visto até agora. A agenda é de segunda a sexta, o que faz o fim de semana
virar dia neutro no meio da corrida em vez de num teste isolado.

Os cinco cenários se encadeiam num só percurso: cinco dias cumpridos, dois de
folga que não quebram, o sétimo dia pagando o marco, um dia em branco salvo pelo
escudo, outro em branco sem escudo que zera a sequência, e uma semana nova
começando do um. No fim, a sequência vale cinco, a melhor marca guarda oito, o
escudo saiu do inventário como consumido e a conquista de sete dias existe uma
vez só.

Um detalhe do arnês mereceu cuidado: a linha de `streaks` nasce com a data de
hoje de verdade, e a avaliação varre até sessenta dias para trás. Sem fixar
`last_evaluated_at` no primeiro dia da corrida, a primeira visita julgaria os
meses entre o cadastro e março. Foi exatamente o que aconteceu na primeira
execução, com um dia sobrando na lista de eventos.

Foi junto o teste do `nomeDoDia`, a função que a T-08.6 criou no
`schedulesService` e que o grafo apontava sem cobertura própria. São os sete dias,
o dia em texto como chega do formulário, e o dia fora da faixa que devolve texto
vazio em vez de derrubar a tela.

Para a auditoria da E08 saber:

1. **O `npm run lint` voltou a passar limpo.** Ele falhava com milhares de erros
   vindos das skills de plugin guardadas em `.github/skills/` e
   `.claude/skills/impeccable/`, que são modelo de MCP e não código do Beever.
   As duas entraram nos `ignores` do `eslint.config.js`; as skills próprias do
   projeto são markdown e continuam de fora da varredura por natureza.
2. **A tela da sequência continua sem passagem por navegador** (DT-22): tudo o
   que a T-08.6 e a T-08.7 provam é a marcação e o número, não o desenho.
3. **A suíte inteira leva cerca de dois minutos** com o banco de pé, e este teste
   sozinho responde por seis segundos deles.

### Sessão de 2026-08-20, auditoria da E08: três consertos e um veredito revisto

A auditoria da E08 está em `docs/08-AUDITORIA-DA-ETAPA.md`. O aceite da etapa —
simular três semanas e a sequência bater com a regra — já estava cumprido e
provado, então o laudo olhou para o que a frase do aceite não cobria. Achou dez
lacunas, nenhuma bloqueante, e as três de maior risco foram corrigidas na mesma
sessão.

O primeiro veredito escrito classificou duas delas como bloqueantes e estava
errado. Bloqueante é regra de negócio violada, recompensa errada paga ou dado em
risco; nenhuma das duas passava nesse teste. A classificação foi corrigida antes
de o documento ser escrito, e a lição ficou registrada no próprio laudo: quando
tudo é bloqueante, nada é.

**O fuso do banco não estava fixado.** O `@@global.time_zone` era `SYSTEM` e só
valia UTC porque a imagem `mysql:8.4` sobe assim. A aplicação grava e lê tudo em
UTC — o driver usa `timezone: 'Z'` —, mas `finished_at`, `completed_at` e o
`due_at < NOW()` da expiração usam o relógio do servidor MySQL. Num host em fuso
local os dois lados discordariam, a atribuição de partida ao dia sairia errada e
a RN-024 quebraria em silêncio, sem teste nenhum acusar, porque o contêiner de
teste é UTC. O compose passou a subir o banco com `--default-time-zone=+00:00`.
É o tipo de defeito que só aparece no servidor, e o conserto é uma linha.

**Três dos sete tipos de meta não tinham fonte de progresso.** O seed cria os
sete tipos da RN-015, mas só `coin_balance` e `user_level` sabiam se medir.
Célula, favo e sequência dependem de dados que a E06, a E07 e a própria E08 já
tinham entregado. Nada quebrava — o planejador nunca sorteia o que não sabe
medir —, mas o jogador de semana cheia recebia assunto repetido. As três fontes
foram escritas, com duas contagens novas no `progressRepository` para célula e
favo concluídos na vida inteira, porque o alvo da meta é absoluto ("chegue a 43
células"), e a leitura de `current_days` para a sequência: a de hoje, não o
recorde, senão a meta de manter sequência nunca cairia junto com a quebra.

As réguas de alvo dos três tipos entraram no seed com teto curto de propósito. A
régua multiplica o alvo pelo tamanho da sessão, que vai a 45 minutos, e o plano
de um dia por semana tem só quatro dias marcados em 28: sem teto, a meta de
sequência nasceria pedindo mais dias do que existem no prazo, contra a RN-015.
Os números continuam sendo chute educado, e a DT-31 segue de pé — agora com três
linhas a mais para calibrar no playtest.

**A avaliação da sequência não travava o jogador.** Duas requisições simultâneas
na primeira visita do dia julgavam o mesmo dia perdido e cada uma gastava um
escudo para salvar um dia só; o `INSERT IGNORE` gravava um evento e o segundo
escudo, 400 de mel, sumia sem proteger nada. A varredura inteira passou a rodar
dentro de uma transação que começa por `usersRepository.travarPorId`, o mesmo
cuidado que o planejador de metas já tomava, e o consumo do escudo deixou de
abrir transação própria para cair junto com o evento do dia. O marco e a
auditoria ficaram fora da trava, porque a conquista abre transação própria e a
UNIQUE do banco já impede pagar duas vezes.

O teste dessa correção dispara duas avaliações em paralelo e exige que sobre um
escudo guardado. Antes de dar a correção por boa, a trava foi desligada e o teste
falhou — teste de corrida que passa nos dois mundos não prova nada.

Três testes existentes assumiam o mundo de dois tipos de meta e precisaram
mudar: um esperava assunto repetido com três metas, outro contava com a meta de
mel sair no sorteio. Agora um afirma o contrário e os outros fixam o tipo de
propósito, com o motivo escrito no comentário.

Para a E09 saber:

1. **Faltam duas fontes de progresso de meta**, `patrimony_total` e
   `vault_balance`, e as duas nascem na E09. Quando entrarem, os sete tipos da
   RN-015 passam a ser sorteáveis, e a tarefa `depositar-no-cofre` sai do estado
   inativo do seed (DT-43).
2. **A DT-44 e a DT-45 são de tarefa, não de meta**, e as duas são conserto de
   poucas linhas: o status no `WHERE` da conclusão e a contagem por célula
   distinta.
3. **O seed precisa rodar de novo** em qualquer banco já criado antes desta
   sessão, senão as réguas de alvo dos três tipos novos não existem e o
   planejador continua sorteando só dois assuntos.

### Sessão de 2026-08-21, T-09.1: a economia ganhou porta

O schema inteiro da economia existe desde a E01 — `vaults`, `vault_transactions`,
`economic_cycles`, `patrimony_snapshots`, os cinco comportamentos de item e os
quatro estados de inventário, todos semeados. O que faltava era acesso: nenhum
repository lia nada disso, e as cinco tarefas seguintes da E09 iam todas esbarrar
na mesma parede. Esta tarefa não criou tabela nenhuma.

**O cofre.** `vaultsRepository` faz o par saldo e extrato. O saque tem
`balance >= ?` no próprio `WHERE`, como o `debitarMel` da carteira: zero linha
afetada quer dizer saldo insuficiente, e o cofre nunca fica negativo nem depende
de uma leitura anterior ter sido honesta. O `balance_after` de cada movimento é
gravado por quem acabou de mexer no saldo, dentro da mesma transação, para o
extrato nunca discordar do cofre. `totalSacadoDesde` existe por causa da RN-043,
que manda o mel sacado não render no ciclo do saque.

Um detalhe pegou o teste e vale registrar: `created_at` guarda segundo cheio, sem
fração, então comparar com um instante de milissegundos perdia o saque gravado no
mesmo segundo do corte. O corte passou a ser arredondado para baixo dentro do
repository. É o tipo de erro que some no teste e aparece em produção.

**O ciclo.** `economicCyclesRepository.registrar` é `INSERT IGNORE` e devolve
`true` só na primeira vez. É essa a trava da RN-036: o jogador que some seis
semanas volta e recebe seis ciclos, e quem abrir duas abas ao voltar não recebe
doze. O `summary` em JSON guarda o que aconteceu no ciclo, e é dele que sai o
extrato da Colmeia da T-09.8.

**O patrimônio.** `patrimony_snapshots` ficou explicitamente como foto para o
gráfico, não como fonte. Quem responde quanto o jogador tem hoje é o
`PatrimonyService` da T-09.3, somando carteira, cofre e bens na hora, porque a
RN-039 pede valor auditável e saldo em cache é a mentira mais cara de depurar.
Regravar o mesmo dia sobrescreve, pela UNIQUE de usuário e data.

**O valor do item no ciclo.** `aplicarCicloDeValor` faz a conta inteira dentro do
`UPDATE`, com o piso e o teto do próprio item e a referência no que a unidade
custou, não no preço de hoje na loja. O sinal vem de `valuation_rate`: positivo
valoriza, negativo deprecia — é a mesma coluna de onde o seed deriva os
comportamentos, então não há dois lugares dizendo se o item sobe ou desce.
Calcular fora e gravar depois abriria a janela entre ler e escrever, que é
exatamente o buraco que a auditoria da E08 fechou na sequência.

**A inadimplência** conta ciclos em `overdue_cycles` em vez de virar dívida
(RN-037), e a unidade inadimplente continua aparecendo no ciclo seguinte — ela
segue cobrando até ser vendida. Quem vende, e por quanto, é o service.

Para a T-09.2 saber:

1. **`purchasesRepository` não precisou de nada novo.** O desconto do upgrade sai
   do `current_value` da unidade que o jogador já tem, que o inventário já
   entrega, e `buscarUltimaDoItem` já cobre o reenvio idempotente.
2. **`itemsRepository.listarUpgradesDe`** responde quais itens são melhoria de
   um que o jogador possui — é por aí que a loja monta a oferta com desconto.
3. **Os comportamentos vêm em lote** (`listarComportamentosDosItens`), porque o
   ciclo de quem ficou semanas fora pediria uma consulta por unidade.
4. **A suíte falhou uma vez em quatro execuções**, com quatro casos, e passou nas
   três seguintes. A saída não foi guardada e a causa não foi reproduzida; ficou
   como DT-51, irmã da DT-37.


### Sessão de 2026-08-21, T-09.2: a loja virou service

A compra já existia desde a E06 e funcionava. O que faltava era a loja em volta
dela: quem pode comprar o quê, o que falta para os itens travados e quanto sai o
upgrade de quem já tem o modelo menor. Entrou `shopService`, que monta a vitrine
e a prévia; quem transaciona continua sendo o `purchasesService`, porque montar
a vitrine e debitar mel são dois trabalhos diferentes.

**O upgrade.** A entrega da unidade antiga abate o valor atual dela, cheio, e
não os 60% da venda voluntária da RN-040: na troca o jogador não está se
desfazendo do bem, está movendo o valor dele para um bem maior, e punir a troca
ensinaria a lição errada. A unidade nova nasce valendo o preço de tabela, então
o patrimônio antes e depois da troca é o mesmo — é isso que o teste confere no
centavo. A unidade entregue é travada com `FOR UPDATE` dentro da transação, pelo
mesmo motivo que a E08 travou o escudo: ler o valor antes deixaria a janela para
duas abas darem a mesma casa de entrada duas vezes.

**A ordem das checagens mudou, e por um bug de verdade.** Requisitos e teto de
escudo eram conferidos antes da transação. Com o upgrade isso quebra o reenvio
idempotente: a casa média exige a casa pequena, e o primeiro envio acabou de
vender a pequena, então o segundo envio da mesma chave era recusado por um
requisito que a própria compra consumiu. As checagens passaram para dentro de
`registrarCompra`, que é o caminho que o reenvio não percorre.

**Os requisitos passaram a ser avaliados em lote.** A vitrine pergunta pelo
catálogo inteiro, e uma consulta por item era N+1 na abertura da loja. Mesmo
desenho de `listarComportamentosDosItens`, e o nome do item pré-requisito já vem
no join, para o service não voltar ao banco só por ele.

`itemsController` saiu: a rota `/loja/itens` passou a responder a vitrine pelo
`shopController`, que também expõe a prévia em `/loja/itens/:idItem/previa`. A
página `/loja` continua no catálogo cru até a T-09.7 — está registrado como
DT-54, ao lado do patrimônio que falta no topo (DT-52) e da venda voluntária que
ainda não existe (DT-53).


### Sessão de 2026-08-21, T-09.3: o patrimônio ganhou dono

A conta da RN-039 estava espalhada. A trilha chamava de patrimônio o valor dos
bens, sem carteira nem cofre, e por isso o favo com requisito de patrimônio
media a coisa errada; a loja mostrava só o mel; e o requisito
`patrimonio-minimo` dos itens voltava como "não dá para verificar". Entrou
`patrimonyService`, que soma carteira, cofre e bens toda vez que é chamado. Não
existe total guardado em coluna nenhuma: a regra pede valor auditável, e
auditável é o que dá para recontar.

**A foto continua sendo foto.** `patrimony_snapshots` alimenta o gráfico de
evolução e nada mais. É gravada preguiçosamente, no mesmo desenho da sequência:
o dia sem foto ganha a primeira, e o dia cujo total mudou recebe a reescrita
pela UNIQUE de usuário e data. Sem essa comparação, toda abertura de loja viraria
uma escrita.

**O que passou a enxergar o patrimônio.** A vitrine e a prévia da compra
devolvem a composição, então a tela consegue dizer para onde o patrimônio vai
antes de a criança confirmar. O inventário separa bens de cosméticos e traz o
valor pago de cada unidade, que veio de um join novo com `purchases`. O
requisito `patrimonio-minimo` dos itens deixou de ser aviso e passou a bloquear
de verdade, e o desbloqueio de favo da RN-028 passou a medir o patrimônio
completo em vez de só os bens.

**Cofre de quem nunca depositou.** A leitura devolve zero e não cria linha em
`vaults` — quem cria o cofre é o primeiro depósito, na T-09.4. Leitura que
escreve é o tipo de surpresa que ninguém procura no lugar certo depois.


### Sessão de 2026-08-21, T-09.4: o cofre abriu

O schema do cofre estava pronto desde a E01 e os repositories desde a T-09.1; o
que faltava era a regra. Entrou `vaultService`, e com ele a DT-43 foi paga: a
tarefa `depositar-no-cofre` estava inativa no seed desde a T-08.5 porque
ninguém sabia medir `vault_deposit`, e agora a fonte existe.

**Depósito e saque mexem em três lugares** — carteira, cofre e extrato — então
acontecem numa transação só, com o cofre travado por `FOR UPDATE` antes de
gravar o movimento. Sem a trava, dois saques ao mesmo tempo escreveriam dois
`balance_after` com o mesmo número, e o extrato deixaria de explicar o saldo. O
mel guardado não passa a pertencer a outro lugar: o `patrimonyService` já o
conta, e há teste provando que guardar não muda quanto o jogador tem.

**O rendimento desconta o que saiu.** A RN-043 diz que o mel sacado não rende no
ciclo do saque, e é isso que `totalSacadoDesde` responde: a base do cálculo é o
saldo menos o sacado desde o último ciclo, com piso em zero. Quem tirou tudo na
semana recebe zero, e não um rendimento sobre dinheiro que já foi embora. Quem
chama isso uma vez por ciclo é o `economicCycleService` da T-09.5.

**A meta paga na hora.** Bater a meta é conferido no mesmo instante em que o
saldo cresce, seja por depósito ou por rendimento — bônus que chega uma semana
depois não ensina a ligação entre guardar e ganhar. O percentual (5% do alvo)
vive em `reward_modifiers`, como manda a RN-006, e a meta batida é limpa: o
campo esvaziado é a trava contra pagar duas vezes e é o que libera a próxima
meta. O prazo é guardado mas ainda não faz nada ao vencer, e isso ficou como
DT-58.

**A projeção é conta pura**, sem banco, e por isso a T-09.4 tem o teste unitário
que a T-09.3 não teve como escrever. A ordem importa e está fixada em teste: o
rendimento vem antes do depósito da semana, porque mel que acabou de chegar
ainda não rendeu.
### Sessão de 2026-08-25, T-09.5: a semana passou a acontecer

O ciclo econômico era a última peça da economia sem dono. A tabela
`economic_cycles` existia desde a E01 e o repository desde a T-09.1; o que
faltava era quem decidisse quantos ciclos passaram e o que cada um faz.

**O número do ciclo sai do calendário, não de um contador.** É a quantidade de
semanas cheias entre a semana em que a conta nasceu e a semana de hoje, no fuso
do perfil, com a semana começando no domingo, como já era na sequência. Um
contador incremental daria o mesmo resultado enquanto tudo desse certo, e
deslocaria a economia do jogador para sempre no primeiro reprocessamento. Com o
calendário, o mesmo instante devolve sempre o mesmo ciclo, e a `UNIQUE` de
`(user_id, cycle_number)` vira uma trava que sabe o que está travando.

**A marca vem antes dos efeitos.** Cada ciclo é uma transação própria, e a
primeira coisa dentro dela é o `INSERT IGNORE` do ciclo: quem chegou depois
recebe `false` e sai sem tocar em nada. Foi preciso um `gravarResumo` novo no
repository, porque o extrato só existe depois dos efeitos aplicados. Transação
por ciclo, e não uma para os seis, porque falhar no quarto não pode desfazer os
três primeiros — a próxima visita continua de onde parou.

**A ordem dos efeitos é regra de produto, não detalhe.** Valor, renda, custo
fixo, venda forçada e por último o cofre. A renda entra antes da cobrança de
propósito: quem tem barraquinha paga as contas com o que ela rendeu, e não fica
inadimplente por ordem de execução. O custo fixo é debitado direto pelo
`walletsRepository`, e não pelo `coinsService`, porque faltar mel aqui não é
erro — é a inadimplência da RN-037, que conta ciclos em vez de virar dívida.

**Teto de doze ciclos por visita**, na mesma ideia do limite de sessenta dias da
sequência: os ciclos acima do teto são marcados como processados sem efeito,
para o calendário não ficar devendo. Quem volta depois de um ano não perde o
inventário inteiro na primeira tela. Ficou como DT-60, para rever com jogador
real.

Para a T-09.6 e a T-09.8 saberem: o filtro da faixa etária tem um lugar só, no
`processarUm`, marcado por comentário — é ali que a Faixa A desliga depreciação,
custo fixo e inadimplência. E o `summary` de cada ciclo já sai no formato que o
aviso da Colmeia vai ler: valorização, depreciação, renda, custo, inadimplentes,
vendidos, rendimento do cofre e meta.
### Sessão de 2026-08-25, T-09.6: a Faixa A vive a economia sem punição

A RN-038 desliga três coisas para a criança de 6 a 8 anos, e só uma delas tinha
interruptor: `age_bands.is_upkeep_enabled` cobria o custo fixo desde a E01. A
depreciação ficaria sem fonte, então entrou a migration `016` com
`is_depreciation_enabled`. A inadimplência não ganhou coluna de propósito — ela
é consequência de não pagar o custo, e quem não cobra não tem como ficar
devendo. Uma lista de faixas escrita no service seria o valor mágico que a
RN-006 proíbe no resto da economia.

**A leitura tem um ponto só.** `profilesService.regrasEconomicasDoUsuario`
devolve os três interruptores, e nem o ciclo nem a loja conhecem a letra da
faixa. Perfil sem faixa gravada joga com tudo ligado, que é a regra das faixas B
e C — o padrão seguro é punir menos, nunca mais.

**A loja não esconde item.** O catálogo é o mesmo para todo mundo: a criança de
6 anos vê a moto igual ao irmão de 12, com o custo semanal em zero e uma frase
dizendo que ali aquele item não cobra nada nem perde valor. Esconder seria mais
fiel à leitura literal da regra e criaria dois catálogos para manter, além de
empobrecer a loja da faixa mais nova.

**Mudar de faixa perdoa a dívida.** Quem estava inadimplente e passou para uma
faixa sem custo fixo é regularizado no ciclo seguinte: a dívida era da regra
antiga, e ninguém deve ser punido por ter feito aniversário. O caminho contrário
— entrar numa faixa que cobra — passa a cobrar no ciclo seguinte, sem aviso na
tela, e isso ainda vai precisar de um.

O banco de desenvolvimento recusou `db:migrate` por causa das migrations `004` e
`007`, editadas depois de aplicadas em sessões anteriores — o guarda de checksum
fazendo o que deve. Foi recriado do zero na mesma sessão, com as 16 migrations
aplicadas, seed completo e `db:reconcile` fechando os livros. Era a DT-61, já
paga.
### Sessão de 2026-08-25, T-09.7: a economia ganhou tela

A regra da economia estava inteira desde a T-09.6 e não chegava à criança: a
loja renderizava o catálogo cru, o inventário morava num pedaço do painel e o
cofre não tinha página nenhuma. Esta tarefa não mexeu em regra — foram quatro
telas lendo o que os services já respondiam.

**A confirmação tem endereço próprio**, `/loja/itens/:id/confirmar`, em vez de
um balão na loja. Funciona sem JavaScript, dá para voltar, e o impacto sai
pronto do `previaDaCompra`: quanto sai do bolso, quanto sobra, para onde vai o
patrimônio e o que o item vai cobrar por semana. O botão da vitrine leva para
lá, nunca direto para a compra — gastar sem ver a conta é exatamente o hábito
que o Beever quer desfazer.

**Os dois gráficos são `canvas`**, por escolha do produto no checkpoint: a rosca
da composição do patrimônio e a linha da projeção do cofre. Todo gráfico tem o
mesmo dado escrito ao lado em texto e um `aria-label` com os números, então quem
usa leitor de tela ou abre a página com o script bloqueado não perde nada. A cor
sai das variáveis do tema, não de um hexadecimal repetido no script, e a medida
do canvas vive em classe do CSS porque a CSP proíbe estilo inline (RNF-11).

**O cofre é formulário comum.** Depósito, saque e meta são POST que redirecionam
de volta para `/cofre`, como a compra já fazia; o `vaultController` passou a
negociar conteúdo, e a meta ganhou um `POST /cofre/meta` ao lado do `PUT`,
porque formulário de navegador só sabe GET e POST. Um detalhe ficou como DT-62:
o campo de data não vem preenchido com o prazo já gravado.

O teste do fluxo autenticado esperava o botão "Comprar" da vitrine antiga e
passou a esperar "Quero este" — é a mesma tela, reescrita aqui. A DT-57 foi
paga. O que ainda não foi visto por olho humano é o desenho: os dois gráficos
pintados, a vitrine a 320 px e o foco de teclado nos formulários do cofre.
