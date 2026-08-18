# Auditoria da E04 — onboarding e planejador de metas

**Data:** 2026-08-18 · **Branch:** `refactor/arquitetura-em-camadas` ·
**Commit auditado:** `17a2546` · **Papel:** revisor, não autor.

Auditoria feita depois de a última tarefa da etapa (T-04.6 e T-04.7, commit
`d72b18d`) entrar. O critério de aceite do `02-ROADMAP-ETAPAS.md` para a E04 é
uma frase: *"dois usuários com disponibilidades diferentes recebem conjuntos de
metas coerentes com a tabela de RN-014, e reduzir dias não apaga progresso"*.
Requisitos declarados: RF-ONB-01 a 09, RN-011 a 018.

Nada foi corrigido aqui. Este documento é diagnóstico.

---

## 1. Requisito a requisito

| Requisito | Status | Onde está | Prova |
|---|---|---|---|
| RF-ONB-01 Fluxo em etapas com barra de progresso e voltar | **atendido e testado** | `src/views/pages/onboarding.ejs` (`role="progressbar"`, `#btn-voltar`), `src/public/js/onboarding.js` | `onboarding.test.js`: "a tela abre no primeiro passo, com a barra em zero e anunciada"; "voltar e regravar um passo não devolve o jogador ao começo" |
| RF-ONB-02 Seleção de faixa de idade | **atendido e testado**, por desenho diferente do texto | derivada da data de nascimento no cadastro (`usersService.faixaParaIdade`), decisão D-1 do laudo da T-04.1, ressalva já escrita na própria RN-011 | `test/unit/usersService.test.js`: "classifica dentro do intervalo declarado" |
| RF-ONB-03 Dias da semana (mín. 1) | **atendido e testado** | passo do wizard + `schedulesService`; barreira na rota e no service | `onboarding.test.js`: "recusa passo desconhecido, semana vazia e o nível fora da conclusão" |
| RF-ONB-04 Tempo por sessão | **atendido e testado** | passo do wizard; lista 5/10/20/30/45 na rota, no service e no CHECK (migration `012`) | `onboarding.test.js`: "grava tempo por sessão, objetivo, avatar e as preferências"; "recusa slug fora do catálogo e tempo de sessão fora da RN-011" |
| RF-ONB-05 Objetivo inicial | **atendido e testado** | catálogo lido do banco, conferido no service | mesmo teste acima |
| RF-ONB-06 Avatar/mascote | **atendido e testado** | idem, e `avatar` deixou de ser opcional na rota | `onboarding.test.js`: "não conclui sem avatar" |
| RF-ONB-07 Geração automática de metas ao concluir | **atendido e testado** | `goalPlannerService.garantirMetasAtivas` chamado na conclusão | `planejadorDeMetas.test.js`: 1, 4 e 7 dias |
| RF-ONB-08 Bloqueio até concluir | **atendido e testado** | `router.use(requireAuth, requireOnboarding)` em `metas.js`, `tarefas.js`, `loja.js`; nas páginas, em `routes/index.js` | `fluxoAutenticado.test.js` e `onboarding.test.js`: "gravar um passo não marca a conta como configurada" |
| RF-ONB-09 Edição posterior da disponibilidade com recálculo | **atendido e testado** | `PUT /perfil/:id/disponibilidade` → `profilesService.atualizarDisponibilidade` → planejador; tela em `views/pages/perfil.ejs` | `disponibilidade.test.js`: cinco casos, incluindo 5→2 dias e voltar a marcar dias |
| RN-011 Ordem de coleta | **atendido e testado** | sete passos na ordem da regra, com as duas ressalvas registradas na própria RN | `onboarding.test.js`: "grava cada passo respondido e empurra o marcador para frente" |
| RN-012 Onboarding bloqueante | **atendido e testado** | `middlewares/requireOnboarding.js` | `fluxoAutenticado.test.js` |
| RN-013 Disponibilidade editável, sem perder progresso | **atendido e testado** | o planejador só completa, nunca apaga meta ativa | `disponibilidade.test.js`: "reduzir de 5 para 2 dias mantém as metas em andamento, com o progresso intacto" |
| RN-014 Tabela dias → metas/prazo/dificuldade/multiplicador | **atendido e testado** | `goal_plan_rules` + `goal_difficulties` (seed `02_age_bands_domains.sql`): 1–2 → 1 meta, 28 dias, alta, 2.0×; 3–4 → 2, 14, média, 1.5×; 5–7 → 3, 7, simples, 1.0×. Nenhum número em código | `test/unit/goalPlannerService.test.js` (`escolherPlano`) e `planejadorDeMetas.test.js` (as três faixas) |
| RN-015 Tipos possíveis, nunca meta impossível | **atendido e testado** | interseção entre `goal_target_rules` e `goalProgressSources.fontesMensuraveis()` | `planejadorDeMetas.test.js`: "não sorteia tipo que o sistema ainda não sabe medir" |
| RN-016 Meta concluída: recompensa uma vez + auditoria + meta nova | **atendido e testado** | `goalsService.concluir` — `completed_at IS NULL` dentro do `WHERE`, crédito na mesma transação, `audit_logs` depois, planejador no fim | `planejadorDeMetas.test.js`: "repõe a meta concluída, mantendo a conta sempre com meta ativa" |
| RN-017 Meta vencida não é punida | **parcial** | a expiração existe e não tira nada de ninguém (`goalsService.expirarVencidas`, auditada com `recompensaPaga: 0`). **A oferta de renovação com prazo estendido e recompensa pela metade não existe** | `disponibilidade.test.js`: "meta vencida expira sem pagar, e o plano volta a ser completado" |
| RN-018 Sempre ao menos 1 meta ativa | **atendido e testado** | planejador chamado ao abrir painel, metas e perfil | `planejadorDeMetas.test.js`: "abrir o painel de novo não cria meta a mais" |

**Critério de aceite da etapa:** atendido. As três faixas da RN-014 têm teste com
banco real, e o caso "reduzir dias não apaga progresso" está coberto ponta a
ponta, pela rota, com CSRF.

---

## 2. Verificações estruturais

| Item | Veredito |
|---|---|
| Camadas respeitadas | **ok** — `grep` por `SELECT/INSERT/UPDATE` em `src/services`, `src/controllers` e `src/routes` não retorna nada; toda SQL da etapa está em `goalsRepository`, `profilesRepository` e `schedulesRepository` |
| Regra fora de service | **ok** — a view de perfil só formata; o cálculo do percentual da barra usa o helper compartilhado |
| Cálculo de recompensa só no servidor | **ok** — `perfil.js` no navegador só envia dias marcados e lê o que voltou; alvo, prazo e recompensa saem do planejador |
| Auditoria em mudança de mel/pólen | **ok** — `coin_ledger`/`points_ledger` pelo repository, mais `audit_logs` em `meta.criada`, `meta.concluida`, `meta.expirada` e `perfil.disponibilidade-alterada` |
| Transação onde há saldo | **ok** — conclusão de meta credita dentro de `emTransacao`; criação em lote do planejador idem |
| Idempotência | **ok** — planejador completa o que falta e não repete; `concluir` tem `completed_at IS NULL` no `WHERE`, então clique duplo não paga duas vezes |
| Validação de entrada | **ok** — `express-validator` em toda rota nova; `dias.*` restrito a 0–6 e lista não vazia |
| Escape na view | **ok** — `perfil.ejs` só usa `<%= %>`; `perfil.js` escreve com `textContent`, nunca `innerHTML` |
| CSRF | **ok** — `app.use(csrf)` global, e o PUT novo manda o token no cabeçalho |
| Lint | **ok no código do projeto** — `npx eslint src test` sai 0. Os 3242 erros de `npm run lint` são todos de `.claude/skills/**` e `.github/skills/**` (DT-02) |
| Testes | **270 passando, 0 falhando**, com MySQL no ar |

---

## 3. Lacunas, em ordem de risco

| # | Lacuna | Risco | Onde |
|---|---|---|---|
| L-1 | `atualizarDisponibilidade` **não expira as metas vencidas antes de chamar o planejador**, ao contrário do painel, da tela de metas e da própria tela de perfil, que chamam `sincronizarProgresso` primeiro. `listarAtivasPorUsuario` conta como ativa a meta que já passou do prazo e ainda não foi marcada, então quem troca a semana logo depois de uma meta vencer recebe menos metas do que a faixa nova pede, até a próxima visita ao painel. Não perde progresso nem paga errado; corrige-se sozinho | médio | `src/services/profilesService.js:263` |
| L-2 | A **oferta de renovação da RN-017** — prazo estendido e recompensa pela metade — não existe e **não tem item numerado na tabela de dívida**. Está só em prosa, no estado do projeto e no comentário de `expirarVencidas`. Regra do escopo da E04 sem código e sem registro formal é a que some | médio | `src/services/goalsService.js:103`, `docs/ESTADO-DO-PROJETO.md` |
| L-3 | O aviso da tela de perfil (`#aviso-disponibilidade`) muda de texto por JavaScript **sem `role="status"` nem `aria-live`**: leitor de tela não anuncia o resultado de salvar a semana. A barra de progresso do onboarding foi corrigida por este mesmo motivo na T-04.2 | baixo-médio | `src/views/pages/perfil.ejs:47` |
| L-4 | Depois de salvar, a lista **"Minhas metas agora" não é atualizada**: o aviso diz que nasceram metas novas, mas elas só aparecem quando a página recarrega. A informação está correta e não some, mas a tela contradiz a si mesma por um instante | baixo | `src/public/js/perfil.js:73` |
| L-5 | **Foco de teclado visível só no botão de salvar.** As caixas de dia e o link "Voltar ao painel" ficam com o contorno padrão do navegador, que não é o do design system. O checklist visual da seção 8 do `04-DESIGN-SYSTEM-E-LANDING.md` pede foco visível em todo elemento interativo | baixo | `src/views/pages/perfil.ejs` |
| L-6 | A tela de perfil usa `max-w-3xl`, enquanto o cabeçalho e as demais páginas internas usam `max-w-5xl`: no desktop o cartão não alinha com o contêiner do cabeçalho, e a composição é a de celular centralizada — exatamente o que o checklist visual desaconselha | baixo | `src/views/pages/perfil.ejs:1` |
| L-7 | O `ESTADO-DO-PROJETO.md` ainda tem a seção **"Próxima tarefa: T-04.6"**, escrita antes de a tarefa existir. As tabelas já estão certas; a prosa ficou para trás | baixo | `docs/ESTADO-DO-PROJETO.md:640` |
| L-8 | `PUT /perfil/:id` deixa trocar `minutos_por_sessao`, que é **entrada da fórmula de alvo do planejador**, sem replanejar nada. Hoje não há tela que faça isso (DT-12), e a RN-013 só fala de disponibilidade — mas quando a tela existir, a incoerência aparece | baixo | `src/routes/perfil.js:19` |

Nenhuma das oito impede a etapa de fechar: nenhuma perde progresso, paga
recompensa errada, vaza dado ou deixa entrada sem validação.

---

## 3.1 O que já foi corrigido

Corrigido na mesma sessão da auditoria, no commit que a acompanha:

- **L-1** — `atualizarDisponibilidade` passou a expirar as vencidas antes de
  contar as ativas, na mesma ordem do painel e da tela de metas. Teste novo em
  `disponibilidade.test.js`: "trocar a semana expira as vencidas antes de contar
  o plano".
- **L-2** — a renovação da RN-017 virou a **DT-33**, com dono na E06.
- **L-3** — o aviso da tela de perfil ganhou `role="status"` e
  `aria-live="polite"`, com teste que confere os dois atributos no HTML servido.
- **L-7** — a seção "Próxima tarefa" do estado do projeto foi reescrita para a
  T-05.1.

As quatro restantes (L-4, L-5, L-6, L-8) seguem abertas, com o encaminhamento
da seção 4.

---

## 4. Veredito

**Pode avançar.** Zero itens bloqueantes. Os requisitos da E04 estão atendidos e
testados, o critério de aceite da etapa está coberto por teste com banco real, e
as camadas, a auditoria e a validação passaram na conferência.

Encaminhamento sugerido para as lacunas:

- **L-1 e L-3** valem correção antes da E05 — são pequenas, e L-1 é a única com
  efeito visível para o jogador.
- **L-2** vira item numerado na tabela de dívida, com dono na E06.
- **L-4, L-5, L-6** entram no trabalho de front da E10/E11, junto do resto das
  telas internas.
- **L-7** é higiene de documento.
- **L-8** fica atrelado à DT-12, quando a tela de perfil ganhar os outros campos.
