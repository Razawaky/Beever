# Auditoria do onboarding — T-04.1

**Data:** 2026-08-18 · **Etapa:** E04 — Onboarding e planejador de metas ·
**Base:** commit `0ac0dc6` (E03 auditada e fechada) · **Suíte no início:** 228
testes passando.

O onboarding não nasceu na E04: ele existe desde antes da troca de schema e foi
realinhado de passagem na T-02.3, sem ninguém conferir se ele ainda cumpre a
RF-ONB e a RN-011. Esta auditoria faz essa conferência peça por peça e decide o
que a etapa reaproveita, o que reescreve e o que descarta — antes de escrever a
máquina de passos (T-04.2) e o `GoalPlannerService` (T-04.4), não depois.

**O que esta auditoria não é:** ela não projeta o planner. Ela vai até a
fronteira dele — a seção 4 diz exatamente quais dados o planner vai precisar ler
e quais o onboarding precisa ter gravado até lá, para que a T-04.4 não descubra
no meio do caminho que falta uma coluna e tenha que abrir migration nova.

Duas lacunas bloqueantes foram corrigidas durante a auditoria, com teste. Estão
marcadas como tal na seção 3; o resto virou dívida com dono.

---

## 1. Requisito a requisito

| Requisito | Situação | Onde está | Destino |
|---|---|---|---|
| RF-ONB-01 Fluxo em etapas, com barra de progresso e possibilidade de voltar | atendido, com ressalvas | `src/public/js/onboarding.js:76` (render), `:206` (voltar), `src/views/pages/onboarding.ejs:7` (barra) | barra fora do padrão `.barra-N` e sem `role="progressbar"` — lacuna 7 |
| RF-ONB-02 Seleção de faixa de idade | **atendido por outro caminho** | não é passo do wizard: sai da data de nascimento no cadastro, contra `age_bands` (`src/services/usersService.js:169`) | decisão ratificada na seção 5 |
| RF-ONB-03 Seleção dos dias da semana disponíveis (mín. 1) | **era parcial; corrigido nesta tarefa** | passo em `onboarding.js:49`; o mínimo agora é do servidor (`src/services/profilesService.js:112`, `src/routes/perfil.js:60`) | lacuna 1 |
| RF-ONB-04 Seleção de tempo por sessão | **não atendido** | `profiles.session_minutes` existe e fica no padrão 10; nenhum passo coleta | T-04.2 / T-04.3 (DT-20) |
| RF-ONB-05 Seleção de objetivo inicial | atendido | `onboarding.js:27`, resolvido contra `initial_goals` em `src/repositories/profilesRepository.js:45` | slug inválido é ignorado em silêncio — lacuna 5 |
| RF-ONB-06 Escolha de avatar/cor do mascote | atendido | `onboarding.js:15`, resolvido contra `avatars` | `avatar` é opcional na rota (`perfil.js:51`) embora a RF seja obrigatória — lacuna 5 |
| RF-ONB-07 Geração automática de metas conforme RN-014 ao concluir | **não atendido** | `profilesService.salvarOnboarding` fecha sem criar meta nenhuma | T-04.4 |
| RF-ONB-08 Bloqueio de acesso ao app até concluir | atendido e testado | `src/middlewares/requireOnboarding.js:28`, declarado em `routes/index.js:38` e nos routers de loja, metas e tarefas | — |
| RF-ONB-09 Edição posterior da disponibilidade, com recálculo | **não atendido** | `PUT /perfil/:id` não aceita `dias`; `schedulesService.definirSemana` existe e não tem chamador fora do onboarding | T-04.6 |
| RN-011 Ordem dos passos: apelido → faixa → dias → tempo → objetivo → mascote | **parcial** | ordem real: apelido → avatar → objetivo → nível → dias (`onboarding.js:7`) | lacuna 8 |
| RN-012 Onboarding obrigatório e bloqueante | atendido e testado | `requireOnboarding` / `requireOnboardingPendente`; `users.onboarding_completed_at` como fonte da verdade | — |
| RN-013 Disponibilidade editável depois, sem perder progresso | **não atendido** | não há rota de edição, logo não há recálculo | T-04.6 / T-04.7 |
| RN-014 Metas, prazo, dificuldade e multiplicador conforme dias marcados | **não atendido em código; tabela pronta** | `goal_difficulties` já traz multiplicador, mel, pólen e `default_days` (`scripts/seeds/02_age_bands_domains.sql:104`) | T-04.4 — ver seção 4 |
| RN-015 Sete tipos de meta, sorteados sem gerar meta impossível | **não atendido** | os sete tipos existem em `goal_types`; só duas fontes de progresso têm consulta (`src/services/goalsService.js:98`) | T-04.4 — ver seção 4 |
| RN-016 Meta concluída paga uma vez, audita e gera outra no lugar | parcial | pagamento e auditoria existem e são idempotentes (`goalsService.concluir:149`); **falta gerar a meta seguinte** | T-04.4 |
| RN-017 Meta vencida vira `expirada`, com renovação a 50% | **não atendido** | `goal_statuses` tem `expirada` e `renovada`, e `goals.renewed_from_goal_id` existe; nenhum código escreve esses estados | E08 |
| RN-018 Sempre ao menos uma meta ativa | **não atendido** | consequência direta de RF-ONB-07 e RN-016 | T-04.4 |

---

## 2. Inventário das peças, com veredito

| Peça | Arquivo | Veredito | Por quê |
|---|---|---|---|
| Guardas de onboarding | `src/middlewares/requireOnboarding.js` | **reaproveitar inteiro** | resolve RF-ONB-08 e RN-012 nas duas linguagens (redireciona navegador, devolve código para JSON); é o que a T-04.5 pediria e já está feito e testado |
| Transação do onboarding | `profilesService.salvarOnboarding:94` | **reaproveitar, estender** | grava apelido, avatar, objetivo, nível e agenda numa transação só, com marca de concluído gravada por último e uma vez — a base certa para pendurar tempo de sessão e a geração de metas |
| Agenda semanal | `schedulesService` + `schedulesRepository` | **reaproveitar inteiro** | escreve os 7 dias sempre, `ON DUPLICATE KEY` por dia, e já tem `definirDia` para a edição da T-04.6; a RN-013 não precisa de código de escrita novo, só de rota e de recálculo |
| Ponto de partida do XP | `levelsService.definirPontoDePartida:109` | **reaproveitar** | lê a curva de `levels`, lança no livro e atualiza o cache; é o passo "nível" que a RN-011 não pede mas o produto tem |
| Resolução de slug por SQL | `profilesRepository.atualizar:35` | **reaproveitar, corrigir o silêncio** | `COALESCE((SELECT id ... WHERE slug = ?), coluna)` evita o service conhecer ids, mas engole slug inexistente — ver lacuna 5 |
| Máquina de passos do wizard | `src/public/js/onboarding.js:7-129` | **reescrever na T-04.2** | a lista de passos, os rótulos e o HTML por tipo são bons e ficam; o que muda é o motor: hoje o estado vive só na memória da aba, não há passo salvo no servidor e a montagem usa `innerHTML` com valor do usuário |
| Marcação da tela | `src/views/pages/onboarding.ejs` | **reaproveitar, ajustar** | estrutura e layout ficam; a barra precisa virar `.barra-N` com `role`/`aria-valuenow`, como o resto do sistema depois da E03 |
| Passo "faixa etária" do wizard | não existe | **não criar** | a faixa vem da data de nascimento e não deve ser digitável — ver decisão D-1 na seção 5 |

---

## 3. Lacunas, em ordem de risco

### 1. Bloqueante — dava para concluir o onboarding com a semana inteira vazia — **corrigido**

A RF-ONB-03 exige pelo menos um dia. A tela cobrava (`onboarding.js:191`
recusa lista vazia), mas o servidor não: `body('dias').optional()` na rota e
nenhuma checagem no service. Quem falasse com a API direto — ou qualquer cliente
futuro que não fosse esta tela — concluía o onboarding com zero dias marcados.

O efeito não é cosmético: a agenda vazia é a entrada da RN-014, que não tem
faixa para zero dias, e é o que a geração de tarefas e a sequência leem para
saber em que dia cobrar presença. Um jogador nesse estado ficaria sem tarefa e
sem meta, sem erro em lugar nenhum.

Corrigido em `src/services/profilesService.js:112` (a regra) e
`src/routes/perfil.js:60` (a primeira barreira, preservando o formato em que um
único dia chega como texto). Teste em `test/integration/fluxoAutenticado.test.js`
— recusa com 422 e confirma que a conta **não** ficou marcada como configurada.

### 2. Bloqueante — tempo de sessão fora de 5/10/20 virava 500 — **corrigido**

`PUT /perfil/:id` aceitava `minutos_por_sessao` de 5 a 60, e o banco só aceita
5, 10 ou 20 (`ck_profiles_session_minutes`, migration `001_core_users.sql:129`,
que é a RN-011 escrita em CHECK). Verificado contra o banco real: um `UPDATE`
com 30 devolve `ER_CHECK_CONSTRAINT_VIOLATED`. Pelo caminho HTTP isso não vira
erro de formulário — vira violação de constraint no handler global, ou seja, 500
para o jogador e ruído de servidor no log por um campo mal preenchido.

Corrigido nos dois níveis: `src/services/profilesService.js:27` guarda a regra
(a lista das três durações, com o comentário apontando para o CHECK que a
repete) e `src/routes/perfil.js:32` recusa antes, com mensagem. O validador usa
conversão explícita porque `isIn` compara texto com número e recusaria até o
valor certo. Teste em `test/integration/fluxoAutenticado.test.js`: 30 devolve
422, 20 devolve 200.

### 3. Alto — o wizard não coleta três coisas que a RN-011 e a RN-050 pedem

Faltam o tempo por sessão (5/10/20) e as preferências de som e animação. As três
colunas existem em `profiles` e ficam no padrão para sempre, porque nenhuma tela
as escreve. É a DT-20, que já tinha dono na E04 e agora tem endereço: passos
novos na T-04.2 e persistência na T-04.3. O tempo por sessão não é preferência
decorativa — é o que dita o tamanho da sessão de jogo na E07.

### 4. Alto — o progresso do onboarding não é salvo a nenhum passo

Todas as respostas vivem no objeto `respostas` da aba (`onboarding.js:66`) e só
viajam ao servidor no último passo. Fechar a aba no meio começa do zero. O
próprio arquivo assume isso em comentário, e para três passos era defensável;
com seis, sendo um deles obrigatório por regra, deixa de ser. É exatamente o que
a T-04.2 pede ("progresso salvo a cada passo") e implica uma decisão de forma —
ver D-2 na seção 5.

### 5. Médio — slug inexistente de avatar ou objetivo é aceito em silêncio

`profilesRepository.atualizar` resolve os slugs com
`COALESCE((SELECT id FROM avatars WHERE slug = ?), avatar_id)`. Quando já existe
valor, slug inválido preserva o anterior — e isso é intencional, tem teste
(`test/integration/repositories/profiles.test.js:88`). O problema é o primeiro
gravação: sem valor anterior, `COALESCE` cai em `NULL`, o onboarding termina
"com sucesso" e o perfil fica sem avatar ou sem objetivo. Some-se a isso que
`avatar` é `optional()` na rota, embora a RF-ONB-06 seja obrigatória, e que
`objetivo` é validado apenas como "não vazio", nunca contra o catálogo.

O comentário do repository ainda afirma que "o banco recusa slug que não
existe". Ele não recusa; ele ignora. O texto precisa mudar junto com a correção.

Vira **DT-27**, com dono na T-04.3.

### 6. Médio — o wizard monta o HTML com valor do usuário sem escapar

`renderizarEtapa` interpola direto em `innerHTML`, inclusive o apelido digitado
(`onboarding.js:90`, `value="${valorAtual}"`). Digitar aspas no apelido e apertar
"Voltar" quebra o atributo e injeta marcação na própria página.

O alcance real é pequeno: o valor não vem do banco nem de outro usuário, então é
XSS em si mesmo, e a CSP em vigor (`script-src 'self'`, sem `unsafe-inline`) já
impede que um `onfocus=` injetado execute. Ou seja: hoje o que segura é a CSP,
não o código — e a regra do projeto é validar toda entrada contra XSS, não
depender só da rede de proteção. A T-04.2 reescreve esta função de qualquer
forma; a correção sai de graça junto, usando `textContent`/`setAttribute` em vez
de interpolação.

Vira **DT-28**, com dono na T-04.2.

### 7. Médio — a barra de progresso do onboarding é a única fora do padrão

A E03 tirou as barras de progresso do atributo `style` e criou
`classeDaBarra()` + as classes `.barra-0` a `.barra-100` (`src/utils/barraDeProgresso.js`).
O onboarding não passou por essa correção: ele escreve `barraProgresso.style.width`
em JavaScript (`onboarding.js:82`). Isso **funciona** — a CSP bloqueia estilo na
marcação, não a manipulação via CSSOM —, mas é a única barra do sistema em outro
padrão, e a barra também não tem `role="progressbar"`, `aria-valuenow` nem
`aria-valuemax`, então quem usa leitor de tela não recebe o progresso que a
RF-ONB-01 promete.

Vira **DT-29**, com dono na T-04.2.

### 8. Baixo — a ordem dos passos diverge da RN-011, e há um passo a mais

A RN-011 fixa apelido → faixa → dias → tempo → objetivo → mascote. O wizard faz
apelido → avatar → objetivo → nível → dias. Além da ordem, há um passo que a
regra não prevê (nível inicial autodeclarado, que alimenta
`definirPontoDePartida`) e dois que ela prevê e não existem (faixa, tempo).

Nada disso quebra o sistema, mas a RN-011 é a regra escrita e o código é outro.
Uma das duas precisa ceder — ver D-1 e D-3 na seção 5.

### 9. Baixo — o fuso do perfil nunca é escolhido nem detectado

`profiles.timezone` fica em `America/Sao_Paulo` para todo mundo. É metade da
DT-23 (a virada do dia usando o relógio do servidor), que tem dono na E08. Se a
T-04.2 for reescrever o wizard, detectar o fuso no cliente e mandá-lo junto é uma
linha — e a E08 encontra o dado já gravado em vez de ter que voltar aqui.

---

## 4. O contrato entre o onboarding e o `GoalPlannerService`

Esta seção existe para a T-04.4 não descobrir tarde que falta dado. Ela descreve
o que o planner vai precisar ler; **não** desenha o planner.

**O que a RN-014 lê, e onde já está:**

| Dado | Fonte | Situação |
|---|---|---|
| Dias marcados na semana | `schedules`, via `schedulesService.diasDisponiveis` | pronto |
| Prazo, dificuldade, multiplicador e recompensa | `goal_difficulties` (`alta` 2.0×/28 dias, `media` 1.5×/14, `simples` 1.0×/7) | pronto e semeado, exatamente com os números da RN-014 |
| Quantas metas ativas por faixa de dias (1–2 → 1, 3–4 → 2, 5–7 → 3) | **nenhuma** | não existe tabela nem código; é a decisão D-4 da seção 5 |
| Faixa etária do jogador | `profiles.age_band_id`, gravada no cadastro | pronto |
| Nível atual | `user_levels`, via `levelsService` | pronto |

**O que a RN-015 exige, e o que hoje é possível.** A regra manda sortear entre
sete tipos "respeitando o que o usuário já desbloqueou (nunca gera meta
impossível)". Os sete tipos estão semeados em `goal_types`, cada um com sua
`progress_source`, mas só duas fontes têm consulta implementada em
`goalsService.FONTES_DE_PROGRESSO`:

| Tipo | `progress_source` | Mensurável hoje? |
|---|---|---|
| Acumular mel | `coin_balance` | **sim** |
| Atingir nível | `user_level` | **sim** |
| Alcançar patrimônio | `patrimony_total` | não — patrimônio é E09 |
| Concluir um favo | `hive_completed` | não — favo é E05 |
| Concluir N células | `cell_completed` | não — célula é E05 |
| Manter sequência de N dias | `streak_days` | não — sequência é E08 |
| Guardar X no cofre | `vault_balance` | não — cofre é E09 |

Consequência direta para a T-04.4: **o planner do MVP sorteia entre dois tipos,
não sete**, e a cláusula "nunca gera meta impossível" da RN-015 deixa de ser
teórica — ela é o que impede o planner de criar hoje uma meta que ninguém
consegue medir e que ficaria ativa para sempre. O sorteio precisa perguntar
quais fontes existem, não assumir as sete. Conforme E05, E08 e E09 entregarem
suas fontes, o leque abre sozinho, sem tocar no planner.

**O que o onboarding precisa ter gravado antes de a T-04.4 rodar:** dias
(pronto), faixa (pronta), nível inicial (pronto), objetivo inicial (pronto,
porém ainda sem nenhum consumidor — o planner é o candidato natural a usá-lo
como peso do sorteio) e tempo por sessão (**faltando**, lacuna 3).

---

## 5. Decisões registradas

**D-1 — a faixa etária continua derivada da data de nascimento, não escolhida.**
A RF-ONB-02 e a RN-011 descrevem a faixa como passo do onboarding; o sistema a
calcula no cadastro contra `age_bands`. Fica como está: faixa etária determina
regra econômica (RN-038) e segmentação de conteúdo (RN-029) e não pode ser
autodeclarada por uma criança que queira "passar de nível". O documento de
requisitos é que precisa registrar isso, não o código mudar.

**D-2 — o progresso por passo é salvo no servidor, não em `localStorage`.**
Salvar no navegador seria mais barato, mas o onboarding grava em `profiles` e
`schedules` de qualquer forma, e um passo salvo no cliente não sobrevive a trocar
de aparelho — cenário comum quando a criança começa no computador da escola e
termina em casa. A forma exata (uma coluna de passo atual, ou gravação
incremental por campo) é decisão da T-04.2.

**D-3 — o passo "nível inicial" fica, e vira parte da RN-011.** Ele não está na
regra escrita, mas alimenta `definirPontoDePartida` e evita que quem já sabe do
assunto comece do zero. É produto entregue e testado; sai mais caro removê-lo do
que corrigir a regra.

**D-4 — a tabela dias → quantidade de metas precisa de dono antes da T-04.4.**
Prazo e recompensa já vivem em `goal_difficulties`; a quantidade de metas ativas
por faixa de dias não vive em lugar nenhum. Repetir o erro da DT-04 (número de
jogo em constante de código) é o risco óbvio. A T-04.4 decide entre acrescentar
colunas a uma tabela de domínio ou criar uma tabela própria de planejamento.

---

## 6. O que precisa acontecer antes de a T-04.2 começar

1. Nada — as duas lacunas bloqueantes foram corrigidas nesta tarefa, com teste,
   e a suíte está em 230 testes passando.
2. As lacunas 3 a 9 estão endereçadas: DT-20 (T-04.2/T-04.3), DT-27, DT-28 e
   DT-29 (T-04.2/T-04.3), DT-23 (E08, com a ressalva da lacuna 9).
3. A decisão D-4 precisa ser tomada **na abertura da T-04.4**, não durante a
   implementação.
