# T-00.3 — Código morto, duplicado e fora de camada

Levantamento sem remoção. Nada foi apagado, movido ou alterado. Cada item traz
evidência e uma recomendação de tratamento, para decisão no checkpoint da T-00.4.

Data: 2026-08-17 · Branch: `refactor/arquitetura-em-camadas`

---

## 1. Método

Para cada símbolo exportado em `src/` e `scripts/`, contei referências em
`src`, `scripts` e `test`. Para cada módulo, contei importadores. Cada
candidato foi conferido à mão antes de entrar na lista — a busca por nome
sozinha gera falso positivo quando dois arquivos exportam o mesmo nome
(`criar`, `listar`, `atualizar` aparecem em vários repositories). Os falsos
positivos descartados estão na seção 6, para o levantamento poder ser
auditado.

---

## 2. Código morto

| ID | Item | Evidência | Recomendação |
|---|---|---|---|
| M-01 | `src/repositories/sessaoJogoRepository.js` — módulo inteiro (`iniciar`, `finalizar`, `listarPorPerfil`) | Nenhum arquivo o importa | **Manter onde está.** É a única base pronta para a E06/E07; apagar agora é retrabalho garantido. Anotar como "aguardando E06" |
| M-02 | `nivelService.creditarXp` (`src/services/nivelService.js:76`) | Nenhum chamador em `src`, `scripts` ou `test` | **Manter.** É metade do contrato de recompensa que a E06 vai consumir. Hoje significa que **nenhum XP é creditado no sistema** |
| M-03 | `usuarioService.obter` (`src/services/usuarioService.js:30`) | Nenhum chamador; nem controller nem teste | **Remover na E03**, quando os repositories forem realinhados. Sem valor futuro claro: `perfilService.obterDoUsuario` cobre o caso de uso real |
| M-04 | Dependência `cors` | Zero importações em todo o projeto | **Remover do `package.json`.** Sem front separado, não há outra origem. Já registrado no `ESTADO-DO-PROJETO.md` como pendência |
| M-05 | `export` de `sessionStore` (`src/config/session.js:18`) | Usado apenas dentro do próprio arquivo (linhas 37 e 51) | **Tirar o `export`**, manter a constante. Exportar amplia a superfície sem necessidade |
| M-06 | `src/public/js/onboarding.js` e `cadastro.js` aparecem como órfãos em análise estática | Carregados por `<script src>` em `onboarding.ejs:46` e `cadastro.ejs:97` | **Nada a fazer.** Falso positivo de ferramenta; registrado aqui para não voltar como "achado" em auditoria futura |

**Consequência de M-02 combinada com a ausência de `moedasService.creditar`:** o
loop do `CLAUDE.md` (Atividades → XP/Pontos/Mel → Loja → Inventário) está
cortado em dois pontos. A única recompensa viva é `pontosService.creditar`,
disparada por `tarefaService.concluir`.

---

## 3. Duplicação

| ID | Padrão repetido | Onde | Recomendação |
|---|---|---|---|
| P-01 | `if (req.accepts(['html', 'json']) === 'json') return res.json(...)` seguido de `res.redirect(...)` | 9 ocorrências em 6 controllers: `authController:17,32`, `usuarioController:25`, `perfilController:31`, `compraController:8`, `tarefaController:14,22`, `metaController:7,15` | Extrair um helper `responder(req, res, { json, redirecionar })` em `src/utils/`. Serviria de ponto único para, no futuro, um cliente SPA ou mobile |
| P-02 | Redirecionamento condicional por `onboardingConcluido` | `paginaController:15,29,34`, `homeController:4`, `authController:18` | Vira o middleware `requireOnboarding` que a T-02.4 já prevê. Hoje a regra está espalhada por dois controllers e uma função local |
| P-03 | `perfilService.obterDoUsuario(req.session.usuarioId)` como primeira linha do handler | `perfilController:5`, `paginaController:36,45` | Aceitável enquanto forem 3 chamadas. Se a Colmeia (E10) repetir o padrão, vira middleware de carregamento de perfil |
| P-04 | Dois guardas de autenticação com a mesma regra e respostas diferentes | `requireAuth` (`src/middlewares/requireAuth.js`, erro 401) e `exigirLoginPagina` (`src/routes/index.js:21`, redireciona para `/login`) | Unificar em um único middleware parametrizado, em `src/middlewares/`. Ver também C-01 |
| P-05 | Dois dumps do mesmo banco legado | `beever.sql` (raiz) e `docs/legacy/beever.sql` | Tratado na E01: os dois vão para `migrations/_legacy/` depois que o schema novo estiver derivado. Ver `00-AUDITORIA-DIVERGENCIAS.md`, D-01 |

---

## 4. Fora de camada

A verificação principal passou: **zero** `SELECT`/`INSERT`/`UPDATE`/`DELETE`
fora de `src/repositories/`, **zero** controllers importando repository,
**zero** services importando controller, **zero** repositories importando
service. O fluxo Controller → Service → Repository está sendo respeitado.

Restam três desvios menores, nenhum de acesso a dado:

| ID | Desvio | Onde | Recomendação |
|---|---|---|---|
| C-01 | Middleware declarado dentro de arquivo de rota | `exigirLoginPagina` em `src/routes/index.js:21` | Mover para `src/middlewares/`. Arquivo de rota deve conter só wiring |
| C-02 | Regra de apresentação montada no controller | `paginaController.loja:50` monta `possuidos` (`new Set(inventario.map(...))`) para a view decidir o que já foi comprado | Pequeno, mas é decisão de domínio ("o perfil possui este item?"). Cabe em `inventarioService` |
| C-03 | Inconsistência de contrato entre rotas equivalentes | `perfilController.meu:5` responde só JSON, sem negociar; `metaController.listar` negocia JSON/HTML na mesma rota; loja e painel usam rota de página separada da rota de API | Padronizar na E02, junto com P-01. Hoje há três padrões diferentes para o mesmo problema |

Valores de regra embutidos em código, que a E06 move para `reward_configs`:
`XP_POR_NIVEL = 1000` e `PONTOS_DE_PARTIDA` (`nivelService.js:9` e `:15`),
`PONTOS_POR_TAREFA_CONCLUIDA = 10` (`pontosService.js:10`).

---

## 5. Assets órfãos

9 das 12 imagens não são referenciadas por nenhuma view, folha de estilo ou JS
de página:

`1real.gif`, `babybee.png`, `beenie_1real.png`, `beenie_howdy.png`,
`beenie_login.png`, `beenie_vem.png`, `beever_logo_white.png`,
`beever_logo_yellow.png`, `mel-moeda-virtual.png`

Em uso hoje: `beever-icon.png` (favicon, em `head.ejs`),
`beenie_login_render.png` e `beever_logo_black.png`.

**Recomendação: manter todas.** São o acervo de identidade visual do mascote,
e a E11 (landing) e a E07 (telas de resultado) vão consumir justamente as que
hoje estão paradas. Órfão de asset não é dívida enquanto o produto ainda não
tem as telas que o usam.

### Correção a um item da T-00.2

O documento `00-INVENTARIO.md` afirmou que não havia design token declarado.
**Está errado.** `src/styles/tailwind.css` traz um bloco `@theme` completo, com
paleta nomeada (`--color-mel`, `--color-nectar`, `--color-cera`, `--color-tinta`
e semânticos com variante escurecida para texto, já ajustada para contraste AA),
raios (`--radius-favo`, `--radius-pilula`) e famílias tipográficas. O documento
foi corrigido.

Uma pendência real fica registrada: **as fontes Lilita One e Nunito não são
servidas pelo projeto** — o próprio comentário do CSS diz que os dois papéis
caem em `system-ui` até serem auto-hospedadas. Item para a E11.

---

## 6. Falsos positivos verificados e descartados

| Símbolo / módulo | Por que não é morto |
|---|---|
| `src/server.js` | Ponto de entrada (`main` e script `start` do `package.json`); nunca é importado por outro módulo, por definição |
| `scripts/migrate.js :: migrar` | Chamada no bootstrap CLI do próprio arquivo, linha 101 |
| `limpezaService.expurgarContasInativas` | Chamada por `agendarLimpezas`, no mesmo arquivo, via cron |
| `sessaoJogoRepository.finalizar` / `listarPorPerfil` | Não apareceram na varredura por colisão de nome com outros repositories, mas o módulo inteiro é órfão — contabilizados em M-01 |
| `src/public/js/*.js` | Carregados por `<script src>` nas views, não por `import` |

---

## 7. Resumo para decisão

| Ação | Itens |
|---|---|
| Remover agora (baixo risco, fora de qualquer caminho de execução) | M-04 (`cors`), M-05 (`export` de `sessionStore`) |
| Remover durante a etapa que reescreve a área | M-03 (`usuarioService.obter`, na E03) |
| Manter, com destino conhecido | M-01, M-02 (E06/E07), assets órfãos (E07/E11) |
| Refatorar em etapa própria, não agora | P-01, P-02, P-04, C-01, C-02, C-03 (E02) |
| Já endereçado em outro documento | P-05 (E01, ver D-01) |

Nada nesta lista foi executado. A T-00.3 é levantamento.

---

## 8. Próxima tarefa

**T-00.4** — reescrever `docs/ESTADO-DO-PROJETO.md` no formato *Feito e
verificado / Feito mas não verificado / Pendente / Dívida técnica*, consolidando
os três documentos da E00.
