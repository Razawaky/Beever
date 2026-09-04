# T-00.2 — Inventário do que existe

Levantamento completo do repositório: rotas, controllers, services,
repositories, views, migrations e assets. Documento descritivo — não julga o que
está certo ou errado (isso é a T-00.3) e não altera nada.

Data: 2026-08-17 · Branch: `refactor/arquitetura-em-camadas` · Base:
`5891668` + working tree não commitado.

---

## 1. Números

| Camada | Quantidade |
|---|---|
| Arquivos de rota | 7 |
| Endpoints HTTP | 26 |
| Controllers | 11 (26 handlers exportados) |
| Services | 14 (32 funções exportadas) |
| Repositories | 12 (42 funções exportadas) |
| Middlewares | 7 |
| Arquivos de configuração | 4 (`env`, `database`, `logger`, `session`) |
| Utilitários | 2 (`erros.js`, `sessaoLogin.js`) |
| Views | 9 páginas + 3 partials |
| Migrations | 2 |
| Tabelas no schema atual | 15 |
| Imagens de identidade visual | 12 |
| Folhas de estilo | 3 (fonte) + 1 gerada |
| JS de página | 2 |
| Arquivos de teste | 4 (22 testes) |

---

## 2. Rotas

`src/app.js` monta, nesta ordem: `helmet` → `pino-http` → static → body parsers
→ sessão → CSRF → rate limit global → rotas → `notFound` → `errorHandler`.

### 2.1 Páginas e raiz — `src/routes/index.js`

| Método | Caminho | Middlewares | Handler |
|---|---|---|---|
| GET | `/` | — | `homeController.mostrar` |
| GET | `/health` | — | `healthController.mostrar` |
| GET | `/login` | — | `paginaController.login` |
| GET | `/cadastro` | — | `paginaController.cadastro` |
| GET | `/manutencao` | — | `paginaController.manutencao` |
| GET | `/onboarding` | `exigirLoginPagina` | `paginaController.onboarding` |
| GET | `/painel` | `exigirLoginPagina` | `paginaController.painel` |
| GET | `/loja` | `exigirLoginPagina` | `paginaController.loja` |

Sub-routers montados em seguida: `/users`, `/perfil`, `/sessao`, `/loja`,
`/metas`, `/tarefas`.

> `GET /loja` existe duas vezes no mesmo prefixo: como página (linha 32) e como
> router (linha 38). Funciona porque a página é declarada antes, mas é o padrão
> que já causou um 404 silencioso antes (registrado no `ESTADO-DO-PROJETO.md`).

### 2.2 Sessão — `src/routes/sessao.js`

| Método | Caminho | Middlewares | Handler |
|---|---|---|---|
| POST | `/sessao/login` | `limiteAutenticacao`, `regrasLogin`, `validate` | `authController.login` |
| POST | `/sessao/logout` | `requireAuth` | `authController.logout` |
| GET | `/sessao/check` | `requireAuth` | `authController.sessaoAtual` |

### 2.3 Usuários — `src/routes/users.js`

| Método | Caminho | Middlewares | Handler |
|---|---|---|---|
| GET | `/users` | `requireAuth`, `requireAdmin` | `usuarioController.listar` |
| POST | `/users` | `limiteAutenticacao`, `regrasCadastro`, `validate` | `usuarioController.criar` |
| PUT | `/users/:id` | `requireAuth`, `regrasAtualizacao`, `validate` | `usuarioController.atualizar` |
| DELETE | `/users/:id` | `requireAuth`, `param`, `validate` | `usuarioController.inativar` |

Única rota administrativa do sistema inteiro é o `GET /users`.

### 2.4 Perfil — `src/routes/perfil.js` (`router.use(requireAuth)`)

| Método | Caminho | Handler |
|---|---|---|
| GET | `/perfil/meu` | `perfilController.meu` |
| PUT | `/perfil/:id` | `perfilController.atualizar` |
| PUT | `/perfil/:id/onboarding` | `perfilController.salvarOnboarding` |
| DELETE | `/perfil/:id` | `perfilController.remover` |

### 2.5 Loja — `src/routes/loja.js` (`router.use(requireAuth)`)

| Método | Caminho | Middlewares | Handler |
|---|---|---|---|
| GET | `/loja/itens` | — | `itemController.listar` |
| GET | `/loja/inventario` | — | `inventarioController.meu` |
| POST | `/loja/compras` | `limiteCompra`, validação de `idItem` | `compraController.criar` |

### 2.6 Metas e tarefas

| Método | Caminho | Handler |
|---|---|---|
| GET | `/metas` | `metaController.listar` (negocia JSON/HTML na mesma rota) |
| POST | `/metas` | `metaController.criar` |
| POST | `/metas/:idMeta/tarefas` | `tarefaController.criar` |
| POST | `/tarefas/:id/concluir` | `tarefaController.concluir` |

Ambos os routers aplicam `requireAuth` a tudo via `router.use`.

---

## 3. Controllers

| Arquivo | Handlers |
|---|---|
| `authController.js` | `login`, `logout`, `sessaoAtual` |
| `usuarioController.js` | `listar`, `criar`, `atualizar`, `inativar` |
| `perfilController.js` | `meu`, `atualizar`, `remover`, `salvarOnboarding` |
| `paginaController.js` | `login`, `cadastro`, `onboarding`, `painel`, `loja`, `manutencao` |
| `metaController.js` | `listar`, `criar` |
| `tarefaController.js` | `criar`, `concluir` |
| `itemController.js` | `listar` |
| `inventarioController.js` | `meu` |
| `compraController.js` | `criar` |
| `homeController.js` | `mostrar` |
| `healthController.js` | `mostrar` |

Quase todos usam o wrapper `assincrono` (de `src/utils/erros.js`) para
encaminhar rejeições ao error handler global. Exceções: `homeController.mostrar`
e os handlers estáticos de `paginaController` (`login`, `cadastro`,
`onboarding`, `manutencao`), que são síncronos.

---

## 4. Services

| Arquivo | Funções exportadas |
|---|---|
| `authService.js` | `autenticar`, `registrarLogout` |
| `usuarioService.js` | `senhaValida`, `listar`, `obter`, `criar`, `atualizar`, `inativar` |
| `perfilService.js` | `obterDoUsuario`, `atualizar`, `remover`, `salvarOnboarding` |
| `nivelService.js` | `calcularXpProximoNivel`, `definirPontoDePartida`, `aplicarXp`, `creditarXp` |
| `pontosService.js` | `creditar`, `pontosPorTarefaConcluida` |
| `moedasService.js` | `debitar` |
| `itemService.js` | `listarCatalogo`, `obterAtivo` |
| `compraService.js` | `comprar` |
| `inventarioService.js` | `listarDoPerfil` |
| `cronogramaService.js` | `obterOuCriarAtivo` |
| `metaService.js` | `listarDoPerfil`, `criar`, `exigirPosse` |
| `tarefaService.js` | `criar`, `concluir` |
| `limpezaService.js` | `expurgarContasInativas`, `agendarLimpezas` (cron) |
| `healthService.js` | `verificarSaude` |

Constantes de regra embutidas em código, não em tabela de configuração:
`XP_POR_NIVEL = 1000` e `PONTOS_DE_PARTIDA` (`nivelService.js:9` e `:15`),
`PONTOS_POR_TAREFA_CONCLUIDA = 10` (`pontosService.js:10`).

Fora de uso hoje: `nivelService.creditarXp` (nenhum chamador) e todo o
`moedasService` exceto `debitar`, chamado só por `compraService.comprar`.
Detalhamento na T-00.3.

---

## 5. Repositories e tabelas

| Repository | Tabelas | Funções |
|---|---|---|
| `usuarioRepository.js` | `usuario`, `admin` (join) | `listar`, `buscarPorId`, `buscarPorEmailComSenha`, `emailJaUsado`, `criar`, `atualizar`, `atualizarUltimoLogin`, `inativar`, `listarInativosParaExpurgo`, `removerPorIds` |
| `perfilRepository.js` | `perfil` | `buscarPorUsuario`, `buscarPorId`, `criar`, `atualizar`, `remover`, `marcarOnboardingConcluido`, `debitarMoedas`, `creditarPontos` |
| `nivelRepository.js` | `nivel` | `buscarPorPerfil`, `criar`, `atualizar` |
| `itemRepository.js` | `item` | `listarAtivos`, `buscarAtivoPorId` |
| `compraRepository.js` | `compra`, `item` | `criar`, `listarPorPerfil` |
| `inventarioRepository.js` | `inventario`, `item` | `listarPorPerfil`, `adicionarOuIncrementar` |
| `cronogramaRepository.js` | `cronograma` | `buscarAtivoDoPerfil`, `criarPadrao` |
| `metaRepository.js` | `meta`, `cronograma` | `listarPorPerfil`, `buscarPorId`, `criar` |
| `tarefaRepository.js` | `tarefa` | `listarPorMeta`, `buscarPorId`, `criar`, `concluir` |
| `auditoriaRepository.js` | `auditoria` | `registrar` |
| `sessaoJogoRepository.js` | `sessao_jogo` | `iniciar`, `finalizar`, `listarPorPerfil` |
| `healthRepository.js` | `schema_migrations` | `ping`, `contarMigrationsAplicadas` |

**Verificação de camadas:** zero ocorrências de `SELECT`, `INSERT`, `UPDATE` ou
`DELETE` em `src/services`, `src/controllers`, `src/routes` e
`src/middlewares`. A regra do `CLAUDE.md` está sendo respeitada hoje.

`auditoriaRepository.registrar` é importado por 8 services: `authService`,
`usuarioService`, `perfilService`, `compraService`, `metaService`,
`tarefaService`, `limpezaService`.

---

## 6. Views

Todas as páginas ficam em `src/views/pages/`. Não há motor de layout: cada
página inclui os partials manualmente.

| Página | Linhas | Renderizada por |
|---|---|---|
| `home.ejs` | 38 | `homeController.mostrar` |
| `login.ejs` | 65 | `paginaController.login` |
| `cadastro.ejs` | 99 | `paginaController.cadastro` |
| `onboarding.ejs` | 48 | `paginaController.onboarding` |
| `painel.ejs` | 87 | `paginaController.painel` |
| `loja.ejs` | 55 | `paginaController.loja` |
| `metas.ejs` | 154 | `metaController.listar` |
| `manutencao.ejs` | 18 | `paginaController.manutencao` |
| `erro.ejs` | 27 | `middlewares/errorHandler.js:36` |

Partials: `head.ejs` (6 linhas — meta tags, favicon, `app.css`, `<title>`),
`header.ejs` (6), `footer.ejs` (5).

**Uso desigual dos partials:** `head.ejs` é incluído pelas 9 páginas, mas
`header.ejs` e `footer.ejs` só por `home.ejs` e `erro.ejs`. As sete páginas
internas não têm cabeçalho nem rodapé compartilhado.

**Escape:** nenhuma ocorrência de `<%- %>` fora de `include`. Todo conteúdo
dinâmico usa `<%= %>`.

JS de página em `src/public/js/`: `cadastro.js` e `onboarding.js`.

---

## 7. Migrations e schema atual

Runner próprio em `scripts/migrate.js`: lê `migrations/*.sql` em ordem lexical,
registra o aplicado em `schema_migrations`, roda cada arquivo em transação,
idempotente.

| Arquivo | Conteúdo |
|---|---|
| `001_schema_inicial.sql` | 15 tabelas com foreign keys e `CHECK` |
| `002_perfil_onboarding_concluido.sql` | `ALTER TABLE perfil ADD COLUMN onboarding_concluido TINYINT(1) NOT NULL DEFAULT 0` |

Tabelas e colunas do schema atual:

| Tabela | Colunas |
|---|---|
| `usuario` | `id`, `nome`, `email`, `data_nasc`, `senha`, `status`, `data_criacao`, `ultimo_login` |
| `admin` | `id_admin`, `user_id_user`, `data_criacao` |
| `perfil` | `id`, `id_usuario`, `apelido`, `avatar_img`, `moedas`, `pontos`, `data_criacao`, `onboarding_concluido` |
| `sessions` | `session_id`, `expires`, `data` |
| `nivel` | `id`, `id_perfil`, `nivel`, `xp_atual`, `xp_proximo_nivel` |
| `conteudo` | `id`, `id_admin_criador`, `titulo`, `descricao`, `corpo`, `data_publicacao` |
| `jogo` | `id`, `id_conteudo`, `nome`, `min_score` |
| `sessao_jogo` | `id`, `id_perfil`, `id_jogo`, `data_inicio`, `data_fim`, `duracao_seg`, `pontos_obtidos`, `moedas_ganhas`, `xp_obtido` |
| `item` | `id`, `id_admin_criador`, `nome`, `descricao`, `preco`, `categoria`, `status`, `data_criacao` |
| `compra` | `id`, `id_perfil`, `id_item`, `quantidade`, `preco_unitario`, `preco_total`, `data_compra` |
| `inventario` | `id`, `id_perfil`, `id_item`, `quantidade`, `data_aquisicao` |
| `cronograma` | `id`, `id_perfil`, `descricao`, `data_inicio`, `data_fim`, `horario`, `dia` |
| `meta` | `id`, `id_cronograma`, `titulo`, `descricao`, `data_criacao`, `data_final`, `status` |
| `tarefa` | `id`, `id_meta`, `id_perfil`, `titulo`, `descricao`, `data_criacao`, `data_inicio`, `data_prazo`, `status`, `prioridade`, `progresso` |
| `auditoria` | `id`, `ator_tipo`, `ator_id`, `acao`, `entidade`, `entidade_id`, `estado_anterior`, `estado_novo`, `criado_em` |

Seed (`scripts/seed.js`), idempotente: 2 usuários (`ana@beever.dev` comum,
`admin@beever.dev` admin), perfis e níveis correspondentes, 6 itens de catálogo,
1 conteúdo e 1 jogo ("Quiz da Poupança", `min_score` 60).

Outros SQL no repositório, fora do runner: `beever.sql` (raiz) e
`docs/legacy/beever.sql` — ambos dumps do banco legado, ver
`docs/00-AUDITORIA-DIVERGENCIAS.md`, D-01.

---

## 8. Assets de identidade visual

`src/public/img/` — 12 arquivos:

| Grupo | Arquivos |
|---|---|
| Mascote (Beenie) | `beenie_howdy.png`, `beenie_login.png`, `beenie_login_render.png`, `beenie_vem.png`, `beenie_1real.png`, `babybee.png` |
| Logo | `beever_logo_black.png`, `beever_logo_white.png`, `beever_logo_yellow.png`, `beever-icon.png` (favicon) |
| Economia | `mel-moeda-virtual.png`, `1real.gif` (animado) |

Estilos em `src/styles/`: `tailwind.css` (entrada, importa os outros dois),
`tema.css` (CSS resgatado do projeto antigo), `trilha.css` (estilos da trilha).
Saída gerada: `src/public/css/app.css` — está no `.gitignore`, precisa de
`npm run css:build` depois de clonar.

Tailwind **v4.3.3** (`tailwindcss` + `@tailwindcss/cli`), sem
`tailwind.config.js` — configuração por CSS, como a v4 espera. Os design tokens
**já existem**, no bloco `@theme` de `src/styles/tailwind.css`: paleta nomeada
(`--color-mel`, `--color-nectar`, `--color-ambar`, `--color-cera`,
`--color-tinta` e semânticos acerto/atenção/erro, cada um com variante
escurecida para texto por causa do contraste AA), raios (`--radius-favo`,
`--radius-pilula`) e famílias tipográficas (`--font-sans` Nunito,
`--font-display` Lilita One). O arquivo também declara os `@source` dos EJS e do
JS de página.

Pendência: **as duas fontes não são servidas pelo projeto**; até serem
auto-hospedadas, ambos os papéis caem em `system-ui`. Conferir os tokens contra
`docs/04-DESIGN-SYSTEM-E-LANDING.md` é tarefa da E11.

---

## 9. Testes

| Arquivo | Tipo |
|---|---|
| `test/unit/migrate.test.js` | unitário do runner de migrations |
| `test/unit/nivelService.test.js` | unitário de cálculo de XP/nível |
| `test/unit/usuarioService.test.js` | unitário de validação de senha e criação |
| `test/integration/app.test.js` | integração via supertest |

22 testes, todos passando. Nenhum teste cobre `compraService`, `tarefaService`,
`metaService`, `moedasService`, `pontosService`, `perfilService` ou
`authService`.

---

## 10. Próxima tarefa

**T-00.3** — listar código morto, duplicado e fora de camada, sem apagar nada.
Candidatos já visíveis neste inventário: `sessaoJogoRepository` (nenhum
importador), `nivelService.creditarXp` (nenhum chamador), dependência `cors`
(nunca importada), `header.ejs`/`footer.ejs` usados em 2 de 9 páginas.
