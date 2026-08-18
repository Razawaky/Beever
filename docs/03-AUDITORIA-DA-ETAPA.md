# Auditoria da etapa E03 — Autenticação

**Data:** 2026-08-18 · **Commit auditado:** `0888087` ·
**Branch:** `refactor/arquitetura-em-camadas`

Auditoria feita como revisor, não como autor: o ponto de partida foi desconfiar
do que o estado do projeto afirma e conferir no código e contra o servidor.

**Veredito da auditoria: não podia avançar — dois itens bloqueantes e um alto.**

**Situação depois da correção (mesmo dia): os três foram corrigidos e a etapa
está liberada.** O que cada um exigiu está no fim de cada lacuna, e a suíte
passou de 225 testes (219 passando naquela terça) para 228, todos passando. As
lacunas 4, 5 e 6 viraram dívida técnica com etapa marcada.

---

## 1. Requisitos, um a um

| Requisito | Situação | Onde está | Teste |
|---|---|---|---|
| RF-AUT-01 Registro com apelido, e-mail e senha, força mínima e e-mail único | atendido e testado | `src/routes/users.js:20`, `src/services/usersService.js:97` | `test/integration/seguranca.test.js:90` e `:109` |
| RF-AUT-02 Login com sessão em MySQL e cookie httpOnly/secure/sameSite | atendido e testado | `src/config/session.js:31`, `src/controllers/authController.js:6` | `test/integration/fluxoAutenticado.test.js` |
| RF-AUT-03 Logout invalidando a sessão no servidor | atendido e testado | `src/controllers/authController.js:22` | `test/integration/seguranca.test.js:191` |
| RF-AUT-04 Rate limiting em login e registro | atendido e testado | `src/middlewares/rateLimiters.js:27` | `test/integration/bruteForce.test.js:86` |
| RF-AUT-05 Middleware bloqueia rota privada e redireciona para o login | atendido e testado | `src/middlewares/requireAuth.js`, `src/middlewares/requireOnboarding.js:28` | `test/integration/fluxoAutenticado.test.js:446` |
| **Autorização por dono da conta** (implícito em RF-AUT-01/02, RNF-06 e LGPD) | **não atendido na auditoria; corrigido depois** | `usersService.exigirPosse` | `test/integration/seguranca.test.js` — ver lacuna 1 |
| RN-048 Registro exige apelido, e-mail e senha de 8+ caracteres com letras e números | atendido e testado | `src/services/usersService.js:33` | `test/unit/usersService.test.js:12` |
| RN-049 Não coletamos nome completo, endereço, telefone, foto ou localização | atendido | `migrations/001_core_users.sql` (não existe coluna de nome), `src/routes/users.js:10` | indireto, por `test/integration/schema.test.js` |
| RN-050 Perfil 1:1 guarda faixa, avatar, fuso, disponibilidade e preferências de som e animação | **parcial** | colunas existem em `migrations/001_core_users.sql:109`; o onboarding não coleta `session_minutes`, `is_sound_enabled` nem `has_reduced_motion` | — (é a DT-20, com dono na E04) |
| RNF-05 Somente prepared statements | atendido | todos os repositories usam `?`; nenhuma concatenação de SQL | `test/integration/repositories/*` |
| RNF-06 Validação de entrada em toda rota | atendido | `express-validator` em `src/routes/users.js`, `sessao.js`, `perfil.js` | `test/integration/seguranca.test.js:90` |
| RNF-07 Escape automático de EJS | atendido e testado | nenhum `<%-` com conteúdo de usuário em `src/views/` | `test/integration/app.test.js` |
| RNF-08 CSRF em toda rota que altera estado | atendido e testado | `src/middlewares/csrf.js` | `test/integration/app.test.js:58` |
| RNF-09 Rate limiting em autenticação, compra e conclusão | atendido e testado | `src/middlewares/rateLimiters.js` | `test/integration/bruteForce.test.js` |
| RNF-10 bcrypt com custo ≥ 10, senha de 8+ com letras e números | atendido e testado | `src/services/usersService.js:22` | `test/unit/usersService.test.js:12` |
| RNF-11 `helmet` com CSP, sem `unsafe-inline` no JS | atendido; a UI quebrava por causa disso e foi corrigida sem afrouxar a CSP | `src/app.js:31`, `src/styles/tema.css`, `src/utils/barraDeProgresso.js` | `test/integration/app.test.js:32` e `fluxoAutenticado.test.js` — ver lacuna 3 |
| RNF-12 Cookies httpOnly, secure, sameSite | atendido sem verificação em navegador | `src/config/session.js:41` | só por `supertest`; nenhuma sessão real em navegador |
| RNF-34 Consentimento do responsável no registro de menor | atendido e testado | `src/services/usersService.js:109`, `src/repositories/guardianConsentsRepository.js` | `test/integration/fluxoAutenticado.test.js:114`, `test/integration/repositories/guardianConsents.test.js` |

**Critério de aceite da etapa** ("registrar → logar → acessar rota privada →
sair, sem senha em log"): o caminho existe e está coberto ponta a ponta, e a
senha está na lista de redação do logger (`src/config/logger.js:25`). Na
auditoria o aceite não se sustentava porque a suíte que o prova não passava todo
dia (lacuna 2); com a lacuna corrigida, ele passa a valer em qualquer dia.

---

## 2. Lacunas, em ordem de risco

### 1. Bloqueante — qualquer conta logada altera e desativa qualquer outra conta

`PUT /users/:id` e `DELETE /users/:id` exigem sessão (`requireAuth`) e param
por aí. `usersService.atualizar` e `usersService.inativar` recebem o `id` da URL
e o ator da sessão, mas usam o ator apenas para escrever a auditoria — nunca
para decidir se aquele ator pode mexer naquela conta.

Verificado contra o servidor, com dois usuários reais criados na hora:

```
PUT    /users/<id de outra conta>  ->  200  (e-mail e senha trocados)
DELETE /users/<id de outra conta>  ->  200  {"mensagem":"Conta inativada com sucesso"}
```

Ou seja: qualquer criança cadastrada troca o e-mail e a senha da conta de
qualquer outra e assume o lugar dela, ou apaga a conta alheia. É tomada de conta
completa, e a trilha de auditoria registra corretamente o atacante — ela grava o
fato, não o impede.

O contraste com o perfil mostra que a regra existia e não foi aplicada aqui:
`src/routes/perfil.js:9` documenta "posse é checada uma vez, dentro do service",
e `profilesController` repassa `req.session.usuarioId` para o service comparar.
As rotas de conta não fazem esse repasse.

Onde corrigir: `usersService.atualizar` e `usersService.inativar` precisam
recusar quando `ator.id !== id` e o ator não for administrador. A rota de
listagem já tem o cuidado certo (`requireAdmin`).

**Corrigido.** `usersService.exigirPosse` guarda as duas operações e recusa com
403 `ACESSO_NEGADO`; administrador continua passando. Dois testes novos em
`test/integration/seguranca.test.js`: um invasor logado tenta alterar e desativar
a conta alheia e é recusado — com o banco conferido depois, porque o que importa
não é o status e sim que e-mail, hash de senha e `is_active` do alvo continuem
como estavam —, e o dono segue alterando a própria conta.

### 2. Bloqueante — a suíte só passa em três dias da semana

O estado do projeto afirma "225 passando, 0 falhando". Hoje, terça-feira:

```
# tests 225
# pass 219
# fail 6
```

Causa: `test/integration/fluxoAutenticado.test.js:167` grava a agenda semanal
como `dias: ['1', '3', '5']` (segunda, quarta e sexta) e depois espera que a
tela gere as tarefas do dia. `tasksService` só gera em dia marcado
(`src/services/tasksService.js:110`), que é a RN-011 funcionando como
especificado. Numa terça, nenhuma tarefa nasce e caem em cascata seis testes —
tarefas, pagamento de mel e pólen, compra, meta e auditoria da compra.

Não é defeito de produção: é a suíte que amarrou a asserção ao calendário do
servidor. O efeito prático, porém, é sério — o aceite da etapa se apoia numa
suíte que reprova sozinha quatro dias em cada sete, e a E14 pretende usar essa
mesma suíte como porta do CI. É parente da DT-23, já registrada.

**Corrigido.** A agenda passou a ser derivada do dia de hoje —
`[hoje, hoje+2, hoje+4]`, módulo 7 — em vez de fixa. Continuam sendo três dias
distintos (7 é ímpar, então os passos não colidem), o cenário segue sendo o de
agenda parcial e não o da semana inteira, e o resultado deixa de depender do dia
em que a suíte roda.

### 3. Alto — a CSP em vigor apaga as barras de progresso

O header entregue é:

```
default-src 'self';...;script-src 'self';script-src-attr 'none';style-src 'self';...
```

`style-src 'self'` sem `'unsafe-inline'` bloqueia também **atributo** `style`, e
não só a tag `<style>`. Três lugares dependem exatamente disso para desenhar
progresso:

- `src/views/pages/painel.ejs:21` — barra de XP do nível;
- `src/views/pages/painel.ejs:75` — progresso da tarefa;
- `src/views/pages/metas.ejs:83` — progresso da meta.

No navegador, as três nascem com largura zero. Nada disso apareceu porque toda
verificação até aqui foi por `curl` e `supertest`, que não aplicam CSP — é
precisamente o item "reconstrução do fluxo em navegador real" que o estado do
projeto já lista como não verificado.

A saída não é afrouxar a CSP: é a largura virar classe utilitária ou variável
CSS servida de arquivo próprio.

**Corrigido.** As classes `.barra-0` a `.barra-100`, em passos de 5%, vivem em
`src/styles/tema.css`, e `src/utils/barraDeProgresso.js` traduz o percentual na
classe; `renderizarPagina` expõe a função a toda página. Os passos de 5% são
menos de dois pixels numa barra de 224 px, e o número exato continua no texto ao
lado e agora também em `aria-valuenow`, dentro de um `role="progressbar"` que
antes não existia — a correção de CSP acabou pagando uma dívida de
acessibilidade junto. A CSP não foi afrouxada.

O teste que impede a volta está em `test/integration/fluxoAutenticado.test.js`:
ele exige que `/painel` e `/metas` não tragam nenhum atributo `style` na
marcação, e que a barra do painel desenhe por classe e anuncie o valor.

### 4. Médio — a documentação promete um comportamento de rate limit que o código não tem

`docs/02-ROADMAP-ETAPAS.md` (linha da T-03.6) e o cabeçalho de
`test/integration/bruteForce.test.js:26` afirmam que `skipSuccessfulRequests`
faz com que "quem acerta a senha não seja barrado junto com o atacante". O
próprio teste do arquivo prova o contrário e assume isso no nome:

```
it('a senha certa não passa enquanto o bloqueio dura', ...)  ->  429
```

`skipSuccessfulRequests` só evita **contar** a requisição bem-sucedida; depois
que o teto estoura, tudo daquela origem é barrado. O comportamento observado
está certo para conter força bruta; o texto que o descreve está errado, e texto
errado sobre segurança é o tipo de coisa que alguém repete numa apresentação de
TCC.

Junto disso, uma consequência de produto que merece decisão explícita: o limite
é por IP. Numa sala de aula atrás de um único IP público, dez erros de senha
somados entre alunos diferentes trancam a turma inteira por quinze minutos.

### 5. Médio — troca de senha e de e-mail sem confirmar a senha atual

Mesmo depois de corrigida a lacuna 1, `PUT /users/:id` permite ao próprio dono
trocar senha e e-mail sem informar a senha vigente. Com isso, uma sessão
esquecida aberta no computador da escola deixa de ser "alguém mexeu no meu jogo"
e passa a ser "perdi a conta".

### 6. Baixo — `normalizeEmail()` reescreve o e-mail digitado

`src/routes/users.js:22` e `src/routes/sessao.js:13` aplicam `normalizeEmail()`,
que por padrão remove pontos e sufixos `+alguma-coisa` em endereços do Gmail. O
login continua funcionando, porque registro e login normalizam igual, mas duas
consequências ficam: dois endereços reais e distintos podem colidir no 409 de
e-mail duplicado, e o `guardian_email` guardado como prova de consentimento pode
não ser exatamente o endereço que o responsável digitou.

---

## 3. Checagens transversais

- **Camadas:** respeitadas. Nenhuma SQL fora de repository, nenhuma regra de
  autenticação em controller — `authController` só traduz HTTP, e a decisão de
  recusar credencial mora em `authService.autenticar`.
- **Cálculo de recompensa só no servidor:** não se aplica à E03; o XP inicial do
  onboarding já passa pelo livro (`fluxoAutenticado.test.js:372`).
- **Auditoria em toda mudança sensível:** `conta.criada`, `consentimento.registrado`,
  `conta.atualizada`, `conta.inativada`, `sessao.login` e `sessao.logout` estão
  gravados. A senha nova nunca entra na auditoria, só o fato de ter mudado
  (`usersService.js:193`).
- **Transação e idempotência:** o registro cria conta, perfil, carteira, nível e
  consentimento numa transação só (`usersService.js:124`). O consentimento entra
  junto de propósito: conta criada sem a prova de autorização seria o pior
  desfecho.
- **Sessão:** o id é regenerado no login e no auto-login pós-cadastro
  (`src/utils/sessaoLogin.js:8`), o que fecha fixação de sessão.
- **Checklist da E01 (`docs/03-BANCO-DE-DADOS-DBA.md`, seção 8):** a única tabela
  que a E03 acrescenta ao uso é `guardian_consents`, que já nasceu na E01 com FK,
  índice e teste de repository. Nada a reabrir.
- **Checklist visual (`docs/04-DESIGN-SYSTEM-E-LANDING.md`, seção 8):** as telas
  de entrar e cadastrar usam só tokens, sem cor literal; o foco de teclado é
  visível em campo e botão; `prefers-reduced-motion` desliga as animações. O item
  que falha é o das barras de progresso — lacuna 3 —, e ele não é de estilo, é de
  CSP.

---

## 4. O que precisa acontecer antes de abrir a E04

1. Autorização por dono nas rotas de conta, com teste de integração que tente a
   conta alheia e espere recusa (lacuna 1).
2. Suíte independente do dia da semana (lacuna 2).
3. Largura de barra fora do atributo `style`, com a CSP intacta (lacuna 3).

As lacunas 4, 5 e 6 podem virar dívida técnica com etapa marcada, desde que
fiquem escritas — a 4 exige, no mínimo, corrigir o texto do roadmap e do teste.

**Feito:** os três itens acima foram corrigidos e a suíte fechou em 228 testes,
todos passando. As lacunas 4, 5 e 6 estão registradas como DT-24, DT-25 e DT-26
na seção 5 do estado do projeto.

Um achado lateral, corrigido junto: `npx eslint src test` acusava um erro em
`test/integration/seguranca.test.js:151`, vindo da própria T-03.6 — uma variável
descartada em desestruturação sem o prefixo que a regra exige. O estado do
projeto afirmava que o código do projeto estava limpo e só os scripts de plugin
falhavam (DT-02); voltou a ser verdade.
