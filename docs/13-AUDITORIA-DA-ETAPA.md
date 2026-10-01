# Auditoria da E13 — Conquistas e liga

**Data:** 2026-08-31 · **Revisor:** o mesmo que escreveu a etapa, no papel de
revisor · **Suíte no fechamento:** 949 testes passando; 958 depois das duas
correções bloqueantes, feitas na mesma sessão.

## Como esta auditoria foi feita

A etapa foi verificada contra o aceite registrado no estado do projeto — a
conquista desbloquear sozinha pelo que o jogador fez, e a liga fechar a semana
sem rebaixamento punitivo —, mais os requisitos RF-GAM-01 a 03, RF-HOM-10 e 11,
RN-023, RF-SEQ-04 e os RNF-01, 04, 21, 33 e 39 que as quatro tarefas tocam. O
checklist de aceite visual da seção 8 do `docs/04-DESIGN-SYSTEM-E-LANDING.md` foi
aplicado às duas telas novas; o checklist de banco da seção 8 do `docs/03` foi
aplicado às migrations 022 e 023. A conferência foi feita lendo o código, os
testes e o CSS compilado, e não o que o estado do projeto afirma — e num ponto o
estado afirma o contrário do que o código faz.

## Requisitos

| Requisito | Status | Onde | Teste |
|---|---|---|---|
| RF-GAM-01 catálogo e regra | atendido e testado | `migrations/022`, `seeds/08_achievements.sql`, `criteriosDeConquista.js`, `achievementsService.js` | `catalogoDeConquistas.test.js` (10), `criteriosDeConquista.test.js` (8) |
| RF-GAM-01 desbloqueio por evento | atendido e testado | `eventosDeConquista.js`, `gameSessionService.js`, `homeService.js` | `desbloqueioAutomatico.test.js` (8), `eventosDeConquista.test.js` (6) |
| RF-GAM-01 tela da escada | atendido e testado | `conquistasDoJogador.js`, `pages/conquistas.ejs`, `ui/conquista-card.ejs`, `config/conquistas.js` | `telasDeConquistaEliga.test.js` |
| RF-GAM-02 liga semanal com grupos | atendido e testado | `migrations/023`, `leagueService.js`, `leaguesRepository.js` | `ligaSemanal.test.js` (11), `leagueService.test.js` (14) |
| RF-GAM-02 sem rebaixamento punitivo | atendido e testado *(corrigido na auditoria)* | `garantirParticipacao` só põe no grupo quem já ganhou pólen na semana | `ligaSemanal.test.js` — ninguém desce, e quem não pontuou não entra |
| RF-GAM-03 ranking só por apelido | atendido e testado | `pages/liga.ejs` — o `avatar_id` que o repositório traz não é desenhado | `telasDeConquistaEliga.test.js` — sem e-mail e sem data de nascimento no HTML |
| RF-HOM-10 conquistas recentes | **parcial** | `ui/conquista-nova.ejs` mostra só o que a visita corrente destravou | `telasDeConquistaEliga.test.js` cobre o aviso; nada cobre "recentes" |
| RF-HOM-11 posição na liga | atendido e testado | `homeService.js`, bloco da liga em `painel.ejs` | `ligaSemanal.test.js`, `telasDeConquistaEliga.test.js` |
| RN-023 / RF-SEQ-04 marcos de sequência | atendido e testado | `streakService.js` (`conferirMarcos`, pelo melhor já atingido) | `marcoDeSequencia.test.js` (6) |
| RNF-01 resposta ≤ 2 s | **atendido sem teste** nas telas novas | `/conquistas` soma a visita preparada, cinco avaliações de critério e o catálogo | o teto é medido na Colmeia, no painel administrativo e no fechamento da partida, e não em `/conquistas` nem em `/liga` |
| RNF-04 sem N+1 | atendido | `listarCriterioComEstado` e `listarMembrosComPolen` trazem escada e ranque num `SELECT` cada | `colmeia.test.js` conta consultas da Colmeia; as duas telas novas não têm contagem |
| RNF-21 contraste AA | atendido | pares novos calculados: tinta-suave sobre o creme do aviso dá 7,23:1, sobre mel puro 5,47:1, acerto-texto sobre branco 4,79:1 | `contraste.test.js` cobre os tokens, não estas combinações |
| RNF-33 coleta mínima de menores | atendido *(corrigido na auditoria)* | `apelidoPublico.js` é a regra única, aplicada no cadastro, no onboarding e na edição; o ranque troca apelido fora da regra por "Abelha \<id\>" | `apelidoPublico.test.js` (6), `telasDeConquistaEliga.test.js` — recusa na porta e substituição no ranque |
| RNF-39 negociação de conteúdo | **não atendido** nas rotas novas | `GET /conquistas` e `GET /liga` só renderizam HTML | nenhum |

Camadas, recompensa e auditoria conferidas: nenhuma SQL fora de repository
(`conquistasDoJogador.js` fala com `progressRepository` e `streaksRepository`,
que é o fluxo previsto); nenhum cálculo de recompensa no cliente — o
`resultado.js` só apresenta o que o servidor mandou; o desbloqueio grava
`conquista.desbloqueada` e o pódio grava `liga.premiada`, os dois com retrato do
saldo antes e depois; as duas escritas de saldo acontecem em transação e são
idempotentes pela `UNIQUE (user_id, achievement_id)` e pela trava
`final_rank IS NULL`. As rotas novas não recebem parâmetro, e todo dado sai por
`<%= %>`.

Checklist de banco (seção 8 do `docs/03`): as migrations 022 e 023 são
versionadas, nada foi apagado, o prêmio do pódio virou tabela em vez de número no
service, e o índice de data do `point_ledger` cobre a consulta que a liga faz.
`league_members.points` continua fora do `scripts/reconcile.js` (DT-108).

Checklist visual (seção 8 do `docs/04`): nenhuma cor literal, nenhum amarelo como
texto, foco herdado dos partials existentes, nenhuma animação nova a desligar sob
`prefers-reduced-motion`, números tabulares e uma leitura óbvia por tela. Duas
observações: o hexágono não aparece como forma estrutural em nenhuma das duas
telas novas, e nenhuma delas foi aberta em navegador (DT-22).

## Lacunas encontradas, em ordem de risco

As duas primeiras eram bloqueantes e foram corrigidas na mesma sessão da
auditoria. As demais continuam abertas e estão registradas no estado do projeto.

1. ~~**O apelido da criança passou a ser público para estranhos, sem filtro.**~~ — **corrigida.**
   Até a T-13.4 nenhuma criança via o apelido de outra. Agora até trinta pessoas
   de 6 a 15 anos (DT-107, sem separação por faixa) leem o campo, e a validação
   dele é `trim`, não vazio e 60 caracteres — nada impede nome completo, telefone
   ou ofensa. A RF-GAM-03 pede ranking só por apelido, e isso está cumprido; o
   que falta é a garantia de que o apelido não é dado pessoal, que é o que a
   RNF-33 promete. **Bloqueante.**

   *Como ficou:* `src/services/apelidoPublico.js` é a regra única — 2 a 20
   caracteres, só letra, número, espaço, hífen e sublinhado, sem quatro dígitos
   seguidos e sem três palavras ou mais — e vale no cadastro, no onboarding e na
   edição do perfil. O ranque não confia no banco: apelido que não passa na regra
   sai como "Abelha \<id\>", o que protege também as contas criadas antes dela. A
   tela de perfil passou a dizer que o apelido aparece na liga. Fica de resíduo o
   que nenhuma regra de texto resolve: "Maria Silva", duas palavras, continua
   passando, e não há lista de palavras ofensivas (DT-109).

2. ~~**A liga inclui quem nunca ganhou pólen, ao contrário do que o projeto
   afirma.**~~ — **corrigida.** O estado do projeto registra, na nota da T-13.3, que "quem não
   ganhou pólen na semana não entra na liga, porque aparecer em último sem ter
   jogado é a humilhação que o requisito manda evitar". O código faz o oposto:
   `prepararVisita` chama `garantirParticipacao` em toda visita à Colmeia, sem
   olhar pólen, e `ranquear` mantém o membro de zero na lista — o próprio teste
   unitário "quem não ganhou pólen fica por último, e não some da lista" prova
   isso. Enquanto não havia tela, ninguém via; agora vê. **Bloqueante**, por
   contrariar a intenção declarada da RF-GAM-02 e o que o documento afirma.

   *Como ficou:* `garantirParticipacao` soma o pólen da semana no livro antes de
   entrar, e devolve `null` para quem ainda não pontuou. Os dois estados vazios
   que a T-13.4 já tinha escrito — o convite na Colmeia e o da tela da liga —
   deixaram de ser inalcançáveis. O jogador entra na visita seguinte à primeira
   célula, com o pólen contando retroativo, porque a soma é do livro (DT-106).
3. **RF-HOM-10 entrega aviso, não "conquistas recentes".** O bloco da Colmeia
   mostra só o que a visita corrente destravou: recarregar a página apaga a
   comemoração, e uma conquista ganha numa partida nunca aparece ali, porque ela
   é avaliada no fechamento e mostrada só na tela de resultado. É a mesma falha
   que a DT-63 corrigiu para o aviso do ciclo econômico.
4. **A comemoração do fim da partida não tem teste nenhum.** O bloco de
   `jogo-resultado.ejs` e a função `mostrarConquistas` do `resultado.js` não são
   exercitados: a resposta da partida traz `conquistas` e há teste disso, mas
   ninguém prova que a tela desenha.
5. **Nenhuma das duas telas novas tem teste de tempo.** O projeto mede o teto da
   RNF-01 na Colmeia, no painel administrativo e no fechamento da partida.
   `/conquistas` é a página mais cara escrita até aqui — visita preparada, mais
   patrimônio, progresso e sequência, mais cinco avaliações de critério, mais o
   catálogo — e ninguém cronometrou.
6. **Nenhum teste prova que `/conquistas` e `/liga` exigem sessão.** O
   `requireOnboarding` está nas duas rotas, mas a suíte não tem o caso do
   visitante anônimo sendo redirecionado, para nenhuma página.
7. **`premiosDoPodio` não tem teste.** A tela da liga imprime os valores do
   pódio e nada confere se são os do banco.
8. **DT-108 continua aberta.** `league_members.points` é cache e não entra no
   `db:reconcile`. A tela lê o ranque do livro, então a divergência não aparece
   para a criança — e continua sem alarme para quem opera.
9. **Efeito colateral em `GET`.** Abrir `/conquistas` avalia critérios e pode
   creditar mel. É o mesmo desenho preguiçoso da Colmeia e é idempotente pela
   `UNIQUE`, mas é uma escrita de saldo numa rota de leitura, sem CSRF e sem
   limite de taxa.
10. **Sem hexágono e sem olho humano.** As duas telas usam cartão arredondado e
    nenhuma forma hexagonal estrutural, e nenhuma foi vista em navegador — nem a
    escada em duas colunas a 320 px, nem o ranque de trinta linhas (DT-22).

## Veredito

**Pode avançar**, com as duas lacunas bloqueantes corrigidas na mesma sessão da
auditoria: o apelido passou a ter regra única e o ranque não publica o que não
passa nela; a liga voltou a fazer o que o projeto sempre afirmou que fazia, e só
entra quem já ganhou pólen na semana. As duas tocavam criança vendo criança, que
é onde este produto tem menos margem para errar.

As lacunas 3 a 10 não impedem avançar. As 4, 5, 6 e 7 são dívida de teste e
cabem na T-14.2; a 10 é o passe de olho humano da DT-22; a 8 e a 9 são
operacionais e ficam aceitas com registro. A DT-109, aberta pela correção da
lacuna 1, entra na mesma lista.
