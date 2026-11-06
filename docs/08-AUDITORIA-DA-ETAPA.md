# Auditoria da E08 — Metas e Sequência

**Data:** 2026-08-20 · **Commit auditado:** `82f943f` · **Suíte:** 543 testes, zero falhas
**Veredito:** pode avançar, zero bloqueantes. As três lacunas de maior risco (L-1, L-2 e L-3) foram corrigidas na mesma sessão; sete de risco menor ficam abertas e estão listadas abaixo.

O aceite da etapa, escrito no `docs/02-ROADMAP-ETAPAS.md`, é uma frase: simular três semanas de uso e a sequência bater com a regra em todos os cenários. Ele está cumprido e provado — o `tresSemanasDeSequencia.test.js` encadeia vinte e um dias em Nova York, atravessa a entrada do horário de verão, passa por dia de folga, dia perdido, escudo gasto e marco de sete pago uma vez só. O que esta auditoria encontrou está fora daquela frase: escopo de meta entregue pela metade, uma corrida que custa mel ao jogador e uma configuração de banco que hoje funciona por acidente.

## O que foi conferido, e como

A conferência foi feita contra o código e contra o banco de pé, não contra o que o `docs/ESTADO-DO-PROJETO.md` afirma. As oito suítes da etapa — `sequencia`, `escudoDeSequencia`, `marcoDeSequencia`, `tresSemanasDeSequencia`, `tarefasDoDia`, `telaDeSequencia`, `renovacaoDeMeta` e `planejadorDeMetas` — foram executadas contra o MySQL do compose antes de qualquer correção, e passaram inteiras. Depois das três correções a suíte completa foi rodada de novo: 543 testes, zero falhas, `eslint` limpo.

| Requisito | Situação | Onde está e onde é testado |
|---|---|---|
| RN-019 célula em dia marcado avança | atendido e testado | `streakService.registrarDiaCumprido` · `sequencia.test.js` |
| RN-020 dia neutro não avança nem quebra | atendido e testado | `streakService.desfechoDoDia` · `sequencia.test.js` |
| RN-021 quebra por dia marcado em branco, avaliação preguiçosa | atendido e testado | `streakService.avaliar`, chamado por `paginaController` · `sequencia.test.js` |
| RN-022 escudo automático, teto de dois | atendido e testado | `streakService.consumirEscudo`, `purchasesService` · `escudoDeSequencia.test.js` |
| RN-023 marcos com mel e conquista | atendido e testado | `streakService.conferirMarco`, `achievementsService` · `marcoDeSequencia.test.js` |
| RN-024 virada do dia no fuso do perfil | atendido e testado | `utils/diaDoJogador.js` · `tresSemanasDeSequencia.test.js`; o fuso do MySQL era implícito e foi fixado — lacuna L-1 |
| RF-SEQ-01 avaliar e atualizar a sequência | atendido e testado | `streakService.avaliar` |
| RF-SEQ-02 calendário semanal | atendido e testado | `partials/ui/calendario-semana.ejs` · `telaDeSequencia.test.js` |
| RF-SEQ-03 consumir escudo automaticamente | atendido e testado | igual à RN-022 |
| RF-SEQ-04 bônus e conquista no marco | atendido e testado | igual à RN-023 |
| RF-MET-01 gerar metas pela disponibilidade | atendido e testado | `goalPlannerService.garantirMetasAtivas` · `planejadorDeMetas.test.js`; cinco dos sete tipos são sorteáveis, os dois que faltam são da E09 — lacuna L-2 |
| RF-MET-02 listar com percentual e prazo | atendido e testado | `pages/metas.ejs` · `renovacaoDeMeta.test.js` |
| RF-MET-03 progresso automático a cada evento | **parcial** | `goalsService.sincronizarProgresso` mede cinco fontes, mas é leitura preguiçosa na abertura da tela, não escuta de evento |
| RF-MET-04 creditar uma única vez | atendido e testado | `goalsRepository.concluir` com `completed_at IS NULL` no `WHERE` · `renovacaoDeMeta.test.js` |
| RF-MET-05 expirar e oferecer renovação | atendido e testado | `goalsService.expirarVencidas` e `renovar` · `renovacaoDeMeta.test.js` |
| RF-MET-06 recalcular quando a disponibilidade muda | atendido e testado | `profilesService.definirDisponibilidade` · `disponibilidade.test.js` |
| RF-MET-07 histórico de metas concluídas (P1) | atendido sem teste | `pages/metas.ejs` lista as concluídas com a recompensa que renderam |
| RN-046 tarefa rende pólen e mel pequeno | atendido e testado | seed de `task_types` · `tarefasDoDia.test.js` |
| RN-047 diária em dia marcado, semanal na virada, máximo de três | atendido e testado | `tasksService.garantirTarefasDoDia` · `tarefasDoDia.test.js` |
| RF-TAR-01 geração diária e semanal | atendido e testado | igual à RN-047 |
| RF-TAR-02 listar, progredir e concluir | atendido e testado | `tasksService.sincronizarProgresso` e `concluir` · `tarefasDoDia.test.js` |
| Aceite: três semanas simuladas batendo com a regra | **atendido e provado** | `tresSemanasDeSequencia.test.js`, vinte e um dias com relógio injetado |

Camadas, segurança, recompensa e auditoria foram conferidos um a um. Não há SQL fora de repository. As duas rotas que mudam estado — concluir meta, renovar meta, concluir tarefa — validam o parâmetro com `param().isInt`, passam pelo CSRF e pelo `limiteRecompensa`. Não existe rota de progresso nem de criação de tarefa, e quem decide que o alvo foi atingido é o `WHERE current_value >= target_value` do UPDATE, nunca o clique. Toda mudança de mel e pólen deixa linha no livro: `meta.concluida`, `tarefa.concluida`, `conquista.desbloqueada`, `meta.expirada`, `meta.renovada`, `meta.criada`, `tarefa.gerada`, `sequencia.quebrada` e `sequencia.escudo-consumido`. Os créditos acontecem dentro de `emTransacao`, e a conclusão dupla é barrada pelo próprio `WHERE`. No EJS, `<%-` aparece só em `include`.

## As três lacunas de maior risco, corrigidas

**L-1, risco alto — o fuso do banco não estava fixado.** O `@@global.time_zone` era `SYSTEM` e só valia UTC porque a imagem `mysql:8.4` sobe assim; nada no `docker-compose.yml` nem nas migrations fixava o fuso. Do lado da aplicação, o driver usa `timezone: 'Z'` e o `paraMySQL` escreve sempre em UTC, mas `finished_at`, `completed_at` e a comparação `due_at < NOW()` usam o relógio do servidor MySQL. Num host cujo sistema estivesse em fuso local, os dois lados deixariam de falar a mesma língua: o `diasComCelulaConcluida` atribuiria partidas ao dia errado e a RN-024 quebraria em silêncio, sem nenhum teste acusar, porque o contêiner de teste é UTC. O serviço passou a subir com `--default-time-zone=+00:00`, e o contêiner recriado confirma `+00:00` no lugar de `SYSTEM`.

**L-2, risco médio — três das sete fontes de progresso de meta já eram mensuráveis e continuavam sem implementação.** O seed cria os sete tipos da RN-015, mas o `goalProgressSources.js` implementava `coin_balance` e `user_level`. As fontes `cell_completed`, `hive_completed` e `streak_days` dependem de dados que a E06, a E07 e a própria E08 já entregaram. Nada quebrava por causa disso — o planejador não sorteia o que não sabe medir —, mas o custo era variedade: o jogador com sete dias marcados recebia assunto repetido, e metas de célula, favo e sequência não existiam para ele. As três fontes foram escritas, com duas contagens novas no `progressRepository` (células e favos concluídos na vida inteira, porque o alvo da meta é absoluto) e a leitura de `current_days` para a sequência — a de hoje, não o recorde, senão a meta de manter sequência nunca cairia junto com a quebra. O seed ganhou as réguas de alvo dos três tipos, com teto curto de propósito: a régua multiplica o alvo pelo tamanho da sessão, que vai a 45 minutos, e o plano de um dia por semana só tem quatro dias marcados em 28 — sem teto, a meta de sequência nasceria pedindo mais dias do que existem no prazo. Restam duas fontes por fazer, `patrimony_total` e `vault_balance`, ambas da E09.

**L-3, risco médio — o escudo podia ser gasto duas vezes no mesmo dia perdido.** O `avaliar` não travava a linha do jogador. Duas requisições simultâneas na primeira visita do dia, com um dia marcado em branco e dois escudos em mãos, liam o mesmo dia como não avaliado e cada uma chamava `consumirEscudo`; o `INSERT IGNORE` gravava um evento `protegido` só, e o segundo escudo — 400 de mel — desaparecia sem proteger nada. A varredura inteira passou a rodar dentro de uma transação que começa por `usersRepository.travarPorId`, o mesmo cuidado que o `goalPlannerService.garantirMetasAtivas` já tomava, e o consumo do escudo deixou de abrir transação própria para cair junto com o evento do dia. O pagamento do marco e as linhas de auditoria ficaram fora da trava, porque a conquista abre transação própria e a UNIQUE do banco já impede pagar o mesmo marco duas vezes. O teste novo dispara duas avaliações em paralelo e exige que sobre um escudo guardado; sem a trava ele falha, o que foi conferido antes de a correção ficar.

## As lacunas que ficam abertas

**L-4, risco médio-baixo.** Tarefa expirada com o alvo já batido continua pagando. O `tasksService.concluir` não confere o status, e o `WHERE` do `tasksRepository.concluir` exige `completed_at IS NULL` e alvo cumprido, mas não `status = 'ativa'`. O `goalsService.concluir` faz essa checagem explicitamente e explica por quê. Como a rota aceita o identificador direto, quem cumpriu a tarefa e não clicou antes da virada ainda recebe no dia seguinte.

**L-5, risco médio-baixo.** A fonte `cell_completed` conta partidas, não células distintas: ela lê linhas de `game_sessions`. Repetir três vezes a célula mais fácil cumpre "Conclua 3 células hoje" e paga 20 de mel e 15 de pólen. O crédito da partida já reduz a repetição pela RN-008, a tarefa não. O teto diário é baixo, mas é farm, e a mesma fonte vai valer para a meta de células quando a L-2 for fechada.

**L-6, risco baixo.** O caminho real de produção não é simulável no tempo. O `gameSessionService` chama `registrarDiaCumprido(idUsuario)` sem passar o instante, então o aceite de três semanas exercita o `streakService` diretamente e insere a partida à mão. O fluxo que o jogador percorre de fato nunca passou por um relógio injetado.

**L-7, risco baixo.** A auditoria da quebra perde detalhe. O `avaliar` grava uma linha `sequencia.quebrada` por varredura, com o `antes` do início dela. Quem some duas semanas, quebra, emenda alguns dias e quebra de novo dentro da mesma varredura deixa uma linha só, com o número errado no `antes`.

**L-8, risco baixo.** O `achievementsService` grava `motivo: 'marco-de-sequencia'` para qualquer conquista. Hoje só a sequência desbloqueia, então nada está errado no livro; a primeira conquista de favo ou de patrimônio é que vai entrar rotulada como marco de sequência.

**L-9, risco baixo, checklist da seção 8 do design.** O dia de hoje no calendário usa `ring-2 ring-tinta`, que é contorno preto em badge, item vetado pelo checklist; os números dos dias não usam `tabular-nums`. O resto passa: as cores saem todas de token, o foco de teclado é visível, o `prefers-reduced-motion` está coberto, cada desfecho vem escrito por extenso além da cor, e a faixa funciona a 320 px.

**L-10, risco baixo.** O cabeçalho de `tasksService.js` ainda diz que a geração automática das tarefas do dia é a E08 e que ali existe a criação avulsa. A geração existe desde a T-08.5 e a criação avulsa foi removida. Comentário que descreve um código que não está mais lá custa mais caro do que comentário nenhum.

## Duas lições desta auditoria

A primeira: **bloqueante tem definição, e ela precisa ser aplicada com frieza**. A primeira versão deste veredito classificou a L-2 e a L-3 como bloqueantes. Nenhuma das duas viola regra de negócio, paga recompensa errada ou põe dado em risco — o critério que separa "corrige antes de avançar" de "corrige logo". Inflacionar a severidade gasta o crédito do rótulo: quando tudo é bloqueante, nada é.

A segunda: **teste verde não cobre configuração implícita**. A L-1 passa por todas as suítes porque o contêiner de teste é UTC por acaso da imagem. Um valor que o projeto depende e não declara é uma decisão que alguém vai tomar por engano mais tarde, provavelmente no servidor.
