# Histórico de commits da branch refactor/arquitetura-em-camadas

Este documento registra os 193 commits da branch `refactor/arquitetura-em-camadas` que ainda não estão na `main`, do `5891668` de 11/08/2026 ao `1ca64b7` de 10/09/2026, em ordem cronológica. São 92 de `feat`, 29 de `fix`, 55 de `docs`, 8 de `test`, 5 de `refactor` e 4 de `chore`. Cada entrada traz hash, data, autor e tipo, os arquivos alterados com as linhas adicionadas e removidas, e o que foi feito, tirado do primeiro parágrafo da mensagem do commit.

Nos commits de `feat`, `fix` e `refactor` que mexem em JavaScript, o código mostrado é a versão atual, no commit `1ca64b7`, da função em que aquele commit mais escreveu. É o código que funciona hoje, e não o que o commit escreveu na época, porque commits seguintes podem ter corrigido o mesmo trecho. Cada função aparece uma vez só, na primeira entrada que a tocou; as seguintes apontam para ela. Trechos com mais de sessenta linhas são cortados e indicam onde terminam no arquivo.

## 11 de agosto de 2026

### 1. `5891668` refactor: migra para arquitetura em camadas (MVC + Service + Repository)

*11/08/2026, Razawaky, tipo `refactor`.*

Remove client/ (Vite/SPA) e server/ antigos; Adiciona src/{config,controllers,services,repositories,middlewares,routes,views,utils}; seguindo o fluxo Controller → Service → Repository → MySQL; View engine EJS server-rendered no lugar do SPA; Autenticação com bcrypt, sessão em MySQL, CSRF, rate limiting, helmet; log estruturado (pino) e trilha de auditoria; Runner de migrations versionado (migrations/) e seed de desenvolvimento; Dockerfile e docker-compose para ambiente local; Testes unitários e de integração (test/unit, test/integration)

**Arquivos (1456 arquivos, +6619 −170272):** `package-lock.json` (+3861 −0), `client/package-lock.json` (+0 −1716), `server/package-lock.json` (+0 −1186), `client/src/desafios.js` (+0 −727), `client/src/shop.js` (+0 −470), `client/src/onboarding.js` (+0 −286), `migrations/001_schema_inicial.sql` (+248 −0), `client/js/selecionarPerfil.js` (+0 −240), `client/pages/login.html` (+0 −201), `client/src/components/login.js` (+0 −198), `iniciar-proj.md` (+188 −0), `client/pages/SignUp.html` (+0 −187), e mais 111 arquivos, além de 1333 arquivos de `node_modules` que saíram do repositório.

**Código atual:** `criarApp` em `src/app.js:27`.

```js
/**
 * Monta o Express sem chamar `listen`, para que os testes de integração possam
 * usar o app direto com supertest. Quem sobe o servidor é `server.js`.
 */
export function criarApp() {
  const app = express();

  // Atrás de nginx/Caddy em produção: usa o IP e protocolo reais do cliente,
  // repassados pelo proxy, em vez dos do proxy.
  if (env.producao) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          // As fontes são auto-hospedadas em /fonts: nenhum CDN externo.
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    })
  );

  // Antes do logger: é ele quem cria o id que o `pino-http` vai reaproveitar e
  // que todo log da requisição vai carregar.
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      // Sem isto o pino-http inventaria um contador próprio por processo, e o
      // log teria dois identificadores diferentes para a mesma requisição.
      genReqId: (req) => req.id,
      autoLogging: { ignore: (req) => req.url === '/health' },
      // O token do link de troca de senha vale como senha até ser usado, então não entra no log.
      serializers: {
        req(req) {
          req.url = req.url.replace(/token=[^&]*/, 'token=[oculto]');
          return req;
        },
      },
    }),
  );

  app.set('view engine', 'ejs');
  app.set('views', path.join(diretorioAtual, 'views'));

  // O catálogo do mascote fica disponível em toda view: nenhuma tela escreve o
  // caminho da imagem, todas pedem a pose pelo nome.
  app.locals.mascote = mascote;
  app.use(express.static(path.join(diretorioAtual, 'public'), { maxAge: env.producao ? '7d' : 0 }));

  // As ilustrações enviadas pelo painel. Ficam fora de `src/public` porque são
  // conteúdo e não código — a pasta é volume em produção, e o que sai daqui é
  // sempre WebP gravado pelo servidor, nunca o arquivo cru de quem enviou.
  app.use('/uploads', express.static(env.uploads.diretorio, { maxAge: env.producao ? '7d' : 0 }));
  // … continua até a linha 104 do arquivo
```

## 17 de agosto de 2026

### 2. `c428ba3` chore: ignora estado local do plugin impeccable

*17/08/2026, Razawaky, tipo `chore`.*

O diretório .impeccable/ guarda cache de hook e configuração local da ferramenta de design, específicos da máquina de cada dev. Mesmo motivo pelo qual .claude/ e .github/ já eram ignorados.

**Arquivos (1 arquivo, +1 −0):** `.gitignore` (+1 −0).

### 3. `a2e596b` feat: recupera telas, loja e domínio de metas do projeto antigo

*17/08/2026, Razawaky, tipo `feat`.*

Fecha as três fases da recuperação das telas do client/ antigo. As três vão no mesmo commit porque são interdependentes: paginaController serve as páginas da fase 1 mas consome itemService e inventarioService (fase 2) e metaService (fase 3), e routes/index.js monta os três routers no mesmo bloco. Separar produziria commits que não sobem.

**Arquivos (52 arquivos, +1525 −131):** `src/public/js/onboarding.js` (+165 −0), `src/views/pages/metas.ejs` (+154 −0), `src/styles/tema.css` (+25 −74), `src/views/pages/cadastro.ejs` (+99 −0), `src/views/pages/painel.ejs` (+87 −0), `src/views/pages/login.ejs` (+65 −0), `src/controllers/paginaController.js` (+57 −0), `src/services/tarefaService.js` (+57 −0), `src/views/pages/loja.ejs` (+55 −0), `src/styles/tailwind.css` (+39 −15), `src/views/pages/onboarding.ejs` (+48 −0), `src/repositories/tarefaRepository.js` (+42 −0), e mais 40 arquivos.

**Código atual:** `renderizarEtapa` em `src/public/js/onboarding.js:224`.

```js
function renderizarEtapa() {
  const etapa = etapas[etapaAtual];
  botaoVoltar.classList.toggle('hidden', etapaAtual === 0);
  botaoAvancar.textContent = rotuloDoBotao();
  aplicarProgresso((etapaAtual / etapas.length) * 100);

  conteudo.replaceChildren(
    elemento('h2', 'text-2xl font-bold', etapa.pergunta),
    elemento('p', 'mt-1 mb-6 text-tinta-suave', etapa.subtitulo),
    montarCampo(etapa, respostas[etapa.id]),
  );
}
```

### 4. `a5f5e9b` docs: adiciona escopo do produto e a auditoria da etapa E00

*17/08/2026, Razawaky, tipo `docs`.*

Escopo (PROMPT-MESTRE e docs 01 a 04): papéis, protocolo de checkpoint requisitos numerados, roadmap por etapa, guia de banco e design system. PRODUCT.md e DESIGN.md são o material de produto e identidade visual que esses documentos referenciam.

**Arquivos (11 arquivos, +2717 −125):** `docs/01-REQUISITOS-E-REGRAS.md` (+454 −0), `DESIGN.md` (+347 −0), `docs/ESTADO-DO-PROJETO.md` (+206 −125), `docs/00-INVENTARIO.md` (+310 −0), `docs/02-ROADMAP-ETAPAS.md` (+279 −0), `docs/04-DESIGN-SYSTEM-E-LANDING.md` (+253 −0), `docs/PROMPT-MESTRE.md` (+206 −0), `docs/03-BANCO-DE-DADOS-DBA.md` (+202 −0), `docs/00-AUDITORIA-DIVERGENCIAS.md` (+176 −0), `PRODUCT.md` (+149 −0), `docs/00-CODIGO-MORTO-E-DUPLICADO.md` (+135 −0).

### 5. `4898fa3` chore: versiona o schema do banco legado como insumo da E01

*17/08/2026, Razawaky, tipo `chore`.*

Dump phpMyAdmin de 11/08/2026 do banco antigo, ponto de partida da E01. As 4 linhas de INSERT foram removidas: traziam contas reais de teste com e-mail e hash de senha. Só a estrutura interessa para derivar o schema novo, e os dados originais seguem em docs/legacy/beever.sql.

**Arquivos (1 arquivo, +502 −0):** `beever.sql` (+502 −0).

### 6. `47c4674` docs: atualiza o estado após commitar as fases 1-3

*17/08/2026, Razawaky, tipo `docs`.*

DT-01 e o risco R-03 encerrados: o trabalho das fases 1 a 3 saiu do working tree. Working tree limpo, 22 testes passando.

**Arquivos (1 arquivo, +7 −8):** `docs/ESTADO-DO-PROJETO.md` (+7 −8).

### 7. `0b7cdc6` docs: corrige as lacunas L-01 e L-02 da auditoria da E00

*17/08/2026, Razawaky, tipo `docs`.*

L-01 — o aceite da etapa pede um documento que se leia em 2 minutos, e o ESTADO-DO-PROJETO.md tinha 11 minutos de leitura. O bloco de abertura virou um resumo executivo de 356 palavras (~1,8 min) que responde sozinho onde estamos, o que funciona, o que não existe, qual é o buraco mais sério e o que vem agora, com uma tabela de números. O resto do documento continua sendo a evidência por trás do resumo.

**Arquivos (2 arquivos, +200 −14):** `docs/00-MAPA-DE-NOMES-LEGADO.md` (+159 −0), `docs/ESTADO-DO-PROJETO.md` (+41 −14).

### 8. `55eb730` docs: auditoria do schema (T-01.1 e T-01.2)

*17/08/2026, Razawaky, tipo `docs`.*

Relatório obrigatório da E01, nos 9 itens do formato da seção 2 do documento de banco, entregue antes de qualquer migration como o checklist de aceite exige. Compara três fontes: o dump da raiz, o schema atual em migrations/ e o modelo alvo. Conclusão: o schema definitivo não sai de nenhum dos dois existentes. O dump tem zero foreign key, zero CHECK, sete colunas ENUM e quatro tabelas de log guardando cópia de nome e e-mail — essa última viola a RN-053, porque excluir a conta não apaga o dado pessoal. O schema atual é melhor em integridade e é dele que vêm as decisões de FK e CHECK aproveitadas.

**Arquivos (1 arquivo, +304 −0):** `docs/01-AUDITORIA-DO-SCHEMA.md` (+304 −0).

### 9. `023908c` feat: schema definitivo do Beever em migrations versionadas (T-01.3)

*17/08/2026, Razawaky, tipo `feat`.*

Junta o dump legado da raiz com o schema de migrations/001+002 e produz o banco definitivo, estruturado a partir das regras de negócio de docs/01-REQUISITOS-E-REGRAS.md e das convenções de docs/03-BANCO-DE-DADOS-DBA.md. A auditoria que justifica cada decisão está em docs/01-AUDITORIA-DO-SCHEMA.md.

**Arquivos (11 arquivos, +1288 −12):** `migrations/005_economy_items_inventory.sql` (+303 −0), `migrations/003_rewards_ledgers.sql` (+246 −0), `migrations/004_goals_tasks_streaks.sql` (+207 −0), `migrations/001_core_users.sql` (+175 −0), `migrations/002_content_hives_cells.sql` (+157 −0), `migrations/007_gamification.sql` (+68 −0), `migrations/README.md` (+63 −0), `migrations/006_audit_operational.sql` (+49 −0), `docs/ESTADO-DO-PROJETO.md` (+20 −12), `migrations/_legacy/001_schema_inicial.sql` (+0 −0), `migrations/_legacy/002_perfil_onboarding_concluido.sql` (+0 −0).

### 10. `32d527c` feat: runner com checksum, reset e reconciliação do banco (T-01.4)

*17/08/2026, Razawaky, tipo `feat`.*

O runner de migrations passa a gravar o checksum SHA-256 de cada arquivo aplicado em schema_migrations e a conferir na execução seguinte. Editar uma migration já aplicada não muda o banco e faz ambientes divergirem em silêncio — agora o runner para e explica o que fazer. Bancos criados antes desta versão ganham a coluna sozinhos e têm o checksum preenchido na primeira execução, com aviso.

**Arquivos (10 arquivos, +477 −29):** `scripts/reconcile.js` (+117 −0), `scripts/migrate.js` (+103 −8), `scripts/reset.js` (+100 −0), `test/unit/migrate.test.js` (+58 −2), `test/unit/reset.test.js` (+48 −0), `docs/ESTADO-DO-PROJETO.md` (+15 −10), `test/unit/reconcile.test.js` (+25 −0), `iniciar-proj.md` (+5 −5), `package.json` (+4 −2), `migrations/README.md` (+2 −2).

**Código atual:** `CONFERENCIAS` em `scripts/reconcile.js:23`.

```js
const CONFERENCIAS = [
  {
    nome: 'mel (wallets.coins x coin_ledger)',
    sql: `
      SELECT w.user_id, w.coins AS cache, COALESCE(SUM(l.amount), 0) AS livro
        FROM wallets w
        LEFT JOIN coin_ledger l ON l.user_id = w.user_id
       GROUP BY w.user_id, w.coins
      HAVING w.coins <> COALESCE(SUM(l.amount), 0)`,
  },
  {
    nome: 'pólen (wallets.points_total x point_ledger)',
    sql: `
      SELECT w.user_id, w.points_total AS cache, COALESCE(SUM(l.amount), 0) AS livro
        FROM wallets w
        LEFT JOIN point_ledger l ON l.user_id = w.user_id
       GROUP BY w.user_id, w.points_total
      HAVING w.points_total <> COALESCE(SUM(l.amount), 0)`,
  },
  {
    nome: 'XP (user_levels.xp_total x xp_ledger)',
    sql: `
      SELECT u.user_id, u.xp_total AS cache, COALESCE(SUM(l.amount), 0) AS livro
        FROM user_levels u
        LEFT JOIN xp_ledger l ON l.user_id = u.user_id
       GROUP BY u.user_id, u.xp_total
      HAVING u.xp_total <> COALESCE(SUM(l.amount), 0)`,
  },
  {
    nome: 'cofre (vaults.balance x vault_transactions)',
    sql: `
      SELECT v.user_id, v.balance AS cache, COALESCE(SUM(t.amount), 0) AS livro
        FROM vaults v
        LEFT JOIN vault_transactions t ON t.user_id = v.user_id
       GROUP BY v.user_id, v.balance
      HAVING v.balance <> COALESCE(SUM(t.amount), 0)`,
  },
  {
    // RN-003: o nível é derivado do XP pela tabela `levels`. Se o cache disser
    // um nível que a curva não sustenta, alguém calculou por fórmula em algum
    // lugar — que é exatamente o que a regra proíbe.
    nome: 'nível (user_levels.level x curva de levels)',
    sql: `
      SELECT ul.user_id, ul.level AS cache,
             (SELECT MAX(l.level) FROM levels l WHERE l.required_xp <= ul.xp_total) AS livro
        FROM user_levels ul
       HAVING cache <> livro`,
  },
  {
    // xp_next_level é cópia do degrau seguinte da curva, guardada para a barra
    // de progresso não fazer mais um join por página. Cópia que não confere é
    // barra de progresso mentindo para a criança.
    nome: 'próximo nível (user_levels.xp_next_level x curva de levels)',
    sql: `
      SELECT ul.user_id, ul.xp_next_level AS cache,
             COALESCE((SELECT MIN(l.required_xp) FROM levels l WHERE l.required_xp > ul.xp_total), 0) AS livro
        FROM user_levels ul
       HAVING cache <> livro`,
  },
  {
  // … continua até a linha 98 do arquivo
```

### 11. `091e07b` feat: seeds do schema novo com usuário demo jogável (T-01.5)

*17/08/2026, Razawaky, tipo `feat`.*

O scripts/seed.js virou runner: o dado de exemplo mora em scripts/seeds/*.sql, aplicado em ordem lexical, um arquivo por transação. Migration nunca carrega seed, e o dado de exemplo continua legível como SQL — que é a linguagem em que ele é discutido.

**Arquivos (9 arquivos, +901 −121):** `scripts/seeds/06_admin_dev.sql` (+271 −0), `scripts/seed.js` (+112 −113), `scripts/seeds/02_age_bands_domains.sql` (+186 −0), `scripts/seeds/03_items_catalog.sql` (+143 −0), `scripts/seeds/05_demo_content.sql` (+67 −0), `scripts/seeds/04_reward_configs.sql` (+46 −0), `scripts/seeds/01_levels.sql` (+33 −0), `test/unit/seed.test.js` (+33 −0), `docs/ESTADO-DO-PROJETO.md` (+10 −8).

**Código atual:** `semear` em `scripts/seed.js:124`.

```js
export async function semear({ diretorio = diretorioSeeds, conexao, comDemo = false } = {}) {
  const propria = !conexao;
  const conn =
    conexao ??
    (await mysql.createConnection({
      host: env.banco.host,
      port: env.banco.porta,
      user: env.banco.usuario,
      password: env.banco.senha,
      database: env.banco.nome,
      multipleStatements: false,
    }));

  try {
    // bcrypt não roda em SQL, então os hashes entram como variável de sessão e
    // o arquivo 06 os consome. Melhor do que hash fixo no arquivo, que
    // esconderia qual é a senha.
    await conn.query('SET @admin_hash = ?, @demo_hash = ?, @avancado_hash = ?', [
      await bcrypt.hash(CONTAS.admin.senha, CUSTO_BCRYPT),
      await bcrypt.hash(CONTAS.demo.senha, CUSTO_BCRYPT),
      await bcrypt.hash(CONTAS.avancado.senha, CUSTO_BCRYPT),
    ]);

    const arquivos = await listarSeeds(diretorio);
    for (const arquivo of arquivos) {
      await aplicar(conn, diretorio, arquivo);
    }

    if (comDemo) {
      for (const arquivo of await listarSeeds(diretorioDemo)) {
        await aplicar(conn, diretorioDemo, arquivo);
        arquivos.push(`seeds-demo/${arquivo}`);
      }
    }

    await derivarComportamentos(conn);

    return { arquivos, resumo: await contar(conn) };
  } finally {
    if (propria) await conn.end();
  }
}
```

### 12. `f8fe330` docs: modelo de dados com diagramas ER (T-01.7)

*17/08/2026, Razawaky, tipo `docs`.*

docs/MODELO-DE-DADOS.md explica o banco que a E01 produziu: o DDL em migrations/ é a verdade, e este documento é o porquê. Seis diagramas ER em mermaid, um por área do modelo (contas, trilha recompensas, metas e sequência, economia, auditoria), cada um com as colunas que importam para entender a ligação. Todos os nomes de tabela dos diagramas foram conferidos contra os CREATE TABLE das migrations.

**Arquivos (2 arquivos, +600 −4):** `docs/MODELO-DE-DADOS.md` (+593 −0), `docs/ESTADO-DO-PROJETO.md` (+7 −4).

### 13. `df9dfc9` docs: fecha a E01 com a subida do zero verificada (T-01.8)

*17/08/2026, Razawaky, tipo `docs`.*

O volume do MySQL foi apagado e recriado, e o ciclo completo rodou como roda para quem clona o projeto: docker compose up -d mysql, db:migrate db:seed, db:reconcile. Sem nenhum GRANT manual — o contêiner criou banco usuário e permissão sozinho, que é a parte que um banco de teste criado na mão não exercita.

**Arquivos (2 arquivos, +54 −37):** `docs/ESTADO-DO-PROJETO.md` (+51 −37), `.gitignore` (+3 −0).

### 14. `fdc003b` feat: fecha as lacunas da auditoria da E01

*17/08/2026, Razawaky, tipo `feat`.*

Cinco itens que o checklist de aceite não pedia, mas a auditoria da etapa apontou. 1. Auditoria imutável de verdade (RNF-17). Até aqui append-only era só um comentário em 006 — nada impedia reescrever o histórico. A migration 008 põe dois gatilhos em audit_logs que recusam UPDATE e DELETE citando a regra. É o único trigger do projeto, e por um motivo estreito: "esta linha nunca muda" não tem como virar CHECK. O docker-compose ganhou --log-bin-trust-function-creators=1, porque com log binário ligado criar gatilho exigiria SUPER — que o usuário da aplicação não tem e não deve ter.

**Arquivos (9 arquivos, +402 −51):** `scripts/backup.js` (+150 −0), `scripts/seeds/03_items_catalog.sql` (+51 −32), `iniciar-proj.md` (+70 −4), `docs/ESTADO-DO-PROJETO.md` (+25 −15), `scripts/reconcile.js` (+38 −0), `migrations/008_audit_immutability.sql` (+33 −0), `test/unit/backup.test.js` (+29 −0), `docker-compose.yml` (+5 −0), `package.json` (+1 −0).

**Código atual:** `escolherComando` em `scripts/backup.js:42`.

```js
/** Descobre se existe `mysqldump` na máquina; senão, usa o do contêiner. */
async function escolherComando() {
  const existeLocal = await new Promise((resolve) => {
    const teste = spawn('mysqldump', ['--version'], { stdio: 'ignore' });
    teste.on('error', () => resolve(false));
    teste.on('close', (codigo) => resolve(codigo === 0));
  });

  const argumentosDump = [
    `--host=${env.banco.host}`,
    `--port=${env.banco.porta}`,
    `--user=${env.banco.usuario}`,
    '--single-transaction',
    '--routines',
    '--events',
    '--triggers',
    env.banco.nome,
  ];

  if (existeLocal) return { comando: 'mysqldump', argumentos: argumentosDump };

  // Sem cliente local: o dump sai de dentro do contêiner do compose, onde o
  // banco é sempre localhost.
  return {
    comando: 'docker',
    argumentos: [
      'compose',
      'exec',
      '-T',
      '-e',
      `MYSQL_PWD=${env.banco.senha}`,
      CONTAINER_COMPOSE,
      'mysqldump',
      `--user=${env.banco.usuario}`,
      '--single-transaction',
      '--routines',
      '--events',
      '--triggers',
      env.banco.nome,
    ],
  };
}
```

### 15. `b9d9f84` test: arnês de banco real e asserções de integridade (T-02.1)

*17/08/2026, Razawaky, tipo `test`.*

Fecha a DT-16, apontada pela auditoria da E01: as constraints do banco eram verificadas por comandos que eu digitava no terminal, e prova que não se repete sozinha vira folclore na semana seguinte.

**Arquivos (5 arquivos, +426 −13):** `test/integration/schema.test.js` (+292 −0), `test/helpers/banco.js` (+103 −0), `docs/ESTADO-DO-PROJETO.md` (+12 −9), `iniciar-proj.md` (+17 −3), `package.json` (+2 −1).

### 16. `d9dc8fd` docs: registra a reordenação da E02 e como retomar o trabalho

*17/08/2026, Razawaky, tipo `docs`.*

A reordenação da E02 tinha sido aprovada no checkpoint e explicada na conversa, mas nunca chegou ao 02-ROADMAP-ETAPAS.md — que continuava mandando construir config, logger e middlewares que existem desde a migração para camadas. Quem abrisse o roadmap numa sessão nova seguiria a lista errada. Agora a etapa traz a lista aprovada, o motivo da mudança e o que já existia antes dela.

**Arquivos (2 arquivos, +63 −16):** `docs/ESTADO-DO-PROJETO.md` (+41 −3), `docs/02-ROADMAP-ETAPAS.md` (+22 −13).

### 17. `c061fa7` refactor: realinha os primeiros repositories ao schema novo (T-02.2, parte 1)

*17/08/2026, Razawaky, tipo `refactor`.*

Aponta cinco repositories para as tabelas do schema definitivo da E01, em inglês, seguindo o mapa de nomes legado: usuarioRepository  -> usersRepository; perfilRepository   -> profilesRepository; nivelRepository    -> userLevelsRepository; auditoriaRepository -> auditLogsRepository; walletsRepository (novo): mel e pólen, com crédito e débito exigindo; conexão de transação, porque o livro é a verdade e a carteira é cache.

**Arquivos (10 arquivos, +404 −213):** `src/repositories/usersRepository.js` (+106 −0), `src/repositories/walletsRepository.js` (+101 −0), `src/repositories/usuarioRepository.js` (+0 −89), `src/repositories/perfilRepository.js` (+0 −70), `src/repositories/profilesRepository.js` (+69 −0), `src/repositories/auditLogsRepository.js` (+56 −0), `src/repositories/userLevelsRepository.js` (+55 −0), `src/repositories/nivelRepository.js` (+0 −27), `src/repositories/auditoriaRepository.js` (+0 −26), `src/config/database.js` (+17 −1).

**Código atual:** `atualizar` em `src/repositories/usersRepository.js:87`.

```js
/** COALESCE mantém o valor atual quando o campo não é enviado. */
export async function atualizar(
  id,
  { apelido = null, email = null, dataNasc = null, senhaHash = null },
  conexao = null,
) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE users
        SET nickname      = COALESCE(?, nickname),
            email         = COALESCE(?, email),
            birth_date    = COALESCE(?, birth_date),
            password_hash = COALESCE(?, password_hash)
      WHERE id = ?`,
    [apelido, email, dataNasc, senhaHash, id],
  );
  return resultado.affectedRows;
}
```

### 18. `2270762` refactor: realinha os repositories restantes ao schema novo (T-02.2)

*17/08/2026, Razawaky, tipo `refactor`.*

Fecha o realinhamento dos 13 repositories ao schema definitivo da E01 e cobre cada um com teste de integração contra banco real: 93 asserções novas, todas passando com `npm run test:db`.

**Arquivos (32 arquivos, +2657 −225):** `test/integration/repositories/goals.test.js` (+193 −0), `test/integration/repositories/purchases.test.js` (+183 −0), `test/integration/repositories/inventory.test.js` (+176 −0), `test/integration/repositories/gameSessions.test.js` (+169 −0), `test/integration/repositories/wallets.test.js` (+165 −0), `test/integration/repositories/tasks.test.js` (+163 −0), `test/integration/repositories/users.test.js` (+158 −0), `test/integration/repositories/userLevels.test.js` (+150 −0), `src/repositories/goalsRepository.js` (+139 −0), `src/repositories/tasksRepository.js` (+134 −0), `src/repositories/inventoryRepository.js` (+123 −0), `src/repositories/gameSessionsRepository.js` (+121 −0), e mais 20 arquivos.

**Código atual:** `criar` em `src/repositories/goalsRepository.js:68`.

```js
/**
 * Cria a meta já ativa. O prazo vem calculado de fora porque quem sabe a regra
 * de prazo é o service (`default_days` da dificuldade, ajustado pela faixa
 * etária) — o repository não decide data.
 */
export async function criar(
  conexao,
  { idUsuario, idTipo, idDificuldade, titulo, alvo, recompensaMoedas = 0, recompensaPontos = 0, prazo, renovadaDe = null },
) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO goals (user_id, goal_type_id, status_id, difficulty_id, title, target_value,
                        reward_coins, reward_points, due_at, renewed_from_goal_id)
     VALUES (?, ?, (SELECT id FROM goal_statuses WHERE slug = 'ativa'), ?, ?, ?, ?, ?, ?, ?)`,
    [idUsuario, idTipo, idDificuldade, titulo, alvo, recompensaMoedas, recompensaPontos, prazo, renovadaDe],
  );
  return resultado.insertId;
}
```

### 19. `eec2b34` docs: registra o fechamento da T-02.2 e o estado real da suíte

*17/08/2026, Razawaky, tipo `docs`.*

Atualiza o estado do projeto e o roadmap com o que a T-02.2 entregou: os 13 repositories falando o schema novo e 93 testes de integração contra banco real. Corrige os números que estavam velhos — 138 testes passando e 3 falhando, não 62 passando — e diz por que os 3 falham: os services ainda importam nomes de repository que não existem mais, o que também explica por que `npm start` não sobe. Preferi deixar isso escrito com o número exato a maquiar de verde: quem retomar o projeto precisa saber que a janela vermelha existe e quando fecha.

**Arquivos (2 arquivos, +96 −46):** `docs/ESTADO-DO-PROJETO.md` (+94 −44), `docs/02-ROADMAP-ETAPAS.md` (+2 −2).

### 20. `3680c31` refactor: realinha services, controllers e telas ao schema novo (T-02.3)

*17/08/2026, Razawaky, tipo `refactor`.*

Devolve a aplicação ao ar. O fluxo inteiro foi percorrido contra o servidor rodando — cadastro, onboarding, painel, loja, tarefa, compra, meta, logout — e virou teste automatizado em `test/integration/fluxoAutenticado.test.js`, que era a metade da DT-16 ainda aberta: nenhuma rota autenticada tinha teste.

**Arquivos (63 arquivos, +2082 −902):** `test/integration/fluxoAutenticado.test.js` (+254 −0), `src/views/pages/metas.ejs` (+120 −86), `src/services/levelsService.js` (+174 −0), `src/services/usersService.js` (+166 −0), `src/services/goalsService.js` (+135 −0), `src/services/profilesService.js` (+131 −0), `src/services/tasksService.js` (+123 −0), `src/services/usuarioService.js` (+0 −110), `src/services/nivelService.js` (+0 −88), `src/services/perfilService.js` (+0 −82), `src/services/purchasesService.js` (+78 −0), `src/services/itemsService.js` (+68 −0), e mais 51 arquivos.

**Código atual:** `definirPontoDePartida` em `src/services/levelsService.js:107`.

```js
/**
 * Ponto de partida do onboarding: quem já entende do assunto não recomeça do
 * zero.
 *
 * O XP inicial **entra pelo livro**, como qualquer outro. A primeira versão
 * disto gravava direto no cache, com o argumento de que o jogador não tinha
 * *ganhado* aquele XP jogando — e o `npm run db:reconcile` reprovou na hora,
 * apontando três contas com cache 1120 e livro 0. Ele estava certo: a régua do
 * projeto é que o livro explica o saldo, e saldo sem lançamento é saldo sem
 * origem. O motivo `ajuste-administrativo` é exatamente o que descreve um
 * crédito concedido pelo sistema.
 *
 * Lança-se a diferença, não o total: se a linha de nível já tiver XP, refazer o
 * ponto de partida não pode creditar tudo de novo.
 */
export async function definirPontoDePartida(conexao, idUsuario, nivelEscolhido) {
  const nivel = NIVEL_DE_PARTIDA[nivelEscolhido];
  if (!nivel) throw erroValidacao(`Nível inicial desconhecido: ${nivelEscolhido}`);

  const curva = await obterCurva();
  const xpTotal = xpDoNivel(curva, nivel);
  const xpProximoNivel = xpDoProximoNivel(curva, nivel) ?? xpTotal;

  const linha = await userLevelsRepository.buscarPorUsuario(idUsuario);
  const xpAnterior = Number(linha?.xp_total ?? 0);
  const diferenca = xpTotal - xpAnterior;

  if (diferenca > 0) {
    await userLevelsRepository.lancarXp(conexao, {
      idUsuario,
      quantidade: diferenca,
      motivo: 'ajuste-administrativo',
      referenciaTipo: 'onboarding',
      referenciaId: idUsuario,
      saldoDepois: xpTotal,
    });
  }

  await userLevelsRepository.atualizar(conexao, idUsuario, { nivel, xpTotal, xpProximoNivel });

  return { nivel, xpTotal, xpProximoNivel };
}
```

### 21. `ac9660e` docs: registra o fechamento da T-02.3 e o encerramento do risco R-01

*17/08/2026, Razawaky, tipo `docs`.*

Atualiza o estado do projeto e o roadmap: a aplicação voltou ao ar contra o schema novo, a suíte tem 171 testes passando e o R-01 — a janela em que a troca de schema derrubou o app — está encerrado depois de duas parcelas anunciadas.

**Arquivos (2 arquivos, +58 −56):** `docs/ESTADO-DO-PROJETO.md` (+56 −54), `docs/02-ROADMAP-ETAPAS.md` (+2 −2).

### 22. `4e6020c` feat: transforma a checagem de onboarding em middleware (T-02.4)

*17/08/2026, Razawaky, tipo `feat`.*

`requireOnboarding` e `requireOnboardingPendente` passam a decidir quem entra declarados na rota em vez de repetidos dentro dos controllers de página. O ganho não é de organização, é de cobertura: a regra antiga morava em dois `if` dentro do `paginaController` e por isso valia só onde alguém lembrou de escrevê-la — as rotas JSON de loja, metas e tarefas nunca checaram nada, e dava para comprar um item sem ter configurado o perfil. Agora a mesma regra vale para navegador e API, com a resposta que cada um entende: redirecionamento para quem pediu HTML, 403 `ONBOARDING_PENDENTE` para quem pediu JSON.

**Arquivos (9 arquivos, +195 −27):** `test/integration/fluxoAutenticado.test.js` (+104 −0), `src/middlewares/requireOnboarding.js` (+72 −0), `src/middlewares/exigirLoginPagina.js` (+0 −16), `src/routes/index.js` (+5 −5), `src/controllers/paginaController.js` (+2 −3), `src/routes/loja.js` (+4 −1), `src/routes/perfil.js` (+4 −0), `src/routes/metas.js` (+2 −1), `src/routes/tarefas.js` (+2 −1).

**Código atual:** `requireOnboarding` em `src/middlewares/requireOnboarding.js:28`.

```js
/**
 * Exige que a conta tenha concluído o onboarding.
 *
 * A regra estava copiada dentro dos controllers de página — cada um com o seu
 * `if (!req.session.onboardingConcluido) return res.redirect('/onboarding')` —
 * e por isso valia só onde alguém lembrou de escrever: as rotas JSON de loja,
 * metas e tarefas nunca checaram nada. Como middleware, ela passa a valer por
 * declaração na rota, que é onde dá para conferir de relance quem exige o quê.
 *
 * A resposta depende do cliente: navegador precisa ser levado ao lugar certo,
 * cliente de API precisa de um código para tratar. Redirecionar uma chamada
 * JSON entregaria HTML para quem pediu dado.
 *
 * Estes dois guardas também absorveram o `exigirLoginPagina`, que existia só
 * para mandar a página sem sessão ao login — era a outra metade da dívida
 * DT-07, e virou código morto assim que toda página protegida passou a
 * declarar um destes. Se algum dia existir página que exija login mas não
 * onboarding, ela volta; hoje não existe.
 *
 * A fonte da verdade é `users.onboarding_completed_at`, lido no login e no
 * fim do onboarding e guardado na sessão. O middleware não vai ao banco: a
 * sessão já carrega a resposta, e o fluxo Controller → Service → Repository
 * continua sendo o único caminho até o MySQL.
 */
export function requireOnboarding(req, res, next) {
  if (!req.session?.usuarioId) {
    return querJson(req) ? next(erroNaoAutorizado()) : res.redirect('/login');
  }

  if (req.session.onboardingConcluido) return next();

  if (querJson(req)) {
    return next(
      new ErroAplicacao('Conclua a configuração do perfil antes de continuar', {
        status: 403,
        codigo: 'ONBOARDING_PENDENTE',
      }),
    );
  }

  res.redirect('/onboarding');
}
```

### 23. `8b0cae1` docs: registra o fechamento da T-02.4

*17/08/2026, Razawaky, tipo `docs`.*

Quatro das sete tarefas da E02 fechadas, 176 testes passando e a DT-07 resolvida por inteiro. A próxima é a T-02.5, request-id no logger.

**Arquivos (2 arquivos, +16 −15):** `docs/ESTADO-DO-PROJETO.md` (+14 −13), `docs/02-ROADMAP-ETAPAS.md` (+2 −2).

### 24. `8510dd3` feat: dá um identificador a cada requisição, do header ao log (T-02.5)

*17/08/2026, Razawaky, tipo `feat`.*

Toda requisição ganha um id, devolvido no header `x-request-id` e carimbado em cada linha de log que ela produzir. É o que responde, quando algo quebra em produção, a pergunta de sempre: quais destas linhas são da mesma requisição? Sem o id, a resposta é "as que estão perto no arquivo", o que deixa de valer no instante em que dois jogadores usam o sistema ao mesmo tempo.

**Arquivos (8 arquivos, +213 −2):** `test/integration/app.test.js` (+52 −0), `test/unit/contextoRequisicao.test.js` (+51 −0), `src/middlewares/requestId.js` (+35 −0), `src/config/contextoRequisicao.js` (+33 −0), `src/app.js` (+13 −1), `src/config/logger.js` (+11 −0), `src/middlewares/errorHandler.js` (+9 −1), `src/views/pages/erro.ejs` (+9 −0).

**Código atual:** `requestId` em `src/middlewares/requestId.js:41`.

```js
export function requestId(req, res, next) {
  // Atrás de um proxy que já identifica a requisição, reaproveita-se o id dele:
  // assim o rastro atravessa nginx e aplicação sem trocar de nome no meio.
  const recebido = req.headers[CABECALHO];
  const id = typeof recebido === 'string' && FORMATO_ACEITO.test(recebido) ? recebido : randomUUID();

  req.id = id;
  res.setHeader(CABECALHO, id);

  executarComContexto({ requestId: id, ipHash: anonimizarIp(req.ip) }, next);
}
```

### 25. `1d0e5c9` docs: registra o fechamento da T-02.5

*17/08/2026, Razawaky, tipo `docs`.*

Cinco das sete tarefas da E02 fechadas e 187 testes passando. Registra também como o rastro por requisição foi verificado com o servidor no ar. A próxima é a T-02.6, o AuditService com API única.

**Arquivos (2 arquivos, +14 −12):** `docs/ESTADO-DO-PROJETO.md` (+12 −10), `docs/02-ROADMAP-ETAPAS.md` (+2 −2).

### 26. `0bedb04` feat: AuditService com porta única para a trilha de auditoria (T-02.6)

*17/08/2026, Razawaky, tipo `feat`.*

Sete services chamavam o repository de auditoria direto, cada um montando o registro à mão. O resultado era o esperado: um mandava `atorTipo: 'Usuario'` outro `'usuario'`; uns guardavam o estado anterior, outros não; e `ip_hash` estava sempre nulo, apesar de existir no schema desde a E01. Uma trilha só vale se as linhas forem comparáveis entre si — com cada chamador inventando o próprio formato, o que havia era um punhado de anotações.

**Arquivos (14 arquivos, +253 −101):** `src/services/auditService.js` (+78 −0), `src/services/usersService.js` (+20 −21), `test/unit/auditService.test.js` (+35 −0), `src/services/profilesService.js` (+10 −19), `test/integration/fluxoAutenticado.test.js` (+24 −0), `migrations/009_audit_request_id.sql` (+22 −0), `src/services/goalsService.js` (+8 −14), `src/services/tasksService.js` (+8 −14), `src/middlewares/requestId.js` (+18 −2), `src/services/authService.js` (+5 −15), `src/config/contextoRequisicao.js` (+11 −0), `src/services/purchasesService.js` (+4 −7), e mais 2 arquivos.

**Código atual:** `registrar` em `src/services/auditService.js:59`.

```js
/**
 * Registra uma ação na trilha.
 *
 * @param {{tipo: string, id: number|null}} ator quem agiu — use `usuario()`, `admin()` ou `sistema()`
 * @param {string} acao o que aconteceu, no formato `entidade.verbo` (`compra.realizada`)
 * @param {{entidade: string, id?: number|null, antes?: object|null, depois?: object|null}} alvo
 */
export async function registrar(ator, acao, alvo) {
  const { entidade, id = null, antes = null, depois = null } = alvo;

  try {
    await auditLogsRepository.registrar({
      atorTipo: ator.tipo,
      atorId: ator.id,
      acao,
      entidade,
      entidadeId: id,
      estadoAnterior: antes,
      estadoNovo: depois,
      ipHash: hashDoIpDaRequisicao() ?? null,
      requestId: idDaRequisicao() ?? null,
    });
  } catch (erro) {
    logger.error(
      { erro, acao, entidade, entidadeId: id, atorTipo: ator.tipo, atorId: ator.id },
      'Falha ao registrar auditoria — a operação seguiu, mas o rastro se perdeu',
    );
  }
}
```

### 27. `7a3bb9d` docs: registra o fechamento da T-02.6

*17/08/2026, Razawaky, tipo `docs`.*

Seis das sete tarefas da E02 fechadas e 192 testes passando. Registra a divergência de assinatura em relação ao roadmap: o AuditService expõe registrar(ator, acao, alvo), em português como o resto do código, em vez do record(actor, action, before, after) previsto. A próxima e última da etapa e a T-02.7, o layout EJS base.

**Arquivos (2 arquivos, +16 −15):** `docs/ESTADO-DO-PROJETO.md` (+14 −13), `docs/02-ROADMAP-ETAPAS.md` (+2 −2).

### 28. `c687c6f` feat: layout EJS base para todas as páginas (T-02.7)

*17/08/2026, Razawaky, tipo `feat`.*

As nove páginas repetiam cada uma o próprio `<!doctype>`, `<head>` e `<body>` — nove cópias do mesmo esqueleto, das quais só duas lembravam de incluir cabeçalho e rodapé. Era a dívida DT-11: trocar a tag de idioma ou acrescentar uma meta significava abrir nove arquivos e esquecer um.

**Arquivos (15 arquivos, +646 −602):** `src/views/pages/metas.ejs` (+165 −173), `src/views/pages/cadastro.ejs` (+81 −91), `src/views/pages/painel.ejs` (+80 −88), `src/views/pages/login.ejs` (+48 −56), `src/views/pages/loja.ejs` (+43 −51), `src/views/pages/onboarding.ejs` (+31 −45), `src/views/pages/home.ejs` (+24 −36), `src/views/pages/erro.ejs` (+21 −33), `test/integration/app.test.js` (+40 −0), `src/controllers/paginaController.js` (+30 −9), `src/utils/pagina.js` (+31 −0), `src/views/layout.ejs` (+29 −0), e mais 3 arquivos.

**Código atual:** `renderizarPagina` em `src/utils/pagina.js:15`.

```js
/**
 * Renderiza uma página dentro do layout base.
 *
 * Existe para que nenhum controller precise saber que existe um `layout.ejs`
 * nem lembrar de passar `classeBody`, `scripts` e companhia. O controller diz
 * qual página quer e com quais dados; o resto tem padrão.
 *
 * @param {import('express').Response} res
 * @param {string} pagina nome do arquivo em `views/pages`, sem extensão
 * @param {object} dados o que a página precisa, mais as opções de layout abaixo
 */
export function renderizarPagina(res, pagina, dados = {}) {
  const {
    classeBody = 'min-h-screen bg-white text-tinta antialiased',
    comCabecalho = false,
    comRodape = false,
    // A tela de jogo é a única que pede o contrário: nada clicável fora do jogo
    // (seção 5 do design system). Todas as outras trazem o painel.
    comAcessibilidade = true,
    dadosBody = {},
    scripts = [],
    ...conteudo
  } = dados;

  return res.render('layout', {
    pagina: `pages/${pagina}`,
    // Disponível em toda página: barra de progresso aparece no painel e nas
    // metas, e nenhuma das duas pode escrever largura em atributo `style`.
    classeDaBarra,
    // Também global: a conquista aparece na Colmeia e na tela dela, e o ícone
    // tem um lugar só de troca (DT-103).
    iconeDaConquista,
    classeBody,
    comCabecalho,
    comRodape,
    comAcessibilidade,
    dadosBody,
    scripts,
    ...conteudo,
  });
}
```

### 29. `10bd9c7` docs: fecha as sete tarefas da E02 e aponta a auditoria da etapa

*17/08/2026, Razawaky, tipo `docs`.*

As sete tarefas da E02 estao entregues, com 198 testes passando. O proximo passo nao e a E03: e a auditoria da etapa, como foi feito com a E01. Registra tambem o unico ponto do aceite ainda nao exercitado — erro sem stack trace so vale em producao, e a aplicacao nunca subiu com NODE_ENV=production.

**Arquivos (2 arquivos, +23 −15):** `docs/ESTADO-DO-PROJETO.md` (+22 −14), `docs/02-ROADMAP-ETAPAS.md` (+1 −1).

### 30. `79f1444` fix: fecha o mel infinito e faz a meta pagar (auditoria da E02)

*17/08/2026, Razawaky, tipo `fix`.*

Os dois itens bloqueantes que a auditoria da E02 levantou. **Mel infinito.** Criar tarefa e concluir na sequência pagava a recompensa cheia sem cumprir nada, em laço: cerca de 300 pares de requisições por janela de rate limit. O teste de fluxo desta mesma etapa explorava isso sem perceber, para juntar mel antes de comprar — o que diz bem o quanto o buraco era natural de achar.

**Arquivos (16 arquivos, +580 −115):** `src/services/tasksService.js` (+137 −16), `test/integration/fluxoAutenticado.test.js` (+108 −16), `test/integration/erroEmProducao.test.js` (+77 −0), `src/services/goalsService.js` (+66 −1), `src/views/pages/metas.ejs` (+12 −40), `src/repositories/tasksRepository.js` (+33 −7), `src/routes/tarefas.js` (+22 −11), `migrations/010_goal_rewards.sql` (+26 −0), `src/repositories/goalsRepository.js` (+19 −7), `test/integration/repositories/goals.test.js` (+18 −0), `test/integration/repositories/tasks.test.js` (+18 −0), `scripts/seeds/02_age_bands_domains.sql` (+11 −5), e mais 4 arquivos.

**Código atual:** `garantirTarefasDoDia` em `src/services/tasksService.js:120`.

```js
export async function garantirTarefasDoDia(idUsuario, agora = new Date()) {
  // O dia é o do jogador, não o do servidor (RN-024): em outro fuso, a virada
  // no relógio da máquina entregava as tarefas na hora errada.
  const fuso = await profilesService.fusoDoUsuario(idUsuario);
  const hoje = dataDoDia(agora, fuso);

  // Expira antes de contar. Tarefa vencida ocupando vaga faria o teto de 3
  // bloquear a geração de hoje, e o jogador ficaria sem tarefa nenhuma.
  await emTransacao((conexao) => tasksRepository.expirarVencidasDoUsuario(idUsuario, conexao));

  const disponiveis = await schedulesService.diasDisponiveis(idUsuario);
  const hojeVale = disponiveis.length === 0 || disponiveis.includes(diaDaSemana(hoje));
  if (!hojeVale) return { criadas: 0, motivo: 'dia fora da agenda do jogador' };

  const vagas = MAXIMO_DE_ATIVAS - (await tasksRepository.contarAtivas(idUsuario));
  if (vagas <= 0) return { criadas: 0, motivo: 'o jogador já tem o máximo de tarefas ativas' };

  // Tipo cuja fonte ninguém sabe medir não é proposto, pelo mesmo motivo do
  // planejador de metas: tarefa impossível de cumprir não é tarefa.
  const mensuraveis = taskProgressSources.fontesMensuraveis();
  const tipos = (await tasksRepository.listarTipos()).filter((tipo) =>
    mensuraveis.includes(tipo.progress_source),
  );
  const diarios = tipos.filter((tipo) => tipo.scope === 'diaria');
  const semanais = tipos.filter((tipo) => tipo.scope === 'semanal');

  const [jaDiarias, jaSemanais] = await Promise.all([
    tasksRepository.listarAtivasPorEscopoDesde(idUsuario, 'diaria', paraMySQL(inicioDoDia(hoje, fuso))),
    tasksRepository.listarAtivasPorEscopoDesde(idUsuario, 'semanal', paraMySQL(inicioDaSemana(hoje, fuso))),
  ]);

  const aCriar = [
    ...escolherTipos(diarios, TAREFAS_DIARIAS - jaDiarias.length, hoje).map((tipo) => ({
      tipo,
      prazo: paraMySQL(fimDoDia(hoje, fuso)),
    })),
    ...escolherTipos(semanais, TAREFAS_SEMANAIS - jaSemanais.length, hoje).map((tipo) => ({
      tipo,
      prazo: paraMySQL(fimDaSemana(hoje, fuso)),
    })),
  ].slice(0, vagas);

  for (const { tipo, prazo } of aCriar) {
    const idTarefa = await emTransacao((conexao) =>
      tasksRepository.criar(conexao, { idUsuario, idTipo: tipo.id, prazo }),
    );

    await auditService.registrar(auditService.sistema(), 'tarefa.gerada', {
      entidade: 'task',
      id: idTarefa,
      depois: { tipo: tipo.slug, escopo: tipo.scope, prazo, alvo: Number(tipo.default_target) },
    });
  }

  return { criadas: aCriar.length };
}
```

### 31. `6e4a821` docs: registra a auditoria da E02 e as dividas que ela abriu

*17/08/2026, Razawaky, tipo `docs`.*

A auditoria reprovou a primeira versao da etapa por dois bloqueantes na economia, ambos ja corrigidos. As lacunas nao bloqueantes viraram DT-18 a DT-22, cada uma com etapa marcada, em vez de sumirem do radar.

**Arquivos (2 arquivos, +33 −12):** `docs/ESTADO-DO-PROJETO.md` (+27 −12), `docs/02-ROADMAP-ETAPAS.md` (+6 −0).

### 32. `c57a074` docs: registra a DT-23 (virada do dia no fuso do servidor) e o estado real da E03

*17/08/2026, Razawaky, tipo `docs`.*

A virada do dia usa new Date() cru, enquanto a RN-024 manda usar o fuso do perfil. Fica para a E08, junto da sequencia: as duas dependem da mesma nocao de "dia do jogador" e devem ser resolvidas de uma vez.

**Arquivos (2 arquivos, +9 −8):** `docs/02-ROADMAP-ETAPAS.md` (+8 −8), `docs/ESTADO-DO-PROJETO.md` (+1 −0).

### 33. `c2f1eab` feat: consentimento do responsável no registro de menor (T-03.5)

*17/08/2026, Razawaky, tipo `feat`.*

Conta de criança passa a exigir que um responsável autorize, com a prova gravada em `guardian_consents` — a tabela existia desde a E01 e nunca havia sido usada pelo código. É a RNF-34, e por trás dela o Art. 14 da LGPD.

**Arquivos (8 arquivos, +304 −5):** `test/integration/repositories/guardianConsents.test.js` (+114 −0), `src/services/usersService.js` (+59 −4), `src/repositories/guardianConsentsRepository.js` (+48 −0), `test/integration/fluxoAutenticado.test.js` (+37 −0), `src/views/pages/cadastro.ejs` (+25 −0), `test/unit/usersService.test.js` (+10 −0), `src/routes/users.js` (+7 −0), `src/controllers/usersController.js` (+4 −1).

**Código atual:** `criar` em `src/services/usersService.js:116`.

```js
/**
 * Cria a conta inteira ou nenhuma parte dela.
 *
 * São quatro linhas em quatro tabelas — conta, perfil, carteira e nível — e
 * todas fazem parte do que "ter uma conta" significa. Uma conta sem carteira
 * não consegue receber mel; uma sem linha de nível quebra na primeira
 * recompensa. Por isso a transação: no schema antigo isso eram três chamadas
 * soltas que podiam falhar no meio e deixar conta pela metade.
 */
export async function criar({ email, dataNasc, senha, apelido, consentimentoResponsavel = false }) {
  exigirSenhaValida(senha);
  return criarConta({ email, dataNasc, apelido, consentimentoResponsavel, senha });
}
```

### 34. `789aca3` docs: registra a T-03.5 e deixa a T-03.6 apontada como proximo passo

*17/08/2026, Razawaky, tipo `docs`.*

Consentimento do responsavel entregue; a E03 fica com 5 de 6 tarefas. O que falta esta escrito no estado com nome e lista, para a proxima sessao comecar sem reconstruir contexto.

**Arquivos (1 arquivo, +7 −5):** `docs/ESTADO-DO-PROJETO.md` (+7 −5).

### 35. `0a21cc9` test: cobre as recusas da autenticação e a força bruta (T-03.6)

*17/08/2026, Razawaky, tipo `test`.*

Fecha a E03. Dez casos que passavam por verificação manual — o que é o mesmo que dizer que não passavam por nada: senha fraca nas três formas de ser fraca e-mail repetido, credencial errada, conta inativa, sessão expirada, logout que invalida no servidor e força bruta barrada.

**Arquivos (2 arquivos, +327 −0):** `test/integration/seguranca.test.js` (+212 −0), `test/integration/bruteForce.test.js` (+115 −0).

### 36. `0888087` docs: fecha a E03 e aponta a auditoria da etapa

*17/08/2026, Razawaky, tipo `docs`.*

Quatro etapas prontas de dezesseis, 225 testes passando. Como na E02, a etapa so deve ser dada por concluida depois de auditada — e a proxima parada e a E04 onde mora o GoalPlannerService que ainda nao existe.

**Arquivos (2 arquivos, +12 −9):** `docs/ESTADO-DO-PROJETO.md` (+10 −7), `docs/02-ROADMAP-ETAPAS.md` (+2 −2).

## 18 de agosto de 2026

### 37. `39f3646` fix: exige posse da conta para alterar e inativar (auditoria da E03)

*18/08/2026, Razawaky, tipo `fix`.*

PUT /users/:id e DELETE /users/:id exigiam sessão e paravam aí. O id vinha da URL e entrava direto no UPDATE, então qualquer conta logada trocava e-mail e senha de qualquer outra e assumia o lugar dela, ou a desativava. Faltava autorização, não autenticação: a auditoria registrava o atacante com precisão e gravar o fato nunca foi o mesmo que impedi-lo.

**Arquivos (2 arquivos, +100 −2):** `test/integration/seguranca.test.js` (+77 −1), `src/services/usersService.js` (+23 −1).

**Código atual:** `exigirPosse` em `src/services/usersService.js:46`.

```js
/**
 * Só o dono da conta mexe na conta — ou um administrador.
 *
 * Estar logado dizia quem você é, não sobre quem você pode agir: as rotas de
 * conta exigiam sessão e paravam aí, e o id da URL entrava direto no `UPDATE`.
 * Qualquer conta trocava e-mail e senha de qualquer outra, e a auditoria
 * registrava fielmente o atacante — gravar o fato não é impedi-lo.
 *
 * O perfil já fazia a checagem certa (`profilesService.exigirPosse`); aqui ela
 * faltava. Recusar com 403 e não com 404 é decisão consciente: quem está logado
 * já sabe que outras contas existem, então esconder a existência não protege
 * nada e só atrapalha quem tenta entender o erro.
 */
function exigirPosse(idAlvo, ator) {
  if (ator?.ehAdmin) return;
  if (Number(ator?.id) !== Number(idAlvo)) throw erroAcessoNegado('Você só pode alterar a sua própria conta');
}
```

### 38. `5c4ab5e` fix: desenha as barras de progresso sem atributo style (auditoria da E03)

*18/08/2026, Razawaky, tipo `fix`.*

A CSP declara style-src 'self' sem 'unsafe-inline' (RNF-11), e isso vale também para o atributo style de um elemento, não só para a tag <style>. As barras de XP, de tarefa e de meta escreviam a largura ali dentro, então o navegador descartava a regra e as três apareciam vazias.

**Arquivos (5 arquivos, +86 −9):** `src/styles/tema.css` (+35 −0), `src/views/pages/painel.ejs` (+19 −7), `src/utils/barraDeProgresso.js` (+18 −0), `src/views/pages/metas.ejs` (+9 −2), `src/utils/pagina.js` (+5 −0).

**Código atual:** `classeDaBarra` em `src/utils/barraDeProgresso.js:12`.

```js
/**
 * Traduz um percentual na classe de largura da barra de progresso.
 *
 * A largura não pode sair como atributo `style`: a CSP declara
 * `style-src 'self'` sem `'unsafe-inline'` (RNF-11), e o navegador descarta
 * estilo escrito direto na marcação. As classes `.barra-0` a `.barra-100`, em
 * passos de 5%, moram em `src/styles/tema.css`.
 *
 * O arredondamento é só visual — o número exato continua indo para o texto ao
 * lado da barra e para o `aria-valuenow`, que é o que o leitor de tela anuncia.
 */
export function classeDaBarra(percentual) {
  const numero = Number(percentual);
  if (!Number.isFinite(numero)) return 'barra-0';

  const limitado = Math.min(100, Math.max(0, numero));
  return `barra-${Math.round(limitado / 5) * 5}`;
}
```

### 39. `a90a66d` test: tira a suíte da dependência do dia da semana (auditoria da E03)

*18/08/2026, Razawaky, tipo `test`.*

O estado do projeto afirmava 225 testes passando e 0 falhando. Numa terça falhavam 6: o fluxo autenticado gravava a agenda semanal como segunda, quarta e sexta e depois esperava as tarefas do dia, que tasksService só propõe em dia marcado (RN-011, funcionando como especificado). Fora desses três dias, nenhuma tarefa nascia e caíam em cascata tarefa, mel, pólen, compra, meta e auditoria da compra — seis testes reprovando por um motivo que não tinha nada a ver com o que eles verificam.

**Arquivos (2 arquivos, +53 −6):** `test/integration/fluxoAutenticado.test.js` (+43 −1), `test/integration/bruteForce.test.js` (+10 −5).

### 40. `0ac0dc6` docs: registra a auditoria da E03 e fecha a etapa

*18/08/2026, Razawaky, tipo `docs`.*

A auditoria reprovou a primeira versão da etapa: dois bloqueantes — tomada de conta pelas rotas /users/:id e suíte presa ao dia da semana — e um alto, as barras de progresso apagadas pela CSP. Os três estão corrigidos nos commits anteriores, e o relatório guarda o diagnóstico e o que cada um exigiu.

**Arquivos (3 arquivos, +266 −11):** `docs/03-AUDITORIA-DA-ETAPA.md` (+235 −0), `docs/ESTADO-DO-PROJETO.md` (+24 −10), `docs/02-ROADMAP-ETAPAS.md` (+7 −1).

### 41. `07bf3db` feat: onboarding em passos com progresso salvo no servidor (T-04.1 e T-04.2)

*18/08/2026, Razawaky, tipo `feat`.*

Fecha as duas primeiras tarefas da E04 num commit só, porque a T-04.1 ficou no working tree quando a sessão anterior acabou. T-04.1 — auditoria do onboarding existente (docs/04-AUDITORIA-DO-ONBOARDING.md): requisito a requisito, veredito peça por peça e o contrato que o GoalPlannerService vai precisar ler. Dois bloqueantes corrigidos na hora: o servidor aceitava concluir o onboarding com a semana inteira vazia, contra a RF-ONB-03 — e semana vazia é a entrada da RN-014, que não tem faixa para zero dias —, e PUT /perfil/:id aceitava tempo de sessão de 5 a 60 minutos enquanto o banco só admite 5, 10 ou 20 (ck_profiles_session_minutes), então erro de formulário chegava ao jogador como 500.

**Arquivos (13 arquivos, +1145 −143):** `src/public/js/onboarding.js` (+215 −112), `docs/04-AUDITORIA-DO-ONBOARDING.md` (+259 −0), `test/integration/onboarding.test.js` (+222 −0), `src/services/profilesService.js` (+134 −1), `docs/ESTADO-DO-PROJETO.md` (+98 −20), `test/unit/profilesService.test.js` (+53 −0), `test/integration/fluxoAutenticado.test.js` (+49 −0), `src/routes/perfil.js` (+34 −2), `migrations/011_onboarding_step.sql` (+23 −0), `src/repositories/profilesRepository.js` (+18 −2), `src/controllers/paginaController.js` (+14 −4), `src/views/pages/onboarding.ejs` (+13 −2), e mais 1 arquivos.

**Código atual:** `montarCampo` em `src/public/js/onboarding.js:159`.

```js
function montarCampo(etapa, valorAtual) {
  if (etapa.tipo === 'texto') {
    const campo = document.createElement('input');
    campo.type = 'text';
    campo.id = 'campo-etapa';
    campo.required = true;
    campo.maxLength = 100;
    campo.className = CLASSE_CAMPO;
    campo.placeholder = etapa.placeholder;
    campo.value = typeof valorAtual === 'string' ? valorAtual : '';
    return campo;
  }

  const opcoes = opcoesDaEtapa(etapa);

  if (etapa.tipo === 'select') {
    const campo = document.createElement('select');
    campo.id = 'campo-etapa';
    campo.required = true;
    campo.className = CLASSE_CAMPO;

    const vazia = elemento('option', null, 'Selecione uma opção...');
    vazia.value = '';
    vazia.disabled = true;
    vazia.selected = !valorAtual;
    campo.append(vazia);

    for (const opcao of opcoes) {
      const item = elemento('option', null, opcao.rotulo);
      item.value = opcao.valor;
      item.selected = valorAtual === opcao.valor;
      campo.append(item);
    }
    return campo;
  }

  const multipla = etapa.tipo === 'multipla';
  const marcados = multipla ? [].concat(valorAtual ?? []).map(String) : [];
  const caixa = elemento('div', multipla ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3');

  for (const opcao of opcoes) {
    const marcada = multipla ? marcados.includes(opcao.valor) : valorAtual === opcao.valor;
    caixa.append(opcaoMarcavel(multipla ? 'checkbox' : 'radio', opcao, marcada));
  }
  return caixa;
}
```

### 42. `1aed560` docs: registra o hash da T-04.1 e da T-04.2 no estado do projeto

*18/08/2026, Razawaky, tipo `docs`.*

O amend do commit anterior mudou o hash depois de o documento já citá-lo. Fica num commit separado porque corrigir dentro do próprio commit é circular: cada amend gera um hash novo.

**Arquivos (1 arquivo, +2 −2):** `docs/ESTADO-DO-PROJETO.md` (+2 −2).

### 43. `fd37b7f` feat: onboarding coleta tempo por sessão, som e animação (T-04.3)

*18/08/2026, Razawaky, tipo `feat`.*

O wizard passou de cinco para sete passos e coleta, enfim, tudo que a RN-011 e a RN-050 pedem. Entraram o tempo por sessão, na posição que a regra lhe dá — logo depois dos dias —, e as preferências de som e animação, antes do nível. As três colunas já existiam em `profiles` desde a migration 001 e ficavam no padrão para sempre, porque nenhuma tela as escrevia: era a DT-20, aberta desde a auditoria da E02.

**Arquivos (14 arquivos, +653 −133):** `src/services/profilesService.js` (+167 −26), `test/integration/onboarding.test.js` (+128 −9), `docs/ESTADO-DO-PROJETO.md` (+72 −27), `src/public/js/onboarding.js` (+57 −31), `src/repositories/profilesRepository.js` (+62 −8), `test/integration/repositories/profiles.test.js` (+38 −6), `src/controllers/profilesController.js` (+30 −2), `test/integration/fluxoAutenticado.test.js` (+25 −6), `src/routes/perfil.js` (+23 −7), `migrations/012_session_minutes_opcoes.sql` (+27 −0), `test/unit/profilesService.test.js` (+12 −6), `test/integration/schema.test.js` (+7 −2), e mais 2 arquivos.

**Código atual:** `salvarOnboarding` em `src/services/profilesService.js:351`.

```js
/**
 * Onboarding (RN-012): fecha de uma vez o apelido, o avatar, o objetivo
 * inicial, o tempo por sessão, as preferências de apresentação, o ponto de
 * partida do XP e os dias da semana em que o jogador pretende jogar.
 *
 * Tudo numa transação porque um onboarding pela metade é pior do que nenhum: a
 * conta ficaria marcada como configurada, com o jogador caindo num painel sem
 * nível nem agenda e sem tela nenhuma para voltar e corrigir.
 *
 * A marca de concluído é gravada por último e só uma vez — o
 * `AND onboarding_completed_at IS NULL` do repository garante que reenviar o
 * formulário não reescreve a data original.
 */
export async function salvarOnboarding(
  idPerfil,
  idUsuario,
  { apelido, avatar, objetivo, nivel, dias = [], minutosPorSessao, preferencias },
) {
  // RF-ONB-03: pelo menos um dia. A tela já cobrava, o servidor não — e semana
  // vazia não é detalhe cosmético: é o que a RN-014 lê para dizer quantas metas
  // o jogador recebe, e a faixa de zero dias não existe na tabela.
  if (dias.length === 0) throw erroValidacao(ERRO_SEM_DIAS);

  const catalogo = await obterCatalogoDoOnboarding();
  // RF-ONB-06: o avatar é obrigatório para concluir. Conferir os dois slugs
  // aqui, antes da transação, é o que impede a conta de terminar o onboarding
  // sem mascote e sem objetivo (DT-27).
  exigirDoCatalogo(catalogo.avatar, avatar, 'Escolha sua abelha');
  exigirDoCatalogo(catalogo.objetivo, objetivo, 'Escolha um objetivo');

  const minutosInformados = minutosPorSessao !== undefined && minutosPorSessao !== null;
  if (minutosInformados) exigirMinutosValidos(minutosPorSessao);
  // Quem passou passo a passo já gravou as preferências; quem mandou tudo de
  // uma vez manda a lista aqui. Ausente quer dizer "não mexeu", e o perfil fica
  // com o padrão do banco.
  const preferenciasMarcadas = preferencias === undefined ? null : lerPreferencias(preferencias);

  await exigirPosse(idPerfil, idUsuario);

  // O ponto de partida lança XP no livro, e crédito de XP precisa de rastro
  // (RN-010). O retrato do antes é lido aqui, antes de qualquer escrita.
  const saldoAntes = await auditService.retratoDoSaldo(idUsuario);

  const resultado = await emTransacao(async (conexao) => {
    if (apelido) await usersRepository.atualizar(idUsuario, { apelido }, conexao);
    await profilesRepository.atualizar(
      idPerfil,
      {
        avatar,
        objetivoInicial: objetivo,
        minutosPorSessao: minutosInformados ? Number(minutosPorSessao) : null,
        ...(preferenciasMarcadas ?? {}),
      },
      conexao,
    );

    const nivelInicial = await levelsService.definirPontoDePartida(conexao, idUsuario, nivel);
    const diasMarcados = await schedulesService.definirSemana(conexao, idUsuario, dias);

    // Passo além do último: quem concluiu não tem passo pendente. Vale mesmo
  // … continua até a linha 451 do arquivo
```

### 44. `8be688f` docs: registra o hash da T-04.3 no estado do projeto

*18/08/2026, Razawaky, tipo `docs`.*

**Arquivos (1 arquivo, +1 −1):** `docs/ESTADO-DO-PROJETO.md` (+1 −1).

### 45. `a818e70` feat: GoalPlannerService gerando as metas da RN-014 (T-04.4)

*18/08/2026, Razawaky, tipo `feat`.*

As metas deixaram de depender de o jogador escrever uma à mão. Ao concluir o onboarding ele recebe o conjunto que a RN-014 manda (RF-ONB-07); ao concluir uma meta, outra nasce no lugar (RN-016); e toda visita ao painel completa o que faltar, de modo que a conta nunca fica sem meta ativa (RN-018). O planejador é idempotente: completa o plano e nunca apaga meta que já existe.

**Arquivos (13 arquivos, +994 −57):** `test/integration/planejadorDeMetas.test.js` (+251 −0), `src/services/goalPlannerService.js` (+226 −0), `test/unit/goalPlannerService.test.js` (+186 −0), `docs/ESTADO-DO-PROJETO.md` (+70 −20), `migrations/013_planejador_de_metas.sql` (+69 −0), `scripts/seeds/02_age_bands_domains.sql` (+51 −0), `src/services/goalsService.js` (+15 −31), `src/services/goalProgressSources.js` (+42 −0), `src/repositories/goalsRepository.js` (+38 −0), `src/services/profilesService.js` (+27 −1), `test/integration/fluxoAutenticado.test.js` (+8 −3), `src/controllers/paginaController.js` (+7 −0), e mais 1 arquivos.

**Código atual:** `montarPlano` em `src/services/goalPlannerService.js:79`.

```js
/**
 * Monta o plano sem gravar nada. `pedidas` volta sempre, porque a tela de perfil
 * precisa dela para explicar as metas que sobraram; `metas` vazia quer dizer que
 * não há o que criar.
 */
async function montarPlano(idUsuario) {
  const [dias, perfil, regras, ativas] = await Promise.all([
    schedulesService.diasDisponiveis(idUsuario),
    profilesRepository.buscarPorUsuario(idUsuario),
    goalsRepository.listarRegrasDePlano(),
    goalsRepository.listarAtivasPorUsuario(idUsuario),
  ]);

  if (dias.length === 0) return { dias: 0, pedidas: 0, metas: [] };

  const plano = escolherPlano(regras, dias.length);
  if (!plano) throw erroValidacao(`Não há regra de plano de metas para ${dias.length} dia(s) na semana`);

  const pedidas = Number(plano.active_goals);
  const faltam = pedidas - ativas.length;
  if (faltam <= 0) return { dias: dias.length, pedidas, metas: [] };

  // RN-015: o tipo precisa de régua de alvo e de fonte de progresso. Sem as
  // duas, a meta nasceria impossível de medir.
  const mensuraveis = new Set(goalProgressSources.fontesMensuraveis());
  const candidatos = (await goalsRepository.listarRegrasDeAlvo()).filter((tipo) =>
    mensuraveis.has(tipo.progress_source),
  );
  if (candidatos.length === 0) return { dias: dias.length, pedidas, metas: [] };

  const minutosPorSessao = Number(perfil?.session_minutes ?? MINUTOS_DE_REFERENCIA);
  const diasDePrazo = Number(plano.default_days);
  const prazo = new Date(Date.now() + diasDePrazo * 24 * 60 * 60 * 1000);

  // Tipo que já está em uso não é sorteado de novo enquanto houver tipo livre:
  // duas metas iguais na tela é pior do que uma meta de cada assunto.
  const usados = new Map();
  for (const meta of ativas) usados.set(meta.type_slug, (usados.get(meta.type_slug) ?? 0) + 1);

  const metas = [];
  for (let i = 0; i < faltam; i += 1) {
    const livres = candidatos.filter((tipo) => !usados.has(tipo.slug));
    const escolhido = sortear(livres.length > 0 ? livres : candidatos);
    const repeticao = (usados.get(escolhido.slug) ?? 0) + 1;
    usados.set(escolhido.slug, repeticao);

    const valorAtual = (await goalProgressSources.medir(escolhido.progress_source, idUsuario)) ?? 0;
    const alvo = calcularAlvo({
      regraDeAlvo: escolhido,
      valorAtual,
      dias: dias.length,
      minutosPorSessao,
      diasDePrazo,
      repeticao,
    });

    metas.push({
      idTipo: escolhido.goal_type_id,
      tipo: escolhido.slug,
      idDificuldade: plano.difficulty_id,
  // … continua até a linha 144 do arquivo
```

### 46. `96ff703` docs: registra o hash da T-04.4 no estado do projeto

*18/08/2026, Razawaky, tipo `docs`.*

**Arquivos (1 arquivo, +1 −1):** `docs/ESTADO-DO-PROJETO.md` (+1 −1).

### 47. `f36b99c` docs: trava a decisão sobre metas excedentes ao reduzir a disponibilidade

*18/08/2026, Razawaky, tipo `docs`.*

Reduzir os dias da semana passa a deixar as metas excedentes ativas até vencer em vez de cancelá-las. Quem não concluiu no prazo não é recompensado, e nada é apagado: o progresso feito continua lá, como a RN-013 exige, e a meta vencida apenas deixa de pagar, sem punição, como manda a RN-017.

**Arquivos (1 arquivo, +13 −5):** `docs/ESTADO-DO-PROJETO.md` (+13 −5).

### 48. `d72b18d` feat: edição da disponibilidade no perfil, com recálculo (T-04.6 e T-04.7)

*18/08/2026, Razawaky, tipo `feat`.*

A semana deixou de ser decidida uma vez só no onboarding. A tela `/perfil` mostra os dias marcados e as metas de agora, e salvar uma semana nova passa pelo planejador (RF-ONB-09, RN-013, RN-017).

**Arquivos (11 arquivos, +601 −21):** `test/integration/disponibilidade.test.js` (+209 −0), `src/views/pages/perfil.ejs` (+97 −0), `src/public/js/perfil.js` (+80 −0), `src/services/profilesService.js` (+51 −0), `src/controllers/paginaController.js` (+36 −6), `src/repositories/goalsRepository.js` (+39 −1), `src/services/goalsService.js` (+35 −0), `src/services/goalPlannerService.js` (+14 −13), `src/routes/perfil.js` (+22 −1), `src/controllers/profilesController.js` (+17 −0), `src/routes/index.js` (+1 −0).

**Código atual:** `resumir` em `src/public/js/perfil.js:21`.

```js
/**
 * O texto que o jogador lê depois de salvar: quantos dias ficaram, quantas metas
 * nasceram e que as excedentes continuam valendo até vencer.
 */
function resumir(resultado) {
  const partes = [`Agora você joga ${resultado.dias.length} dia(s) por semana.`];

  if (resultado.metasGeradas > 0) {
    partes.push(`${resultado.metasGeradas} meta(s) nova(s) entraram no seu plano.`);
  }
  if (resultado.metasExcedentes > 0) {
    partes.push(
      `Você tem ${resultado.metasExcedentes} meta(s) além do que este ritmo pede: elas continuam valendo até o prazo acabar, e o que você já fez nelas não se perde.`,
    );
  }
  if (resultado.metasGeradas === 0 && resultado.metasExcedentes === 0) {
    partes.push('Seu plano de metas continua o mesmo.');
  }

  return partes.join(' ');
}
```

### 49. `17a2546` docs: fecha a T-04.6 e a T-04.7 no estado do projeto

*18/08/2026, Razawaky, tipo `docs`.*

Registra os hashes reais, a contagem nova de testes (270, 205 contra banco) e o que as duas tarefas entregaram. Corrige a contradição que o documento carregava: a tabela da E04 dava as duas como feitas enquanto a tabela de roadmap ainda dizia que faltavam.

**Arquivos (1 arquivo, +34 −11):** `docs/ESTADO-DO-PROJETO.md` (+34 −11).

### 50. `a75d546` docs: auditoria da E04 — pode avançar, com oito lacunas registradas

*18/08/2026, Razawaky, tipo `docs`.*

Laudo requisito a requisito da E04 sobre o commit `17a2546`: RF-ONB-01 a 09 e RN-011 a 018, cada um com arquivo e teste que o prova. O critério de aceite da etapa está coberto por teste com banco real, camadas, auditoria, transação idempotência, validação e escape passaram na conferência.

**Arquivos (1 arquivo, +94 −0):** `docs/04-AUDITORIA-DA-ETAPA.md` (+94 −0).

### 51. `54f539f` fix: fecha as três lacunas de maior risco da auditoria da E04

*18/08/2026, Razawaky, tipo `fix`.*

L-1: `atualizarDisponibilidade` expirava nada antes de replanejar. A expiração é preguiçosa, então a meta fora do prazo continua com status `ativa` no banco até alguém marcá-la — e entrava na conta do planejador. Quem trocava a semana logo depois de uma meta vencer, sem passar pelo painel, recebia menos metas do que a faixa nova pede. Agora a ordem é a mesma do painel e da tela de metas: expira, depois conta.

**Arquivos (5 arquivos, +108 −25):** `docs/ESTADO-DO-PROJETO.md` (+35 −24), `test/integration/disponibilidade.test.js` (+39 −0), `docs/04-AUDITORIA-DA-ETAPA.md` (+19 −0), `src/views/pages/perfil.ejs` (+8 −1), `src/services/profilesService.js` (+7 −0).

**Código atual:** `atualizarDisponibilidade` em `src/services/profilesService.js:287`.

```js
/**
 * Troca os dias da semana depois do onboarding (RF-ONB-09, RN-013).
 *
 * Nada de progresso se perde: o planejador completa o que falta e nunca apaga
 * meta ativa, então quem reduz os dias mantém as excedentes até vencerem.
 * Devolve o antes e o depois para a tela poder explicar o que mudou.
 */
export async function atualizarDisponibilidade(idPerfil, idUsuario, dias) {
  const escolhidos = [].concat(dias ?? []).filter((dia) => dia !== '' && dia !== null && dia !== undefined);
  if (escolhidos.length === 0) throw erroValidacao(ERRO_SEM_DIAS);

  await exigirPosse(idPerfil, idUsuario);

  // A expiração é preguiçosa: sem esta linha, a meta vencida ainda contaria
  // como ativa e a semana nova nasceria com meta a menos.
  await goalsService.expirarVencidas(idUsuario);

  const antes = await schedulesService.diasDisponiveis(idUsuario);
  const metasAntes = await goalsService.listarAtivas(idUsuario);

  // São sete gravações, uma por dia. Numa transação só: falha no meio não deixa
  // a semana metade nova, metade velha.
  await emTransacao((conexao) => schedulesService.definirSemana(conexao, idUsuario, escolhidos));
  const depois = await schedulesService.diasDisponiveis(idUsuario);

  // Pede mais metas: completa. Pede menos: não faz nada — e é esse "nada" que
  // preserva o que estava em andamento.
  const planejadas = await goalPlannerService.garantirMetasAtivas(idUsuario);
  const metasDepois = await goalsService.listarAtivas(idUsuario);

  await auditService.registrar(auditService.usuario(idUsuario), 'perfil.disponibilidade-alterada', {
    entidade: 'profile',
    id: idPerfil,
    antes: { dias: antes, metasAtivas: metasAntes.length },
    depois: { dias: depois, metasAtivas: metasDepois.length, metasGeradas: planejadas.criadas },
  });

  return {
    dias: depois,
    metasAtivas: metasDepois.length,
    metasGeradas: planejadas.criadas,
    // Quantas sobraram além do que a faixa pede. A tela explica que ficam até
    // vencer.
    metasPedidas: Number(planejadas.metasPedidas),
    metasExcedentes: Math.max(0, metasDepois.length - Number(planejadas.metasPedidas)),
  };
}
```

### 52. `ff2063a` fix: tranca o planejador contra corrida e fecha a segunda passagem da E04

*18/08/2026, Razawaky, tipo `fix`.*

A segunda passagem da auditoria da E04 reproduziu um defeito que a primeira não viu: `montarPlano` lia quantas metas faltavam e só depois criava, sem trava entre as duas coisas. Quatro visitas simultâneas ao painel — dois cliques rápidos bastam — criavam 12 metas em vez de 3, várias com alvo idêntico. Como o progresso é lido do saldo, um único acúmulo de 125 de mel completava as quatro cópias e cada uma pagava recompensa inteira: uma conquista, quatro pagamentos contra a RN-016.

**Arquivos (11 arquivos, +235 −130):** `docs/04-AUDITORIA-DA-ETAPA.md` (+111 −1), `src/services/goalPlannerService.js` (+35 −68), `docs/ESTADO-DO-PROJETO.md` (+24 −12), `src/services/profilesService.js` (+13 −22), `test/integration/disponibilidade.test.js` (+25 −0), `src/public/js/perfil.js` (+5 −12), `src/services/goalsService.js` (+4 −10), `src/repositories/usersRepository.js` (+9 −0), `src/controllers/paginaController.js` (+2 −3), `src/repositories/goalsRepository.js` (+3 −2), `src/routes/perfil.js` (+4 −0).

**Código atual:** `garantirMetasAtivas` em `src/services/goalPlannerService.js:180`.

```js
/**
 * Completa o plano até a quantidade da RN-014 e devolve o que criou. Nunca mexe
 * em meta existente: quem reduziu os dias fica com o excesso até vencer
 * (RN-013).
 */
export async function garantirMetasAtivas(idUsuario) {
  const plano = await montarPlano(idUsuario);
  if (plano.metas.length === 0) return { criadas: 0, metas: [], metasPedidas: plano.pedidas };

  // Trava, reconta e só então cria. Sem a trava, duas requisições simultâneas
  // leem o mesmo "faltam 3" e criam 3 cada uma — metas duplicadas, com o mesmo
  // alvo, pagando a mesma conquista duas vezes.
  const { criadas, metasCriadas } = await emTransacao(async (conexao) => {
    await usersRepository.travarPorId(conexao, idUsuario);

    const ativas = await goalsRepository.listarAtivasPorUsuario(idUsuario, conexao);
    const faltam = plano.pedidas - ativas.length;
    if (faltam <= 0) return { criadas: [], metasCriadas: [] };

    const aCriar = plano.metas.slice(0, faltam);
    const ids = [];
    for (const meta of aCriar) {
      ids.push(await goalsRepository.criar(conexao, { idUsuario, ...meta }));
    }
    return { criadas: ids, metasCriadas: aCriar };
  });

  for (let i = 0; i < criadas.length; i += 1) {
    const meta = metasCriadas[i];
    await auditService.registrar(auditService.usuario(idUsuario), 'meta.criada', {
      entidade: 'goal',
      id: criadas[i],
      depois: {
        origem: 'planejador',
        titulo: meta.titulo,
        alvo: meta.alvo,
        tipo: meta.tipo,
        dificuldade: meta.dificuldade,
        diasDisponiveis: plano.dias,
        recompensaMoedas: meta.recompensaMoedas,
        recompensaPontos: meta.recompensaPontos,
      },
    });
  }

  return { criadas: criadas.length, metas: metasCriadas, metasPedidas: plano.pedidas };
}
```

### 53. `2f66c22` refactor: meta é gerada, não digitada — some a criação manual (RF-MET-01)

*18/08/2026, Razawaky, tipo `refactor`.*

A tela de metas tinha um formulário "Nova meta" com título, alvo em mel e prazo herdado da fase anterior ao planejador. Nenhum dos sete RF-MET dá esse poder ao jogador: eles falam em gerar pela disponibilidade, listar, acompanhar, pagar expirar, recalcular e historiar. E escolher o próprio alvo e prazo furava a RN-014 inteira — dificuldade, prazo e recompensa proporcional ao tempo que o jogador declarou ter no onboarding.

**Arquivos (6 arquivos, +55 −146):** `src/services/goalsService.js` (+5 −60), `test/integration/fluxoAutenticado.test.js` (+29 −19), `src/views/pages/metas.ejs` (+1 −42), `docs/ESTADO-DO-PROJETO.md` (+17 −4), `src/routes/metas.js` (+3 −13), `src/controllers/goalsController.js` (+0 −8).

### 54. `220e2d2` feat: repositories de favo, célula, conteúdo e progresso (T-05.1)

*18/08/2026, Razawaky, tipo `feat`.*

As seis tabelas da trilha existiam desde a migration 002 e nenhuma tinha repository: era schema sem código. Agora são quatro arquivos — `hives`, `cells` `contents` e um `progressRepository` com `cell_progress` e `hive_progress` juntos, porque registrar uma tentativa mexe nas duas e separá-las obrigaria o service a coordenar o que é uma escrita só.

**Arquivos (7 arquivos, +737 −7):** `test/integration/repositories/progresso.test.js` (+174 −0), `test/integration/repositories/conteudo.test.js` (+157 −0), `src/repositories/progressRepository.js` (+136 −0), `src/repositories/hivesRepository.js` (+88 −0), `src/repositories/cellsRepository.js` (+81 −0), `docs/ESTADO-DO-PROJETO.md` (+48 −7), `src/repositories/contentsRepository.js` (+53 −0).

**Código atual:** `recalcularFavo` em `src/repositories/progressRepository.js:127`.

```js
export async function recalcularFavo(conexao, idUsuario, idFavo, codigosDeFaixa = []) {
  const percentual = 'CASE WHEN d.total = 0 THEN 0 ELSE FLOOR(d.concluidas * 100 / d.total) END';
  const completo = 'd.total > 0 AND d.concluidas = d.total';
  // Conta só o que o jogador enxerga: um favo com célula de faixa acima nunca
  // chegaria a 100% para quem é mais novo, e travaria o favo seguinte (RN-027).
  const faixa = recorteDeFaixa(codigosDeFaixa);

  await consultarEm(
    conexao,
    `INSERT INTO hive_progress (user_id, hive_id, completed_cells, total_cells, percent, completed_at)
     SELECT d.id_usuario, d.id_favo, d.concluidas, d.total,
            ${percentual},
            CASE WHEN ${completo} THEN NOW() ELSE NULL END
       FROM (
         SELECT ? AS id_usuario, c.hive_id AS id_favo,
                COUNT(*) AS total,
                SUM(CASE WHEN ${CONCLUIDA} THEN 1 ELSE 0 END) AS concluidas
           FROM cells c
           LEFT JOIN cell_progress cp ON cp.cell_id = c.id AND cp.user_id = ?
          WHERE c.hive_id = ? AND ${CELULA_ATIVA} ${faixa.sql}
          GROUP BY c.hive_id
       ) AS d
     ON DUPLICATE KEY UPDATE
        completed_cells = d.concluidas,
        total_cells = d.total,
        percent = ${percentual},
        completed_at = CASE WHEN ${completo} THEN COALESCE(hive_progress.completed_at, NOW()) ELSE NULL END`,
    [idUsuario, idUsuario, idFavo, ...faixa.parametros],
  );

  // Lê pela mesma conexão: fora dela, a linha recém-gravada ainda não existe
  // para ninguém enquanto a transação não fecha.
  return buscarProgressoDoFavo(idUsuario, idFavo, conexao);
}
```

### 55. `4382f93` feat: ContentService com os estados de desbloqueio da trilha (T-05.2)

*18/08/2026, Razawaky, tipo `feat`.*

O service responde o que o jogador pode abrir e por que não pode o resto. Favo e célula voltam com `estado` e `motivo` prontos, então a view da T-05.4 escolhe ícone e texto sem refazer regra, e a mesma resposta serve para JSON.

**Arquivos (4 arquivos, +579 −6):** `src/services/contentService.js` (+219 −0), `test/integration/trilha.test.js` (+190 −0), `test/unit/contentService.test.js` (+135 −0), `docs/ESTADO-DO-PROJETO.md` (+35 −6).

**Código atual:** `listarTrilha` em `src/services/contentService.js:150`.

```js
/**
 * A trilha do jogador: os favos que ele vê, com percentual e estado
 * (RF-CON-01).
 */
export async function listarTrilha(idUsuario) {
  const contexto = await contextoDoJogador(idUsuario);
  const favos = await hivesRepository.listarPorFaixas(contexto.codigosVisiveis);

  // O total de células vem do catálogo, não do cache: `hive_progress` só ganha
  // linha depois da primeira tentativa, e até lá a trilha mostrava "0 de ?".
  const totais = await cellsRepository.contarPorFavos(
    favos.map((favo) => favo.id),
    contexto.codigosVisiveis,
  );

  const trilha = [];
  let anteriorDaFaixa = null;

  for (const favo of favos) {
    // O favo anterior é o vizinho da mesma faixa: quem entra na faixa C não
    // precisa fechar a faixa A antes de começar.
    const anterior = anteriorDaFaixa?.age_band_id === favo.age_band_id ? anteriorDaFaixa : null;
    const progresso = contexto.progressoPorFavo.get(Number(favo.id)) ?? null;

    const { estado, motivo } = estadoDoFavo({
      favo: { ...favo, anterior_id: anterior?.id ?? null },
      progressoDoAnterior: anterior ? contexto.progressoPorFavo.get(Number(anterior.id)) : null,
      temItemExigido: contexto.itensPossuidos.has(Number(favo.required_item_id)),
      patrimonio: contexto.patrimonio,
    });

    trilha.push({
      ...favo,
      // Mesma ideia da célula: quem responde "está aberto?" é o dono da regra.
      aberto: estado === ESTADOS.disponivel,
      percentual: Number(progresso?.percent ?? 0),
      celulasConcluidas: Number(progresso?.completed_cells ?? 0),
      celulasTotais: totais.get(Number(favo.id)) ?? Number(progresso?.total_cells ?? 0),
      concluido: Boolean(progresso?.completed_at),
      estado,
      motivo,
    });

    anteriorDaFaixa = favo;
  }

  return trilha;
}
```

### 56. `d443f9a` feat: ProgressService traduzindo erros em estrelas e fechando o favo (T-05.3)

*18/08/2026, Razawaky, tipo `feat`.*

O service transforma "errou 2, concluiu" em estrelas (RN-030), grava a tentativa e recalcula o percentual do favo na mesma transação — `hive_progress` é cache, e a RN-027 decide desbloqueio com ele, então cache que atualiza depois é cache que mente na tela seguinte.

**Arquivos (5 arquivos, +321 −7):** `test/integration/progressoDaTrilha.test.js` (+148 −0), `src/services/progressService.js` (+109 −0), `docs/ESTADO-DO-PROJETO.md` (+30 −5), `test/unit/progressService.test.js` (+31 −0), `src/repositories/progressRepository.js` (+3 −2).

**Código atual:** `registrarTentativa` em `src/services/progressService.js:53`.

```js
/**
 * Grava uma tentativa e devolve o que mudou.
 *
 * A célula é conferida antes: quem não pode abrir também não pode registrar
 * resultado nela. Sem isso, a checagem da T-05.2 protegeria só a leitura, e
 * bastaria mandar um resultado direto para destravar a trilha inteira.
 *
 * `conexao` vem preenchida quando a E06 chama de dentro da transação que paga.
 * Sem ela, o service abre a própria.
 */
export async function registrarTentativa(idUsuario, idCelula, { erros = 0, pontuacao = 0, concluiu = false }, conexao = null) {
  const errosNumero = Number(erros);
  if (!Number.isInteger(errosNumero) || errosNumero < 0) {
    throw erroValidacao('A contagem de erros precisa ser um inteiro não negativo');
  }

  // Confere o pré-requisito, não o estado atual: célula já concluída pode ser
  // repetida, célula travada não pode ser jogada.
  const { celula } = await contentService.abrirCelula(idUsuario, idCelula);
  const codigosDeFaixa = await contentService.faixasDoJogador(idUsuario);

  const estrelas = estrelasPara(errosNumero, concluiu);
  const gravar = async (c) => {
    await progressRepository.registrarTentativa(c, {
      idUsuario,
      idCelula,
      estrelas,
      erros: errosNumero,
      pontuacao: Number(pontuacao),
      concluidaEm: concluiu ? new Date() : null,
    });

    // O percentual do favo é recalculado junto: `hive_progress` é cache, e a
    // RN-027 decide desbloqueio com ele. Cache que atualiza depois é cache que
    // mente na tela seguinte.
    const favo = await progressRepository.recalcularFavo(c, idUsuario, celula.hive_id, codigosDeFaixa);
    const progressoDaCelula = await progressRepository.buscarProgressoDaCelula(idUsuario, idCelula, c);

    return { favo, progressoDaCelula };
  };

  const { favo, progressoDaCelula } = conexao ? await gravar(conexao) : await emTransacao(gravar);

  return {
    estrelas,
    concluiu,
    // Repetição é o que a RN-008 cobra mais barato: quem chama para pagar
    // precisa saber se a célula já tinha sido concluída antes desta tentativa.
    ehRepeticao: Boolean(celula.concluida),
    celula: progressoDaCelula,
    favo,
    favoConcluido: Boolean(favo?.completed_at),
  };
}
```

### 57. `39925a7` feat: telas da trilha e da lista de células (T-05.4)

*18/08/2026, Razawaky, tipo `feat`.*

`/trilha` mostra os favos em hexágonos serpenteantes e `/trilha/:id` lista as células do favo. A Colmeia ganhou a porta de entrada, que não existia: a trilha estava pronta no back-end e inalcançável pelo navegador.

**Arquivos (9 arquivos, +547 −7):** `test/integration/telasDaTrilha.test.js` (+156 −0), `src/views/pages/favo.ejs` (+114 −0), `src/views/pages/trilha.ejs` (+88 −0), `src/views/partials/ui/favo-card.ejs` (+85 −0), `docs/ESTADO-DO-PROJETO.md` (+39 −6), `src/controllers/paginaController.js` (+29 −0), `src/styles/trilha.css` (+20 −1), `src/views/pages/painel.ejs` (+14 −0), `src/routes/index.js` (+2 −0).

**Código atual:** `trilha` em `src/controllers/paginaController.js:290`.

```js
/**
 * A trilha (RF-CON-01). O favo "atual" é o primeiro aberto e não concluído — é
 * ele que o botão "Continuar" abre.
 */
export const trilha = assincrono(async (req, res) => {
  const trilha = await contentService.listarTrilha(req.session.usuarioId);
  const favoAtual = trilha.find((favo) => favo.aberto && !favo.concluido) ?? null;
  // A trilha já está lida: passar adiante evita cobrar do banco as mesmas
  // consultas de novo (RNF-04).
  const proximaCelula = await contentService.proximaCelulaPendente(req.session.usuarioId, trilha);

  renderizarPagina(res, 'trilha', {
    titulo: 'Minha trilha — Beever',
    classeBody: 'min-h-screen bg-cera pb-28 text-tinta antialiased sm:pb-10',
    trilha,
    favoAtual,
    proximaCelula,
  });
});
```

### 58. `16a86a5` feat: conteúdo nas três faixas e filtro da RN-029 também na célula (T-05.5)

*18/08/2026, Razawaky, tipo `feat`.*

O filtro por faixa existia desde a T-05.2 e nunca tinha sido exercido com dado real: só a faixa A tinha favo, e o teste provava que a faixa B devolvia zero — verdade sem valor. As faixas B e C ganharam dois favos de quatro células cada, e o teste cadastra jogadores de 7, 10 e 14 anos para conferir que cada um vê 2, 4 e 6 favos. Como a faixa vem da data de nascimento, o teste passa pelo cadastro de verdade em vez de escrever a faixa no perfil. Fecha a DT-17.

**Arquivos (12 arquivos, +317 −34):** `test/integration/faixaEtaria.test.js` (+183 −0), `src/repositories/progressRepository.js` (+26 −7), `scripts/seeds/05_demo_content.sql` (+29 −2), `docs/ESTADO-DO-PROJETO.md` (+24 −5), `src/repositories/cellsRepository.js` (+17 −4), `test/integration/repositories/conteudo.test.js` (+14 −7), `src/services/contentService.js` (+12 −1), `src/services/progressService.js` (+8 −4), `test/integration/progressoDaTrilha.test.js` (+1 −1), `test/integration/repositories/progresso.test.js` (+1 −1), `test/integration/telasDaTrilha.test.js` (+1 −1), `test/integration/trilha.test.js` (+1 −1).

**Código atual:** `recorteDeFaixa` em `src/repositories/progressRepository.js:26`.

```js
/**
 * Recorte de faixa para as contagens (RN-029). Lista vazia conta todas as
 * células — é o que os testes de repository usam, e o que vale quando quem
 * chama não tem jogador em mãos.
 */
function recorteDeFaixa(codigosDeFaixa) {
  if (codigosDeFaixa.length === 0) return { sql: '', parametros: [] };

  const marcadores = Array(codigosDeFaixa.length).fill('?').join(', ');
  return {
    sql: `AND EXISTS (SELECT 1 FROM age_bands ab WHERE ab.id = c.age_band_id AND ab.code IN (${marcadores}))`,
    parametros: codigosDeFaixa,
  };
}
```

### 59. `84aa1fa` test: aceite da E05 num percurso único, com os 80% enfim exercidos (T-05.6)

*18/08/2026, Razawaky, tipo `test`.*

Os três critérios de aceite da etapa passaram a ter um lugar que os demonstra por inteiro: célula travada não abre por porta nenhuma — service, escrita de resultado e tela —, favo travado não se abre pela URL, e o requisito de patrimônio é respeitado e some quando cumprido.

**Arquivos (2 arquivos, +233 −4):** `test/integration/aceiteDaTrilha.test.js` (+220 −0), `docs/ESTADO-DO-PROJETO.md` (+13 −4).

### 60. `9d23d7c` docs: auditoria da E05 — pode avançar, com sete lacunas registradas

*18/08/2026, Razawaky, tipo `docs`.*

Laudo requisito a requisito sobre o commit `84aa1fa`: RF-CON-01 a 07 e RN-025 a 029, cada um com arquivo e teste que o prova. O critério de aceite está coberto — a trilha navega com os estados certos e o pré-requisito é recusado nas três portas que existem hoje.

**Arquivos (1 arquivo, +104 −0):** `docs/05-AUDITORIA-DA-ETAPA.md` (+104 −0).

### 61. `a737554` fix: tira o botão que levava a 404 e valida o id do favo (L-1 e L-3 da E05)

*18/08/2026, Razawaky, tipo `fix`.*

L-1: a lista de células oferecia "Jogar" apontando para `/trilha/:idFavo/celula/:idCelula`, rota que só a E07 vai criar — a ação principal da trilha respondia 404. A célula liberada passa a mostrar "em breve" o mesmo aviso que já era dado para célula sem conteúdo. A troca é uma constante no controller, que a E07 vira quando a tela de jogo existir.

**Arquivos (6 arquivos, +42 −12):** `docs/05-AUDITORIA-DA-ETAPA.md` (+16 −0), `test/integration/telasDaTrilha.test.js` (+12 −4), `src/controllers/paginaController.js` (+8 −0), `test/integration/aceiteDaTrilha.test.js` (+1 −5), `src/routes/index.js` (+3 −1), `src/views/pages/favo.ejs` (+2 −2).

**Código atual:** `favo` em `src/controllers/paginaController.js:307`.

```js
/** As células de um favo (RF-CON-02). Favo travado nem lista: quem barra é o service. */
export const favo = assincrono(async (req, res) => {
  const { favo, celulas } = await contentService.listarCelulasDoFavo(req.session.usuarioId, Number(req.params.id));

  // Quem diz se a célula tem jogo é o `contentService`, célula a célula: o quiz
  // e o Arraste e Classifique existem, os outros quatro não. As demais seguem
  // com "em breve", porque prometer o que não existe é pior do que avisar que
  // não dá.
  renderizarPagina(res, 'favo', {
    titulo: `${favo.title} — Beever`,
    classeBody: FUNDO_CERA,
    favo,
    celulas,
  });
});
```

### 62. `299ef80` docs: fecha a E05 no estado do projeto

*18/08/2026, Razawaky, tipo `docs`.*

Registra a etapa como concluída e auditada, a contagem nova de testes (348, 266 contra banco) e o que a E06 herda pronto: `registrarTentativa` aceita conexão de fora e já devolve `ehRepeticao`, o tempo de partida continua sem dono até a T-06.5, e a constante `JOGO_DISPONIVEL` é a chave que a E07 vira.

**Arquivos (1 arquivo, +32 −39):** `docs/ESTADO-DO-PROJETO.md` (+32 −39).

### 63. `05327f4` docs: segunda passagem da auditoria da E05

*18/08/2026, Razawaky, tipo `docs`.*

A primeira passagem pulou o passo 6 do roteiro — o checklist de banco — embora a etapa tenha mexido em seed. Aplicado agora e medido: rodar `db:seed` duas vezes deixa as contagens iguais (6 favos, 24 células, 24 conteúdos), porque as cláusulas novas se apoiam em chaves que já existiam.

**Arquivos (1 arquivo, +74 −1):** `docs/05-AUDITORIA-DA-ETAPA.md` (+74 −1).

### 64. `264b656` fix: a trilha diz quantas células o favo tem, e URL torta vira 404 (L-8, L-9, L-4)

*18/08/2026, Razawaky, tipo `fix`.*

L-8 e L-4 saem juntas: `cellsRepository.contarDoFavo` estava sem uso e sem filtro de faixa — exatamente o denominador que a trilha precisava e não tinha. Virou `contarPorFavos`, que conta em lote e respeita a RN-029, e é de onde a trilha passa a tirar o total. A primeira tela deixou de dizer "0 de ? células" para dizer "0 de 4 células": o número sempre esteve no catálogo, só não era lido porque `hive_progress` só ganha linha depois da primeira tentativa.

**Arquivos (8 arquivos, +106 −22):** `src/repositories/cellsRepository.js` (+19 −5), `docs/ESTADO-DO-PROJETO.md` (+16 −6), `docs/05-AUDITORIA-DA-ETAPA.md` (+16 −1), `test/integration/repositories/conteudo.test.js` (+13 −3), `test/integration/telasDaTrilha.test.js` (+13 −3), `src/middlewares/validate.js` (+13 −1), `src/routes/index.js` (+8 −2), `src/services/contentService.js` (+8 −1).

**Código atual:** `contarPorFavos` em `src/repositories/cellsRepository.js:94`.

```js
/**
 * Quantas células cada favo tem, para os favos pedidos — o denominador da
 * RN-027, e o número que a trilha mostra antes de o jogador tocar no favo.
 *
 * Em lote e com filtro de faixa: a trilha precisa de todos os favos de uma vez,
 * e contar sem o recorte da RN-029 daria um total que o jogador não enxerga.
 */
export async function contarPorFavos(idsDeFavo = [], codigosDeFaixa = []) {
  if (idsDeFavo.length === 0 || codigosDeFaixa.length === 0) return new Map();

  const linhas = await consultar(
    `SELECT c.hive_id, COUNT(*) AS total
       FROM cells c
       ${JOINS}
      WHERE c.hive_id IN (${marcadores(idsDeFavo.length)})
        AND ${ATIVO} AND ab.code IN (${marcadores(codigosDeFaixa.length)})
      GROUP BY c.hive_id`,
    [...idsDeFavo, ...codigosDeFaixa],
  );

  return new Map(linhas.map((linha) => [Number(linha.hive_id), Number(linha.total)]));
}
```

### 65. `d328308` docs: registra onde a sessão parou

*18/08/2026, Razawaky, tipo `docs`.*

Cabeçalho atualizado para o commit real e seção "Onde paramos" com a lista dos commits da sessão, como retomar e o que ficou aberto, com o documento em que cada pendência está escrita.

**Arquivos (1 arquivo, +52 −3):** `docs/ESTADO-DO-PROJETO.md` (+52 −3).

## 19 de agosto de 2026

### 66. `ecfccaf` feat: reward_configs ganha repository e a repetição vira dado (T-06.1)

*19/08/2026, Razawaky, tipo `feat`.*

Abre a E06. A tabela `reward_configs` existia desde a migration 003, com 54 linhas semeadas, e nenhum service a lia — era a DT-19. Agora `rewardConfigsRepository` responde quanto vale uma célula por slug do tipo de jogo, código da faixa e estrelas, que é o vocabulário que os services já falam. Combinação sem linha devolve null: o que fazer com configuração faltando é decisão do service, não do repository.

**Arquivos (8 arquivos, +353 −11):** `test/integration/repositories/rewardConfigs.test.js` (+143 −0), `docs/ESTADO-DO-PROJETO.md` (+81 −10), `src/repositories/rewardConfigsRepository.js` (+62 −0), `migrations/014_reward_modifiers.sql` (+31 −0), `docs/RASTREABILIDADE.md` (+19 −0), `scripts/seeds/07_reward_modifiers.sql` (+14 −0), `test/unit/seed.test.js` (+2 −1), `scripts/seed.js` (+1 −0).

**Código atual:** `buscarModificador` em `src/repositories/rewardConfigsRepository.js:46`.

```js
/**
 * Busca um modificador pelo slug.
 *
 * Os fatores voltam como número, e não como o texto que o driver devolve para
 * DECIMAL, porque existem para ser multiplicados. Os valores em mel continuam
 * inteiros — quem arredonda é o service.
 */
export async function buscarModificador(slug, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    `SELECT slug, name, xp_factor, points_factor, coins_factor
       FROM reward_modifiers
      WHERE slug = ?`,
    [slug],
  );

  const linha = linhas[0];
  if (!linha) return null;

  return {
    slug: linha.slug,
    name: linha.name,
    xp_factor: Number(linha.xp_factor),
    points_factor: Number(linha.points_factor),
    coins_factor: Number(linha.coins_factor),
  };
}
```

### 67. `99de3bf` feat: o XP da célula sai da tabela, não do código (T-06.2)

*19/08/2026, Razawaky, tipo `feat`.*

Metade da tarefa já existia: o `levelsService` credita XP e resolve o nível pela curva do banco desde a T-02.3. Faltava o "calcula" — ninguém ligava `reward_configs` ao crédito, que era a DT-03. Agora `calcularXpDaCelula` lê a configuração e aplica o corte da repetição, e `creditarPorCelula` credita com motivo `conclusao-celula`.

**Arquivos (6 arquivos, +342 −25):** `test/integration/xpDeCelula.test.js` (+135 −0), `src/services/levelsService.js` (+110 −5), `docs/ESTADO-DO-PROJETO.md` (+66 −11), `test/unit/levelsService.test.js` (+24 −5), `docs/RASTREABILIDADE.md` (+4 −2), `src/repositories/userLevelsRepository.js` (+3 −2).

**Código atual:** `calcularXpDaCelula` em `src/services/levelsService.js:213`.

```js
/**
 * Quanto XP uma célula concluída vale. Conta, sem crédito.
 *
 * O valor cheio vem de `reward_configs` (RN-006). Repetir multiplica pelo fator
 * de `reward_modifiers` (RN-008), e o resultado é arredondado — recompensa
 * pequena repetida pode dar zero, que é o efeito anti-farming pretendido.
 *
 * A faixa é a **da célula**, não a do jogador: quem define o esforço é o
 * conteúdo. Pela faixa do jogador, um adolescente refazendo conteúdo infantil
 * ganharia 1,5× por material fácil.
 *
 * Configuração faltando paga zero e vira alarme no log, em vez de estourar: o
 * buraco é de administração, e derrubar a partida da criança não o conserta.
 */
export async function calcularXpDaCelula(
  { slugDoTipoDeJogo, codigoDaFaixa, estrelas, ehRepeticao = false },
  conexao = null,
) {
  if (!Number.isInteger(estrelas) || estrelas < 1) return 0;

  const configuracao = await rewardConfigsRepository.buscarConfiguracao(
    { slugDoTipoDeJogo, codigoDaFaixa, estrelas },
    conexao,
  );

  if (!configuracao) {
    logger.error({ slugDoTipoDeJogo, codigoDaFaixa, estrelas }, 'Sem configuração de recompensa: creditando zero de XP');
    return 0;
  }

  const xpCheio = Number(configuracao.xp_amount);
  if (!ehRepeticao) return xpCheio;

  const modificador = await rewardConfigsRepository.buscarModificador(
    rewardConfigsRepository.REPETICAO_DE_CELULA,
    conexao,
  );
  if (!modificador) {
    logger.error('Modificador de repetição ausente: rode `npm run db:seed`. Repetição não pagou XP');
    return 0;
  }

  return Math.round(xpCheio * modificador.xp_factor);
}
```

### 68. `789f967` feat: o pólen da célula também sai da tabela (T-06.3)

*19/08/2026, Razawaky, tipo `feat`.*

Mesmo desenho do XP: `calcularPolenDaCelula` lê `points_amount` de `reward_configs` e aplica o fator de `reward_modifiers` na repetição, que para o pólen é zero — repetir célula não rende progresso nenhum. `creditarPorCelula` credita com motivo `conclusao-celula`, e valor zero não vira lançamento.

**Arquivos (4 arquivos, +191 −21):** `src/services/pointsService.js` (+77 −0), `docs/ESTADO-DO-PROJETO.md` (+55 −11), `test/integration/recompensaDaCelula.test.js` (+55 −7), `docs/RASTREABILIDADE.md` (+4 −3).

**Código atual:** `calcularPolenDaCelula` em `src/services/pointsService.js:44`.

```js
/**
 * Quanto pólen uma célula concluída vale. Conta, sem crédito.
 *
 * Mesmo desenho do XP: valor cheio de `reward_configs` (RN-006) e fator de
 * `reward_modifiers` na repetição, que para o pólen é zero — repetir célula não
 * rende progresso de meta nenhuma.
 *
 * A faixa é a da célula, não a do jogador: quem define o esforço é o conteúdo.
 *
 * Configuração faltando paga zero e vira alarme no log, em vez de estourar: o
 * buraco é de administração, e derrubar a partida da criança não o conserta.
 */
export async function calcularPolenDaCelula(
  { slugDoTipoDeJogo, codigoDaFaixa, estrelas, ehRepeticao = false },
  conexao = null,
) {
  if (!Number.isInteger(estrelas) || estrelas < 1) return 0;

  const configuracao = await rewardConfigsRepository.buscarConfiguracao(
    { slugDoTipoDeJogo, codigoDaFaixa, estrelas },
    conexao,
  );

  if (!configuracao) {
    logger.error(
      { slugDoTipoDeJogo, codigoDaFaixa, estrelas },
      'Sem configuração de recompensa: creditando zero de pólen',
    );
    return 0;
  }

  const polenCheio = Number(configuracao.points_amount);
  if (!ehRepeticao) return polenCheio;

  const modificador = await rewardConfigsRepository.buscarModificador(
    rewardConfigsRepository.REPETICAO_DE_CELULA,
    conexao,
  );
  if (!modificador) {
    logger.error('Modificador de repetição ausente: rode `npm run db:seed`. Repetição não pagou pólen');
    return 0;
  }

  return Math.round(polenCheio * modificador.points_factor);
}
```

### 69. `d37c394` feat: o mel da célula sai da tabela e o bônus de nível é pago (T-06.4)

*19/08/2026, Razawaky, tipo `feat`.*

Fecha as três recompensas da célula: repetir rende 25% de XP, zero pólen e zero mel. `calcularMelDaCelula` lê `coins_amount` de `reward_configs` e aplica o fator da repetição, que para o mel é zero.

**Arquivos (4 arquivos, +234 −15):** `src/services/coinsService.js` (+97 −0), `test/integration/recompensaDaCelula.test.js` (+76 −1), `docs/ESTADO-DO-PROJETO.md` (+58 −12), `docs/RASTREABILIDADE.md` (+3 −2).

**Código atual:** `calcularMelDaCelula` em `src/services/coinsService.js:77`.

```js
/**
 * Quanto mel uma célula concluída vale. Conta, sem crédito.
 *
 * Mesmo desenho do XP e do pólen: valor cheio de `reward_configs` (RN-006) e
 * fator de `reward_modifiers` na repetição, que para o mel é zero — é a RN-008
 * escrita por extenso, e o que impede farming de moeda.
 *
 * A faixa é a da célula, não a do jogador: quem define o esforço é o conteúdo.
 *
 * Configuração faltando paga zero e vira alarme no log, em vez de estourar: o
 * buraco é de administração, e derrubar a partida da criança não o conserta.
 */
export async function calcularMelDaCelula(
  { slugDoTipoDeJogo, codigoDaFaixa, estrelas, ehRepeticao = false },
  conexao = null,
) {
  if (!Number.isInteger(estrelas) || estrelas < 1) return 0;

  const configuracao = await rewardConfigsRepository.buscarConfiguracao(
    { slugDoTipoDeJogo, codigoDaFaixa, estrelas },
    conexao,
  );

  if (!configuracao) {
    logger.error(
      { slugDoTipoDeJogo, codigoDaFaixa, estrelas },
      'Sem configuração de recompensa: creditando zero de mel',
    );
    return 0;
  }

  const melCheio = Number(configuracao.coins_amount);
  if (!ehRepeticao) return melCheio;

  const modificador = await rewardConfigsRepository.buscarModificador(
    rewardConfigsRepository.REPETICAO_DE_CELULA,
    conexao,
  );
  if (!modificador) {
    logger.error('Modificador de repetição ausente: rode `npm run db:seed`. Repetição não pagou mel');
    return 0;
  }

  return Math.round(melCheio * modificador.coins_factor);
}
```

### 70. `4aa4edc` feat: a partida abre com token e fecha pagando as três recompensas (T-06.5)

*19/08/2026, Razawaky, tipo `feat`.*

`gameSessionService` é o único lugar que orquestra XP, pólen e mel: cada um continua com o seu service, e aqui se decide ordem e transação. Partida que credita XP e falha no mel não pode existir.

**Arquivos (6 arquivos, +522 −15):** `test/integration/sessaoDeJogo.test.js` (+191 −0), `src/services/gameSessionService.js` (+159 −0), `src/services/validadoresDeJogo.js` (+81 −0), `docs/ESTADO-DO-PROJETO.md` (+66 −14), `src/repositories/gameSessionsRepository.js` (+21 −0), `docs/RASTREABILIDADE.md` (+4 −1).

**Código atual:** `fechar` em `src/services/gameSessionService.js:211`.

```js
/**
 * Fecha a partida: confere as respostas, grava a tentativa e paga.
 *
 * Reenviar o mesmo token devolve o resultado já gravado, sem creditar de novo
 * (RN-009). Navegador que reenvia por conexão ruim merece a tela de resultado,
 * não um erro.
 */
export async function fechar(idUsuario, token, { respostas = [] } = {}) {
  const partida = await gameSessionsRepository.buscarPorToken(token);
  if (!partida) throw erroNaoEncontrado('Partida não encontrada');
  if (Number(partida.user_id) !== Number(idUsuario)) throw erroAcessoNegado('Esta partida é de outro jogador');
  // Partida encerrada sem conclusão não tem resultado para mostrar. Devolver o
  // registro zerado faria a tela anunciar "zero estrelas, zero mel" como se
  // fosse desempenho, quando o que houve foi desistência.
  if (partida.finished_at && partida.status !== 'concluida') {
    throw erroValidacao(`Esta partida foi ${partida.status} e não pode ser concluída`);
  }
  if (partida.finished_at) return comProximaCelula(idUsuario, partida.cell_id, resultadoGravado(partida));

  const celula = await cellsRepository.buscarPorId(partida.cell_id);
  if (!celula) throw erroNaoEncontrado('Célula não encontrada');

  // A correção usa a atividade que a criança jogou, e não a atual da célula:
  // publicar outra versão no meio da partida não pode trocar o gabarito dela.
  const conteudo = await conteudoDaPartida(partida);

  const { erros, total } = validadoresDeJogo.validarRespostas(celula.game_type_slug, conteudo.body, respostas);
  const pontuacao = total === 0 ? 0 : Math.round(((total - erros) / total) * 100);

  // Retrato antes da partida, para a linha de auditoria (RN-010). Lido aqui, e
  // não dentro da transação, porque é o estado que a partida encontrou.
  const antes = await auditService.retratoDoSaldo(idUsuario);

  // A chave é o próprio token: ele já é único por partida, e assim o cliente não
  // precisa inventar nada. O pedido fica fora do hash de propósito — quem reenvia
  // com respostas diferentes recebe o resultado gravado, porque o crédito já
  // aconteceu e resposta trocada depois não o desfaz.
  const resultado = await idempotencyService.executarUmaVezSo(
    { chave: `partida:${token}`, idUsuario, operacao: 'partida.fechar' },
    {
      executar: (conexao) => creditarPartida(conexao, { idUsuario, token, partida, celula, erros, pontuacao }),
      aoRepetir: async () => resultadoGravado(await gameSessionsRepository.buscarPorToken(token)),
    },
  );

  // Uma linha por partida, e não uma por crédito: três linhas descreveriam o
  // detalhe e perderiam o fato. Reenvio não gera linha, porque nada mudou.
  if (!resultado.jaEstavaFechada) {
    await auditService.registrarRecompensa(auditService.usuario(idUsuario), 'partida.concluida', {
      entidade: 'game_session',
      id: Number(partida.id),
      antes,
      depois: await auditService.retratoDoSaldo(idUsuario),
      detalhes: {
        celula: Number(partida.cell_id),
        estrelas: resultado.estrelas,
        erros: resultado.erros,
        ehRepeticao: resultado.ehRepeticao,
        xpGanho: resultado.xp,
        polenGanho: resultado.polen,
  // … continua até a linha 280 do arquivo
```

### 71. `4f54f40` feat: idempotência da partida e da compra (T-06.6)

*19/08/2026, Razawaky, tipo `feat`.*

`idempotencyService.executarUmaVezSo` reserva a chave dentro da transação da operação e, quando ela já existe, responde por `aoRepetir`. A reserva é INSERT IGNORE e não "consultar e depois gravar": entre a consulta e a escrita cabe a segunda requisição, e aí as duas se acham a primeira. Rollback leva a chave junto, senão uma operação que falhou bloquearia a retentativa legítima.

**Arquivos (12 arquivos, +496 −94):** `src/services/gameSessionService.js` (+74 −54), `test/integration/idempotencia.test.js` (+117 −0), `src/services/purchasesService.js` (+78 −24), `docs/ESTADO-DO-PROJETO.md` (+75 −12), `src/services/idempotencyService.js` (+69 −0), `src/repositories/idempotencyKeysRepository.js` (+37 −0), `src/repositories/purchasesRepository.js` (+19 −0), `src/controllers/paginaController.js` (+13 −1), `src/controllers/purchasesController.js` (+10 −2), `docs/RASTREABILIDADE.md` (+2 −1), `src/routes/loja.js` (+1 −0), `src/views/pages/loja.ejs` (+1 −0).

**Código atual:** `comprar` em `src/services/purchasesService.js:162`.

```js
/**
 * `chaveDeIdempotencia` vem do formulário, uma por renderização da loja. Dois
 * cliques no mesmo botão mandam a mesma chave e compram uma vez só; abrir a
 * loja de novo traz chave nova, então comprar o mesmo item de propósito
 * continua possível (DT-18).
 *
 * Sem chave, a compra roda como antes — é o caminho de quem chama a API direto,
 * e a proteção fica por conta de quem chama.
 *
 * `idUnidadeTrocada` é opcional: quem quiser ficar com a casa pequena paga o
 * preço cheio da média.
 */
export async function comprar(idUsuario, idItem, { chaveDeIdempotencia = null, idUnidadeTrocada = null } = {}) {
  const item = await itemsService.obterAtivo(idItem);
  const preco = Number(item.price);

  // Retrato antes do débito. A compra é a única operação que tira mel, e a
  // RN-010 pede o antes/depois justamente do que muda o saldo.
  const saldoAntes = await auditService.retratoDoSaldo(idUsuario);
  const pedido = { idUsuario, item, preco, idUnidadeTrocada };

  if (!chaveDeIdempotencia) {
    const gravada = await emTransacao((conexao) => registrarCompra(conexao, pedido));
    return concluir({ idUsuario, item, preco, gravada, saldoAntes, idUnidadeTrocada });
  }

  const { gravada, repetida, compraAnterior } = await idempotencyService.executarUmaVezSo(
    {
      chave: chaveDeIdempotencia,
      idUsuario,
      operacao: 'compra',
      pedido: { idItem, idUnidadeTrocada },
    },
    {
      executar: async (conexao) => ({ gravada: await registrarCompra(conexao, pedido), repetida: false }),
      // A tabela de chaves guarda hash, não resposta: quem repete recebe a
      // compra que o primeiro envio gravou, que é a mais recente daquele item.
      aoRepetir: async () => ({
        compraAnterior: await purchasesRepository.buscarUltimaDoItem(idUsuario, idItem),
        repetida: true,
      }),
    },
  );

  if (repetida) {
    return {
      idCompra: compraAnterior?.id ?? null,
      item,
      precoDeTabela: preco,
      desconto: Number(compraAnterior?.discount_applied ?? 0),
      precoPago: Number(compraAnterior?.total_price ?? preco),
      repetida: true,
      avisos: [],
    };
  }

  return concluir({ idUsuario, item, preco, gravada, saldoAntes, idUnidadeTrocada });
}
```

### 72. `6c1022a` feat: todo crédito deixa rastro com saldo antes e depois (T-06.7)

*19/08/2026, Razawaky, tipo `feat`.*

Havia dois créditos sem nenhum rastro: a partida e o XP inicial do onboarding. `auditService.retratoDoSaldo` lê mel, pólen, XP e nível, e `registrarRecompensa` grava o antes, o depois e o que a operação rendeu.

**Arquivos (8 arquivos, +276 −19):** `test/integration/auditoriaDeCreditos.test.js` (+123 −0), `docs/ESTADO-DO-PROJETO.md` (+59 −12), `src/services/auditService.js` (+38 −0), `src/services/gameSessionService.js` (+28 −1), `src/services/profilesService.js` (+12 −0), `src/services/goalsService.js` (+7 −3), `src/services/tasksService.js` (+7 −3), `docs/RASTREABILIDADE.md` (+2 −0).

**Código atual:** `retratoDoSaldo` em `src/services/auditService.js:89`.

```js
/**
 * Retrato do que o jogador tem agora: mel, pólen, XP e nível.
 *
 * É o "antes" e o "depois" que a RN-010 pede para crédito de recompensa. Lido do
 * banco nos dois momentos, e não calculado a partir do valor creditado: conta
 * feita de cabeça vira mentira no primeiro crédito concorrente.
 */
export async function retratoDoSaldo(idUsuario) {
  const [carteira, nivel] = await Promise.all([
    walletsRepository.buscarPorUsuario(idUsuario),
    userLevelsRepository.buscarPorUsuario(idUsuario),
  ]);

  return {
    mel: Number(carteira?.coins ?? 0),
    polen: Number(carteira?.points_total ?? 0),
    xp: Number(nivel?.xp_total ?? 0),
    nivel: Number(nivel?.level ?? 0),
  };
}
```

### 73. `7592e84` test: cinco conclusões em paralelo creditam uma vez (T-06.8)

*19/08/2026, Razawaky, tipo `test`.*

O critério de aceite da E06, exercido como o roadmap escreve: cinco `fechar` do mesmo token disparados juntos. As cinco terminam sem erro, exatamente uma credita, e a prova é tripla — os três livros somam um crédito, `game_sessions` tem uma linha fechada e `audit_logs` tem uma única `partida.concluida`.

**Arquivos (3 arquivos, +272 −20):** `test/integration/aceiteDoMotor.test.js` (+209 −0), `docs/ESTADO-DO-PROJETO.md` (+59 −17), `docs/RASTREABILIDADE.md` (+4 −3).

### 74. `ba85186` fix: fecha as três lacunas de risco médio do laudo da E06

*19/08/2026, Razawaky, tipo `fix`.*

L-1: `compra.realizada` passa a carregar o saldo antes e depois. A T-06.7 enriqueceu partida, tarefa, meta e onboarding, e passou batido justamente na única operação que tira mel — que é a que importa numa disputa.

**Arquivos (7 arquivos, +189 −21):** `docs/06-AUDITORIA-DA-ETAPA.md` (+68 −0), `docs/ESTADO-DO-PROJETO.md` (+35 −11), `test/integration/sessaoDeJogo.test.js` (+27 −0), `test/integration/auditoriaDeCreditos.test.js` (+24 −1), `src/repositories/gameSessionsRepository.js` (+16 −3), `src/services/purchasesService.js` (+11 −5), `src/services/gameSessionService.js` (+8 −1).

**Código atual:** `finalizar` em `src/repositories/gameSessionsRepository.js:106`.

```js
/**
 * Fecha a partida e registra o que ela rendeu.
 *
 * A duração é calculada pelo banco a partir do `started_at` gravado na
 * abertura, não pelo cliente: um cronômetro que vem do navegador é um número
 * que o jogador controla, e a recompensa depende dele.
 *
 * Só fecha partida aberta (`finished_at IS NULL` no `WHERE`). Reenviar o mesmo
 * resultado devolve 0 linhas afetadas, e o service não credita nada — é a
 * mesma defesa da tarefa concluída duas vezes.
 *
 * `ehRepeticao` corrige o que a abertura só podia adivinhar: quem abre duas
 * partidas antes de concluir a célula abre as duas como estreia, e a segunda
 * acaba paga como repetição. O que vale para o relatório é o que foi pago, e
 * isso só se sabe no fim.
 *
 * Ausente quer dizer "não sei", e aí o valor da abertura fica — daí o
 * `COALESCE`. Sobrescrever com o padrão apagaria a informação de quem fecha a
 * partida sem calcular recompensa.
 */
export async function finalizar(
  conexao,
  { token, estrelas = 0, erros = 0, xp = 0, pontos = 0, moedas = 0, ehRepeticao = null },
) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE game_sessions
        SET status_id = (SELECT id FROM game_session_statuses WHERE slug = 'concluida'),
            finished_at = NOW(),
            duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()),
            stars = ?, errors = ?, xp_awarded = ?, points_awarded = ?, coins_awarded = ?,
            is_replay = COALESCE(?, is_replay)
      WHERE token = ? AND finished_at IS NULL`,
    [estrelas, erros, xp, pontos, moedas, ehRepeticao === null ? null : Number(ehRepeticao), token],
  );
  return resultado.affectedRows;
}
```

### 75. `70f220f` docs: resumo da E06 em uma página

*19/08/2026, Razawaky, tipo `docs`.*

Texto corrido e curto, para quem precisa entender a etapa sem ler as duas páginas de estado e o laudo inteiro.

**Arquivos (1 arquivo, +15 −0):** `docs/06-RESUMO-DA-ETAPA.md` (+15 −0).

### 76. `530f55b` feat: contrato único de jogo, em documento e em assinatura (T-07.1)

*19/08/2026, Razawaky, tipo `feat`.*

Abre a E07. O contrato existe em dois lugares que se sustentam: o documento explica o ciclo da partida e o formato, e o código o impõe. Todo validador passa a ser um objeto com `conferirForma`, `paraJogar` e `validar`, indexado pelo slug de `game_types`, e é assim que os cinco jogos que faltam entram.

**Arquivos (5 arquivos, +278 −47):** `test/unit/validadoresDeJogo.test.js` (+102 −0), `src/services/validadoresDeJogo.js` (+63 −34), `docs/ESTADO-DO-PROJETO.md` (+82 −12), `docs/CONTRATO-DE-JOGO.md` (+29 −0), `docs/RASTREABILIDADE.md` (+2 −1).

**Código atual:** `quiz` em `src/services/validadoresDeJogo.js:28`.

```js
/**
 * Quiz do Favo (RF-JOG-01): múltipla escolha, uma resposta certa por pergunta.
 *
 * Corpo esperado: `{ tipo, perguntas: [{ enunciado, alternativas, correta }] }`,
 * em que `correta` é o índice da alternativa certa.
 */
const quiz = {
  conferirForma(corpo) {
    const perguntas = corpo?.perguntas;
    if (!Array.isArray(perguntas) || perguntas.length === 0) {
      throw erroValidacao('Esta célula ainda não é jogável: o conteúdo não tem gabarito');
    }

    for (const pergunta of perguntas) {
      if (!Array.isArray(pergunta.alternativas) || pergunta.alternativas.length < 2) {
        throw erroValidacao('Pergunta sem alternativas suficientes: o conteúdo está incompleto');
      }
      const foraDaLista = pergunta.correta < 0 || pergunta.correta >= pergunta.alternativas.length;
      if (!Number.isInteger(pergunta.correta) || foraDaLista) {
        throw erroValidacao('Pergunta com resposta certa fora das alternativas');
      }
    }
  },

  paraJogar(corpo) {
    return {
      tipo: corpo.tipo,
      perguntas: corpo.perguntas.map((pergunta) => ({
        enunciado: pergunta.enunciado,
        alternativas: pergunta.alternativas,
      })),
    };
  },

  /** Pergunta sem resposta conta como erro: deixar em branco não pode valer estrela. */
  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma por pergunta');
    }

    let erros = 0;
    corpo.perguntas.forEach((pergunta, indice) => {
      if (Number(respostas[indice]) !== Number(pergunta.correta)) erros += 1;
    });

    return { erros, total: corpo.perguntas.length };
  },
};
```

### 77. `126a3ec` feat: o Quiz do Favo joga de verdade (T-07.2)

*19/08/2026, Razawaky, tipo `feat`.*

A primeira tela de jogo do projeto. `/trilha/:idFavo/celula/:idCelula` é uma casca: o `quiz.js` abre a partida por `POST /partidas`, recebe token e perguntas juntos, mostra uma pergunta por vez e manda as respostas no fim. `GET` não cria partida, então atualizar a página não deixa partida aberta para trás.

**Arquivos (13 arquivos, +638 −34):** `test/integration/quizDoFavo.test.js` (+186 −0), `src/public/js/quiz.js` (+161 −0), `src/views/pages/celula.ejs` (+84 −0), `docs/ESTADO-DO-PROJETO.md` (+65 −16), `src/routes/partidas.js` (+44 −0), `src/controllers/gameSessionsController.js` (+37 −0), `src/controllers/paginaController.js` (+27 −8), `test/integration/telasDaTrilha.test.js` (+9 −7), `src/routes/index.js` (+10 −0), `test/integration/aceiteDaTrilha.test.js` (+6 −2), `src/services/contentService.js` (+6 −0), `docs/RASTREABILIDADE.md` (+2 −0), e mais 1 arquivos.

**Código atual:** `mostrarPergunta` em `src/public/js/quiz.js:34`.

```js
function mostrarPergunta() {
  const pergunta = perguntas[indiceAtual];

  escolhaAtual = null;
  botaoConfirmar.disabled = true;
  botaoConfirmar.textContent = indiceAtual === perguntas.length - 1 ? 'Terminar' : 'Confirmar';
  enunciado.textContent = pergunta.enunciado;
  listaDeAlternativas.replaceChildren();
  mostrarProgresso(`Pergunta ${indiceAtual + 1} de ${perguntas.length}`, indiceAtual, perguntas.length);

  pergunta.alternativas.forEach((alternativa, indice) => {
    const item = document.createElement('li');
    const botao = document.createElement('button');

    botao.type = 'button';
    botao.textContent = alternativa;
    botao.className = CLASSES_DA_ALTERNATIVA;
    botao.setAttribute('aria-pressed', 'false');
    botao.addEventListener('click', () => {
      escolhaAtual = indice;
      botaoConfirmar.disabled = false;
      marcarEscolhida(botao);
    });

    item.append(botao);
    listaDeAlternativas.append(item);
  });

  enunciado.focus?.();
}
```

### 78. `ce1b9b7` feat: o Arraste e Classifique joga de verdade (T-07.3)

*19/08/2026, Razawaky, tipo `feat`.*

O segundo jogo da E07 (RF-JOG-02): as cartas vão para as caixas arrastando clicando ou pelo teclado, e os três caminhos terminam na mesma função. Cada jogada é anunciada em região aria-live e o foco volta para a carta depois do redesenho, porque a RNF-23 pede alternativa de verdade, não enfeite.

**Arquivos (20 arquivos, +906 −138):** `test/integration/arrasteEClassifique.test.js` (+203 −0), `src/public/js/arraste.js` (+186 −0), `docs/ESTADO-DO-PROJETO.md` (+72 −15), `src/public/js/partida.js` (+84 −0), `test/unit/validadoresDeJogo.test.js` (+76 −1), `src/public/js/quiz.js` (+8 −67), `scripts/seeds/05_demo_content.sql` (+65 −0), `src/services/validadoresDeJogo.js` (+64 −0), `src/views/pages/celula.ejs` (+20 −29), `src/controllers/paginaController.js` (+33 −8), `src/views/partials/jogos/arraste.ejs` (+39 −0), `test/integration/sessaoDeJogo.test.js` (+12 −5), e mais 8 arquivos.

**Código atual:** `criarCaixa` em `src/public/js/arraste.js:104`.

```js
/** Uma caixa: o nome, as cartas que já caíram nela e o botão de soltar. */
function criarCaixa(categoria) {
  const secao = document.createElement('section');
  const titulo = document.createElement('h3');
  const lista = document.createElement('ul');
  const botaoSoltar = document.createElement('button');

  secao.className = CLASSES_DA_CAIXA;
  titulo.className = 'font-display text-lg text-tinta';
  titulo.textContent = categoria.nome;
  lista.className = 'mt-3 flex min-h-16 flex-col gap-2';

  cartas.forEach((carta, indice) => {
    if (caixaDaCarta[indice] !== categoria.id) return;
    const item = document.createElement('li');
    item.append(criarCarta(indice));
    lista.append(item);
  });

  botaoSoltar.type = 'button';
  botaoSoltar.textContent = 'Colocar aqui';
  botaoSoltar.className = CLASSES_DO_BOTAO_SOLTAR;
  botaoSoltar.disabled = cartaSelecionada === null;
  botaoSoltar.addEventListener('click', () => colocar(cartaSelecionada, categoria.id));

  secao.addEventListener('dragover', (evento) => {
    // Sem o preventDefault o navegador não deixa soltar nada aqui.
    evento.preventDefault();
    secao.className = `${CLASSES_DA_CAIXA} border-mel bg-cera`;
  });
  secao.addEventListener('dragleave', () => {
    secao.className = CLASSES_DA_CAIXA;
  });
  secao.addEventListener('drop', (evento) => {
    evento.preventDefault();
    colocar(Number(evento.dataTransfer.getData('text/plain')), categoria.id);
  });

  secao.append(titulo, lista, botaoSoltar);
  return secao;
}
```

### 79. `9aae13c` feat: o Monte o Orçamento joga de verdade (T-07.4)

*19/08/2026, Razawaky, tipo `feat`.*

O terceiro jogo da E07 (RF-JOG-03): o jogador reparte uma quantia entre categorias com os botões − e +, e o servidor confere se a divisão respeita a faixa de cada categoria e fecha o total. Erro é categoria fora da faixa, mais um erro quando sobra ou falta mel, então o total do contrato é o número de categorias mais um — errar uma categoria ainda vale três estrelas (RN-030).

**Arquivos (11 arquivos, +686 −21):** `test/integration/monteOOrcamento.test.js` (+182 −0), `src/public/js/orcamento.js` (+133 −0), `src/services/validadoresDeJogo.js` (+103 −0), `scripts/seeds/05_demo_content.sql` (+93 −0), `docs/ESTADO-DO-PROJETO.md` (+71 −17), `test/unit/validadoresDeJogo.test.js` (+60 −1), `src/views/partials/jogos/orcamento.ejs` (+33 −0), `docs/CONTRATO-DE-JOGO.md` (+6 −0), `test/integration/quizDoFavo.test.js` (+3 −3), `docs/RASTREABILIDADE.md` (+1 −0), `src/controllers/paginaController.js` (+1 −0).

**Código atual:** `criarLinha` em `src/public/js/orcamento.js:58`.

```js
function criarLinha(categoria, indice) {
  const item = document.createElement('li');
  const cabecalho = document.createElement('div');
  const nome = document.createElement('p');
  const dica = document.createElement('p');
  const controles = document.createElement('div');
  const valor = document.createElement('p');

  item.className = 'rounded-favo border-2 border-linha bg-white p-4';
  nome.className = 'font-semibold text-tinta';
  nome.textContent = categoria.nome;
  dica.className = 'text-sm text-tinta-suave';
  dica.textContent = categoria.dica ?? '';

  cabecalho.append(nome, dica);

  valor.className = 'min-w-16 text-center font-display text-2xl text-tinta tabular-nums';
  controles.className = 'mt-3 flex items-center justify-between gap-3';
  controles.append(
    criarBotaoDePasso(indice, -conteudo.passo, `Tirar ${conteudo.passo} de ${categoria.nome}`),
    valor,
    criarBotaoDePasso(indice, conteudo.passo, `Colocar ${conteudo.passo} em ${categoria.nome}`),
  );

  item.append(cabecalho, controles);
  linhas.push({ valor, tirar: controles.children[0], colocar: controles.children[2] });
  return item;
}
```

### 80. `6cecc43` feat: o Cofre do Tempo joga de verdade (T-07.5)

*19/08/2026, Razawaky, tipo `feat`.*

O quarto e último jogo obrigatório da E07 (RF-JOG-04): um ciclo por vez, o jogador escolhe quanto guardar e o gráfico cresce a cada depósito. O depósito entra no começo do ciclo e o rendimento cai no fim, o que faz guardar cedo render mais do que guardar tarde — existe teste com esse nome, e é a lição do jogo. Erro é ciclo fora da regra, mais um se a meta não vier; ciclo inválido perde o depósito, mas o tempo passa e o que já estava guardado rende.

**Arquivos (10 arquivos, +777 −15):** `test/integration/cofreDoTempo.test.js` (+193 −0), `src/public/js/cofre.js` (+175 −0), `src/services/validadoresDeJogo.js` (+108 −0), `test/unit/validadoresDeJogo.test.js` (+85 −2), `docs/ESTADO-DO-PROJETO.md` (+65 −13), `src/views/partials/jogos/cofre.ejs` (+75 −0), `scripts/seeds/05_demo_content.sql` (+68 −0), `docs/CONTRATO-DE-JOGO.md` (+6 −0), `docs/RASTREABILIDADE.md` (+1 −0), `src/controllers/paginaController.js` (+1 −0).

**Código atual:** `comecar` em `src/public/js/cofre.js:161`.

```js
async function comecar() {
  try {
    const partida = await abrirPartida();

    token = partida.token;
    conteudo = partida.conteudo;
    depositos = [];
    cicloAtual = 0;
    saldo = 0;
    // O jogador anda de mínimo em mínimo: é a menor decisão que o jogo aceita,
    // e evita inventar um passo que o conteúdo não define.
    passo = conteudo.minimoPorCiclo > 0 ? conteudo.minimoPorCiclo : 1;

    // O topo do gráfico é o saldo de quem guarda tudo em todos os ciclos: assim
    // a barra nunca estoura e a meta fica sempre dentro do desenho.
    escala = 0;
    for (let ciclo = 0; ciclo < conteudo.ciclos; ciclo += 1) {
      escala = renderUmCiclo(escala, conteudo.entradaPorCiclo);
    }

    enunciado.textContent = conteudo.enunciado;
    linhaDaMeta.setAttribute('y1', String(BASE_DO_GRAFICO - alturaDaBarra(conteudo.meta)));
    linhaDaMeta.setAttribute('y2', String(BASE_DO_GRAFICO - alturaDaBarra(conteudo.meta)));
    atualizarLegenda();

    // Quem voltou vê de novo os ciclos que já fechou, com gráfico e histórico
    // refeitos a partir dos depósitos salvos (RF-JOG-07).
    for (const deposito of partida.estado?.respostas ?? []) {
      if (cicloAtual < conteudo.ciclos) guardarNoCiclo(deposito);
    }

    if (cicloAtual >= conteudo.ciclos) {
      terminar();
      return;
    }
    mostrarCiclo();
    enunciado.focus?.();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}
```

### 81. `b071d49` fix: o botão "Jogar" não promete mais célula com conteúdo de demonstração

*19/08/2026, Razawaky, tipo `fix`.*

Com a aplicação de pé, o botão aparecia em célula cujo conteúdo ainda é placeholder, e o clique morria em "422 Esta célula ainda não é jogável". Vem da T-07.2: temJogo só perguntava se o tipo de jogo tinha validador, nunca se aquele conteúdo era jogável.

**Arquivos (4 arquivos, +72 −18):** `src/services/contentService.js` (+23 −7), `test/integration/telasDaTrilha.test.js` (+25 −0), `src/repositories/contentsRepository.js` (+16 −6), `test/integration/repositories/conteudo.test.js` (+8 −5).

**Código atual:** `podeJogar` em `src/services/contentService.js:212`.

```js
/**
 * A célula oferece o botão "Jogar"?
 *
 * Não basta o tipo de jogo ter validador: o conteúdo daquela célula precisa
 * passar pelo `conferirForma`. Sem esta segunda pergunta, célula com conteúdo de
 * demonstração mostrava o botão e o clique morria em 422 — o botão prometia o
 * que o servidor recusaria.
 */
function podeJogar(slugDoTipoDeJogo, corpo) {
  if (!corpo) return false;

  try {
    validadoresDeJogo.conferirForma(slugDoTipoDeJogo, corpo);
    return true;
  } catch {
    return false;
  }
}
```

### 82. `fa988c5` feat: uma tela de resultado só para os quatro jogos (T-07.6)

*19/08/2026, Razawaky, tipo `feat`.*

A RF-CON-05 pede estrelas, XP, mel, pólen e animação do mascote. O painel provisório que a T-07.2 deixou dentro do partida.js virou parcial própria mais um resultado.js: os quatro jogos ganham a tela nova de uma vez, e o arquivo comum a todos eles voltou a cuidar só da partida.

**Arquivos (10 arquivos, +457 −53):** `test/integration/telaDeResultado.test.js` (+167 −0), `docs/ESTADO-DO-PROJETO.md` (+68 −14), `src/public/js/resultado.js` (+75 −0), `src/views/partials/jogo-resultado.ejs` (+61 −0), `src/styles/tema.css` (+42 −0), `src/public/js/partida.js` (+6 −20), `src/services/contentService.js` (+22 −0), `src/views/pages/celula.ejs` (+1 −16), `src/services/gameSessionService.js` (+12 −2), `docs/RASTREABILIDADE.md` (+3 −1).

**Código atual:** `mostrarEstrelas` em `src/public/js/resultado.js:45`.

```js
/**
 * As três estrelas, desenhadas.
 *
 * Desenho em vez do caractere ★ porque amarelo não pode ser cor de texto sobre
 * fundo claro (RNF-21): a mesma cor que reprova em contraste como letra passa
 * como preenchimento de forma. A tela do favo já fazia assim.
 */
function mostrarEstrelas(estrelas) {
  painelDeEstrelas.replaceChildren();
  painelDeEstrelas.setAttribute('aria-label', `${estrelas} de 3 estrelas`);

  for (let posicao = 1; posicao <= 3; posicao += 1) {
    const ganha = posicao <= estrelas;
    const desenho = document.createElementNS(ESPACO_SVG, 'svg');
    const contorno = document.createElementNS(ESPACO_SVG, 'path');

    contorno.setAttribute('d', CONTORNO_DA_ESTRELA);
    contorno.setAttribute('fill', 'currentColor');
    // A animação é escalonada por classe, porque a CSP não permite `style`.
    desenho.setAttribute(
      'class',
      ganha ? `estrela estrela-ganha estrela-${posicao} h-10 w-10 text-mel` : 'estrela h-10 w-10 text-linha',
    );
    desenho.setAttribute('viewBox', '0 0 24 24');
    desenho.setAttribute('aria-hidden', 'true');
    desenho.setAttribute('focusable', 'false');
    desenho.append(contorno);
    painelDeEstrelas.append(desenho);
  }
}
```

### 83. `c8f558f` feat: o Mercado Esperto joga de verdade (T-07.7, parte 1)

*19/08/2026, Razawaky, tipo `feat`.*

Primeiro dos dois jogos P1 (RF-JOG-05): uma comparação por vez, cada opção com preço e quantidade à vista, e o jogador escolhe a que vale mais a pena. O gabarito não está escrito no conteúdo. A melhor compra é a de menor preço por unidade, calculada a partir dos dois números, então nenhum conteúdo consegue declarar uma "melhor compra" que a conta desmente. Em troca, o conferirForma recusa empate no primeiro lugar: duas opções igualmente baratas dariam duas respostas certas, e a contagem de erros passaria a depender de qual delas o jogador marcou.

**Arquivos (9 arquivos, +577 −2):** `test/integration/mercadoEsperto.test.js` (+179 −0), `src/public/js/mercado.js` (+107 −0), `scripts/seeds/05_demo_content.sql` (+95 −0), `src/services/validadoresDeJogo.js` (+90 −0), `test/unit/validadoresDeJogo.test.js` (+79 −2), `src/views/partials/jogos/mercado.ejs` (+19 −0), `docs/CONTRATO-DE-JOGO.md` (+6 −0), `docs/RASTREABILIDADE.md` (+1 −0), `src/controllers/paginaController.js` (+1 −0).

**Código atual:** `criarOpcao` em `src/public/js/mercado.js:30`.

```js
function criarOpcao(opcao, indice, unidade) {
  const item = document.createElement('li');
  const botao = document.createElement('button');
  const nome = document.createElement('span');
  const detalhe = document.createElement('span');

  nome.className = 'block';
  nome.textContent = opcao.texto;
  detalhe.className = 'block text-sm text-tinta-suave';
  detalhe.textContent = `${opcao.preco} de mel por ${opcao.quantidade} ${unidade}`;

  botao.type = 'button';
  botao.className = CLASSES_DA_OPCAO;
  botao.setAttribute('aria-pressed', 'false');
  botao.append(nome, detalhe);
  botao.addEventListener('click', () => {
    escolhaAtual = indice;
    botaoConfirmar.disabled = false;
    marcarEscolhida(botao);
  });

  item.append(botao);
  return item;
}
```

### 84. `7b25129` feat: o Ordene a Prioridade joga de verdade (T-07.7, parte 2)

*19/08/2026, Razawaky, tipo `feat`.*

Segundo jogo P1 (RF-JOG-06): a lista chega embaralhada do servidor e o jogador a arruma com as setas de subir e descer, que servem ao mouse, ao dedo e ao teclado do mesmo jeito.

**Arquivos (11 arquivos, +544 −15):** `test/integration/ordeneAPrioridade.test.js` (+165 −0), `src/public/js/ordene.js` (+101 −0), `test/unit/validadoresDeJogo.test.js` (+87 −2), `src/services/validadoresDeJogo.js` (+75 −0), `scripts/seeds/05_demo_content.sql` (+50 −0), `test/integration/telaDeResultado.test.js` (+19 −8), `src/views/partials/jogos/ordene.ejs` (+26 −0), `test/integration/sessaoDeJogo.test.js` (+13 −5), `docs/CONTRATO-DE-JOGO.md` (+6 −0), `docs/RASTREABILIDADE.md` (+1 −0), `src/controllers/paginaController.js` (+1 −0).

**Código atual:** `criarLinha` em `src/public/js/ordene.js:51`.

```js
function criarLinha(item, posicao) {
  const linha = document.createElement('li');
  const numero = document.createElement('span');
  const texto = document.createElement('span');
  const setas = document.createElement('div');

  linha.className = 'flex items-center gap-3 rounded-favo border-2 border-linha bg-white p-3';
  numero.className = 'font-display text-xl text-tinta-suave tabular-nums';
  numero.textContent = `${posicao + 1}º`;
  texto.className = 'flex-1 font-medium text-tinta';
  texto.textContent = item.texto;
  setas.className = 'flex shrink-0 gap-2';
  setas.append(criarSeta(posicao, 'subir'), criarSeta(posicao, 'descer'));

  linha.append(numero, texto, setas);
  return linha;
}
```

### 85. `8f7c737` feat: retomar a partida interrompida (T-07.7, parte 3)

*19/08/2026, Razawaky, tipo `feat`.*

A RF-JOG-07 ocupou o lugar que o docs/CONTRATO-DE-JOGO.md reservava desde a T-07.1: a quarta função do contrato, estadoParaSalvar, e a coluna saved_state em game_sessions (migration 015).

**Arquivos (17 arquivos, +476 −37):** `test/integration/retomadaDePartida.test.js` (+200 −0), `docs/ESTADO-DO-PROJETO.md` (+65 −15), `src/services/gameSessionService.js` (+39 −1), `src/repositories/gameSessionsRepository.js` (+31 −1), `src/public/js/cofre.js` (+23 −6), `src/services/validadoresDeJogo.js` (+23 −0), `migrations/015_estado_de_partida.sql` (+22 −0), `src/public/js/partida.js` (+17 −2), `src/controllers/gameSessionsController.js` (+11 −1), `docs/CONTRATO-DE-JOGO.md` (+8 −2), `src/public/js/ordene.js` (+9 −1), `src/public/js/quiz.js` (+6 −2), e mais 5 arquivos.

**Código atual:** `abrir` em `src/services/gameSessionService.js:49`.

```js
/**
 * Abre a partida e devolve o token junto do conteúdo sem gabarito.
 *
 * A célula é conferida pelo `contentService`: quem não pode abri-la também não
 * pode jogá-la, mesmo mandando o pedido direto.
 *
 * Se o jogador já tem uma partida aberta nesta célula, ela é devolvida em vez de
 * uma nova (RF-JOG-07): é assim que fechar a aba no meio do jogo deixa de custar
 * o progresso. Abrir sempre uma partida nova encheria a tabela de partidas
 * órfãs e faria a criança recomeçar do zero.
 */
export async function abrir(idUsuario, idCelula) {
  const { celula, acervo } = await contentService.abrirCelula(idUsuario, idCelula);

  // Quem retoma continua com a mesma atividade que estava jogando: sortear de
  // novo trocaria as perguntas debaixo das respostas já dadas.
  const emAndamento = await gameSessionsRepository.buscarAbertaDaCelula(idUsuario, idCelula);
  if (emAndamento) {
    const conteudo = await conteudoDaPartida(emAndamento);
    return {
      token: emAndamento.token,
      celula,
      conteudo: validadoresDeJogo.conteudoParaJogar(celula.game_type_slug, conteudo.body),
      ehRepeticao: Boolean(emAndamento.is_replay),
      estado: emAndamento.saved_state ?? null,
      retomada: true,
    };
  }

  const ultimoJogado = await gameSessionsRepository.ultimoConteudoJogado(idUsuario, idCelula);
  const sorteada = sortearAtividade(acervo, ultimoJogado);

  // Falha antes de gravar partida: conteúdo sem gabarito não é jogável, e uma
  // partida aberta que ninguém consegue fechar só sujaria a tabela.
  const paraJogar = validadoresDeJogo.conteudoParaJogar(celula.game_type_slug, sorteada.body);

  const jaConcluiu = await gameSessionsRepository.contarConcluidasNaCelula(idUsuario, idCelula);
  const token = randomUUID();

  await emTransacao((conexao) =>
    gameSessionsRepository.iniciar(conexao, {
      idUsuario,
      idCelula,
      idConteudo: sorteada.id,
      token,
      ehRepeticao: jaConcluiu > 0,
    }),
  );

  return { token, celula, conteudo: paraJogar, ehRepeticao: jaConcluiu > 0, estado: null, retomada: false };
}
```

### 86. `9e5a7ca` fix: fecha as duas lacunas de risco médio do laudo da E07

*19/08/2026, Razawaky, tipo `fix`.*

Auditoria da etapa em docs/07-AUDITORIA-DA-ETAPA.md: pode avançar, zero bloqueantes. As duas lacunas de risco médio eram desvio de regra já escrita no projeto, não descuido de engenharia.

**Arquivos (8 arquivos, +235 −21):** `test/integration/limiteDaPartida.test.js` (+116 −0), `docs/07-AUDITORIA-DA-ETAPA.md` (+63 −0), `src/public/js/resultado.js` (+24 −5), `docs/ESTADO-DO-PROJETO.md` (+15 −13), `src/routes/partidas.js` (+8 −0), `src/views/partials/jogo-resultado.ejs` (+6 −2), `test/integration/telaDeResultado.test.js` (+3 −0), `src/styles/tema.css` (+0 −1).

**Código atual:** `ESPACO_SVG` em `src/public/js/resultado.js:34`.

```js
const ESPACO_SVG = 'http://www.w3.org/2000/svg';
```

### 87. `f51046c` feat: a meta vencida pode ser retomada (T-08.1)

*19/08/2026, Razawaky, tipo `feat`.*

Fecha a DT-33, aberta desde a auditoria da E04: a RN-017 tinha duas metades e só uma existia. A meta vencida já entrava em expirada sem punição, mas não havia oferta de renovação — o jogador perdia o trabalho feito naquela meta sem chance de retomá-la. É também toda a RF-MET-05.

**Arquivos (11 arquivos, +473 −21):** `test/integration/renovacaoDeMeta.test.js` (+201 −0), `docs/ESTADO-DO-PROJETO.md` (+88 −16), `src/services/goalsService.js` (+86 −1), `src/repositories/goalsRepository.js` (+35 −2), `src/services/goalPlannerService.js` (+24 −0), `src/views/pages/metas.ejs` (+21 −1), `src/controllers/goalsController.js` (+8 −0), `src/routes/metas.js` (+4 −0), `scripts/seeds/07_reward_modifiers.sql` (+2 −1), `src/repositories/rewardConfigsRepository.js` (+3 −0), `docs/RASTREABILIDADE.md` (+1 −0).

**Código atual:** `renovar` em `src/services/goalsService.js:163`.

```js
/**
 * Renova uma meta vencida (RN-017, RF-MET-05).
 *
 * A meta vencida não é punida: quem perdeu o prazo retoma a mesma meta, **com o
 * progresso que já tinha**, ganha prazo novo pelo plano de hoje e aceita
 * receber metade da recompensa. Recomeçar do zero tiraria justamente o trabalho
 * que a renovação existe para salvar.
 *
 * A vencida vira `renovada` na mesma transação, e é isso que impede renovar
 * duas vezes a mesma meta.
 */
export async function renovar(idMeta, idUsuario) {
  const meta = await exigirPosse(idMeta, idUsuario);
  if (meta.status !== 'expirada') {
    throw erroValidacao('Só meta vencida pode ser renovada');
  }

  const plano = await goalPlannerService.planoAtual(idUsuario);
  if (!plano) throw erroValidacao('Sem dias marcados na semana não há prazo para a meta renovada');

  const desconto = await rewardConfigsRepository.buscarModificador(rewardConfigsRepository.META_RENOVADA);
  if (!desconto) throw erroValidacao('Falta a configuração de recompensa da meta renovada');

  const prazo = new Date(Date.now() + plano.diasDePrazo * 24 * 60 * 60 * 1000);
  const recompensaMoedas = Math.round(Number(meta.reward_coins) * desconto.coins_factor);
  const recompensaPontos = Math.round(Number(meta.reward_points) * desconto.points_factor);

  const idNovaMeta = await emTransacao(async (conexao) => {
    const afetadas = await goalsRepository.marcarRenovada(conexao, idMeta);
    if (afetadas === 0) throw erroValidacao('Esta meta já foi renovada');

    const id = await goalsRepository.criar(conexao, {
      idUsuario,
      idTipo: meta.goal_type_id,
      idDificuldade: meta.difficulty_id,
      titulo: meta.title,
      alvo: Number(meta.target_value),
      recompensaMoedas,
      recompensaPontos,
      prazo,
      renovadaDe: idMeta,
    });

    // O progresso é copiado depois de criar, e não no INSERT, porque quem sabe
    // limitar o valor ao alvo é o `atualizarProgresso`.
    await goalsRepository.atualizarProgresso(conexao, id, Number(meta.current_value));
    return id;
  });

  await auditService.registrar(auditService.usuario(idUsuario), 'meta.renovada', {
    entidade: 'goal',
    id: idMeta,
    antes: {
      status: 'expirada',
      progresso: Number(meta.current_value),
      recompensaMoedas: Number(meta.reward_coins),
      recompensaPontos: Number(meta.reward_points),
    },
    depois: {
      status: 'renovada',
  // … continua até a linha 220 do arquivo
```

### 88. `a0bba7e` feat: a sequência avalia sozinha, no fuso do jogador (T-08.2)

*19/08/2026, Razawaky, tipo `feat`.*

Entrega o StreakService com avaliação preguiçosa na primeira página do dia (RN-021) e paga a dívida DT-23 no mesmo movimento: a virada do dia deixa de usar o relógio do servidor e passa a sair de profiles.timezone (RN-024).

**Arquivos (12 arquivos, +809 −48):** `test/integration/sequencia.test.js` (+244 −0), `src/services/streakService.js` (+184 −0), `src/utils/diaDoJogador.js` (+106 −0), `docs/ESTADO-DO-PROJETO.md` (+64 −14), `test/unit/diaDoJogador.test.js` (+70 −0), `src/repositories/streaksRepository.js` (+68 −0), `src/services/tasksService.js` (+25 −34), `src/repositories/gameSessionsRepository.js` (+19 −0), `src/services/profilesService.js` (+12 −0), `src/services/gameSessionService.js` (+9 −0), `src/controllers/paginaController.js` (+6 −0), `docs/RASTREABILIDADE.md` (+2 −0).

**Código atual:** `avaliar` em `src/services/streakService.js:167`.

```js
/**
 * Avalia os dias fechados desde a última visita e devolve a sequência de hoje.
 *
 * Chamar duas vezes no mesmo dia não muda nada: cada dia já avaliado tem evento
 * gravado, e evento existente é pulado.
 */
export async function avaliar(idUsuario, agora = new Date()) {
  const fuso = await profilesService.fusoDoUsuario(idUsuario);
  const hoje = dataDoDia(agora, fuso);
  await streaksRepository.criarSeNaoExistir(idUsuario);

  // A varredura inteira roda com o jogador travado. Sem a trava, duas
  // requisições simultâneas na primeira visita do dia julgam o mesmo dia
  // perdido e cada uma gasta um escudo para salvar um dia só.
  const varredura = await emTransacao(async (conexao) => {
    await usersRepository.travarPorId(conexao, idUsuario);
    const sequencia = await streaksRepository.buscarPorUsuario(idUsuario, conexao);

    const primeiroDia = primeiroDiaNaoAvaliado(sequencia, hoje, fuso);
    const dias = diasFechados(primeiroDia, hoje);

    let diasAtuais = Number(sequencia.current_days);
    let melhorDias = Number(sequencia.best_days);
    let ultimoDiaContado = sequencia.last_counted_date;
    let quebrou = false;
    const protegidos = [];

    if (dias.length > 0) {
      const [agenda, cumpridos, jaAvaliados] = await Promise.all([
        agendaDoJogador(idUsuario),
        diasComCelulaConcluida(idUsuario, primeiroDia, hoje, fuso),
        streaksRepository.listarEventos(idUsuario, primeiroDia, hoje, conexao),
      ]);

      const comDesfecho = new Set(jaAvaliados.map((evento) => evento.data));

      for (const dia of dias) {
        if (comDesfecho.has(dia)) continue;

        let tipo = desfechoDoDia(agenda, dia, cumpridos.has(dia));

        // O escudo só é gasto quando há sequência para salvar: proteger um dia de
        // quem já está zerado queimaria 400 de mel para não mudar nada.
        if (tipo === 'perdido' && diasAtuais > 0 && (await consumirEscudo(conexao, idUsuario))) {
          tipo = 'protegido';
          protegidos.push(dia);
        }

        await streaksRepository.registrarEvento({ idUsuario, data: dia, tipo }, conexao);

        if (tipo === 'cumprido') {
          diasAtuais += 1;
          ultimoDiaContado = dia;
          melhorDias = Math.max(melhorDias, diasAtuais);
        }

        if (tipo === 'perdido' && diasAtuais > 0) {
          quebrou = true;
          diasAtuais = 0;
        }
  // … continua até a linha 258 do arquivo
```

### 89. `595947b` feat: o escudo salva o dia perdido sozinho (T-08.3)

*19/08/2026, Razawaky, tipo `feat`.*

Entrega o consumo automático do Escudo de Sequência (RN-022, RF-SEQ-03): antes de um dia marcado em branco quebrar a sequência, um escudo do inventário é gasto e o dia vira `protegido`. Um escudo salva um dia; acabando os escudos, o próximo dia em branco quebra, como o streak freeze do Duolingo.

**Arquivos (9 arquivos, +500 −29):** `test/integration/escudoDeSequencia.test.js` (+236 −0), `src/services/streakService.js` (+85 −6), `docs/ESTADO-DO-PROJETO.md` (+66 −12), `src/repositories/inventoryRepository.js` (+62 −6), `src/services/purchasesService.js` (+30 −3), `src/repositories/streaksRepository.js` (+15 −0), `scripts/seeds/02_age_bands_domains.sql` (+4 −1), `migrations/004_goals_tasks_streaks.sql` (+1 −1), `docs/RASTREABILIDADE.md` (+1 −0).

**Código atual:** `consumirEscudo` em `src/services/streakService.js:89`.

```js
/**
 * Gasta um escudo, se houver. Devolve `true` quando o dia foi salvo.
 *
 * Usa a conexão da avaliação, e não uma transação própria: o escudo consumido e
 * o evento do dia que ele salvou têm de cair juntos ou não cair.
 */
async function consumirEscudo(conexao, idUsuario) {
  const idItem = await idDoEscudo();
  if (!idItem) return false;

  const unidade = await inventoryRepository.bloquearUnidadeAtivaDoItem(conexao, idUsuario, idItem);
  if (!unidade) return false;

  const consumiu = await inventoryRepository.marcarComoConsumido(conexao, unidade.id);
  if (!consumiu) return false;

  await sincronizarEscudos(conexao, idUsuario);
  return true;
}
```

### 90. `2d7285a` feat: os marcos de sequência pagam mel e conquista (T-08.4)

*19/08/2026, Razawaky, tipo `feat`.*

Entrega a RN-023 e a RF-SEQ-04: chegar a 7, 14, 30, 60 ou 100 dias de sequência desbloqueia a conquista do marco e credita o mel que ela promete. O valor vem de achievements.reward_coins, nunca de número no código (RN-006), e o lançamento usa o motivo marco-de-sequencia, que já estava no seed desde a E01.

**Arquivos (9 arquivos, +405 −17):** `test/integration/marcoDeSequencia.test.js` (+207 −0), `docs/ESTADO-DO-PROJETO.md` (+59 −11), `src/services/achievementsService.js` (+56 −0), `src/repositories/achievementsRepository.js` (+39 −0), `src/services/streakService.js` (+24 −2), `scripts/seeds/08_achievements.sql` (+14 −0), `migrations/007_gamification.sql` (+3 −3), `test/unit/seed.test.js` (+2 −1), `docs/RASTREABILIDADE.md` (+1 −0).

**Código atual:** `desbloquear` em `src/services/achievementsService.js:22`.

```js
/**
 * Desbloqueia a conquista e credita o bônus na mesma transação.
 * Devolve `desbloqueou: false` quando o jogador já a tinha, sem pagar de novo —
 * a UNIQUE do banco é a trava, não uma consulta anterior.
 */
export async function desbloquear(idUsuario, slug) {
  const conquista = await achievementsRepository.buscarPorSlug(slug);
  if (!conquista) return { desbloqueou: false, melCreditado: 0 };

  const saldoAntes = await auditService.retratoDoSaldo(idUsuario);
  const bonus = Number(conquista.reward_coins);

  const desbloqueou = await emTransacao(async (conexao) => {
    const primeiraVez = await achievementsRepository.desbloquear(conexao, {
      idUsuario,
      idConquista: conquista.id,
    });
    if (!primeiraVez) return false;

    if (bonus > 0) {
      await coinsService.creditar(conexao, idUsuario, bonus, {
        motivo: 'marco-de-sequencia',
        referenciaTipo: 'achievement',
        referenciaId: Number(conquista.id),
      });
    }
    return true;
  });

  if (!desbloqueou) return { desbloqueou: false, melCreditado: 0 };

  await auditService.registrarRecompensa(auditService.usuario(idUsuario), 'conquista.desbloqueada', {
    entidade: 'achievement',
    id: Number(conquista.id),
    antes: saldoAntes,
    depois: await auditService.retratoDoSaldo(idUsuario),
    detalhes: { conquista: conquista.slug, melBonus: bonus },
  });

  return { desbloqueou: true, melCreditado: bonus, conquista };
}
```

### 91. `241b401` feat: a tarefa avança pelo evento, não pelo clique (T-08.5)

*19/08/2026, Razawaky, tipo `feat`.*

Entrega a RF-TAR-01 e a RF-TAR-02 e fecha a DT-21, aberta desde a auditoria da E02. O progresso da tarefa passa a ser lido da fonte que o tipo declara — cell_completed, active_days e hive_completed —, e a rota POST /tarefas/:id/ progresso, com o botão "Avancei um passo", deixou de existir. Antes disso "conclua 3 células hoje" se cumpria com três cliques, sem jogar nada.

**Arquivos (14 arquivos, +524 −108):** `test/integration/tarefasDoDia.test.js` (+225 −0), `docs/ESTADO-DO-PROJETO.md` (+71 −14), `test/integration/fluxoAutenticado.test.js` (+64 −19), `src/services/tasksService.js` (+47 −30), `src/repositories/tasksRepository.js` (+39 −7), `src/services/taskProgressSources.js` (+36 −0), `scripts/seeds/02_age_bands_domains.sql` (+11 −7), `src/routes/tarefas.js` (+3 −10), `src/repositories/progressRepository.js` (+12 −0), `src/views/pages/metas.ejs` (+7 −5), `src/controllers/tasksController.js` (+0 −11), `test/integration/repositories/tasks.test.js` (+5 −5), e mais 2 arquivos.

**Código atual:** `sincronizarProgresso` em `src/services/tasksService.js:196`.

```js
/**
 * Relê o progresso de cada tarefa ativa na fonte que o tipo declara (RF-TAR-02).
 * Substitui o passo manual da DT-21: quem move a tarefa é a célula concluída, o
 * dia jogado e o favo fechado, nunca um clique em "avancei".
 */
export async function sincronizarProgresso(idUsuario) {
  const fuso = await profilesService.fusoDoUsuario(idUsuario);
  const ativas = await tasksRepository.listarAtivasPorUsuario(idUsuario);
  let atualizadas = 0;

  for (const tarefa of ativas) {
    const medido = await taskProgressSources.medir(tarefa.progress_source, idUsuario, janelaDaTarefa(tarefa, fuso));
    if (medido === null) continue;

    await emTransacao((conexao) => tasksRepository.definirProgresso(conexao, tarefa.id, medido));
    atualizadas += 1;
  }

  return { atualizadas };
}
```

## 20 de agosto de 2026

### 92. `8bfdd7c` feat: a sequência apareceu na tela (T-08.6)

*20/08/2026, Razawaky, tipo `feat`.*

O motor da E08 estava inteiro e invisível: a sequência avaliava, o escudo se gastava e o marco pagava sem que nada disso chegasse ao jogador. Esta tarefa não acrescenta regra, só expõe o que já era calculado (RF-SEQ-02).

**Arquivos (9 arquivos, +416 −21):** `test/integration/telaDeSequencia.test.js` (+176 −0), `docs/ESTADO-DO-PROJETO.md` (+58 −13), `src/views/partials/ui/calendario-semana.ejs` (+66 −0), `src/services/streakService.js` (+45 −0), `src/views/pages/metas.ejs` (+42 −3), `src/controllers/paginaController.js` (+9 −2), `src/views/pages/painel.ejs` (+11 −0), `docs/RASTREABILIDADE.md` (+4 −3), `src/services/schedulesService.js` (+5 −0).

**Código atual:** `resumoDaSemana` em `src/services/streakService.js:267`.

```js
/**
 * A semana corrente do jogador, pronta para a tela (RF-SEQ-02).
 *
 * Devolve os sete dias de domingo a sábado, cada um com o desfecho que
 * `streak_events` guardou, mais a sequência e os escudos. A view só desenha:
 * cruzar agenda com evento é conta, e conta não mora no EJS.
 */
export async function resumoDaSemana(idUsuario, agora = new Date()) {
  const fuso = await profilesService.fusoDoUsuario(idUsuario);
  const hoje = dataDoDia(agora, fuso);
  const domingo = somarDias(hoje, -diaDaSemana(hoje));

  const [sequencia, agenda, eventos, escudos] = await Promise.all([
    streaksRepository.criarSeNaoExistir(idUsuario),
    agendaDoJogador(idUsuario),
    streaksRepository.listarEventos(idUsuario, domingo, somarDias(domingo, 6)),
    escudosDisponiveis(idUsuario),
  ]);

  const desfechoPorData = new Map(eventos.map((evento) => [evento.data, evento.tipo]));

  const dias = [];
  for (let passo = 0; passo < 7; passo += 1) {
    const data = somarDias(domingo, passo);
    dias.push({
      data,
      nome: schedulesService.nomeDoDia(diaDaSemana(data)),
      marcado: ehDiaMarcado(agenda, data),
      // Dia sem evento é dia que ainda não foi julgado: hoje e o que vem depois.
      desfecho: desfechoPorData.get(data) ?? null,
      ehHoje: data === hoje,
      futuro: diferencaEmDias(hoje, data) > 0,
    });
  }

  return {
    dias,
    hoje,
    fuso,
    diasAtuais: Number(sequencia.current_days),
    melhorDias: Number(sequencia.best_days),
    escudos,
  };
}
```

### 93. `405ac02` chore: o lint para de varrer as skills de plugin

*20/08/2026, Razawaky, tipo `chore`.*

`npm run lint` falhava com milhares de erros vindos de `.github/skills/` e `.claude/skills/impeccable/`, que são modelo de MCP guardado no repositório e não código do Beever. As duas entraram nos `ignores` do `eslint.config.js`, e o portão de lint do Definition of Done voltou a valer alguma coisa.

**Arquivos (1 arquivo, +11 −1):** `eslint.config.js` (+11 −1).

### 94. `82f943f` test: três semanas de sequência num relógio simulado (T-08.7)

*20/08/2026, Razawaky, tipo `test`.*

O aceite da E08 é simular três semanas de uso e a sequência bater com a regra em todos os cenários. Os testes anteriores provavam cada regra numa janela de um ou dois dias, o que não mostra os desfechos se encadeando.

**Arquivos (5 arquivos, +384 −17):** `test/integration/tresSemanasDeSequencia.test.js` (+264 −0), `docs/ESTADO-DO-PROJETO.md` (+66 −12), `test/unit/schedulesService.test.js` (+29 −0), `test/helpers/calendarioSimulado.js` (+20 −0), `docs/RASTREABILIDADE.md` (+5 −5).

### 95. `a8a7504` fix: a auditoria da E08 fechou as três lacunas de maior risco

*20/08/2026, Razawaky, tipo `fix`.*

O laudo está em `docs/08-AUDITORIA-DA-ETAPA.md`: pode avançar, zero bloqueantes, dez lacunas encontradas e as três de maior risco corrigidas aqui. O fuso do MySQL era `SYSTEM` e só valia UTC por acidente da imagem. A aplicação grava e lê em UTC, mas `NOW()` seguia o relógio do sistema: num host em fuso local a RN-024 quebraria em silêncio, sem teste acusar. O compose passou a subir o banco com `--default-time-zone=+00:00`.

**Arquivos (12 arquivos, +446 −121):** `test/integration/planejadorDeMetas.test.js` (+120 −40), `src/services/streakService.js` (+79 −63), `docs/ESTADO-DO-PROJETO.md` (+88 −6), `docs/08-AUDITORIA-DA-ETAPA.md` (+67 −0), `src/repositories/progressRepository.js` (+26 −0), `src/services/goalProgressSources.js` (+18 −4), `test/integration/fluxoAutenticado.test.js` (+13 −5), `test/integration/escudoDeSequencia.test.js` (+15 −0), `scripts/seeds/02_age_bands_domains.sql` (+8 −0), `docker-compose.yml` (+6 −1), `docs/RASTREABILIDADE.md` (+3 −2), `src/services/goalPlannerService.js` (+3 −0).

**Código atual:** `contarCelulasConcluidas` em `src/repositories/progressRepository.js:188`.

```js
/**
 * Quantas células o jogador já concluiu na vida. Alimenta a meta
 * `cell_completed`, cujo alvo é absoluto: "chegue a 43 células".
 */
export async function contarCelulasConcluidas(idUsuario) {
  const linhas = await consultar(
    `SELECT COUNT(*) AS total
       FROM cell_progress cp
       JOIN cells c ON c.id = cp.cell_id
      WHERE cp.user_id = ? AND ${CONCLUIDA} AND ${CELULA_ATIVA}`,
    [idUsuario],
  );
  return Number(linhas[0]?.total ?? 0);
}
```

## 21 de agosto de 2026

### 96. `50797ed` feat: os repositories da economia abriram o schema da E01 (T-09.1)

*21/08/2026, Razawaky, tipo `feat`.*

O schema da economia existe desde a E01 e estava sem porta: nenhum repository lia cofre, ciclo, foto de patrimônio ou comportamento de item. Esta tarefa não criou tabela nenhuma, só o acesso que a E09 inteira vai usar.

**Arquivos (9 arquivos, +935 −6):** `test/integration/repositories/economia.test.js` (+283 −0), `test/integration/repositories/vaults.test.js` (+164 −0), `src/repositories/vaultsRepository.js` (+131 −0), `src/repositories/inventoryRepository.js` (+100 −0), `docs/ESTADO-DO-PROJETO.md` (+89 −6), `src/repositories/economicCyclesRepository.js` (+67 −0), `src/repositories/patrimonyRepository.js` (+53 −0), `src/repositories/itemsRepository.js` (+43 −0), `docs/RASTREABILIDADE.md` (+5 −0).

**Código atual:** `listarTransacoes` em `src/repositories/vaultsRepository.js:80`.

```js
export async function listarTransacoes(idUsuario, limite = 50) {
  return consultar(
    `SELECT t.id, t.amount, t.balance_after, t.created_at,
            tt.slug AS tipo, tt.name AS tipo_nome
       FROM vault_transactions t
       JOIN vault_transaction_types tt ON tt.id = t.transaction_type_id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ${limiteSeguro(limite)}`,
    [idUsuario],
  );
}
```

### 97. `34b90c1` feat: a loja ganhou service e o upgrade ganhou desconto (T-09.2)

*21/08/2026, Razawaky, tipo `feat`.*

A compra já existia desde a E06; o que faltava era a loja em volta dela. Entrou `shopService`, que monta a vitrine por jogador — bloqueios, quanto falta de mel, oferta de troca — e a prévia de impacto que a RF-LOJ-05 pede. Quem transaciona continua sendo o `purchasesService`.

**Arquivos (12 arquivos, +686 −114):** `test/integration/loja.test.js` (+238 −0), `src/services/purchasesService.js` (+125 −49), `src/services/shopService.js` (+126 −0), `src/services/itemsService.js` (+47 −39), `docs/ESTADO-DO-PROJETO.md` (+50 −7), `test/integration/fluxoAutenticado.test.js` (+27 −2), `src/repositories/itemsRepository.js` (+19 −6), `src/repositories/inventoryRepository.js` (+20 −0), `src/routes/loja.js` (+14 −4), `src/controllers/shopController.js` (+17 −0), `src/controllers/itemsController.js` (+0 −6), `src/controllers/purchasesController.js` (+3 −1).

**Código atual:** `previaDaCompra` em `src/services/shopService.js:110`.

```js
/**
 * O impacto da compra antes de confirmar (RF-LOJ-05): quanto sai do bolso,
 * quanto sobra e o que o item passa a cobrar ou a render por semana.
 *
 * `idUnidadeTrocada` ausente usa a melhor entrada disponível, que é a mesma que
 * a vitrine ofereceu. A conferência de verdade da troca é do `purchasesService`,
 * dentro da transação — aqui é retrato, não decisão.
 */
export async function previaDaCompra(idUsuario, idItem, { idUnidadeTrocada = null } = {}) {
  const item = await itemsService.obterAtivo(idItem);
  const [patrimonio, unidades, pendencias, regras] = await Promise.all([
    patrimonyService.obterDoUsuario(idUsuario),
    inventoryRepository.listarPorUsuario(idUsuario),
    itemsService.requisitosNaoCumpridos(idItem, idUsuario),
    profilesService.regrasEconomicasDoUsuario(idUsuario),
  ]);

  const oferta = ofertaDeTroca(item, unidades);
  const escolhida = idUnidadeTrocada
    ? unidades.find((unidade) => Number(unidade.id) === Number(idUnidadeTrocada) && unidade.status === 'ativo')
    : null;

  let troca = oferta;
  if (idUnidadeTrocada) {
    troca = escolhida
      ? {
          idUnidade: escolhida.id,
          itemTrocado: escolhida.item_name,
          desconto: Math.min(Number(escolhida.current_value), Number(item.price)),
        }
      : null;
  }

  const desconto = troca?.desconto ?? 0;
  const precoPago = Number(item.price) - desconto;
  const entraNoPatrimonio = Boolean(item.counts_in_patrimony);
  const bloqueios = pendencias.filter((pendencia) => !pendencia.naoVerificavelAinda);

  // O bem novo entra pelo preço de tabela e o entregue sai pelo desconto: é
  // assim que a tela consegue dizer "seu patrimônio vai para X" (RF-LOJ-05).
  const patrimonioDepois =
    patrimonio.total - precoPago + (entraNoPatrimonio ? Number(item.price) : 0) - desconto;

  return {
    item,
    precoDeTabela: Number(item.price),
    desconto,
    precoPago,
    troca,
    saldoAtual: patrimonio.carteira,
    saldoDepois: patrimonio.carteira - precoPago,
    patrimonioAtual: patrimonio.total,
    patrimonioDepois,
    ...comportamentoNaFaixa(item, regras),
    rendaSemanal: Number(item.income_per_cycle),
    entraNoPatrimonio,
    bloqueios,
    avisos: pendencias.filter((pendencia) => pendencia.naoVerificavelAinda),
    podeComprar: bloqueios.length === 0 && patrimonio.carteira >= precoPago,
  };
  // … continua até a linha 162 do arquivo
```

### 98. `78e566b` feat: o patrimônio ganhou dono e virou a conta da RN-039 (T-09.3)

*21/08/2026, Razawaky, tipo `feat`.*

A conta estava espalhada e errada em dois lugares: a trilha chamava de patrimônio só o valor dos bens, e o requisito `patrimonio-minimo` dos itens voltava como "não dá para verificar". Entrou `patrimonyService`, que soma carteira, cofre e bens a cada chamada — sem total guardado em coluna, porque a regra pede valor auditável e auditável é o que dá para recontar. Cosmético fica de fora pelo `counts_in_patrimony` (RN-041).

**Arquivos (11 arquivos, +363 −38):** `test/integration/patrimonio.test.js` (+177 −0), `src/services/patrimonyService.js` (+66 −0), `docs/ESTADO-DO-PROJETO.md` (+46 −11), `src/services/shopService.js` (+24 −14), `src/services/inventoryService.js` (+24 −0), `src/services/itemsService.js` (+11 −4), `src/services/contentService.js` (+5 −2), `src/services/purchasesService.js` (+3 −3), `src/repositories/inventoryRepository.js` (+3 −2), `test/integration/fluxoAutenticado.test.js` (+3 −1), `src/controllers/inventoryController.js` (+1 −1).

**Código atual:** `obterDoUsuario` em `src/services/patrimonyService.js:18`.

```js
/** A composição sempre aberta: quem só quer o número lê `total`. */
export async function obterDoUsuario(idUsuario) {
  const [carteira, cofre, bens] = await Promise.all([
    coinsService.obterCarteira(idUsuario),
    vaultsRepository.buscarPorUsuario(idUsuario),
    inventoryRepository.valorTotalEmPatrimonio(idUsuario),
  ]);

  // Quem nunca depositou não tem linha em `vaults`, e leitura não cria linha:
  // o cofre nasce no primeiro depósito.
  const composicao = {
    carteira: carteira.mel,
    cofre: Number(cofre?.balance ?? 0),
    bens,
  };
  const patrimonio = { ...composicao, total: composicao.carteira + composicao.cofre + composicao.bens };

  await guardarFotoDoDia(idUsuario, patrimonio);
  return patrimonio;
}
```

### 99. `264747e` docs: a rastreabilidade alcançou a loja e o patrimônio (T-09.3)

*21/08/2026, Razawaky, tipo `docs`.*

`docs/RASTREABILIDADE.md` ganhou as linhas de RN-032, RN-033, RF-LOJ-01 RF-LOJ-04, RF-LOJ-05, RF-LOJ-06, RF-LOJ-07, RF-INV-02 e RF-INV-04, e a linha de RN-039/RN-041 passou de parcial a atendida, agora apontando para o `patrimonyService` em vez de só para os repositories.

**Arquivos (2 arquivos, +7 −1):** `docs/RASTREABILIDADE.md` (+6 −1), `docs/ESTADO-DO-PROJETO.md` (+1 −0).

### 100. `dab8433` feat: o cofre abriu e a tarefa dele voltou ao catálogo (T-09.4)

*21/08/2026, Razawaky, tipo `feat`.*

`vaultService` entrega o que a E01 já tinha no schema e a T-09.1 tinha em repository: depósito e saque numa transação só, com o cofre travado por FOR UPDATE antes de gravar o movimento — sem isso, dois saques simultâneos escreveriam dois `balance_after` com o mesmo número.

**Arquivos (14 arquivos, +750 −20):** `src/services/vaultService.js` (+241 −0), `test/integration/cofre.test.js` (+217 −0), `test/unit/vaultService.test.js` (+61 −0), `docs/ESTADO-DO-PROJETO.md` (+49 −9), `test/integration/fluxoAutenticado.test.js` (+54 −0), `src/routes/cofre.js` (+50 −0), `src/controllers/vaultController.js` (+31 −0), `src/repositories/vaultsRepository.js` (+17 −0), `test/integration/tarefasDoDia.test.js` (+8 −4), `scripts/seeds/07_reward_modifiers.sql` (+7 −2), `scripts/seeds/02_age_bands_domains.sql` (+3 −4), `src/services/taskProgressSources.js` (+5 −1), e mais 2 arquivos.

**Código atual:** `sacar` em `src/services/vaultService.js:95`.

```js
/**
 * Tira mel do cofre (RF-COF-01). O saque é livre — a RN-043 não o proíbe, só
 * deixa de pagar rendimento sobre o que saiu no ciclo.
 */
export async function sacar(idUsuario, valor) {
  exigirValorValido(valor, 'sacar');
  const antes = await retratoComCofre(idUsuario);

  const saldo = await emTransacao(async (conexao) => {
    const cofre = await vaultsRepository.bloquearPorUsuario(conexao, idUsuario);
    const afetadas = cofre ? await vaultsRepository.debitar(conexao, idUsuario, valor) : 0;

    // Zero linhas afetadas quer dizer saldo insuficiente: a checagem e o débito
    // acontecem na mesma instrução, como na carteira.
    if (afetadas === 0) {
      throw new ErroAplicacao('Não há esse tanto de mel no cofre', {
        status: 422,
        codigo: 'COFRE_INSUFICIENTE',
      });
    }

    await coinsService.creditar(conexao, idUsuario, valor, { motivo: 'saque-cofre' });

    const restante = Number(cofre.balance) - valor;
    await vaultsRepository.registrarTransacao(conexao, {
      idUsuario,
      tipo: 'saque',
      valor,
      saldoDepois: restante,
    });
    return restante;
  });

  await registrarNaAuditoria(idUsuario, 'cofre.saque', antes, { valor });
  return { saldo };
}
```

## 25 de agosto de 2026

### 101. `cbefbf1` feat: a semana passou a acontecer e o ciclo cobrou as contas (T-09.5)

*25/08/2026, Razawaky, tipo `feat`.*

O `economicCycleService` conta os ciclos pelo calendário do jogador — semanas cheias entre a semana da conta e a semana de hoje, no fuso do perfil — e aplica de uma vez os que faltam, na Colmeia. Um contador incremental deslocaria a economia dele para sempre no primeiro reprocessamento; o calendário devolve sempre o mesmo número para o mesmo instante.

**Arquivos (7 arquivos, +651 −13):** `src/services/economicCycleService.js` (+273 −0), `test/integration/cicloEconomico.test.js` (+221 −0), `test/unit/economicCycleService.test.js` (+76 −0), `docs/ESTADO-DO-PROJETO.md` (+57 −9), `src/repositories/economicCyclesRepository.js` (+15 −0), `docs/RASTREABILIDADE.md` (+4 −4), `src/controllers/paginaController.js` (+5 −0).

**Código atual:** `processarPendentes` em `src/services/economicCycleService.js:249`.

```js
/**
 * Roda todos os ciclos que passaram desde a última visita e devolve os extratos,
 * do mais antigo para o mais novo. É o que a Colmeia mostra na T-09.8.
 *
 * Cada ciclo tem transação própria: falha no quarto preserva os três primeiros,
 * e a próxima visita continua de onde parou.
 */
export async function processarPendentes(idUsuario, agora = new Date()) {
  const usuario = await usersRepository.buscarPorId(idUsuario);
  if (!usuario) return [];

  const fuso = await profilesService.fusoDoUsuario(idUsuario);
  const cicloAtual = numeroDoCiclo({ criadoEm: usuario.created_at, agora, fuso });
  const ultimoProcessado = await economicCyclesRepository.ultimoNumeroProcessado(idUsuario);
  const { pular, aplicar } = separarPendentes({ ultimoProcessado, cicloAtual });
  if (pular.length === 0 && aplicar.length === 0) return [];

  const regras = await profilesService.regrasEconomicasDoUsuario(idUsuario);
  const semanaDaConta = semanaDe(dataDoDia(new Date(usuario.created_at), fuso));
  for (const numero of pular) {
    await marcarSemEfeito(idUsuario, numero);
  }

  const antes = await auditService.retratoDoSaldo(idUsuario);
  const resumos = [];
  for (const numero of aplicar) {
    const resumo = await processarUm(idUsuario, numero, { fuso, semanaDaConta, regras });
    if (resumo) resumos.push(resumo);
  }

  if (resumos.length === 0) return [];

  // A foto do patrimônio sai uma vez, no fim: é o ponto do gráfico da semana de
  // quem passou o período fora (DT-56).
  await patrimonyService.obterDoUsuario(idUsuario);
  await auditService.registrarRecompensa(auditService.sistema(), 'ciclo.economico', {
    entidade: 'economic_cycle',
    id: idUsuario,
    antes,
    depois: await auditService.retratoDoSaldo(idUsuario),
    detalhes: { ciclos: resumos.map((resumo) => resumo.numero), pulados: pular.length },
  });

  return resumos;
}
```

### 102. `626bbee` feat: a Faixa A ganhou a economia sem punição (T-09.6)

*25/08/2026, Razawaky, tipo `feat`.*

A RN-038 desliga custo fixo, depreciação e inadimplência para a criança de 6 a 8 anos, e só o custo tinha interruptor em `age_bands`. Entrou a migration `016` com `is_depreciation_enabled`; a inadimplência não ganhou coluna porque é consequência de não pagar o custo, e quem não cobra não tem como ficar devendo. Uma lista de faixas escrita no service seria o valor mágico que a RN-006 proíbe no resto da economia.

**Arquivos (9 arquivos, +365 −31):** `test/integration/faixaNaEconomia.test.js` (+189 −0), `docs/ESTADO-DO-PROJETO.md` (+46 −8), `src/services/economicCycleService.js` (+29 −11), `src/services/shopService.js` (+29 −3), `src/repositories/profilesRepository.js` (+21 −1), `src/services/profilesService.js` (+21 −0), `migrations/016_faixa_sem_depreciacao.sql` (+19 −0), `scripts/seeds/02_age_bands_domains.sql` (+8 −6), `docs/RASTREABILIDADE.md` (+3 −2).

**Código atual:** `cobrarCustoFixo` em `src/services/economicCycleService.js:120`.

```js
/**
 * Cobra o custo fixo de cada unidade (RN-037). A renda já entrou: quem tem
 * negócio paga as contas com o que ele rendeu, e não fica inadimplente por
 * ordem de execução.
 *
 * O débito vai direto ao `walletsRepository` de propósito: o `coinsService`
 * estoura quando falta mel, e aqui faltar mel não é erro — é inadimplência, que
 * a regra manda tratar sem nunca virar dívida negativa.
 */
async function cobrarCustoFixo(conexao, idUsuario, unidades, regras) {
  let custo = 0;
  const inadimplentes = [];

  // Faixa sem custo fixo também perdoa o que ficou devendo antes: a dívida era
  // da regra antiga, e ninguém deve ser punido por ter feito aniversário.
  if (!regras.custoFixo) {
    for (const unidade of unidades) {
      if (unidade.status === 'inadimplente') {
        await inventoryRepository.regularizar(conexao, unidade.id);
      }
    }
    return { custo, inadimplentes };
  }

  for (const unidade of unidades) {
    const valor = Number(unidade.upkeep_cost);
    if (valor <= 0) continue;

    const pagou = await walletsRepository.debitarMel(conexao, {
      idUsuario,
      quantidade: valor,
      motivo: 'custo-fixo',
      referenciaTipo: 'inventory',
      referenciaId: unidade.id,
    });

    if (pagou === 0) {
      await inventoryRepository.marcarInadimplente(conexao, unidade.id);
      inadimplentes.push(unidade.item_name);
      continue;
    }

    custo += valor;
    if (unidade.status === 'inadimplente') {
      await inventoryRepository.regularizar(conexao, unidade.id);
    }
  }

  return { custo, inadimplentes };
}
```

### 103. `b01158f` docs: o banco de desenvolvimento voltou do zero e a DT-61 foi paga

*25/08/2026, Razawaky, tipo `docs`.*

O guarda de checksum recusava `db:migrate` por causa das migrations 004 e 007 editadas depois de aplicadas nas T-08.3 e T-08.4. O banco foi recriado com `db:reset -- --sim`: 16 migrations aplicadas, seed completo e `db:reconcile` fechando os quatro livros.

**Arquivos (1 arquivo, +6 −5):** `docs/ESTADO-DO-PROJETO.md` (+6 −5).

### 104. `e17f1c5` feat: a economia ganhou tela e a compra passou a explicar a conta (T-09.7)

*25/08/2026, Razawaky, tipo `feat`.*

A regra estava inteira desde a T-09.6 e não chegava à criança: a loja renderizava o catálogo cru, o inventário morava num pedaço do painel e o cofre não tinha página. Entraram quatro telas lendo o que os services já respondiam sem nenhuma regra nova.

**Arquivos (17 arquivos, +1030 −79):** `test/integration/telasDaEconomia.test.js` (+231 −0), `src/views/pages/cofre.ejs` (+184 −0), `src/public/js/graficos.js` (+110 −0), `src/views/pages/confirmar-compra.ejs` (+93 −0), `src/views/pages/inventario.ejs` (+85 −0), `src/views/pages/loja.ejs` (+38 −44), `src/views/partials/ui/item-card.ejs` (+72 −0), `src/controllers/paginaController.js` (+60 −9), `docs/ESTADO-DO-PROJETO.md` (+47 −12), `src/views/partials/ui/patrimonio-topo.ejs` (+44 −0), `src/views/pages/painel.ejs` (+18 −1), `src/styles/tema.css` (+16 −0), e mais 5 arquivos.

**Código atual:** `desenharComposicao` em `src/public/js/graficos.js:33`.

```js
/** A composição do patrimônio (RF-INV-04): carteira, cofre e bens. */
function desenharComposicao(canvas) {
  const { contexto, largura, altura } = prepararContexto(canvas);
  const fatias = [
    { valor: Number(canvas.dataset.carteira), cor: corDoTema('--color-breu') },
    { valor: Number(canvas.dataset.cofre), cor: corDoTema('--color-ambar') },
    { valor: Number(canvas.dataset.bens), cor: corDoTema('--color-nectar') },
  ];

  const total = fatias.reduce((soma, fatia) => soma + fatia.valor, 0);
  const centroX = largura / 2;
  const centroY = altura / 2;
  const raio = Math.min(largura, altura) / 2 - 4;
  const espessura = raio * 0.45;

  // Patrimônio zero ainda desenha o anel vazio: um buraco na tela faria a
  // criança achar que a página quebrou.
  if (total <= 0) {
    contexto.beginPath();
    contexto.arc(centroX, centroY, raio - espessura / 2, 0, Math.PI * 2);
    contexto.lineWidth = espessura;
    contexto.strokeStyle = corDoTema('--color-cera');
    contexto.stroke();
    return;
  }

  let inicio = -Math.PI / 2;
  fatias.forEach((fatia) => {
    if (fatia.valor <= 0) return;

    const fim = inicio + (fatia.valor / total) * Math.PI * 2;
    contexto.beginPath();
    contexto.arc(centroX, centroY, raio - espessura / 2, inicio, fim);
    contexto.lineWidth = espessura;
    contexto.strokeStyle = fatia.cor;
    contexto.stroke();
    inicio = fim;
  });
}
```

### 105. `18e3c9f` feat: o ciclo passou a falar com a criança na Colmeia (T-09.8)

*25/08/2026, Razawaky, tipo `feat`.*

O `summary` de cada ciclo era gravado desde a T-09.5 e nunca tinha sido lido por ninguém. `avisoDosCiclos` transforma aquele JSON em frase, sem mexer em regra nenhuma.

**Arquivos (8 arquivos, +414 −12):** `test/integration/avisoDoCiclo.test.js` (+140 −0), `test/unit/avisosDoCiclo.test.js` (+96 −0), `src/services/economicCycleService.js` (+83 −0), `docs/ESTADO-DO-PROJETO.md` (+39 −8), `src/views/partials/ui/aviso-do-ciclo.ejs` (+40 −0), `src/views/pages/painel.ejs` (+8 −0), `src/controllers/paginaController.js` (+5 −2), `docs/RASTREABILIDADE.md` (+3 −2).

**Código atual:** `avisoDosCiclos` em `src/services/economicCycleService.js:325`.

```js
/**
 * O que aconteceu na economia, em frases (RF-HOM-09).
 *
 * Vários ciclos viram um aviso só, com os números somados: seis blocos iguais
 * empilhados viram parede de texto, e quem passou seis semanas fora é justamente
 * quem mais precisa entender o que mudou. Ciclo silencioso não vira aviso —
 * aviso vazio ensina a ignorar avisos.
 *
 * Conta pura, sem banco: é o que deixa o teste cobrir os casos difíceis.
 */
export function avisoDosCiclos(resumos) {
  const aplicados = (resumos ?? []).filter((resumo) => resumo && !resumo.pulado);
  if (aplicados.length === 0) return null;

  const total = somarCiclos(aplicados);
  const frases = [];

  if (total.renda > 0) frases.push(`Seus negócios renderam ${total.renda} de mel.`);
  if (total.rendimentoDoCofre > 0) frases.push(`Seu cofre rendeu ${total.rendimentoDoCofre} de mel.`);
  if (total.bonusDeMeta > 0) frases.push(`Você bateu a meta do cofre e ganhou ${total.bonusDeMeta} de mel.`);
  if (total.custo > 0) frases.push(`As contas dos seus itens custaram ${total.custo} de mel.`);
  if (total.valorizacao > 0) frases.push(`Seus bens ganharam ${total.valorizacao} de valor.`);
  if (total.depreciacao > 0) frases.push(`Seus bens perderam ${total.depreciacao} de valor.`);

  for (const nome of new Set(total.inadimplentes)) {
    frases.push(`Faltou mel para pagar as contas de ${nome}. Duas semanas sem pagar e o item é vendido.`);
  }

  // A regra da venda forçada é dura; o texto não precisa ser. Diz o motivo e o
  // valor, sem culpar a criança.
  for (const vendido of total.vendidos) {
    frases.push(
      `${vendido.item} foi vendido por ${vendido.valor} de mel porque as contas dele ficaram duas semanas sem pagar.`,
    );
  }

  if (frases.length === 0) return null;
  return { semanas: aplicados.length, frases };
}
```

### 106. `55bbf77` test: a E09 passou no próprio aceite e a etapa fechou (T-09.9)

*25/08/2026, Razawaky, tipo `test`.*

O critério do roadmap virou teste executável: entrar depois de seis semanas aplica todos os ciclos uma única vez, com extrato claro e nada de saldo negativo. Os cinco cenários rodam em ordem sobre o mesmo jogador — ele compra guarda no cofre, fica sem mel, some seis semanas e volta —, porque cada efeito isolado já tinha teste próprio e o que faltava provar era a travessia.

**Arquivos (3 arquivos, +350 −12):** `test/integration/aceiteDaEconomia.test.js` (+311 −0), `docs/ESTADO-DO-PROJETO.md` (+34 −8), `docs/RASTREABILIDADE.md` (+5 −4).

### 107. `e32fc4a` fix: a auditoria da E09 fechou as três lacunas baratas

*25/08/2026, Razawaky, tipo `fix`.*

O laudo entrou em `docs/09-AUDITORIA-DA-ETAPA.md`, no formato do da E08. A lacuna de risco real era entrada não validada: a página `/cofre` aceitava qualquer coisa na query enquanto a rota JSON do mesmo caminho recusava, e `?porSemana=abc` respondia 200 com a projeção inteira escrita como `NaN`. A página passou a usar a mesma regra, e o caso virou teste.

**Arquivos (9 arquivos, +155 −22):** `docs/09-AUDITORIA-DA-ETAPA.md` (+78 −0), `docs/ESTADO-DO-PROJETO.md` (+33 −1), `src/routes/index.js` (+13 −3), `test/integration/telasDaEconomia.test.js` (+13 −0), `src/views/pages/cofre.ejs` (+6 −6), `src/views/partials/ui/item-card.ejs` (+4 −4), `src/views/pages/confirmar-compra.ejs` (+3 −3), `src/views/partials/ui/patrimonio-topo.ejs` (+3 −3), `src/views/pages/inventario.ejs` (+2 −2).

### 108. `9d83891` docs: a E12 ganhou escopo e as decisões de modelagem ficaram para ela

*25/08/2026, Razawaky, tipo `docs`.*

A pergunta era se o administrador pode cadastrar itens novos com ilustração própria e variações. Hoje não: o CRUD de itens é a T-12.3 e não começou, `items` não tem coluna de imagem nenhuma, e variação só existe como linha de evolução (`upgrade_of_item_id`), não como cor ou tamanho do mesmo item.

**Arquivos (2 arquivos, +65 −5):** `docs/02-ROADMAP-ETAPAS.md` (+45 −5), `docs/ESTADO-DO-PROJETO.md` (+20 −0).

### 109. `fd13159` feat: a Colmeia ganhou dono e a home virou uma chamada só (T-10.1)

*25/08/2026, Razawaky, tipo `feat`.*

`homeService` aplica os efeitos da visita e responde os nove blocos da RF-HOM prontos: nível, mel, patrimônio, sequência, meta em destaque com prazo e recompensa, trilha, próxima célula, tarefas e o aviso do ciclo. O `paginaController.painel` virou três linhas e o `/painel` passou a servir JSON pelo mesmo endereço, como as telas da economia.

**Arquivos (8 arquivos, +611 −98):** `test/integration/colmeia.test.js` (+215 −0), `src/services/homeService.js` (+113 −0), `test/unit/homeService.test.js` (+103 −0), `src/views/pages/painel.ejs` (+59 −39), `docs/ESTADO-DO-PROJETO.md` (+67 −15), `src/controllers/paginaController.js` (+11 −36), `src/services/contentService.js` (+37 −8), `docs/RASTREABILIDADE.md` (+6 −0).

**Código atual:** `obterColmeia` em `src/services/homeService.js:60`.

```js
/** A Colmeia inteira do jogador, com os efeitos da visita já aplicados. */
export async function obterColmeia(idUsuario) {
  await prepararVisita(idUsuario);

  const [perfil, patrimonio, semana, metas, tarefas, trilha, eventosDoCiclo, avisoDoCiclo, liga] =
    await Promise.all([
      profilesService.obterDoUsuario(idUsuario),
      patrimonyService.obterDoUsuario(idUsuario),
      streakService.resumoDaSemana(idUsuario),
      goalsService.listarAtivas(idUsuario),
      tasksService.listarAtivas(idUsuario),
      contentService.listarTrilha(idUsuario),
      economicCycleService.listarEventosRecentes(idUsuario),
      economicCycleService.avisoDoDia(idUsuario),
      leagueService.ligaDoJogador(idUsuario),
    ]);

  // Patrimônio e cofre são avaliados aqui, e não no evento que os move: somar
  // carteira, cofre e bens é a conta mais cara do sistema, e a visita já a fez
  // uma vez para o cabeçalho. Célula e favo não passam por aqui — aqueles a
  // partida avalia na hora, porque o dado já está em mãos (T-13.2).
  const conquistas = await achievementsService.avaliarEventos(
    idUsuario,
    Object.fromEntries(
      criteriosDosEventos(['patrimonio-mudou', 'cofre-mudou']).map((criterio) => [
        criterio,
        criterio === 'cofre-guardado' ? patrimonio.cofre : patrimonio.total,
      ]),
    ),
  );

  // A trilha já lida é passada adiante: pedir de novo cobraria do banco as
  // mesmas consultas duas vezes na mesma tela (RNF-04).
  const proximaCelula = await contentService.proximaCelulaPendente(idUsuario, trilha);
  // Quem sabe resumir meta é o `goalsService`: a Colmeia só escolhe qual vai
  // para o destaque (RF-HOM-04) e qual fica na lista das outras (RF-HOM-05).
  const resumidas = goalsService
    .ordenarPorVencimento(metas)
    .map((meta) => goalsService.resumirMeta(meta, { hoje: semana.hoje, fuso: semana.fuso }));

  return {
    jogador: {
      apelido: perfil.apelido,
      nivel: perfil.nivel,
      mel: perfil.mel,
      polen: perfil.polen,
      patrimonio,
    },
    sequencia: semana,
    metaEmDestaque: resumidas[0] ?? null,
    outrasMetas: resumidas.slice(1),
    trilha: marcarFocoDaTrilha(trilha),
    proximaCelula,
    tarefas: tarefas.map(tasksService.resumirTarefa),
    ciclo: {
      // O destaque é do dia do jogador, e não da visita: recarregar a Colmeia
      // não pode apagar a notícia (DT-63).
      aviso: avisoDoCiclo,
      eventos: eventosDoCiclo,
    },
  // … continua até a linha 124 do arquivo
```

### 110. `45e9686` feat: o topo da Colmeia virou componente e ficou grudado (T-10.2)

*25/08/2026, Razawaky, tipo `feat`.*

`badge-recurso` desenha número com ícone e palavra, `barra-progresso` põe a largura em classe com o rótulo fora da barra, e `cabecalho-colmeia` junta nível com barra de XP, mel, patrimônio e sequência (RF-HOM-01 a 03). Os mesmos partials já valem na loja, no inventário e no cofre, que repetiam esses números em marcação própria.

**Arquivos (11 arquivos, +300 −81):** `test/integration/cabecalhoDaColmeia.test.js` (+127 −0), `src/views/pages/painel.ejs` (+16 −63), `src/views/partials/ui/cabecalho-colmeia.ejs` (+63 −0), `docs/ESTADO-DO-PROJETO.md` (+33 −7), `src/views/partials/ui/barra-progresso.ejs` (+24 −0), `src/views/partials/ui/badge-recurso.ejs` (+18 −0), `src/views/partials/ui/patrimonio-topo.ejs` (+7 −5), `src/views/pages/cofre.ejs` (+7 −3), `src/controllers/paginaController.js` (+2 −1), `test/integration/fluxoAutenticado.test.js` (+2 −1), `docs/RASTREABILIDADE.md` (+1 −1).

**Código atual:** `painel` em `src/controllers/paginaController.js:110`.

```js
/**
 * A Colmeia (RF-HOM-01 a 09). O controller não orquestra nada: quem aplica os
 * efeitos da visita e monta os blocos é o `homeService`, e o mesmo endereço
 * responde JSON para quem pedir.
 */
export const painel = assincrono(async (req, res) => {
  const colmeia = await homeService.obterColmeia(req.session.usuarioId);
  if (querJson(req)) return res.json(colmeia);

  renderizarPagina(res, 'painel', {
    titulo: `${colmeia.jogador.apelido} — Beever`,
    // Sem espaço no topo, porque o cabeçalho é grudado; e folga embaixo no
    // celular, para o botão "Continuar" não tapar o fim da página.
    classeBody: 'min-h-screen bg-cera pb-28 text-tinta antialiased sm:pb-10',
    colmeia,
    // O admin que entra pelo login comum cai aqui, e sem este atalho a área
    // administrativa só abria digitando o endereço.
    mostrarAtalhoAdmin: Boolean(req.session.ehAdmin),
  });
});
```

### 111. `9036f6b` feat: a meta mais próxima virou o segundo assunto da Colmeia (T-10.3)

*25/08/2026, Razawaky, tipo `feat`.*

`resumirMeta` e `ordenarPorVencimento` saíram do `homeService` e foram para o `goalsService`, que é quem responde por meta; junto entrou `urgenciaDoPrazo` que traduz o prazo em palavra (hoje, apertado, tranquilo, sem prazo) com ícone e frase, porque cor sozinha não anuncia urgência (RNF-25).

**Arquivos (11 arquivos, +449 −140):** `test/integration/metaDaColmeia.test.js` (+182 −0), `src/views/pages/painel.ejs` (+40 −43), `src/services/goalsService.js` (+63 −0), `src/views/pages/metas.ejs` (+15 −39), `test/unit/resumoDeMetas.test.js` (+42 −5), `src/services/homeService.js` (+5 −40), `docs/ESTADO-DO-PROJETO.md` (+32 −11), `src/views/partials/ui/card-meta.ejs` (+41 −0), `src/views/partials/ui/estado-vazio.ejs` (+21 −0), `src/controllers/paginaController.js` (+7 −1), `docs/RASTREABILIDADE.md` (+1 −1).

**Código atual:** `resumirMeta` em `src/services/goalsService.js:47`.

```js
/**
 * A meta pronta para a tela: percentual, dias até o prazo, urgência em palavra e
 * o que ela paga (RF-HOM-04, RF-MET-02). Conta de meta não mora na view.
 *
 * Pura, para poder ser testada sem banco.
 */
export function resumirMeta(meta, { hoje, fuso }) {
  const atual = Number(meta.current_value);
  const alvo = Number(meta.target_value);
  const prazo = meta.due_at ? dataDoDia(new Date(meta.due_at), fuso) : null;
  const diasRestantes = prazo ? diferencaEmDias(hoje, prazo) : null;

  return {
    id: Number(meta.id),
    titulo: meta.title,
    atual,
    alvo,
    percentual: alvo === 0 ? 0 : Math.min(100, Math.round((atual / alvo) * 100)),
    status: meta.status,
    dificuldade: meta.difficulty,
    prazo,
    diasRestantes,
    urgencia: urgenciaDoPrazo(diasRestantes),
    melDaRecompensa: Number(meta.reward_coins),
    polenDaRecompensa: Number(meta.reward_points),
  };
}
```

### 112. `9997ab9` feat: a trilha entrou na Colmeia em hexágonos, com foco no favo atual (T-10.4)

*25/08/2026, Razawaky, tipo `feat`.*

A Colmeia mostra todos os favos, e não um cartão com link: o que está em andamento e o seguinte vêm grandes, os mais avançados vêm pequenos e travados com o motivo escrito. A régua do que ainda vem é parte do que motiva.

**Arquivos (8 arquivos, +282 −33):** `test/integration/trilhaDaColmeia.test.js` (+120 −0), `test/unit/focoDaTrilha.test.js` (+65 −0), `docs/ESTADO-DO-PROJETO.md` (+34 −13), `src/views/pages/painel.ejs` (+24 −10), `src/views/partials/ui/favo-card.ejs` (+15 −6), `src/services/homeService.js` (+17 −1), `test/integration/metaDaColmeia.test.js` (+5 −2), `docs/RASTREABILIDADE.md` (+2 −1).

**Código atual:** `marcarFocoDaTrilha` em `src/services/homeService.js:50`.

```js
/**
 * Marca em qual favo a Colmeia põe o foco (RF-HOM-06): o que está em andamento e
 * o seguinte. Os demais continuam na trilha, com o estado que já tinham — sumir
 * com eles tiraria a régua do que a criança está construindo.
 *
 * Pura, para poder ser testada sem banco.
 */
export function marcarFocoDaTrilha(trilha) {
  const atual = trilha.findIndex((favo) => favo.aberto && !favo.concluido);

  return trilha.map((favo, posicao) => ({
    ...favo,
    emFoco: atual >= 0 && (posicao === atual || posicao === atual + 1),
  }));
}
```

### 113. `996c06a` feat: as tarefas do dia entraram na Colmeia e o aviso do ciclo parou de sumir (T-10.5)

*25/08/2026, Razawaky, tipo `feat`.*

O bloco das tarefas fica entre a trilha e a meta: tarefa é o que a colmeia pede hoje, meta é onde o jogador quer chegar. `card-tarefa` é compartilhado com `/metas` — compacto na home, com barra na tela de metas — e a conta saiu do EJS para `tasksService.resumirTarefa`.

**Arquivos (15 arquivos, +387 −54):** `test/integration/tarefasDaColmeia.test.js` (+155 −0), `docs/ESTADO-DO-PROJETO.md` (+38 −13), `src/views/partials/ui/card-tarefa.ejs` (+44 −0), `test/unit/resumoDeMetas.test.js` (+38 −0), `src/views/pages/metas.ejs` (+2 −30), `src/services/tasksService.js` (+25 −0), `test/integration/avisoDoCiclo.test.js` (+16 −2), `src/views/pages/painel.ejs` (+16 −0), `src/services/economicCycleService.js` (+15 −0), `src/utils/resposta.js` (+13 −0), `src/repositories/economicCyclesRepository.js` (+11 −0), `src/services/homeService.js` (+7 −4), e mais 3 arquivos.

**Código atual:** `resumirTarefa` em `src/services/tasksService.js:48`.

```js
/**
 * A tarefa pronta para a tela (RF-HOM-08): progresso em percentual e a resposta
 * de "já dá para receber?". Conta de tarefa não mora na view.
 *
 * Pura, para poder ser testada sem banco.
 */
export function resumirTarefa(tarefa) {
  const atual = Number(tarefa.current_value);
  const alvo = Number(tarefa.target_value);

  return {
    id: Number(tarefa.id),
    titulo: tarefa.title,
    atual,
    alvo,
    percentual: alvo === 0 ? 0 : Math.min(100, Math.round((atual / alvo) * 100)),
    escopo: tarefa.scope,
    status: tarefa.status,
    concluida: tarefa.status === 'concluida',
    cumprida: atual >= alvo,
    melDaRecompensa: Number(tarefa.reward_coins),
    polenDaRecompensa: Number(tarefa.reward_points),
  };
}
```

### 114. `8903eb6` feat: a Colmeia ganhou o botão Continuar, e ele leva ao jogo (T-10.6)

*25/08/2026, Razawaky, tipo `feat`.*

`botao-continuar` é partial único da Colmeia e da trilha: recebe a próxima célula e decide destino e texto. Com célula, vai direto a `/trilha/:idFavo/celula/:idCelula`; sem célula, troca para "Ver minha trilha" em vez de sumir, porque tela sem ação principal deixa a criança sem saber o que fazer. É um link, então funciona sem JavaScript e com teclado.

**Arquivos (7 arquivos, +208 −29):** `test/integration/continuarDaColmeia.test.js` (+127 −0), `docs/ESTADO-DO-PROJETO.md` (+32 −12), `src/views/partials/ui/botao-continuar.ejs` (+26 −0), `src/views/pages/trilha.ejs` (+8 −13), `src/controllers/paginaController.js` (+8 −3), `src/views/pages/painel.ejs` (+6 −0), `docs/RASTREABILIDADE.md` (+1 −1).

**Código atual:** `trilha` em `src/controllers/paginaController.js:290`, já transcrito no commit 57.

### 115. `718dcff` test: a E10 passou no próprio aceite, com jogador avançado (T-10.7)

*25/08/2026, Razawaky, tipo `test`.*

`aceiteDaColmeia.test.js` monta o cenário do critério — 5 favos, 60 células com quiz válido, 50 concluídas, 12 itens, 4000 de mel e 1500 no cofre — e prova as duas metades sobre o mesmo jogador: a Colmeia vem inteira e correta, com o patrimônio fechando na soma da RN-039, e responde em 87 a 102 ms contra o teto de 2 s da RNF-01. Os tempos vão para a saída do teste por `t.diagnostic`.

**Arquivos (4 arquivos, +387 −17):** `test/integration/aceiteDaColmeia.test.js` (+221 −0), `test/helpers/jogadorAvancado.js` (+121 −0), `docs/ESTADO-DO-PROJETO.md` (+43 −15), `docs/RASTREABILIDADE.md` (+2 −2).

### 116. `79b6101` fix: a auditoria da E10 fechou as três lacunas baratas

*25/08/2026, Razawaky, tipo `fix`.*

A Colmeia voltou a ter `h1`: ao virar componente, o topo passou a escrever o apelido como parágrafo, e a tela mais visitada do jogo ficou sem título de página enquanto todas as outras tinham. Virou teste.

**Arquivos (11 arquivos, +164 −24):** `docs/10-AUDITORIA-DA-ETAPA.md` (+89 −0), `docs/ESTADO-DO-PROJETO.md` (+29 −3), `src/controllers/paginaController.js` (+7 −13), `test/integration/avisoDoCiclo.test.js` (+18 −0), `test/integration/cabecalhoDaColmeia.test.js` (+7 −0), `src/services/contentService.js` (+5 −1), `test/unit/focoDaTrilha.test.js` (+3 −3), `src/views/partials/ui/cabecalho-colmeia.ejs` (+3 −1), `src/services/homeService.js` (+1 −1), `src/views/pages/favo.ejs` (+1 −1), `src/views/partials/ui/favo-card.ejs` (+1 −1).

**Código atual:** `metas` em `src/controllers/paginaController.js:196`.

```js
export const metas = assincrono(async (req, res) => {
  // A chegada do jogador tem uma dona só: o `homeService`. Esta tela repetia
  // cinco dos seis passos à mão, sem o ciclo econômico, e mostrava o saldo de
  // antes das contas da semana.
  await homeService.prepararVisita(req.session.usuarioId);

  const [listaDeMetas, tarefas, semana, conquistas] = await Promise.all([
    goalsService.listarDoUsuario(req.session.usuarioId),
    tasksService.listarDoUsuario(req.session.usuarioId),
    streakService.resumoDaSemana(req.session.usuarioId),
    achievementsService.listarDoUsuario(req.session.usuarioId),
  ]);

  // A meta chega resumida pelo service, como na Colmeia: percentual, prazo em
  // palavra e recompensa saem de um lugar só (RF-MET-02).
  const metasResumidas = listaDeMetas.map((meta) =>
    goalsService.resumirMeta(meta, { hoje: semana.hoje, fuso: semana.fuso }),
  );

  renderizarPagina(res, 'metas', {
    titulo: 'Metas — Beever',
    classeBody: FUNDO_CERA,
    metas: metasResumidas,
    tarefas: tarefas.map(tasksService.resumirTarefa),
    semana,
    conquistas,
  });
});
```

### 117. `ab0f891` docs: a E10 ficou marcada como concluída e auditada

*25/08/2026, Razawaky, tipo `docs`.*

**Arquivos (1 arquivo, +3 −2):** `docs/ESTADO-DO-PROJETO.md` (+3 −2).

## 26 de agosto de 2026

### 118. `f12f2b9` feat: as fontes viraram arquivo do projeto e a Beenie ganhou catálogo (T-11.1)

*26/08/2026, Razawaky, tipo `feat`.*

Abre a E11 fechando o que faltava dos tokens da identidade. As fontes eram só nome no @theme: nenhum arquivo era servido, então display e corpo caíam no system-ui. Agora Lilita One e Nunito estão auto-hospedados em src/public/fonts/, nos subsets latin e latin-ext, com font-display: swap e preload dos dois arquivos latin. O Nunito é variável de 400 a 700, então um arquivo por subset cobre corpo, botão e número.

**Arquivos (20 arquivos, +311 −40):** `docs/ESTADO-DO-PROJETO.md` (+69 −5), `src/styles/fontes.css` (+65 −0), `docs/04-DESIGN-SYSTEM-E-LANDING.md` (+36 −5), `test/unit/mascote.test.js` (+36 −0), `src/config/mascote.js` (+22 −0), `src/views/partials/jogo-resultado.ejs` (+12 −9), `src/public/js/resultado.js` (+12 −6), `src/styles/tailwind.css` (+12 −6), `src/views/partials/ui/mascote.ejs` (+14 −0), `DESIGN.md` (+9 −2), `src/app.js` (+7 −0), `test/integration/telaDeResultado.test.js` (+6 −1), e mais 8 arquivos.

**Código atual:** `MASCOTES` em `src/config/mascote.js:16`.

```js
/**
 * Catálogo da arte da Beenie: o único lugar do projeto que sabe qual arquivo é
 * cada pose. A arte é provisória e vai ser substituída por ilustração própria em
 * SVG ou WebP, então trocar o desenho é mexer só aqui — a extensão não importa
 * para quem consome.
 *
 * Os PNG originais continuam em `src/public/img`: o WebP é gerado deles por
 * `npm run img:webp`, e é ele que vai para a tela.
 *
 * `largura` e `altura` são as do arquivo e existem para o navegador reservar o
 * espaço antes de baixar a imagem, o que evita salto de layout (RNF-03).
 *
 * A animação nunca entra neste mapa: ela vive na classe do tema
 * (`animate-float`), para que um desenho novo entre sem reescrever tela.
 */
export const MASCOTES = {
  acolhendo: {
    arquivo: '/img/beenie_howdy.webp',
    alt: 'Beenie acenando',
    largura: 612,
    altura: 812,
  },
  chamando: {
    arquivo: '/img/beenie_vem.webp',
    alt: 'Beenie chamando para começar',
    largura: 482,
    altura: 746,
  },
  entrando: {
    arquivo: '/img/beenie_login_render.webp',
    alt: 'Beenie na porta do Beever',
    largura: 1000,
    altura: 1017,
  },
};
```

### 119. `08c93c7` docs: a T-11.1 fechou o estado, a rastreabilidade e duas dívidas novas

*26/08/2026, Razawaky, tipo `docs`.*

A DT-71 foi paga: o caminho da arte da Beenie não está mais em seis views. Ficam duas dívidas registradas. A DT-73 é a arte em si — o design system promete cinco poses, existem três, e as três são PNG acima de 80 KB. A DT-74 é a medição que não foi feita: 86 KB de fonte com preload, mas o LCP de 2,5 s em 4G da RNF-03 não foi verificado.

**Arquivos (2 arquivos, +6 −1):** `docs/ESTADO-DO-PROJETO.md` (+4 −1), `docs/RASTREABILIDADE.md` (+2 −0).

### 120. `56ccddd` feat: o botão virou componente e a chama saiu do cabeçalho (T-11.2)

*26/08/2026, Razawaky, tipo `feat`.*

Quatro dos cinco componentes da tarefa já existiam das etapas anteriores. O que faltava era o mais repetido: as mesmas classes de botão estavam copiadas em 24 lugares, em 22 arquivos, e já tinham divergido — anel de foco âmbar em umas telas e tinta em outras, hover que levanta em umas e não em outras.

**Arquivos (29 arquivos, +277 −179):** `test/integration/componentesDaUi.test.js` (+78 −0), `src/views/partials/ui/botao.ejs` (+66 −0), `docs/ESTADO-DO-PROJETO.md` (+40 −3), `src/views/partials/ui/chama-sequencia.ejs` (+25 −0), `src/views/partials/ui/cabecalho-colmeia.ejs` (+2 −13), `docs/04-DESIGN-SYSTEM-E-LANDING.md` (+13 −1), `src/views/pages/cofre.ejs` (+2 −12), `src/views/pages/favo.ejs` (+8 −6), `src/views/pages/home.ejs` (+2 −12), `src/views/pages/metas.ejs` (+2 −12), `src/views/pages/perfil.ejs` (+6 −7), `src/views/pages/confirmar-compra.ejs` (+5 −7), e mais 17 arquivos.

**Código atual:** `pular` em `test/integration/componentesDaUi.test.js:24`.

```js
const pular = await motivoParaPular();
```

### 121. `8af98f8` feat: a landing ganhou primeira dobra, em superfície escura (T-11.3)

*26/08/2026, Razawaky, tipo `feat`.*

A landing deixou de morar dentro da casca clara do app. Ela tem cabeçalho próprio, com o logo branco e uma ação só, porque a superfície aqui é escura de propósito: entrar no app, que é claro, deve parecer acender a luz.

**Arquivos (15 arquivos, +393 −34):** `src/styles/landing.css` (+113 −0), `test/integration/landing.test.js` (+79 −0), `src/views/partials/landing/heroi.ejs` (+56 −0), `docs/ESTADO-DO-PROJETO.md` (+38 −3), `src/config/mascote.js` (+24 −4), `src/views/pages/home.ejs` (+11 −14), `src/views/partials/landing/cabecalho.ejs` (+25 −0), `src/views/partials/ui/mascote.ejs` (+11 −2), `src/views/partials/ui/botao.ejs` (+8 −4), `docs/04-DESIGN-SYSTEM-E-LANDING.md` (+8 −0), `test/integration/app.test.js` (+6 −2), `test/integration/componentesDaUi.test.js` (+5 −3), e mais 3 arquivos.

**Código atual:** `mostrar` em `src/controllers/homeController.js:4`.

```js
/** Landing page pública. Quem já está logado não precisa vê-la de novo. */
export function mostrar(req, res) {
  if (req.session?.usuarioId) {
    return res.redirect(req.session.onboardingConcluido ? '/painel' : '/onboarding');
  }

  // A landing tem cabeçalho e rodapé próprios, escuros: os do app são claros e
  // brigariam com a superfície da página.
  renderizarPagina(res, 'home', {
    titulo: 'Beever — educação financeira para crianças e adolescentes',
    classeBody: 'min-h-screen bg-breu text-cera antialiased',
    // O Lenis vem antes porque o `landing.js` usa o que ele publica. Os dois são
    // servidos pelo projeto: a CSP não aceita script de fora.
    scripts: ['/js/vendor/lenis.min.js', '/js/landing.js'],
  });
}
```

### 122. `6b8225c` feat: a landing ganhou rolagem suave com Lenis e parallax conduzido por ela

*26/08/2026, Razawaky, tipo `feat`.*

O docs/04 §6.3 exigia aprovação do usuário antes de adotar biblioteca de rolagem suave. A aprovação veio, com pedido de foco no Lenis e de uma landing bem dinâmica.

**Arquivos (13 arquivos, +283 −23):** `src/public/js/landing.js` (+91 −0), `docs/ESTADO-DO-PROJETO.md` (+39 −5), `src/styles/landing.css` (+37 −0), `package-lock.json` (+32 −0), `src/styles/lenis.css` (+26 −0), `src/views/partials/landing/heroi.ejs` (+16 −7), `docs/04-DESIGN-SYSTEM-E-LANDING.md` (+13 −7), `test/integration/landing.test.js` (+17 −2), `package.json` (+3 −1), `docs/RASTREABILIDADE.md` (+2 −1), `src/controllers/homeController.js` (+3 −0), `eslint.config.js` (+2 −0), e mais 1 arquivos.

**Código atual:** `ligarMovimento` em `src/public/js/landing.js:172`.

```js
function ligarMovimento() {
  const lenis = new globalThis.Lenis({
    // Um pouco mais longa que o padrão: a página é vitrine, e a rolagem
    // arrastada é justamente o efeito que se quer sentir.
    duration: 1.2,
    smoothWheel: true,
    // No celular a rolagem nativa é melhor: o dedo já dá a inércia, e mexer
    // nela atrapalha mais do que ajuda.
    syncTouch: false,
    // O próprio Lenis mantém o laço de quadros; um laço nosso seria um segundo
    // `requestAnimationFrame` fazendo a mesma coisa.
    autoRaf: true,
  });

  rolagemSuave = lenis;

  lenis.on('scroll', ({ scroll }) => {
    moverCamadas(scroll);
    marcarProgresso(scroll);
  });

  // A primeira marcação não espera a rolagem: quem chega no meio da página, por
  // uma âncora, já vê a coluna no ponto certo.
  marcarProgresso(window.scrollY);

  // Âncora com rolagem suave, e sem perder o teclado: o destino recebe foco
  // depois da viagem, senão quem navega por Tab volta para o começo da página.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (evento) => {
      const destino = document.querySelector(link.getAttribute('href'));
      if (!destino) return;

      evento.preventDefault();
      lenis.scrollTo(destino, {
        offset: -80,
        onComplete: () => {
          destino.setAttribute('tabindex', '-1');
          destino.focus({ preventScroll: true });
        },
      });
    });
  });
}
```

### 123. `9793318` feat: a landing ganhou as seis seções de conteúdo (T-11.4)

*26/08/2026, Razawaky, tipo `feat`.*

Na ordem da RF-LAN-03: o problema, como funciona, a trilha, os jogos, a economia e a sequência. Cada seção tem âncora própria, para o menu que a T-11.6 vai precisar, e entra pela revelação que a tarefa anterior deixou pronta.

**Arquivos (11 arquivos, +527 −5):** `src/public/js/landing.js` (+77 −0), `src/views/partials/landing/jogos.ejs` (+72 −0), `src/views/partials/landing/economia.ejs` (+65 −0), `src/views/partials/landing/porque.ejs` (+62 −0), `src/views/partials/landing/sequencia.ejs` (+60 −0), `src/views/partials/landing/trilha.ejs` (+60 −0), `src/views/partials/landing/como-funciona.ejs` (+46 −0), `docs/ESTADO-DO-PROJETO.md` (+38 −3), `test/integration/landing.test.js` (+36 −0), `src/views/pages/home.ejs` (+8 −2), `docs/RASTREABILIDADE.md` (+3 −0).

**Código atual:** `ligarMiniQuiz` em `src/public/js/landing.js:146`.

```js
/**
 * O mini quiz da seção dos jogos: uma pergunta, resposta na hora, nada enviado a
 * servidor nenhum. Errar não fecha a pergunta — a resposta explica e as opções
 * continuam disponíveis, que é a regra de erro do design system.
 */
function ligarMiniQuiz() {
  const resposta = document.getElementById('mini-quiz-resposta');
  const opcoes = Array.from(document.querySelectorAll('.mini-quiz-opcao'));
  if (!resposta || opcoes.length === 0) return;

  const EXPLICACOES = {
    certa: 'Isso mesmo. O mel gasto no patinete sai da conta da casa — e é essa escolha que o jogo ensina a enxergar.',
    errada: 'Ainda não. Comprar agora tira mel da meta maior: a casa continua custando 300, e você volta a zero.',
  };

  opcoes.forEach((opcao) => {
    opcao.addEventListener('click', () => {
      const acertou = opcao.dataset.certa === 'true';

      opcoes.forEach((outra) => outra.classList.remove('border-mel', 'border-erro'));
      opcao.classList.add(acertou ? 'border-mel' : 'border-erro');

      resposta.textContent = acertou ? EXPLICACOES.certa : EXPLICACOES.errada;
      resposta.classList.remove('hidden');
    });
  });
}
```

### 124. `c897755` feat: a landing ganhou a coluna de mel que enche com a rolagem (T-11.5)

*26/08/2026, Razawaky, tipo `feat`.*

Metade desta tarefa já estava paga: revelação, parallax e rolagem suave entraram com o Lenis, na T-11.3. O que faltava era o elemento-assinatura da seção 6.1. A coluna tem três camadas de responsabilidade. O trilho desenha os hexágonos vazios com um SVG repetido, o preenchimento é uma faixa em degradê de mel para néctar, e uma máscara com as mesmas formas recorta o mel para ele só aparecer dentro dos favos. O que se move é transform: scaleY, alimentado pela variável --mel que o landing.js escreve a cada quadro.

**Arquivos (13 arquivos, +293 −12):** `test/integration/movimentoDaLanding.test.js` (+82 −0), `src/styles/landing.css` (+70 −0), `src/public/js/landing.js` (+52 −1), `docs/ESTADO-DO-PROJETO.md` (+35 −3), `src/views/partials/landing/coluna-de-mel.ejs` (+32 −0), `src/views/partials/landing/economia.ejs` (+7 −3), `docs/04-DESIGN-SYSTEM-E-LANDING.md` (+7 −0), `src/views/partials/landing/trilha.ejs` (+2 −2), `docs/RASTREABILIDADE.md` (+2 −0), `src/views/partials/landing/como-funciona.ejs` (+1 −1), `src/views/partials/landing/jogos.ejs` (+1 −1), `src/views/partials/landing/porque.ejs` (+1 −1), e mais 1 arquivos.

**Código atual:** `ligarFavosDaTrilha` em `src/public/js/landing.js:73`.

```js
/**
 * Os favos da trilha acendem um a um quando a seção entra, e não todos juntos:
 * é a trilha se construindo, que é exatamente o que o produto faz.
 */
function ligarFavosDaTrilha() {
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;

        const favos = Array.from(entrada.target.querySelectorAll('.favo-acende'));
        favos.forEach((favo, posicao) => {
          setTimeout(() => favo.classList.add('aceso'), posicao * 160);
        });

        observador.unobserve(entrada.target);
      }
    },
    { threshold: 0.35 },
  );

  const secoes = new Set(favosQueAcendem.map((favo) => favo.closest('section')).filter(Boolean));
  secoes.forEach((secao) => observador.observe(secao));
}
```

### 125. `abc2d5e` feat: a landing fechou com pais, perguntas, rodapé e a política de privacidade (T-11.6)

*26/08/2026, Razawaky, tipo `feat`.*

As dez seções da RF-LAN-03 estão de pé. Faltavam quatro: a seção para responsáveis e escolas, as perguntas, a chamada final e o rodapé. O usuário pediu as duas opções do checkpoint sobre a seção de responsáveis, e as duas foram entregues em lugares diferentes. Na landing, a seção afirma só o que o código sustenta: quais dados são pedidos, o consentimento registrado com data a senha em hash, nenhum anúncio e nenhum dinheiro real. O documento completo virou página própria em /privacidade.

**Arquivos (17 arquivos, +596 −11):** `src/views/pages/privacidade.ejs` (+150 −0), `src/views/partials/landing/pais-e-escolas.ejs` (+79 −0), `src/views/partials/landing/rodape.ejs` (+78 −0), `test/integration/privacidade.test.js` (+68 −0), `src/views/partials/landing/perguntas.ejs` (+50 −0), `docs/ESTADO-DO-PROJETO.md` (+41 −3), `test/integration/landing.test.js` (+33 −1), `src/views/partials/landing/chamada-final.ejs` (+32 −0), `src/views/partials/landing/cabecalho.ejs` (+22 −1), `src/config/env.js` (+11 −0), `src/views/pages/home.ejs` (+8 −2), `src/controllers/paginaController.js` (+9 −0), e mais 5 arquivos.

**Código atual:** `env` em `src/config/env.js:26`.

```js
export const env = {
  ambiente,
  producao: ambiente === 'production',
  teste: ambiente === 'test',
  porta: inteiro(process.env.PORT, 3000),

  banco: {
    host: process.env.DB_HOST,
    porta: inteiro(process.env.DB_PORT, 3306),
    usuario: process.env.DB_USER,
    senha: process.env.DB_PASSWORD,
    nome: process.env.DB_NAME,
    // Vinte, e não dez nem trinta: medido na T-14.3 com 30 jogadores chegando
    // ao mesmo tempo. Dez põe fila na aplicação e estoura o teto da RNF-01;
    // trinta ou mais troca essa fila por disputa dentro do MySQL e piora.
    limitePool: inteiro(process.env.DB_POOL_LIMIT, 20),
  },

  sessao: {
    segredo: process.env.SESSION_SECRET,
    duracaoMs: inteiro(process.env.SESSION_MAX_AGE_MINUTES, 20) * 60 * 1000,
  },

  log: {
    nivel: process.env.LOG_LEVEL ?? (ambiente === 'production' ? 'info' : 'debug'),
  },

  // Endereço que a política de privacidade publica para pedidos de acesso e
  // exclusão de dados (Art. 18 da LGPD). Vem do ambiente porque muda de quem
  // hospeda, e porque publicar e-mail errado numa política é pior que não ter.
  emailDeContato: process.env.CONTACT_EMAIL ?? 'contato@beever.local',

  // Ilustrações enviadas pelo painel administrativo. A pasta fica fora de
  // `src/public` porque é conteúdo, não código: numa imagem de contêiner ela
  // precisa ser volume, senão a arte some no próximo deploy.
  uploads: {
    diretorio: process.env.UPLOADS_DIR ?? 'uploads',
    limiteEmBytes: inteiro(process.env.UPLOAD_MAX_MB, 8) * 1024 * 1024,
  },

  // Base dos links enviados por e-mail. Vem daqui, e não do cabeçalho Host,
  // porque o Host é escrito por quem faz a requisição e poderia apontar o link
  // para outro site.
  urlDaAplicacao: process.env.APP_URL ?? 'http://localhost:3000',

  email: {
    host: process.env.SMTP_HOST ?? '',
    porta: inteiro(process.env.SMTP_PORT, 587),
    usuario: process.env.SMTP_USER ?? '',
    senha: process.env.SMTP_PASSWORD ?? '',
    remetente: process.env.MAIL_FROM ?? 'Beever <nao-responda@beever.local>',
  },

  // Login com Google. Opcional: sem as duas chaves o botão simplesmente não aparece.
  google: {
    idDoCliente: process.env.GOOGLE_CLIENT_ID ?? '',
    segredoDoCliente: process.env.GOOGLE_CLIENT_SECRET ?? '',
  },
};
```

### 126. `698a65e` feat: a E11 fechou com acessibilidade para daltonismo, TDAH e autismo (T-11.7)

*26/08/2026, Razawaky, tipo `feat`.*

O usuário ampliou a régua da tarefa: acessibilidade aqui precisa servir também daltonismo, TDAH e autismo. Isso virou seção 7.0 do design system e, mais importante, virou teste.

**Arquivos (22 arquivos, +513 −24):** `test/unit/contraste.test.js` (+149 −0), `test/integration/acessibilidadeDaLanding.test.js` (+140 −0), `src/public/js/landing.js` (+56 −0), `docs/ESTADO-DO-PROJETO.md` (+45 −6), `docs/MEDICAO-DE-PERFORMANCE.md` (+45 −0), `docs/04-DESIGN-SYSTEM-E-LANDING.md` (+28 −0), `src/views/partials/landing/rodape.ejs` (+20 −1), `src/styles/tailwind.css` (+11 −7), `src/config/mascote.js` (+6 −3), `test/integration/landing.test.js` (+3 −1), `docs/RASTREABILIDADE.md` (+3 −0), `package.json` (+2 −1), e mais 10 arquivos.

**Código atual:** `rolagemSuave` em `src/public/js/landing.js:170`.

```js
// Guardada porque o painel de acessibilidade precisa pausá-la e retomá-la.
let rolagemSuave = null;
```

### 127. `b4eb24f` feat: painel de acessibilidade em toda tela, com o modo normal intocado (T-11.8)

*26/08/2026, Razawaky, tipo `feat`.*

O usuário pediu um controle que ligue as adaptações de acessibilidade, deixando o modo normal sem afetar imagem, cor, animação, navegação nem enquadramento, e um caminho que ligue tudo de uma vez.

**Arquivos (13 arquivos, +439 −95):** `src/public/js/acessibilidade.js` (+112 −0), `src/views/partials/ui/acessibilidade.ejs` (+103 −0), `src/styles/acessibilidade.css` (+93 −0), `src/public/js/landing.js` (+14 −45), `test/integration/acessibilidadeDaLanding.test.js` (+34 −16), `docs/ESTADO-DO-PROJETO.md` (+39 −3), `docs/04-DESIGN-SYSTEM-E-LANDING.md` (+19 −5), `src/views/partials/landing/rodape.ejs` (+0 −19), `test/integration/movimentoDaLanding.test.js` (+12 −6), `src/views/layout.ejs` (+5 −0), `test/integration/app.test.js` (+4 −1), `src/styles/tailwind.css` (+3 −0), e mais 1 arquivos.

**Código atual:** `aplicar` em `src/public/js/acessibilidade.js:44`.

```js
/** Aplica a escolha no documento e nas chaves do painel, de uma vez só. */
function aplicar(escolha) {
  for (const [nome, classe] of Object.entries(AJUSTES)) {
    document.documentElement.classList.toggle(classe, Boolean(escolha[nome]));
  }

  chaves.forEach((chave) => {
    const ligado = Boolean(escolha[chave.dataset.ajuste]);
    chave.setAttribute('aria-pressed', String(ligado));
    // Marca em forma, e não só em cor: quem não distingue as duas precisa ver
    // a diferença do mesmo jeito.
    chave.querySelector('.acessibilidade-marca').textContent = ligado ? '☑' : '☐';
  });

  // O CSS dá conta de animação e transição, mas rolagem suave é JavaScript: o
  // `landing.js` escuta este aviso para pausar ou retomar o Lenis.
  document.dispatchEvent(
    new CustomEvent('beever:movimento', { detail: { reduzido: Boolean(escolha.movimento) } }),
  );

  const ligados = Object.keys(AJUSTES).filter((nome) => escolha[nome]).length;
  aviso.textContent =
    ligados === 0
      ? 'Modo normal.'
      : `${ligados} ${ligados === 1 ? 'ajuste ligado' : 'ajustes ligados'}. A escolha fica guardada neste navegador.`;
}
```

### 128. `603c032` fix: a auditoria da E11 fechou oito das nove lacunas

*26/08/2026, Razawaky, tipo `fix`.*

O laudo está em docs/11-AUDITORIA-DA-ETAPA.md, com veredito "pode avançar". A bloqueante (L-1) nasceu da própria tarefa que fechou a etapa: se a página abrisse com movimento reduzido, os observadores de revelação nunca eram criados e religar o movimento pelo painel escondia as seções que ainda não tinham aparecido, sem ninguém para revelá-las. Agora os observadores existem sempre, e só a rolagem suave e o parallax dependem da escolha. O contador ganhou verificação própria, porque número que sobe é movimento feito em JavaScript e o CSS não o desliga.

**Arquivos (12 arquivos, +272 −34):** `docs/11-AUDITORIA-DA-ETAPA.md` (+90 −0), `src/public/js/landing.js` (+34 −18), `docs/ESTADO-DO-PROJETO.md` (+45 −3), `test/integration/acessibilidadeDaLanding.test.js` (+40 −4), `src/styles/landing.css` (+22 −0), `src/views/partials/ui/acessibilidade.ejs` (+11 −3), `src/views/pages/perfil.ejs` (+10 −1), `src/views/layout.ejs` (+6 −3), `src/views/pages/login.ejs` (+7 −1), `src/utils/pagina.js` (+4 −0), `src/controllers/paginaController.js` (+2 −0), `src/views/partials/header.ejs` (+1 −1).

**Código atual:** `aplicarMovimento` em `src/public/js/landing.js:226`.

```js
/**
 * Liga o movimento, ou o desliga, a qualquer momento.
 *
 * A revelação, os contadores e os favos são ligados uma vez só, sempre — mesmo
 * com o movimento desligado. É o que impede o pior defeito possível aqui: se os
 * observadores só existissem quando a página abre com movimento, religar pelo
 * painel esconderia todas as seções que ainda não tinham aparecido, e elas
 * nunca voltariam sem recarregar. O estado escondido é de CSS; o observador
 * precisa existir de qualquer forma.
 */
function aplicarMovimento(reduzido) {
  document.documentElement.classList.toggle('landing-com-movimento', !reduzido);

  if (reduzido) {
    rolagemSuave?.stop();
    return;
  }

  // A rolagem suave é cara e só nasce quando é usada pela primeira vez.
  if (rolagemSuave) rolagemSuave.start();
  else ligarMovimento();
}
```

### 129. `bb228b9` docs: o estado registra onde a sessão parou e o que espera alguém

*26/08/2026, Razawaky, tipo `docs`.*

A E11 está fechada e auditada, mas três coisas dependem de pessoa, não de código: medir a landing em navegador (é o próprio aceite da etapa), o passe de olho humano da DT-22, e as duas decisões de produto — o texto das seções e a revisão jurídica da política de privacidade.

**Arquivos (1 arquivo, +31 −0):** `docs/ESTADO-DO-PROJETO.md` (+31 −0).

## 27 de agosto de 2026

### 130. `f82da43` feat: a área administrativa ganhou porta própria (T-12.1)

*27/08/2026, Razawaky, tipo `feat`.*

A E12 abre pela autenticação. Metade do que a tarefa pede já existia: a tabela `admins`, o join no login e o `requireAdmin` lendo o resultado da sessão. Faltava o que a RF-ADM-01 pede de fato — um login administrativo separado — e faltava a área ter endereço próprio em vez de uma rota solta protegida à mão.

**Arquivos (17 arquivos, +611 −21):** `test/integration/adminAcesso.test.js` (+149 −0), `docs/ESTADO-DO-PROJETO.md` (+73 −11), `test/unit/requireAdmin.test.js` (+72 −0), `src/controllers/adminController.js` (+61 −0), `src/views/pages/admin/login.ejs` (+43 −0), `src/views/pages/admin/painel.ejs` (+38 −0), `src/views/pages/admin/usuarios.ejs` (+36 −0), `src/views/partials/admin/casca.ejs` (+34 −0), `src/services/adminService.js` (+32 −0), `src/routes/admin.js` (+31 −0), `src/repositories/adminsRepository.js` (+20 −0), `src/middlewares/requireAdmin.js` (+10 −2), e mais 5 arquivos.

**Código atual:** `login` em `src/controllers/adminController.js:25`.

```js
export const login = assincrono(async (req, res) => {
  const { email, senha } = req.body;
  const admin = await adminService.autenticarAdmin({ email, senha });

  await iniciarSessaoLogin(req, {
    usuarioId: admin.id,
    email: admin.email,
    ehAdmin: admin.ehAdmin,
    perfilId: admin.perfilId,
    onboardingConcluido: admin.onboardingConcluido,
  });

  if (querJson(req)) return res.json(admin);
  res.redirect('/admin');
});
```

### 131. `97bbb1a` feat: o administrador cadastra a trilha sem programador no meio (T-12.2)

*27/08/2026, Razawaky, tipo `feat`.*

Os três repositories da trilha eram só de leitura desde a E05 — todo o conteúdo do jogo tinha nascido do seed. Esta tarefa é a primeira escrita em `hives`, `cells` e `contents`, e ela entra pelo painel: favo, célula e conteúdo ganham CRUD sob `/admin/favos`.

**Arquivos (17 arquivos, +1471 −11):** `test/integration/adminConteudo.test.js` (+316 −0), `src/services/adminContentService.js` (+220 −0), `src/controllers/adminContentController.js` (+150 −0), `src/repositories/cellsRepository.js` (+107 −1), `src/views/pages/admin/celulas.ejs` (+89 −0), `src/views/pages/admin/favo-formulario.ejs` (+86 −0), `src/repositories/hivesRepository.js` (+83 −1), `src/routes/admin.js` (+81 −1), `src/views/pages/admin/celula-formulario.ejs` (+82 −0), `src/views/pages/admin/favos.ejs` (+58 −0), `src/views/pages/admin/conteudo-formulario.ejs` (+54 −0), `docs/ESTADO-DO-PROJETO.md` (+46 −4), e mais 5 arquivos.

**Código atual:** `criarCelula` em `src/services/adminContentService.js:133`.

```js
/**
 * A célula herda a faixa do favo (RN-029).
 *
 * Não é campo de formulário porque a escolha não existe de verdade: as consultas
 * da trilha filtram por faixa, então célula de outra faixa dentro do favo
 * simplesmente não aparece para ninguém — o administrador cadastrava e nada
 * acontecia, sem aviso.
 */
export async function criarCelula(idFavo, dados, ator) {
  const favo = await exigirFavo(idFavo);
  const ordem = (await cellsRepository.ultimaOrdemDoFavo(favo.id)) + 1;

  const id = await cellsRepository.criar({
    idFavo: favo.id,
    idTipoDeJogo: dados.idTipoDeJogo,
    idFaixa: favo.age_band_id,
    ordem,
    titulo: dados.titulo,
    segundosEstimados: dados.segundosEstimados ?? DURACAO_PADRAO_EM_SEGUNDOS,
  });

  await auditService.registrar(ator, 'celula.criada', {
    entidade: 'cell',
    id,
    depois: { favo: favo.id, titulo: dados.titulo, ordem },
  });
  return id;
}
```

### 132. `e619231` feat: o catálogo da loja passou a ser cadastrado pelo painel (T-12.3)

*27/08/2026, Razawaky, tipo `feat`.*

A tarefa carregava três das quatro decisões de modelagem adiadas na abertura da E12, e duas foram tomadas. A arte do item mora numa pasta servida como estática, com o caminho em `items.image_path` (migration 017). Guardar bytes no banco faria o backup engordar com imagem e transformaria cada card da vitrine numa consulta. Variação cosmética continua sem tabela, de propósito: modelar isso agora mexeria em loja, compra, inventário e patrimônio, as quatro peças que a E09 fechou e testou.

**Arquivos (24 arquivos, +1911 −18):** `package-lock.json` (+732 −0), `test/integration/adminItens.test.js` (+245 −0), `src/repositories/itemsRepository.js` (+163 −2), `src/views/pages/admin/item-formulario.ejs` (+150 −0), `src/services/adminItemsService.js` (+143 −0), `src/controllers/adminItemsController.js` (+96 −0), `src/config/uploads.js` (+65 −0), `src/views/pages/admin/itens.ejs` (+64 −0), `docs/ESTADO-DO-PROJETO.md` (+48 −4), `test/unit/adminItemsService.test.js` (+44 −0), `src/routes/admin.js` (+34 −0), `scripts/seed.js` (+32 −0), e mais 12 arquivos.

**Código atual:** `atualizar` em `src/repositories/itemsRepository.js:202`.

```js
/** COALESCE mantém o valor atual quando o campo não é enviado — vale para a imagem. */
export async function atualizar(id, dados, conexao = null) {
  await consultarEm(
    conexao,
    `UPDATE items
        SET slug                = COALESCE(?, slug),
            name                = COALESCE(?, name),
            description_kid     = COALESCE(?, description_kid),
            image_path          = COALESCE(?, image_path),
            category_id         = COALESCE(?, category_id),
            price               = COALESCE(?, price),
            counts_in_patrimony = COALESCE(?, counts_in_patrimony),
            valuation_rate      = COALESCE(?, valuation_rate),
            valuation_floor_pct = COALESCE(?, valuation_floor_pct),
            valuation_cap_pct   = COALESCE(?, valuation_cap_pct),
            upkeep_cost         = COALESCE(?, upkeep_cost),
            income_per_cycle    = COALESCE(?, income_per_cycle),
            upgrade_of_item_id  = ?,
            is_consumable       = COALESCE(?, is_consumable)
      WHERE id = ? AND deleted_at IS NULL`,
    [
      dados.slug,
      dados.nome,
      dados.descricaoInfantil,
      dados.caminhoDaImagem,
      dados.idCategoria,
      dados.preco,
      dados.contaNoPatrimonio === null ? null : dados.contaNoPatrimonio ? 1 : 0,
      dados.taxaDeValorizacao,
      dados.pisoPercentual,
      dados.tetoPercentual,
      dados.custoFixo,
      dados.rendaPorCiclo,
      // Sem COALESCE de propósito: desfazer a linha de evolução é enviar vazio,
      // e com COALESCE o campo em branco seria lido como "não mexer".
      dados.idItemDeOrigem,
      dados.ehConsumivel === null ? null : dados.ehConsumivel ? 1 : 0,
      id,
    ],
  );
}
```

### 133. `4588e02` feat: a atividade deixou de ser JSON colado e virou formulário (T-12.4)

*27/08/2026, Razawaky, tipo `feat`.*

A tarefa entrou com um conflito escrito no próprio roadmap: a linha da tabela prometia "os tipos de jogo que já existem", e o parágrafo do escopo acordado listava também listas suspensas e quadrinho interativo que não existiam. Perguntado, o usuário mandou fazer os dois formatos por inteiro, com mídia só de imagem.

**Arquivos (32 arquivos, +1527 −50):** `test/integration/adminAtividades.test.js` (+287 −0), `src/services/atividadesDoPainel.js` (+218 −0), `src/public/js/quadrinho.js` (+129 −0), `src/services/validadoresDeJogo.js` (+124 −1), `test/unit/atividadesDoPainel.test.js` (+123 −0), `src/public/js/listas.js` (+98 −0), `src/views/pages/admin/conteudo-formulario.ejs` (+53 −24), `docs/ESTADO-DO-PROJETO.md` (+54 −4), `scripts/seeds/05_demo_content.sql` (+55 −0), `src/views/partials/admin/atividade/arraste-e-classifique.ejs` (+47 −0), `src/views/partials/admin/atividade/campos.ejs` (+35 −0), `src/views/partials/admin/atividade/quadrinho-interativo.ejs` (+33 −0), e mais 20 arquivos.

**Código atual:** `construtores` em `src/services/atividadesDoPainel.js:55`.

```js
const construtores = {
  'quiz-do-favo'(campos) {
    const perguntas = linhas(
      {
        enunciado: campos.perguntaEnunciado,
        alternativas: campos.perguntaAlternativas,
        correta: campos.perguntaCorreta,
      },
      'enunciado',
    );

    return {
      perguntas: perguntas.map((pergunta) => ({
        enunciado: pergunta.enunciado.trim(),
        alternativas: opcoesDoTexto(pergunta.alternativas),
        correta: indiceDaCerta(pergunta.correta),
      })),
    };
  },

  'arraste-e-classifique'(campos) {
    // A carta aponta a caixa pelo número da linha, e não pelo identificador: sem
    // JavaScript a tela não teria como oferecer uma lista das caixas digitadas.
    const caixas = linhas({ nome: campos.categoriaNome }, 'nome');
    const categorias = caixas.map((caixa) => ({
      id: slugDeTexto(caixa.nome, 30),
      nome: caixa.nome.trim(),
    }));

    const cartas = linhas({ texto: campos.cartaTexto, caixa: campos.cartaCaixa }, 'texto');

    return {
      enunciado: String(campos.enunciado ?? '').trim(),
      categorias,
      cartas: cartas.map((carta) => ({
        texto: carta.texto.trim(),
        categoria: categorias[inteiro(carta.caixa) - 1]?.id ?? '',
      })),
    };
  },

  'monte-o-orcamento'(campos) {
    const categorias = linhas(
      {
        nome: campos.categoriaNome,
        minimo: campos.categoriaMinimo,
        maximo: campos.categoriaMaximo,
        dica: campos.categoriaDica,
      },
      'nome',
    );

    return {
      enunciado: String(campos.enunciado ?? '').trim(),
      total: inteiro(campos.total),
      passo: inteiro(campos.passo),
      categorias: categorias.map((categoria) => ({
        id: slugDeTexto(categoria.nome, 30),
        nome: categoria.nome.trim(),
        minimo: inteiro(categoria.minimo),
  // … continua até a linha 204 do arquivo
```

### 134. `ae82688` feat: a célula ganhou acervo e a partida sorteia a atividade (T-12.5)

*27/08/2026, Razawaky, tipo `feat`.*

Última das quatro decisões de modelagem adiadas na abertura da etapa, e ela começou com um conflito que precisava ser dito: o sorteio não está escrito em requisito nenhum, vem da conversa de escopo de 2026-08-25 enquanto RN-025 a RN-027 descrevem uma trilha determinística. A tarefa foi feita sem inventar requisito: a ordem das células continua fixa, e o que sorteia é qual atividade daquela célula aparece. A lacuna virou DT-91.

**Arquivos (16 arquivos, +635 −38):** `test/integration/sorteioDaAtividade.test.js` (+280 −0), `docs/ESTADO-DO-PROJETO.md` (+50 −4), `src/views/pages/admin/conteudo-formulario.ejs` (+34 −8), `src/services/gameSessionService.js` (+33 −8), `test/unit/sorteioDeConteudo.test.js` (+40 −0), `src/repositories/contentsRepository.js` (+37 −0), `src/services/adminContentService.js` (+33 −4), `src/repositories/gameSessionsRepository.js` (+26 −5), `src/views/partials/admin/publicacao.ejs` (+26 −0), `migrations/018_conteudo_da_partida.sql` (+21 −0), `src/services/sorteioDeConteudo.js` (+20 −0), `src/controllers/adminContentController.js` (+13 −2), e mais 4 arquivos.

**Código atual:** `listarAcervoDaCelula` em `src/repositories/contentsRepository.js:25`.

```js
/**
 * O acervo da célula: todas as atividades ativas dela, da mais nova para a mais
 * velha (T-12.5).
 *
 * Publicar substituindo aposenta as anteriores e deixa uma só; publicar somando
 * ao acervo mantém as outras ativas, e é este conjunto que a partida sorteia.
 */
export async function listarAcervoDaCelula(idCelula) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM contents ct
      WHERE ct.cell_id = ? AND ${ATIVO}
      ORDER BY ct.version DESC`,
    [idCelula],
  );
}
```

### 135. `bf05053` feat: a trilha de auditoria ganhou como ser lida (T-12.6)

*27/08/2026, Razawaky, tipo `feat`.*

A trilha existia e era sólida desde a E06: imutável por gatilho, com ator, entidade, antes/depois, hash de IP e id de requisição, escrita por oito services. O que não existia era como ler — o repository tinha uma consulta só, por entidade, e nenhuma tela.

**Arquivos (13 arquivos, +811 −8):** `test/integration/adminAuditoria.test.js` (+225 −0), `src/views/pages/admin/auditoria.ejs` (+162 −0), `src/services/adminAuditService.js` (+110 −0), `src/repositories/auditLogsRepository.js` (+87 −1), `test/unit/adminAuditService.test.js` (+60 −0), `docs/ESTADO-DO-PROJETO.md` (+49 −4), `src/controllers/adminAuditController.js` (+41 −0), `src/routes/admin.js` (+21 −1), `migrations/019_indices_da_auditoria.sql` (+20 −0), `src/views/pages/admin/painel.ejs` (+15 −2), `src/utils/limite.js` (+14 −0), `src/views/partials/admin/casca.ejs` (+5 −0), e mais 1 arquivos.

**Código atual:** `exportarCsv` em `src/services/adminAuditService.js:121`.

```js
/**
 * O mesmo recorte, em CSV, para o resultado sair da tela — a trilha é material
 * de defesa do TCC, e ler cem linhas numa página não é o mesmo que ter o arquivo.
 */
export async function exportarCsv(recebido = {}) {
  const filtros = filtrosDaConsulta(recebido);
  const linhas = await auditLogsRepository.listarComFiltros(filtros, {
    limite: LIMITE_DO_CSV,
    maximo: LIMITE_DO_CSV,
  });

  const cabecalho = ['id', 'quando', 'ator_tipo', 'ator_id', 'acao', 'entidade', 'entidade_id', 'request_id'];
  const corpo = linhas.map((linha) => [
    linha.id,
    new Date(linha.created_at).toISOString(),
    linha.ator_tipo,
    linha.actor_id ?? '',
    linha.action,
    linha.entity_type,
    linha.entity_id ?? '',
    linha.request_id ?? '',
  ]);

  return [cabecalho, ...corpo].map((colunas) => colunas.map(paraCampoCsv).join(',')).join('\n');
}
```

### 136. `94f02bd` fix: a auditoria da E12 fechou as dez lacunas do laudo

*27/08/2026, Razawaky, tipo `fix`.*

Duas impediam declarar a etapa concluída. A primeira era de privacidade. O expurgo apagava a conta e escrevia apelido e e-mail no `antes` da linha de auditoria — numa tabela append-only, o dado pessoal sobrevivia à exclusão para sempre, que é o oposto do que a RN-053 promete. A linha passou a guardar só o agregado: dias de inatividade e se a conta tinha perfil. O rastro de que ela existiu continua, e é para isso que `audit_logs` não tem chave estrangeira para `users`. O `limpezaService` ganhou o teste que nunca teve.

**Arquivos (27 arquivos, +734 −50):** `test/integration/lacunasDaAuditoriaDaE12.test.js` (+376 −0), `docs/ESTADO-DO-PROJETO.md` (+58 −7), `src/services/adminAuditService.js` (+49 −4), `src/services/adminService.js` (+31 −1), `src/routes/admin.js` (+24 −2), `src/services/adminContentService.js` (+19 −3), `src/views/pages/admin/celula-formulario.ejs` (+6 −15), `src/views/pages/admin/usuarios.ejs` (+20 −0), `src/services/adminItemsService.js` (+18 −0), `migrations/020_ordem_unica_do_favo.sql` (+17 −0), `src/repositories/usersRepository.js` (+12 −5), `src/middlewares/rateLimiters.js` (+16 −0), e mais 15 arquivos.

**Código atual:** `consultar` em `src/services/adminAuditService.js:87`.

```js
export async function consultar(recebido = {}) {
  const filtros = filtrosDaConsulta(recebido);
  const total = await auditLogsRepository.contarComFiltros(filtros);
  const pagina = paginacao(recebido.pagina, total);

  const [linhas, acoes] = await Promise.all([
    auditLogsRepository.listarComFiltros(filtros, {
      limite: pagina.porPagina,
      deslocamento: pagina.deslocamento,
    }),
    auditLogsRepository.listarAcoes(),
  ]);

  const semDadoPessoal = linhas.map((linha) => ({
    ...linha,
    before_state: mascararDadoPessoal(linha.before_state),
    after_state: mascararDadoPessoal(linha.after_state),
  }));

  return {
    linhas: semDadoPessoal,
    acoes,
    filtros,
    pagina,
    tiposDeAtor: TIPOS_DE_ATOR,
    // A tela avisa quando o recorte não cabe inteiro no CSV.
    limiteDoCsv: LIMITE_DO_CSV,
  };
}
```

### 137. `c0c4303` feat: o painel administrativo virou dashboard de métricas (T-12.7)

*27/08/2026, Razawaky, tipo `feat`.*

Última tarefa da E12, P1 e cortável. O trabalho não estava na tela: estava em onde os números moram. As quatro métricas da RF-ADM-04 batem nas tabelas que mais crescem — uma linha por partida, uma por compra, uma por dia de cada jogador — e todos os índices delas começam por `user_id` porque nasceram para responder "o que este jogador fez". O painel pergunta o contrário, e nenhuma das quatro tinha por onde começar a não ser varrendo. A migration 021 acrescentou índice de data às três, com a coluna de agrupamento junto.

**Arquivos (11 arquivos, +739 −15):** `test/integration/adminMetricas.test.js` (+210 −0), `src/views/partials/admin/metricas.ejs` (+126 −0), `src/services/adminMetricsService.js` (+113 −0), `test/unit/adminMetricsService.test.js` (+97 −0), `src/repositories/metricsRepository.js` (+94 −0), `docs/ESTADO-DO-PROJETO.md` (+51 −6), `migrations/021_indices_das_metricas.sql` (+28 −0), `src/controllers/adminController.js` (+8 −2), `src/views/pages/admin/painel.ejs` (+3 −6), `src/routes/admin.js` (+7 −1), `docs/RASTREABILIDADE.md` (+2 −0).

**Código atual:** `metricasDoPeriodo` em `src/services/adminMetricsService.js:64`.

```js
export async function metricasDoPeriodo(diasPedidos, agora = new Date()) {
  const dias = periodoEmDias(diasPedidos);
  const { de, ate } = intervaloDoPeriodo(dias, agora);

  // Em paralelo porque nenhuma depende da outra: quatro consultas agregadas
  // esperando uma pela outra somariam o tempo de todas no teto da RNF-01.
  const [jogadoresAtivos, conclusoes, porDia, itens, desfechos] = await Promise.all([
    metricsRepository.contarJogadoresAtivos(de, ate),
    metricsRepository.contarConclusoes(de, ate),
    metricsRepository.conclusoesPorDia(de, ate),
    metricsRepository.itensMaisComprados(de, ate),
    metricsRepository.desfechosDosDiasMarcados(de, ate),
  ]);

  return {
    dias,
    periodos: PERIODOS_EM_DIAS,
    jogadoresAtivos,
    conclusoes: conclusoes.conclusoes,
    celulasTocadas: conclusoes.celulas,
    itensMaisComprados: itens,
    retencao: retencaoDosDiasMarcados(desfechos),
    grafico: barrasDoGrafico(porDia),
    alturaDoGrafico: ALTURA_DO_GRAFICO,
  };
}
```

### 138. `dab4df3` feat: a conquista passou a declarar o que destrava ela (T-13.1)

*27/08/2026, Razawaky, tipo `feat`.*

A E13 abriu com um achado que mudou o desenho da tarefa. As quatro tabelas de gamificação existem desde a E01 e o `achievementsService` funciona — só que `achievements` não tinha critério nenhum. O desbloqueio funcionava porque o `streakService` montava o slug com o número dentro (`sequencia-${dias}`), e o slug carregava a regra por coincidência. Isso não se estende às outras quatro famílias que a RF-GAM-01 pede: `favo-3` não diz "três favos concluídos", e nada no banco diria.

**Arquivos (11 arquivos, +573 −44):** `test/integration/catalogoDeConquistas.test.js` (+157 −0), `test/unit/criteriosDeConquista.test.js` (+81 −0), `src/services/criteriosDeConquista.js` (+68 −0), `docs/ESTADO-DO-PROJETO.md` (+61 −3), `scripts/seeds/08_achievements.sql` (+51 −12), `src/services/achievementsService.js` (+46 −3), `src/repositories/achievementsRepository.js` (+46 −1), `src/services/streakService.js` (+15 −19), `migrations/022_criterio_da_conquista.sql` (+30 −0), `test/integration/marcoDeSequencia.test.js` (+16 −6), `docs/RASTREABILIDADE.md` (+2 −0).

**Código atual:** `proximaConquista` em `src/services/criteriosDeConquista.js:58`.

```js
/**
 * O quanto falta para a próxima conquista daquele critério, para a tela dizer
 * "faltam 3 células" em vez de só mostrar o que já foi.
 *
 * `null` quando não há próxima: a criança chegou ao fim da escada daquela
 * família, e inventar um degrau seria mentir sobre o catálogo.
 */
export function proximaConquista(catalogo, valor) {
  const numero = Number(valor);
  const pendentes = catalogo
    .filter((conquista) => Number(conquista.criterion_target) > numero)
    .sort((uma, outra) => Number(uma.criterion_target) - Number(outra.criterion_target));

  if (pendentes.length === 0) return null;

  const proxima = pendentes[0];
  return { conquista: proxima, falta: Number(proxima.criterion_target) - numero };
}
```

### 139. `961fe25` feat: as conquistas passaram a desbloquear sozinhas (T-13.2)

*27/08/2026, Razawaky, tipo `feat`.*

Os quatro pontos onde os números mudam não custam a mesma coisa, e foi isso que decidiu o desenho. Célula e favo já estão em mãos no fim da partida — `registrarConclusao` devolve `favoConcluido`, e contar as concluídas usa a UNIQUE (user_id, cell_id) —, então são avaliados ali, e a conquista volta na resposta do fechamento, porque a comemoração pertence à tela de resultado. Patrimônio é o oposto: somar carteira cofre e inventário é a conta mais cara do sistema, e a Colmeia já a faz uma vez por visita para o cabeçalho.

**Arquivos (13 arquivos, +506 −46):** `test/integration/desbloqueioAutomatico.test.js` (+224 −0), `docs/ESTADO-DO-PROJETO.md` (+49 −5), `src/services/achievementsService.js` (+40 −13), `test/unit/eventosDeConquista.test.js` (+45 −0), `src/services/eventosDeConquista.js` (+41 −0), `src/repositories/achievementsRepository.js` (+15 −23), `src/services/gameSessionService.js` (+31 −1), `src/repositories/progressRepository.js` (+26 −0), `src/services/homeService.js` (+18 −0), `test/integration/colmeia.test.js` (+6 −2), `test/integration/aceiteDaEconomia.test.js` (+5 −1), `test/integration/aceiteDaColmeia.test.js` (+4 −1), e mais 1 arquivos.

**Código atual:** `EVENTOS` em `src/services/eventosDeConquista.js:20`.

```js
/**
 * O que cada evento faz avaliar.
 *
 * Um evento pode mexer em mais de um critério — fechar um favo também conclui
 * uma célula —, e é por isso que o valor é lista.
 */
const EVENTOS = {
  'celula-concluida': ['celulas-concluidas'],
  'favo-concluido': ['favos-concluidos'],
  'patrimonio-mudou': ['patrimonio-total'],
  'cofre-mudou': ['cofre-guardado'],
};
```

### 140. `74b7100` feat: a liga semanal por pólen saiu do schema e virou comportamento (T-13.3)

*27/08/2026, Razawaky, tipo `feat`.*

`leagues` e `league_members` nasceram na E01 e nunca receberam uma linha. Escrever a primeira revelou três coisas que o schema tinha decidido sem querer. A uq_leagues_starts_on permitia uma liga por semana em todo o sistema, e a RF-GAM-02 pede grupos: a unicidade virou o par semana e nome, e cada grupo é uma linha. O índice do `point_ledger` começa por `user_id` porque foi feito para "o extrato deste jogador", e a liga pergunta o contrário — sem o índice de data ela varre a tabela que mais cresce. E o prêmio do pódio é valor de recompensa, então virou `league_prizes` em vez de três números no meio do service (RN-006).

**Arquivos (11 arquivos, +818 −15):** `test/integration/ligaSemanal.test.js` (+245 −0), `src/services/leagueService.js` (+225 −0), `src/repositories/leaguesRepository.js` (+123 −0), `test/unit/leagueService.test.js` (+98 −0), `docs/ESTADO-DO-PROJETO.md` (+49 −4), `migrations/023_liga_semanal.sql` (+38 −0), `src/services/homeService.js` (+19 −10), `scripts/seeds/09_league_prizes.sql` (+16 −0), `test/unit/seed.test.js` (+2 −1), `docs/RASTREABILIDADE.md` (+2 −0), `scripts/seeds/02_age_bands_domains.sql` (+1 −0).

**Código atual:** `ligaDoJogador` em `src/services/leagueService.js:142`.

```js
/**
 * A liga da semana do jogador, com o pólen somado do livro e o cache regravado.
 *
 * Devolve `null` para quem ainda não entrou em grupo nenhum: aparecer em último
 * sem ter jogado é a humilhação que a RF-GAM-02 manda evitar.
 */
export async function ligaDoJogador(idUsuario, agora = new Date()) {
  const semana = semanaDe(agora);
  const grupo = await leaguesRepository.buscarGrupoDoJogador(idUsuario, semana.domingo);
  if (!grupo) return null;

  const { de, ate } = intervaloDaSemana(semana);
  const ranqueados = ranquear(await leaguesRepository.listarMembrosComPolen(grupo.id, de, ate));

  // O cache só é regravado para quem está lendo: escrever a tabela inteira a
  // cada visita seria trinta UPDATEs para mostrar uma tela.
  const meu = ranqueados.find((membro) => Number(membro.user_id) === Number(idUsuario));
  if (meu && Number(grupo.points) !== meu.polen) {
    await leaguesRepository.atualizarPontos(grupo.id, idUsuario, meu.polen);
  }

  return {
    grupo: {
      id: grupo.id,
      nome: grupo.name,
      comecaEm: paraDataISO(grupo.starts_on),
      terminaEm: paraDataISO(grupo.ends_on),
    },
    posicao: meu?.posicao ?? null,
    polen: meu?.polen ?? 0,
    // O apelido sai daqui já no formato que pode ser publicado: a liga é a
    // primeira tela em que uma criança lê o campo de outra (RF-GAM-03).
    membros: ranqueados.map((membro) => ({
      ...membro,
      nickname: apelidoParaRanque(membro.nickname, membro.user_id),
    })),
  };
}
```

## 31 de agosto de 2026

### 141. `ae8e0b1` feat: a conquista e a liga ganharam tela (T-13.4)

*31/08/2026, Razawaky, tipo `feat`.*

O catálogo mostra as cinco escadas com o degrau travado exibindo alvo e progresso, e não silhueta: a escada visível é o que dá motivo para voltar. A liga mostra apelido, posição e pólen, e nada mais (RF-GAM-03), com a linha do próprio jogador marcada por fundo e pela palavra "você".

**Arquivos (17 arquivos, +603 −11):** `test/integration/telasDeConquistaEliga.test.js` (+137 −0), `src/services/conquistasDoJogador.js` (+87 −0), `src/views/pages/liga.ejs` (+69 −0), `docs/ESTADO-DO-PROJETO.md` (+41 −9), `src/views/pages/conquistas.ejs` (+44 −0), `src/controllers/paginaController.js` (+38 −0), `src/views/partials/ui/conquista-card.ejs` (+36 −0), `src/views/pages/painel.ejs` (+34 −0), `src/views/partials/ui/conquista-nova.ejs` (+28 −0), `src/public/js/resultado.js` (+27 −0), `src/config/conquistas.js` (+17 −0), `src/services/leagueService.js` (+15 −0), e mais 5 arquivos.

**Código atual:** `catalogoPorFamilia` em `src/services/conquistasDoJogador.js:67`.

```js
/**
 * O catálogo agrupado por família, na ordem em que os critérios são declarados.
 *
 * A conquista travada aparece com alvo e progresso, e não escondida: a escada
 * visível é o que dá motivo para voltar amanhã.
 */
export async function catalogoPorFamilia(idUsuario) {
  const valores = await valoresAtuais(idUsuario);
  // Avalia antes de ler o catálogo, senão a tela mostraria "12 de 12 favos" num
  // degrau ainda travado para quem chega aqui sem passar pela Colmeia.
  await achievementsService.avaliarEventos(idUsuario, valores);

  const catalogo = await achievementsService.catalogoDoUsuario(idUsuario);

  const familias = Object.keys(CRITERIOS)
    .map((criterio) => {
      const degraus = catalogo.filter((conquista) => conquista.criterion_type === criterio);
      return montarFamilia(criterio, degraus, valores[criterio] ?? 0);
    })
    .filter((familia) => familia.conquistas.length > 0);

  return {
    familias,
    total: catalogo.length,
    desbloqueadas: catalogo.filter((conquista) => conquista.unlocked_at).length,
  };
}
```

### 142. `0cd6baa` fix: a auditoria da E13 fechou as duas lacunas bloqueantes

*31/08/2026, Razawaky, tipo `fix`.*

O apelido só passou a ser visto por outras crianças quando a liga ganhou tela, e até aqui a validação dele era "não vazio, até 60 caracteres". `apelidoPublico.js` é a regra única — 2 a 20 caracteres, letra, número, espaço, hífen e sublinhado sem quatro dígitos seguidos e sem três palavras — e vale no cadastro, no onboarding e na edição. O ranque não confia no banco: apelido fora da regra sai como "Abelha" mais o id interno, o que protege conta criada antes dela.

**Arquivos (12 arquivos, +378 −18):** `docs/13-AUDITORIA-DA-ETAPA.md` (+137 −0), `src/services/apelidoPublico.js` (+57 −0), `test/unit/apelidoPublico.test.js` (+48 −0), `docs/ESTADO-DO-PROJETO.md` (+34 −3), `test/integration/telasDeConquistaEliga.test.js` (+32 −3), `test/integration/ligaSemanal.test.js` (+19 −7), `src/repositories/leaguesRepository.js` (+16 −0), `src/services/leagueService.js` (+15 −1), `src/routes/users.js` (+9 −2), `src/views/pages/perfil.ejs` (+6 −0), `src/routes/perfil.js` (+3 −2), `docs/RASTREABILIDADE.md` (+2 −0).

**Código atual:** `motivoDeRecusa` em `src/services/apelidoPublico.js:25`.

```js
/** O motivo da recusa, ou `null` quando o apelido pode ser publicado. */
export function motivoDeRecusa(apelido) {
  const limpo = String(apelido ?? '').trim();

  if (limpo.length < TAMANHO_MINIMO) return 'O apelido precisa ter ao menos 2 letras';
  if (limpo.length > TAMANHO_MAXIMO) return 'O apelido pode ter no máximo 20 letras';
  if (!CARACTERES_PERMITIDOS.test(limpo)) return 'Use só letras, números, espaço, hífen e sublinhado';
  if (SEQUENCIA_DE_DIGITOS.test(limpo)) return 'Não use telefone, data nem documento no apelido';
  if (PALAVRAS_DEMAIS.test(limpo)) return 'Não use seu nome completo: outras crianças veem seu apelido';

  return null;
}
```

### 143. `8f5f19d` feat: a varredura de segurança virou teste que enumera (T-14.1)

*31/08/2026, Razawaky, tipo `feat`.*

Varredura em duas frentes. A estática lê o código: classifica toda interpolação dos repositories em três famílias auditadas, cobra validador de toda rota de escrita, reprova saída de view sem escape e procura segredo literal. A dinâmica exercita a aplicação: as 36 rotas de escrita recusam sem token de CSRF, e um segundo teste confronta a lista lida dos arquivos com o que o Express montou — se as contas divergirem, é porque a varredura passou a olhar menos do que existe.

**Arquivos (11 arquivos, +744 −35):** `test/integration/varreduraDeSeguranca.test.js` (+270 −0), `test/unit/varreduraDeCodigo.test.js` (+242 −0), `docs/14-VARREDURA-DE-SEGURANCA.md` (+85 −0), `test/integration/bruteForce.test.js` (+59 −18), `src/middlewares/rateLimiters.js` (+40 −3), `docs/ESTADO-DO-PROJETO.md` (+11 −4), `src/repositories/walletsRepository.js` (+13 −0), `src/routes/users.js` (+8 −4), `docs/RASTREABILIDADE.md` (+8 −0), `src/routes/admin.js` (+5 −3), `src/routes/sessao.js` (+3 −3).

**Código atual:** `limitePorCredencial` em `src/middlewares/rateLimiters.js:78`.

```js
/**
 * Login e cadastro, contados pelo e-mail tentado.
 *
 * É este que contém a força bruta: cinco erros na mesma conta fecham a porta
 * daquela conta, e o colega ao lado continua entrando. Acertar a senha não
 * consome o balde (`skipSuccessfulRequests`), então quem sabe a própria senha
 * nunca é barrado.
 */
export const limitePorCredencial = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: chaveDaCredencial,
  message: { erro: 'Muitas tentativas nesta conta. Aguarde alguns minutos.' },
});
```

### 144. `ac77fd4` feat: a cobertura virou piso medido, e não palpite (T-14.2)

*31/08/2026, Razawaky, tipo `feat`.*

O projeto não media cobertura nenhuma. Agora `npm run test:cobertura` mede os 24 services de cálculo com a cobertura embutida do Node 22 e reprova com código de saída 1. A lista dos services e os três pisos moram em `scripts/cobertura.js` que é o que a T-14.5 vai chamar. Sem piso global de propósito: ele deixaria um service de mel em 60% com o total verde.

**Arquivos (22 arquivos, +857 −52):** `test/integration/recompensaSemConfiguracao.test.js` (+144 −0), `test/integration/guardasDaPartida.test.js` (+139 −0), `docs/15-COBERTURA-DE-TESTES.md` (+122 −0), `test/integration/guardasDeSaldo.test.js` (+111 −0), `test/integration/requisitosDeItem.test.js` (+97 −0), `scripts/cobertura.js` (+81 −0), `test/unit/fontesDeProgresso.test.js` (+50 −0), `docs/ESTADO-DO-PROJETO.md` (+41 −4), `test/integration/ligaSemanal.test.js` (+28 −0), `test/helpers/relogio.js` (+16 −0), `test/integration/aceiteDaEconomia.test.js` (+10 −4), `src/services/goalsService.js` (+0 −13), e mais 10 arquivos.

**Código atual:** `CELULA_INEXISTENTE` em `test/integration/recompensaSemConfiguracao.test.js:32`.

```js
const CELULA_INEXISTENTE = {
  slugDoTipoDeJogo: 'jogo-que-nao-existe',
  codigoDaFaixa: 'Z',
  estrelas: 3,
};
```

### 145. `137655b` docs: a T-14.2 registrou as duas dívidas que a medição abriu

*31/08/2026, Razawaky, tipo `docs`.*

DT-110: a cobertura de ramo ficou em 92,06% e não em 100%, com o resíduo separado em três famílias que não se fecham com teste honesto. DT-111: a medição apontou que a RF-INV-06 é P1, tem dado gravado desde a E09 e service que o lê, e não tem tela nenhuma — a função nunca era executada porque ninguém a chama.

**Arquivos (1 arquivo, +3 −0):** `docs/ESTADO-DO-PROJETO.md` (+3 −0).

### 146. `07359d0` feat: a carga foi medida e o pool mudou por causa do número (T-14.3)

*31/08/2026, Razawaky, tipo `feat`.*

O pool tinha dez conexões desde a E01, escolhidas sem medir. Medido com trinta jogadores fazendo a jornada real, dez não davam conta da primeira visita: p95 de 2375 ms contra o teto de 2 s da RNF-01. Com vinte, 1924 ms.

**Arquivos (9 arquivos, +463 −14):** `scripts/carga.js` (+197 −0), `test/integration/cargaSimultanea.test.js` (+122 −0), `docs/16-MEDICAO-DE-CARGA.md` (+92 −0), `docs/ESTADO-DO-PROJETO.md` (+34 −4), `docs/02-ROADMAP-ETAPAS.md` (+8 −8), `src/config/env.js` (+4 −1), `.env.example` (+3 −1), `docs/RASTREABILIDADE.md` (+2 −0), `package.json` (+1 −0).

**Código atual:** `env` em `src/config/env.js:26`, já transcrito no commit 125.

### 147. `838bf8d` feat: construir a imagem achou o que nenhum teste veria (T-14.4)

*31/08/2026, Razawaky, tipo `feat`.*

O Dockerfile e o docker-compose existiam desde a T-00.5 e nunca tinham sido rodados. Revisar de verdade significou construir, e construir achou cinco defeitos. O compose só subia o MySQL, e a RNF-37 pede a aplicação também: ela entrou sob o perfil `completo`, para não quebrar quem roda o Node fora do compose, com as migrations num serviço separado que sai antes de a aplicação começar — migrar no boot impediria mais de uma réplica.

**Arquivos (8 arquivos, +498 −18):** `test/unit/ambienteDeConteiner.test.js` (+164 −0), `docs/17-CONTEINER-E-AMBIENTE.md` (+111 −0), `docker-compose.yml` (+75 −4), `docs/ESTADO-DO-PROJETO.md` (+40 −5), `.dockerignore` (+40 −0), `Dockerfile` (+33 −6), `src/config/logger.js` (+20 −3), `.env.example` (+15 −0).

**Código atual:** `transporteLegivel` em `src/config/logger.js:13`.

```js
/**
 * O `pino-pretty` é dependência de desenvolvimento e não existe na imagem de
 * produção, que roda `npm prune --omit=dev`. Pedir por ele sem conferir derruba
 * a aplicação no boot com um erro que nem fala em log.
 */
function transporteLegivel() {
  if (env.producao) return undefined;

  try {
    createRequire(import.meta.url).resolve('pino-pretty');
  } catch {
    return undefined;
  }

  return { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } };
}
```

### 148. `c9700e7` docs: a conclusão da T-14.4 achou uma RNF sem dono no roadmap

*31/08/2026, Razawaky, tipo `docs`.*

A rastreabilidade ganhou as linhas da RNF-37 e da RNF-38, e a da RNF-13 pelo lado do ambiente, que é a que fecha a DT-15. Escrevê-las mostrou um problema que não é da T-14.4. A linha da RNF-12 apontava para ela como a tarefa que traria o `Secure` no cookie, e a T-14.4 acabou sem trazer: ela é compose de desenvolvimento, e o `Secure` depende de TLS terminando num proxy reverso. Nenhuma tarefa do roadmap entrega esse proxy — a T-14.5 é CI a T-14.6 é backup, a T-14.7 é acessibilidade e a E15 é documentação. A RNF-12 passou de atendida a parcial, e a lacuna virou DT-114.

**Arquivos (2 arquivos, +8 −1):** `docs/RASTREABILIDADE.md` (+4 −1), `docs/ESTADO-DO-PROJETO.md` (+4 −0).

## 2 de setembro de 2026

### 149. `7870eff` feat: o portão automático existe, e quase não teria existido (T-14.5)

*02/09/2026, Razawaky, tipo `feat`.*

O `.gitignore` ignorava `.github/` inteiro — o único diretório que o GitHub Actions lê. Uma exceção para `workflows/` corrigiu isso antes que o portão nascesse invisível.

**Arquivos (9 arquivos, +471 −9):** `.github/workflows/ci.yml` (+210 −0), `test/unit/fluxoDeIntegracao.test.js` (+108 −0), `docs/18-INTEGRACAO-CONTINUA.md` (+82 −0), `docs/ESTADO-DO-PROJETO.md` (+50 −5), `test/helpers/relogio.js` (+10 −0), `.gitignore` (+5 −2), `test/integration/cargaSimultanea.test.js` (+2 −2), `docs/RASTREABILIDADE.md` (+2 −0), `package.json` (+2 −0).

**Código atual:** `scriptsChamadosPeloWorkflow` em `test/unit/fluxoDeIntegracao.test.js:26`.

```js
/** Os scripts que o workflow chama, na forma `npm run <nome>`. */
function scriptsChamadosPeloWorkflow() {
  const chamados = new Set();
  for (const achado of workflow.matchAll(/npm run ([a-z:]+)/g)) chamados.add(achado[1]);
  return chamados;
}
```

### 150. `9bf31cd` feat: o backup rodou pela primeira vez e apagou o que devia proteger (T-14.6)

*02/09/2026, Razawaky, tipo `feat`.*

O `scripts/backup.js` existia desde a E01, com teste unitário, comentário e documentação — e nunca tinha sido executado. A primeira execução real funcionou (163 KB, 61 tabelas) e, no mesmo comando, apagou o `beever-antes-da-E01-*.sql` dump guardado de propósito e citado duas vezes no estado do projeto como ponto de retorno. A pasta é ignorada pelo git: o arquivo não voltou.

**Arquivos (8 arquivos, +402 −18):** `scripts/restaurar.js` (+155 −0), `docs/19-BACKUP-E-RESTAURACAO.md` (+88 −0), `docs/ESTADO-DO-PROJETO.md` (+74 −13), `test/unit/backup.test.js` (+63 −0), `iniciar-proj.md` (+15 −4), `scripts/backup.js` (+5 −1), `docs/RASTREABILIDADE.md` (+1 −0), `package.json` (+1 −0).

**Código atual:** `escolherComando` em `scripts/restaurar.js:61`.

```js
/** Usa o cliente da máquina; se não houver, o do contêiner do compose. */
async function escolherComando() {
  const existeLocal = await new Promise((resolve) => {
    const teste = spawn('mysql', ['--version'], { stdio: 'ignore' });
    teste.on('error', () => resolve(false));
    teste.on('close', (codigo) => resolve(codigo === 0));
  });

  if (existeLocal) {
    return {
      comando: 'mysql',
      argumentos: [
        `--host=${env.banco.host}`,
        `--port=${env.banco.porta}`,
        `--user=${env.banco.usuario}`,
        `--database=${env.banco.nome}`,
      ],
    };
  }

  return {
    comando: 'docker',
    argumentos: [
      'compose',
      'exec',
      '-T',
      '-e',
      `MYSQL_PWD=${env.banco.senha}`,
      CONTAINER_COMPOSE,
      'mysql',
      `--user=${env.banco.usuario}`,
      `--database=${env.banco.nome}`,
    ],
  };
}
```

### 151. `da6448a` fix: a sessão de login rodava sobre um mysql2 vulnerável (RNF-14)

*02/09/2026, Razawaky, tipo `fix`.*

O `npm audit` do portão passou a reprovar com uma vulnerabilidade alta, e não era do `mysql2` do projeto, que está íntegro: o `express-mysql-session@3.0.3` carrega uma cópia própria, `mysql2@3.10.2`, com rebaixamento de plugin de autenticação que vaza credencial em texto claro. A versão vulnerável era justamente a que guarda a sessão de login.

**Arquivos (4 arquivos, +78 −67):** `package-lock.json` (+69 −66), `docs/ESTADO-DO-PROJETO.md` (+5 −0), `package.json` (+3 −0), `docs/RASTREABILIDADE.md` (+1 −1).

### 152. `c7c74c8` docs: o Definition of Done da T-14.6 achou dois ajustes

*02/09/2026, Razawaky, tipo `docs`.*

O cabeçalho do `restaurar.js` tinha três parágrafos separados por linha em branco, e a seção 7 do prompt mestre pede 3 a 4 linhas corridas. Encurtado sem perder o porquê.

**Arquivos (2 arquivos, +4 −5):** `scripts/restaurar.js` (+2 −5), `docs/ESTADO-DO-PROJETO.md` (+2 −0).

## 3 de setembro de 2026

### 153. `ba5729f` feat: quatrocentos e onze elementos não diziam onde o teclado estava (T-14.7)

*03/09/2026, Razawaky, tipo `feat`.*

A acessibilidade era provada em duas telas. A T-11.7 escreveu o teste da landing e da política, e as outras trinta telas do projeto nunca passaram por régua nenhuma. A varredura nova busca cada uma delas pelo HTTP, com sessão de jogador e de administrador, e roda a mesma bateria em todas: foco de teclado, alvo de 44 px, campo com nome, ordem de títulos, contraste do par escrito no elemento largura que cabe em 320 px, tabela com rolagem própria, zoom liberado, painel de acessibilidade desligado por padrão e animação com saída.

**Arquivos (14 arquivos, +731 −91):** `test/integration/acessibilidadeDasTelas.test.js` (+342 −0), `test/helpers/acessibilidade.js` (+239 −0), `docs/20-ACESSIBILIDADE-E-RESPONSIVIDADE.md` (+87 −0), `test/unit/contraste.test.js` (+12 −74), `docs/ESTADO-DO-PROJETO.md` (+18 −5), `test/integration/acessibilidadeDaLanding.test.js` (+7 −6), `src/styles/tema.css` (+8 −0), `src/views/partials/ui/favo-card.ejs` (+5 −2), `src/views/pages/cofre.ejs` (+2 −2), `src/views/pages/onboarding.ejs` (+4 −0), `src/views/pages/admin/conteudo-formulario.ejs` (+3 −0), `src/views/pages/painel.ejs` (+2 −1), e mais 2 arquivos.

**Código atual:** `raiz` em `test/integration/acessibilidadeDasTelas.test.js:41`.

```js
const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
```

### 154. `050f2cf` fix: a carga de trinta crianças era medida sem os limitadores ligados (auditoria da E14)

*03/09/2026, Razawaky, tipo `fix`.*

A E14 fechou sem auditoria, e a auditoria achou dois requisitos dados por atendidos que a medição desmentia. A RNF-02 era medida com `NODE_ENV=test`, e nesse ambiente os limitadores se desligam sozinhos. Com eles ligados, a mesma jornada devolvia 120 respostas 429 em 600 requisições: o limite global conta 600 por IP a cada quinze minutos, e uma sala de aula inteira sai de um IP só. A chave passou a ser a sessão nas leituras de quem está logado, mantendo o endereço na escrita e para quem não entrou, que é o que segura varredura em massa. A carga refeita sai 200×600, sem nenhum 429.

**Arquivos (12 arquivos, +631 −18):** `test/unit/guardasDosValidadores.test.js` (+181 −0), `docs/21-AUDITORIA-DA-ETAPA-E14.md` (+114 −0), `test/integration/limiteGlobalPorSessao.test.js` (+100 −0), `test/integration/guardasDaConta.test.js` (+89 −0), `test/unit/limiteDeTurma.test.js` (+43 −0), `docs/ESTADO-DO-PROJETO.md` (+38 −4), `src/views/pages/privacidade.ejs` (+10 −6), `docs/15-COBERTURA-DE-TESTES.md` (+14 −1), `docs/MODELO-DE-DADOS.md` (+15 −0), `scripts/cobertura.js` (+10 −5), `src/middlewares/rateLimiters.js` (+15 −0), `docs/RASTREABILIDADE.md` (+2 −2).

**Código atual:** `chaveDoLimiteGlobal` em `src/middlewares/rateLimiters.js:39`.

```js
/**
 * Em qual balde a requisição cai no limite global: quem está logado e só está
 * lendo conta por sessão, e o resto conta por endereço. Sem isto uma sala de
 * aula inteira, que sai de um IP só, é contada como uma pessoa — a medição de
 * carga bateu no teto com trinta crianças (DT-112).
 */
export function chaveDoLimiteGlobal(req) {
  const usuario = req.session?.usuarioId;
  if (usuario && METODOS_DE_LEITURA.has(req.method)) return `sessao:${usuario}`;
  return ipKeyGenerator(req.ip);
}
```

### 155. `a841bc0` docs: as três decisões da auditoria da E14 viraram etapa e linha de roadmap

*03/09/2026, Razawaky, tipo `docs`.*

Desktop das quatro telas mais vistas e apagamento definitivo de conta não eram conserto, e sim escopo novo: viraram a E16, com as duas tarefas escritas. O pull request para a `main` fica aberto só para o CI executar pela primeira vez, e o merge espera os cinco jobs. As três decisões entraram em "Decisões travadas" porque cada uma responde uma pergunta que voltaria a ser feita.

**Arquivos (2 arquivos, +19 −2):** `docs/02-ROADMAP-ETAPAS.md` (+11 −0), `docs/ESTADO-DO-PROJETO.md` (+8 −2).

## 4 de setembro de 2026

### 156. `22dddcf` fix: o teste da casca subia a aplicação sem criar banco (DT-117 paga)

*04/09/2026, Razawaky, tipo `fix`.*

A primeira execução do CI reprovou, que era exatamente para isso que o portão existia. `app.test.js` criava o app sem arnês nenhum, então o `/health` respondia pelo banco de desenvolvimento da máquina de quem rodava; no runner esse banco não existe e a resposta virou 503. Agora o arquivo usa `helpers/ambiente.js` e `criarBancoDeTeste`, como todos os outros de integração, e pula sozinho sem MySQL.

**Arquivos (4 arquivos, +34 −8):** `test/integration/app.test.js` (+18 −4), `docs/21-AUDITORIA-DA-ETAPA-E14.md` (+9 −2), `scripts/cobertura.js` (+6 −1), `docs/ESTADO-DO-PROJETO.md` (+1 −1).

**Código atual:** `pular` em `test/integration/app.test.js:22`.

```js
const pular = await motivoParaPular();
```

### 157. `9966966` docs: o portão saiu verde na segunda execução, e a RNF-40 deixou de ser promessa

*04/09/2026, Razawaky, tipo `docs`.*

**Arquivos (2 arquivos, +3 −2):** `docs/21-AUDITORIA-DA-ETAPA-E14.md` (+2 −1), `docs/ESTADO-DO-PROJETO.md` (+1 −1).

### 158. `8df4d64` docs: a matriz de rastreabilidade parou de contar meia verdade (T-15.1)

*04/09/2026, Razawaky, tipo `docs`.*

Ela citava 132 dos 184 requisitos. O que faltava era quase tudo de E01 a E05 — autenticação, onboarding, perfil e conteúdo nunca tinham entrado, porque o arquivo nasceu na T-06.1 e só registrava o que era tocado dali em diante. As 52 linhas foram escritas conferindo arquivo e teste um a um, e a tabela passou a ser ordenada por módulo, que é como se procura na defesa.

**Arquivos (4 arquivos, +246 −107):** `docs/RASTREABILIDADE.md` (+147 −98), `test/unit/rastreabilidade.test.js` (+78 −0), `docs/ESTADO-DO-PROJETO.md` (+19 −9), `docs/01-REQUISITOS-E-REGRAS.md` (+2 −0).

## 8 de setembro de 2026

### 159. `0c502ff` docs: o banco, os atores e o fluxo de recompensa viraram figura (T-15.2)

*08/09/2026, Razawaky, tipo `docs`.*

Os quatro diagramas do TCC em `docs/22-DIAGRAMAS-DO-TCC.md`, validados no renderizador Mermaid: ER das 61 tabelas agrupadas em seis áreas, casos de uso com os atores que as rotas realmente têm, classes do fluxo de recompensa com os métodos que a sequência usa, e a sequência da conclusão de partida trazendo RN-007, RN-009, RN-010 e RNF-15/16/17 na própria figura, cada um com o teste que o sustenta.

**Arquivos (2 arquivos, +498 −4):** `docs/22-DIAGRAMAS-DO-TCC.md` (+487 −0), `docs/ESTADO-DO-PROJETO.md` (+11 −4).

### 160. `26b7ae3` docs: cada decisão de arquitetura passou a ter o porquê escrito (T-15.3)

*08/09/2026, Razawaky, tipo `docs`.*

`docs/23-ARQUITETURA-DO-SISTEMA.md` justifica para a banca as escolhas que o projeto tomou: camadas, ausência de ORM, EJS server-rendered, livro append-only como verdade, enum como tabela, transação por conexão emprestada idempotência no banco, sessão no MySQL, contêiner e integração contínua. Cada escolha fecha com a tabela decisão, alternativa e porquê, e o documento termina mostrando por que a evolução cabe sem reescrita.

**Arquivos (2 arquivos, +331 −3):** `docs/23-ARQUITETURA-DO-SISTEMA.md` (+321 −0), `docs/ESTADO-DO-PROJETO.md` (+10 −3).

### 161. `c5336bd` docs: o manual de instalação virou a fonte, e o quickstart parou de mentir (T-15.4)

*08/09/2026, Razawaky, tipo `docs`.*

`docs/24-MANUAL-DE-INSTALACAO-E-EXECUCAO.md` é o manual canônico: pré-requisitos `.env`, Docker, migrations, seed com as contas de exemplo, os testes e seus comandos, backup e restauração, o ambiente completo do compose e o checklist de produção.

**Arquivos (3 arquivos, +390 −6):** `docs/24-MANUAL-DE-INSTALACAO-E-EXECUCAO.md` (+372 −0), `docs/ESTADO-DO-PROJETO.md` (+9 −3), `iniciar-proj.md` (+9 −3).

## 9 de setembro de 2026

### 162. `c158d46` docs: o laudo de evidências guardou a execução, não a promessa (T-15.5)

*09/09/2026, Razawaky, tipo `docs`.*

O documento `docs/25-EVIDENCIAS-DE-TESTE.md` passa a citar número com execução por trás: as saídas da suíte e da cobertura ficam ao lado, em `docs/evidencias/`, e os dezesseis prints das telas saem de `npm run evidencias`, que sobe o navegador sem janela e fotografa cada endereço.

**Arquivos (27 arquivos, +9639 −10):** `docs/evidencias/cobertura.txt` (+7999 −0), `docs/evidencias/suite.txt` (+956 −0), `scripts/evidencias.js` (+347 −0), `docs/25-EVIDENCIAS-DE-TESTE.md` (+146 −0), `test/unit/evidencias.test.js` (+119 −0), `docs/ESTADO-DO-PROJETO.md` (+61 −3), `package-lock.json` (+6 −6), `docs/24-MANUAL-DE-INSTALACAO-E-EXECUCAO.md` (+2 −0), `docs/RASTREABILIDADE.md` (+1 −1), `.gitignore` (+1 −0), `package.json` (+1 −0), `docs/evidencias/telas/01-landing-celular.webp` (+0 −0), e mais 15 arquivos.

### 163. `5ea4fb4` fix: a evidência do TCC voltou a sustentar o número que o laudo cita (T-15.5)

*09/09/2026, Razawaky, tipo `fix`.*

A saída guardada em `docs/evidencias/suite.txt` estava truncada no meio, sem o resumo TAP — o laudo afirmava 1085 testes e o arquivo ao lado não trazia a linha que prova isso. As duas execuções foram refeitas e gravadas inteiras: 1111 testes passando na suíte limpa em 3 min 51 s, e 100% de linha, 92,93% de ramo e 99,39% de função na medição de cobertura.

**Arquivos (4 arquivos, +8974 −1580):** `docs/evidencias/suite.txt` (+7429 −230), `docs/evidencias/cobertura.txt` (+1535 −1344), `docs/25-EVIDENCIAS-DE-TESTE.md` (+6 −6), `.env.example` (+4 −0).

### 164. `a06a6c9` docs: o que o Beever não faz virou escopo escrito, e não promessa (T-15.6)

*09/09/2026, Razawaky, tipo `docs`.*

`docs/26-TRABALHOS-FUTUROS.md` fecha a E15 pelo avesso: em vez do que foi entregue, o que ficou de fora e por qual caminho entra depois. Cada frente diz o que é, por que saiu do MVP, o que no código de hoje já a habilita, o que precisaria mudar e qual o risco — as quatro do roadmap (SPA, mobile, painel do responsável e recomendação de conteúdo), os dez requisitos escritos sem código a dívida que depende de host, de volume ou de decisão de produto, e uma ordem sugerida de continuação que começa pelas telas cujo dado já está gravado.

**Arquivos (5 arquivos, +353 −9):** `docs/26-TRABALHOS-FUTUROS.md` (+196 −0), `test/unit/trabalhos-futuros.test.js` (+83 −0), `docs/ESTADO-DO-PROJETO.md` (+67 −7), `docs/23-ARQUITETURA-DO-SISTEMA.md` (+6 −1), `docs/RASTREABILIDADE.md` (+1 −1).

### 165. `fd69eca` docs: a auditoria da E15 achou os testes que nunca tinham sido commitados

*09/09/2026, Razawaky, tipo `docs`.*

O laudo está em `docs/27-AUDITORIA-DA-ETAPA-E15.md`. A lacuna bloqueante foi a mais constrangedora possível: `test/unit/tcc.test.js`, que guarda os documentos da T-15.2, T-15.3 e T-15.4, existia só no disco — `git ls-files` não o trazia e o portão de CI não rodava nenhum dos quinze testes. Entrou no repositório sem a constante morta que era o único erro de lint do projeto.

**Arquivos (5 arquivos, +404 −11):** `test/unit/tcc.test.js` (+226 −0), `docs/27-AUDITORIA-DA-ETAPA-E15.md` (+117 −0), `docs/ESTADO-DO-PROJETO.md` (+45 −4), `docs/23-ARQUITETURA-DO-SISTEMA.md` (+7 −6), `docs/22-DIAGRAMAS-DO-TCC.md` (+9 −1).

### 166. `97773be` feat: o desktop deixou de ser a coluna do celular no meio da tela (T-16.1)

*09/09/2026, Razawaky, tipo `feat`.*

A Colmeia e o cofre passam a duas colunas a partir de `lg` — trilha e "Continuar" de um lado, tarefas e meta do outro; ações do cofre à esquerda projeção e extrato à direita —, e a vitrine da loja vai a quatro colunas no `xl`. A trilha ficou como estava: ela já tinha composição desde a T-10.4, e os hexágonos serpenteiam de propósito, então alargar só criou vazio.

**Arquivos (5 arquivos, +168 −16):** `test/integration/composicaoDeDesktop.test.js` (+124 −0), `src/views/pages/painel.ejs` (+20 −8), `src/views/pages/cofre.ejs` (+19 −5), `src/views/pages/loja.ejs` (+3 −3), `docs/02-ROADMAP-ETAPAS.md` (+2 −0).

**Código atual:** `TELAS` em `test/integration/composicaoDeDesktop.test.js:32`.

```js
// A trilha ganhou composição própria na T-10.4 e não pede largura maior: o
// painel do favo atual já ocupa o lado direito, e alargar deixa os favos
// perdidos no meio do vazio. Por isso ela é cobrada só pela grade.
const TELAS = [
  { nome: 'Colmeia', caminho: '/painel', larga: true },
  { nome: 'trilha', caminho: '/trilha', larga: false },
  { nome: 'loja', caminho: '/loja', larga: true },
  { nome: 'cofre', caminho: '/cofre', larga: true },
];
```

### 167. `981536c` fix: as três dívidas e os dois exageros que a auditoria da E15 deixou abertos

*09/09/2026, Razawaky, tipo `fix`.*

DT-127: o manual canônico não explicava 7 das 18 variáveis do `.env.example`. Entrou a tabela das quatorze com padrão e quando mexer, e uma guarda nova — variável do exemplo que o manual não explique reprova a suíte. A lacuna 6 do laudo era falso positivo: o `npm test` sempre esteve na seção 7, e o grep da auditoria só procurava `npm run`.

**Arquivos (7 arquivos, +63 −13):** `test/unit/tcc.test.js` (+18 −5), `docs/24-MANUAL-DE-INSTALACAO-E-EXECUCAO.md` (+21 −1), `test/unit/rastreabilidade.test.js` (+10 −0), `scripts/evidencias.js` (+5 −3), `docs/23-ARQUITETURA-DO-SISTEMA.md` (+3 −2), `docs/27-AUDITORIA-DA-ETAPA-E15.md` (+3 −1), `scripts/seed.js` (+3 −1).

**Código atual:** `tabelasDaFiguraEr` em `test/unit/tcc.test.js:65`.

```js
/**
 * Os nomes que aparecem na figura ER, sem contar os comentários.
 *
 * O comentário cita o nome da tabela para explicar por que ela não tem ligação,
 * e contá-lo deixaria a tabela "presente" mesmo depois de sumir do desenho —
 * foi o buraco que a segunda passada da auditoria da E15 encontrou.
 */
function tabelasDaFiguraEr(texto) {
  const bloco = blocosMermaid(texto).find((b) => b.trim().startsWith('erDiagram')) ?? '';
  const semComentarios = bloco
    .split('\n')
    .filter((linha) => !linha.trim().startsWith('%%'))
    .join('\n');

  return new Set(semComentarios.match(/[a-z_][a-z0-9_]*/g) ?? []);
}
```

### 168. `d7169ab` docs: a evidência e o estado passaram a mostrar as telas de desktop (T-16.1)

*09/09/2026, Razawaky, tipo `docs`.*

Os prints de Colmeia, trilha, loja e cofre foram refeitos com a composição nova e as duas execuções que sustentam o laudo foram regravadas no estado final do código: 1123 testes passando em 4 min 11 s, e cobertura de 100% de linha, 92,93% de ramo e 99,39% de função. A contagem de arquivos virou a real — 211 suítes em 140 arquivos, 96 de integração e 44 unitários.

**Arquivos (11 arquivos, +3193 −2987):** `docs/evidencias/suite.txt` (+1565 −1486), `docs/evidencias/cobertura.txt` (+1564 −1485), `docs/ESTADO-DO-PROJETO.md` (+58 −11), `docs/25-EVIDENCIAS-DE-TESTE.md` (+4 −4), `docs/RASTREABILIDADE.md` (+2 −1), `docs/evidencias/telas/03-colmeia-celular.webp` (+0 −0), `docs/evidencias/telas/03-colmeia-desktop.webp` (+0 −0), `docs/evidencias/telas/04-trilha-desktop.webp` (+0 −0), `docs/evidencias/telas/06-loja-desktop.webp` (+0 −0), `docs/evidencias/telas/07-cofre-desktop.webp` (+0 −0), `docs/evidencias/telas/08-metas-celular.webp` (+0 −0).

### 169. `b2b825c` docs: o que falta para a banca virou plano com prioridade escrita (E17)

*09/09/2026, Razawaky, tipo `docs`.*

`docs/28-PLANO-PARA-A-BANCA.md` responde separadamente às duas perguntas que estavam misturadas: o que impede a apresentação e o que impede o app de ser usado por criança de verdade. São quatro faixas de obrigação decrescente, e cada tarefa diz por quê, o que já existe e qual o aceite.

**Arquivos (4 arquivos, +235 −3):** `docs/28-PLANO-PARA-A-BANCA.md` (+105 −0), `test/unit/plano-da-banca.test.js` (+71 −0), `docs/ESTADO-DO-PROJETO.md` (+35 −3), `docs/02-ROADMAP-ETAPAS.md` (+24 −0).

### 170. `36d742d` fix: o cofre parou de concordar no gênero errado e de mostrar tabela vazia (T-17.1)

*09/09/2026, Razawaky, tipo `fix`.*

A regra escrita do Cofre do Tempo montava "rende 10% neste ${nomeDoCiclo}", e o nome vem do banco: com "semana" a criança lia "neste semana". A frase passou a ser "por ${nomeDoCiclo}", que funciona com qualquer nome, em vez de o código carregar uma tabela de gênero (DT-124).

**Arquivos (2 arquivos, +23 −3):** `src/public/js/cofre.js` (+12 −1), `src/views/partials/jogos/cofre.ejs` (+11 −2).

**Código atual:** `registrarNoHistorico` em `src/public/js/cofre.js:67`.

```js
function registrarNoHistorico(indiceDoCiclo, deposito) {
  const linha = document.createElement('tr');
  const celulas = [
    `${conteudo.nomeDoCiclo} ${indiceDoCiclo + 1}`,
    `${deposito} de mel`,
    `${saldo} de mel`,
  ];

  linha.className = 'border-t border-linha';
  celulas.forEach((texto, coluna) => {
    const celula = document.createElement('td');
    celula.className = coluna === 2 ? 'py-1 text-right font-semibold text-tinta' : 'py-1 text-tinta';
    celula.textContent = texto;
    linha.append(celula);
  });
  historico.append(linha);

  // O gráfico e a tabela só existem depois do primeiro depósito: antes dele não
  // há o que mostrar, e cabeçalho sobre corpo vazio confunde.
  aindaVazio.classList.add('hidden');
  figura.classList.remove('hidden');
  tabela.classList.remove('hidden');
}
```

### 171. `f6ab90c` feat: uma conta de demonstração com passado, para o app não parecer vazio (T-17.4)

*09/09/2026, Razawaky, tipo `feat`.*

A conta da Ana mostra o começo do jogo, e começo é tela quase vazia — nível 1 liga sem posição, dois favos. `npm run db:seed:demo` acrescenta o Léo, faixa C: nível 16, patrimônio de 22720, a trilha inteira concluída nos seis favos, cofre com extrato de vinte movimentos, cem dias de sequência, 17 conquistas e uma liga com seis pessoas em que ele está em segundo.

**Arquivos (18 arquivos, +454 −4):** `scripts/seeds-demo/01_demo_avancado.sql` (+420 −0), `scripts/seed.js` (+18 −3), `docs/24-MANUAL-DE-INSTALACAO-E-EXECUCAO.md` (+9 −0), `.env.example` (+4 −0), `scripts/evidencias.js` (+2 −1), `package.json` (+1 −0), `docs/evidencias/telas/03-colmeia-celular.webp` (+0 −0), `docs/evidencias/telas/03-colmeia-desktop.webp` (+0 −0), `docs/evidencias/telas/04-trilha-desktop.webp` (+0 −0), `docs/evidencias/telas/05-celula-celular.webp` (+0 −0), `docs/evidencias/telas/06-loja-celular.webp` (+0 −0), `docs/evidencias/telas/06-loja-desktop.webp` (+0 −0), e mais 6 arquivos.

**Código atual:** `diretorioDemo` em `scripts/seed.js:36`.

```js
// A conta de demonstração avançada mora fora de `seeds/` de propósito: o seed
// padrão é o que os testes aplicam em cada banco descartável, e um jogador com
// liga e cem dias de sequência muda o resultado de quem conta membros de grupo.
// Ela entra só com `npm run db:seed:demo`.
const diretorioDemo = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seeds-demo');
```

### 172. `2be4a9f` docs: a E17 andou duas tarefas, e as dívidas do cofre foram pagas

*09/09/2026, Razawaky, tipo `docs`.*

DT-124 e DT-125 fechadas com a T-17.1; a conta de demonstração do Léo é a T-17.4. O estado registra as três armadilhas que o seed encontrou, porque nenhuma delas aparece em teste: JOIN que não casa insere zero linhas em silêncio, a trilha é cumulativa por faixa, e a liga guarda um grupo por linha.

**Arquivos (3 arquivos, +32 −15):** `docs/ESTADO-DO-PROJETO.md` (+28 −11), `docs/RASTREABILIDADE.md` (+3 −3), `docs/02-ROADMAP-ETAPAS.md` (+1 −1).

### 173. `896cde5` feat: apagar a conta passou a apagar de verdade (T-16.2)

*09/09/2026, Razawaky, tipo `feat`.*

O que existia era desativação: `is_active = 0` com o dado todo guardado. A RN-053 e a política de privacidade prometem exclusão, e agora `DELETE FROM users` leva a conta e, pela cascata das foreign keys, tudo o que ela possui.

**Arquivos (7 arquivos, +304 −13):** `test/integration/exclusaoDefinitiva.test.js` (+203 −0), `src/services/usersService.js` (+48 −8), `src/views/pages/admin/usuarios.ejs` (+18 −0), `src/controllers/adminController.js` (+15 −0), `src/views/pages/privacidade.ejs` (+5 −5), `src/routes/admin.js` (+9 −0), `src/repositories/usersRepository.js` (+6 −0).

**Código atual:** `apagarDefinitivamente` em `src/services/usersService.js:276`.

```js
/**
 * Apagamento definitivo (RN-053): remove a linha do usuário e, pela cascata
 * das foreign keys, tudo o que a conta possui — perfil, carteira, metas,
 * compras, consentimento. É o que a política de privacidade oferece a quem
 * pede a exclusão pelo Art. 18 da LGPD: o dado sai de verdade.
 *
 * A trilha de auditoria não pode ser reescrita (RNF-17 a tornou imutável por
 * gatilho), e ela não tem foreign key para `users` justamente para sobreviver
 * à exclusão. O que mantém a RN-053 inteira é o agregado já nascer anônimo —
 * `conta.criada`, `conta.atualizada` e `consentimento.registrado` não gravam
 * apelido, e-mail nem data, então quando o expurgo chega não há o que apagar.
 */
export async function apagarDefinitivamente(id, ator) {
  exigirPosse(id, ator);

  // O `obter` garante que a conta existe; sem ele, o registro sairia sobre um
  // id que não pertence a ninguém.
  const usuario = await obter(id);

  // O registro sai antes do `DELETE`: a linha de auditoria precisa do id
  // enquanto ele ainda existe. É a mesma ordem do expurgo do cron
  // (`limpezaService`), e o que ele guarda é só o agregado.
  await auditService.registrar(quemAgiu(ator), 'conta.apagada', {
    entidade: 'user',
    id,
    antes: { ativa: Boolean(usuario.is_active) },
    depois: { tinhaOnboarding: Boolean(usuario.onboarding_completed_at) },
  });

  await usersRepository.removerPorId(id);
}
```

### 174. `004bbcb` fix: o apelido ainda morava na trilha imutável por dois eventos de perfil (RN-053)

*09/09/2026, Razawaky, tipo `fix`.*

A T-16.2 tirou o dado pessoal de `conta.criada`, `conta.atualizada` e `consentimento.registrado`, mas deixou dois de fora: `perfil.atualizado` gravava o apelido em `antes` e em `depois`, e `onboarding.concluido` gravava o apelido. Como a trilha é imutável por gatilho (RNF-17) e não tem chave estrangeira para `users`, esses dois sobreviveriam ao apagamento da conta — o oposto do que a RN-053 promete e do que o aceite da E16 afirma.

**Arquivos (2 arquivos, +26 −6):** `test/integration/exclusaoDefinitiva.test.js` (+17 −2), `src/services/profilesService.js` (+9 −4).

**Código atual:** `atualizar` em `src/services/profilesService.js:243`.

```js
/**
 * Atualiza o que é do perfil e o que é da conta na mesma chamada, porque para
 * quem usa a tela isso é uma coisa só: "meus dados". O apelido vai para
 * `users`, o resto para `profiles`.
 */
export async function atualizar(
  idPerfil,
  idUsuario,
  { apelido, avatar, fuso, minutosPorSessao, somAtivo, animacaoReduzida },
) {
  const minutosInformados = minutosPorSessao !== undefined && minutosPorSessao !== null;
  if (minutosInformados) exigirMinutosValidos(minutosPorSessao);

  await exigirPosse(idPerfil, idUsuario);

  // O avatar continua opcional aqui — esta é a tela de perfil, onde se muda uma
  // coisa de cada vez —, mas quando vem, vem conferido contra o catálogo.
  if (avatar !== undefined && avatar !== null) {
    const catalogo = await obterCatalogoDoOnboarding();
    exigirDoCatalogo(catalogo.avatar, avatar, 'Escolha sua abelha');
  }

  // O apelido anterior não é mais lido: ele existia só para entrar na trilha,
  // e a trilha deixou de guardá-lo.
  const anterior = await profilesRepository.buscarDetalhadoPorUsuario(idUsuario);

  if (apelido) await usersRepository.atualizar(idUsuario, { apelido });
  await profilesRepository.atualizar(idPerfil, { avatar, fuso, minutosPorSessao, somAtivo, animacaoReduzida });

  // Apelido é dado pessoal (RN-049) e a trilha é imutável por gatilho (RNF-17):
  // o que entrar aqui sobrevive ao apagamento da conta (RN-053). Entra o fato de
  // ter mudado, não o nome. O avatar é escolha de catálogo, e pode ficar.
  await auditService.registrar(auditService.usuario(idUsuario), 'perfil.atualizado', {
    entidade: 'profile',
    id: idPerfil,
    antes: { avatar: anterior?.avatar },
    depois: { apelidoAlterado: Boolean(apelido), avatar: avatar ?? anterior?.avatar },
  });

  return obterDoUsuario(idUsuario);
}
```

### 175. `68b0df9` feat: os 320 px do aceite passaram a ser medidos, e não afirmados (T-16.1)

*09/09/2026, Razawaky, tipo `feat`.*

A RNF-20 pede que a aplicação funcione de 320 px a desktop, e a varredura de acessibilidade lê o HTML servido — largura só existe depois do CSS. O `npm run evidencias` passou a abrir as doze telas a 320 px num navegador de verdade e a falhar se alguma rolar lateralmente. Nenhuma rola.

**Arquivos (11 arquivos, +123 −8):** `scripts/evidencias.js` (+123 −8), `docs/evidencias/telas/01-landing-celular.webp` (+0 −0), `docs/evidencias/telas/03-colmeia-celular.webp` (+0 −0), `docs/evidencias/telas/03-colmeia-desktop.webp` (+0 −0), `docs/evidencias/telas/05-celula-celular.webp` (+0 −0), `docs/evidencias/telas/06-loja-celular.webp` (+0 −0), `docs/evidencias/telas/06-loja-desktop.webp` (+0 −0), `docs/evidencias/telas/07-cofre-celular.webp` (+0 −0), `docs/evidencias/telas/07-cofre-desktop.webp` (+0 −0), `docs/evidencias/telas/08-metas-celular.webp` (+0 −0), `docs/evidencias/telas/09-conquistas-celular.webp` (+0 −0).

**Código atual:** `principal` em `scripts/evidencias.js:363`.

```js
async function principal() {
  const cookieDeSessao = await entrar(CONTA_DO_JOGADOR);
  const caminhoDaCelula = await descobrirCaminhoDaCelula(cookieDeSessao);

  await mkdir(PASTA_DE_SAIDA, { recursive: true });
  const perfilTemporario = join(tmpdir(), `beever-evidencias-${process.pid}`);
  const { processo, nome } = await subirNavegador(perfilTemporario);
  console.log(`Navegador: ${nome}`);

  const versao = await (await fetch(`http://127.0.0.1:${PORTA_DE_DEPURACAO}/json/version`)).json();
  const aba = await abrirAba(versao.webSocketDebuggerUrl);

  const capturadas = [];
  const estouraram = [];

  async function capturar(tela) {
    if (SOMENTE_ROLAGEM) return;

    const caminho = tela.caminho ?? caminhoDaCelula;
    if (!caminho) {
      console.log(`  ${tela.arquivo}: sem célula na trilha, pulada`);
      return;
    }

    const larguras = [{ sufixo: 'celular', largura: LARGURA_DE_CELULAR, altura: ALTURA_DE_CELULAR }];
    if (tela.desktop) {
      larguras.push({ sufixo: 'desktop', largura: LARGURA_DE_DESKTOP, altura: ALTURA_DE_DESKTOP });
    }

    for (const { sufixo, largura, altura } of larguras) {
      const destino = `${PASTA_DE_SAIDA}/${tela.arquivo}-${sufixo}.webp`;
      await fotografar(aba, `${ENDERECO_DO_SERVIDOR}${caminho}`, largura, altura, destino);
      capturadas.push(destino);
      console.log(`  ${destino}`);
    }
  }

  async function ligarSessao(cookie) {
    const { hostname } = new URL(ENDERECO_DO_SERVIDOR);
    await aba.pedir('Network.setCookie', {
      name: 'beever.sid',
      value: cookie,
      domain: hostname,
      path: '/',
      httpOnly: true,
    });
  }

  async function medirTodas(telas) {
    for (const tela of telas) {
      const caminho = tela.caminho ?? caminhoDaCelula;
      if (!caminho) continue;

      const { rolagem, pagina, janela, culpado, contencao } = await medirRolagemEstreita(
        aba,
        `${ENDERECO_DO_SERVIDOR}${caminho}`,
      );

      // Sem esta conferência o gate mente: se o navegador não aplicar a largura
      // pedida, a página é medida numa janela maior e "cabe" sem ter cabido.
  // … continua até a linha 503 do arquivo
```

### 176. `246e8e9` docs: a auditoria da E16 achou a RN-053 furada por dois eventos de perfil

*09/09/2026, Razawaky, tipo `docs`.*

Laudo em `docs/29-AUDITORIA-DA-ETAPA-E16.md`, veredito de pode avançar com a lacuna bloqueante corrigida e commitada durante a auditoria. Fica registrado o padrão que apareceu em duas etapas seguidas: a guarda cobrindo menos do que o texto promete. Na E15 o teste existia só no disco; aqui a conferência filtrava um tipo de entidade e deixava o outro passar. Nos dois casos o teste estava verde e o requisito, furado.

**Arquivos (2 arquivos, +132 −0):** `docs/29-AUDITORIA-DA-ETAPA-E16.md` (+107 −0), `docs/ESTADO-DO-PROJETO.md` (+25 −0).

### 177. `b341027` docs: a E16 passou a constar como auditada na tabela do roadmap

*09/09/2026, Razawaky, tipo `docs`.*

A linha dizia apenas concluída; o laudo existe desde o commit anterior, e uma etapa só fecha depois dele.

**Arquivos (1 arquivo, +1 −1):** `docs/ESTADO-DO-PROJETO.md` (+1 −1).

### 178. `019d7d1` fix: a guarda da RN-053 passou a olhar as duas pontas da trilha

*09/09/2026, Razawaky, tipo `fix`.*

A primeira versão filtrava `entity_type = 'user'` e deixava passar as linhas de perfil — foi assim que o apelido sobreviveu. A correção trocou por `actor_id`, e com isso criou o buraco simétrico: linha que outra pessoa escreve sobre esta conta tem o ator dela, não o dono. `admin.promovido`, `admin.rebaixado` e o `conta.apagada` feito pelo painel são exatamente essa forma.

**Arquivos (1 arquivo, +7 −4):** `test/integration/exclusaoDefinitiva.test.js` (+7 −4).

### 179. `fde64c6` fix: a barra de progresso do favo cabia mal em 320 px

*09/09/2026, Razawaky, tipo `fix`.*

`w-40` são 160 px fixos, e ao lado do hexágono eles passavam da janela num celular estreito: a barra ficava cortada pelo cartão. `max-w-full` deixa ela encolher quando não há espaço, e a medição de 320 px confirma — a Colmeia saiu da lista de telas com conteúdo cortado.

**Arquivos (1 arquivo, +3 −1):** `src/views/partials/ui/favo-card.ejs` (+3 −1).

### 180. `af084c2` feat: a medição de 320 px virou portão do CI e alcançou o painel administrativo

*09/09/2026, Razawaky, tipo `feat`.*

O gate existia mas dependia de alguém lembrar de rodar: ele mora no `npm run evidencias`, que precisa de servidor de pé e navegador, e o CI não o executava. Agora há o job `rolagem`, com MySQL, migrations, seed, CSS compilado — sem estilo tudo cabe, e a medição provaria nada —, servidor de pé e `npm run rolagem`, o modo que mede sem gerar print.

**Arquivos (3 arquivos, +121 −16):** `scripts/evidencias.js` (+55 −16), `.github/workflows/ci.yml` (+65 −0), `package.json` (+1 −0).

**Código atual:** `medirRolagemEstreita` em `scripts/evidencias.js:298`.

```js
/**
 * Mede se a página cabe em 320 px sem rolagem horizontal (RNF-20).
 *
 * A varredura de acessibilidade lê o HTML servido e não consegue responder
 * isto: largura só existe depois de o CSS ser aplicado. Aqui a pergunta é feita
 * ao navegador — `scrollWidth` maior que a janela é a definição de rolagem
 * lateral, e é o que o checklist da seção 8 do `docs/04` proíbe.
 */
async function medirRolagemEstreita(aba, endereco) {
  await aba.pedir('Emulation.setDeviceMetricsOverride', {
    width: LARGURA_ESTREITA,
    height: 640,
    deviceScaleFactor: 1,
    mobile: true,
  });

  const carregou = aba.esperarEvento('Page.loadEventFired');
  await aba.pedir('Page.navigate', { url: endereco });
  await carregou;
  await esperar(800);

  const medir = () => aba.pedir('Runtime.evaluate', {
    // `scrollWidth` do documento é clampado quando algo esconde o transbordo, e
    // aí a medida vira sempre "cabe". O que não mente é o elemento mais largo
    // da página: se ele passa da janela, houve transbordo, escondido ou não.
    expression: `JSON.stringify((() => {
      let maior = document.documentElement.scrollWidth;
      let culpado = 'html';
      let contencao = 'nenhuma';
      for (const elemento of document.body.querySelectorAll('*')) {
        const direita = elemento.getBoundingClientRect().right;
        if (direita <= maior) continue;

        maior = Math.ceil(direita);
        culpado = elemento.tagName.toLowerCase() + (elemento.id ? '#' + elemento.id : '') + (elemento.className ? '.' + String(elemento.className).split(' ').slice(0, 3).join('.') : '');

        // Quem segura o transbordo muda o veredito: contêiner que rola deixa o
        // conteúdo alcançável, e é o padrão que o design system pede para
        // tabela larga. Contêiner que esconde corta e a criança não chega lá.
        contencao = 'nenhuma';
        for (let pai = elemento.parentElement; pai; pai = pai.parentElement) {
          const transbordo = getComputedStyle(pai).overflowX;
          if (transbordo === 'visible') continue;
          contencao = transbordo === 'hidden' ? 'escondido' : 'rolavel';
          break;
        }
      }
      return {
        rolagem: document.documentElement.scrollWidth,
        pagina: maior,
        janela: window.innerWidth,
        culpado,
        contencao,
        caminho: location.pathname,
      };
    })())`,
    returnByValue: true,
  });

  // O evento de carregamento de uma navegação anterior pode chegar atrasado e
  // … continua até a linha 361 do arquivo
```

### 181. `3f589c4` docs: a segunda varredura da E16 entrou no laudo

*09/09/2026, Razawaky, tipo `docs`.*

Quatro lacunas nas próprias correções da primeira varredura, as quatro corrigidas e commitadas. A principal repete o padrão da etapa: a guarda trocou um filtro estreito por outro estreito.

**Arquivos (1 arquivo, +27 −0):** `docs/29-AUDITORIA-DA-ETAPA-E16.md` (+27 −0).

### 182. `d0d46f4` chore: o opencode.json ficou de fora do repositório

*09/09/2026, Razawaky, tipo `chore`.*

Configuração de agente de IA, na mesma família do .claude/ e do .opencode/ que já estavam ignorados: é ajuste de máquina, não do projeto.

**Arquivos (1 arquivo, +1 −0):** `.gitignore` (+1 −0).

## 10 de setembro de 2026

### 183. `50ce60d` feat: o painel do jogador ganhou atalho para a área administrativa

*10/09/2026, Razawaky, tipo `feat`.*

O admin que entrava pelo login comum caía em `/painel` e só chegava a `/admin` digitando o endereço. A Colmeia agora mostra o card "Área administrativa" quando a sessão tem `ehAdmin`; landing e login público seguem sem link para a porta.

**Arquivos (5 arquivos, +55 −9):** `test/integration/adminAcesso.test.js` (+26 −0), `docs/RASTREABILIDADE.md` (+7 −7), `docs/ESTADO-DO-PROJETO.md` (+11 −2), `src/views/pages/painel.ejs` (+8 −0), `src/controllers/paginaController.js` (+3 −0).

**Código atual:** `painel` em `src/controllers/paginaController.js:110`, já transcrito no commit 110.

### 184. `8e390c8` feat: a aplicação passou a enviar e-mail, com o Mailpit fazendo papel de caixa de correio em desenvolvimento

*10/09/2026, Razawaky, tipo `feat`.*

Primeira metade da T-17.5 (P1.1 do plano para a banca). O nodemailer entra com transporte único, configurado por SMTP_*; em teste, ou sem SMTP fora de produção, o e-mail vira JSON e nada sai da máquina. Em produção o env.js recusa subir sem SMTP_HOST e APP_URL.

**Arquivos (9 arquivos, +162 −2):** `src/services/emailService.js` (+40 −0), `test/unit/emailService.test.js` (+35 −0), `src/config/email.js` (+27 −0), `docker-compose.yml` (+17 −2), `src/config/env.js` (+17 −0), `.env.example` (+13 −0), `package-lock.json` (+10 −0), `test/integration/erroEmProducao.test.js` (+2 −0), `package.json` (+1 −0).

**Código atual:** `montarEmailDeRecuperacao` em `src/services/emailService.js:11`.

```js
/** Monta o e-mail de recuperação. Só texto puro, então o apelido não precisa de escape de HTML. */
export function montarEmailDeRecuperacao({ apelido, link, validadeEmMinutos }) {
  const texto = [
    `Oi, ${apelido}!`,
    '',
    'Alguém pediu para trocar a senha da sua conta no Beever. Se foi você, abra o link abaixo e escolha uma senha nova:',
    '',
    link,
    '',
    `O link vale por ${validadeEmMinutos} minutos e só funciona uma vez.`,
    '',
    'Se não foi você, pode ignorar este e-mail: sua senha continua a mesma.',
  ].join('\n');

  return { assunto: 'Troca de senha do Beever', texto };
}
```

### 185. `ba68f36` feat: quem esquece a senha recebe um link por e-mail e escolhe outra (T-17.5)

*10/09/2026, Razawaky, tipo `feat`.*

Fecha a RF-AUT-06, o último P1 sem código. O login ganhou "Esqueceu a senha?"; o link vale 60 minutos e uma vez só, o banco guarda apenas o hash SHA-256 do token (migration 024), a resposta é igual exista a conta ou não e o pedido é limitado a três por e-mail por hora. Na tela da senha nova o usuário escolhe se quer sair de todos os aparelhos, e só então as sessões da conta caem. O token é escondido do log de requisição.

**Arquivos (25 arquivos, +736 −43):** `test/integration/recuperacaoDeSenha.test.js` (+212 −0), `src/services/passwordResetService.js` (+108 −0), `src/views/pages/redefinir-senha.ejs` (+77 −0), `src/views/pages/recuperar-senha.ejs` (+53 −0), `src/repositories/passwordResetTokensRepository.js` (+49 −0), `test/unit/passwordResetService.test.js` (+44 −0), `docs/26-TRABALHOS-FUTUROS.md` (+7 −29), `src/routes/sessao.js` (+31 −1), `docs/ESTADO-DO-PROJETO.md` (+22 −7), `src/controllers/passwordResetController.js` (+24 −0), `migrations/024_password_reset_tokens.sql` (+20 −0), `src/repositories/sessionsRepository.js` (+14 −0), e mais 13 arquivos.

**Código atual:** `solicitarRecuperacao` em `src/services/passwordResetService.js:40`.

```js
/** Gera um link novo e manda por e-mail. Não devolve nada, para o controller não ter como revelar se a conta existe. */
export async function solicitarRecuperacao(email) {
  const usuario = await usersRepository.buscarPorEmail(email);
  if (!usuario || !usuario.is_active) return;

  const token = gerarToken();
  await passwordResetTokensRepository.invalidarAbertosDoUsuario(usuario.id);
  await passwordResetTokensRepository.criar({
    usuarioId: usuario.id,
    tokenHash: hashDoToken(token),
    validadeEmMinutos: VALIDADE_DO_LINK_EM_MINUTOS,
  });

  await auditService.registrar(auditService.usuario(usuario.id), 'senha.recuperacao_solicitada', {
    entidade: 'user',
    id: usuario.id,
  });

  // O envio não segura a resposta: esperar o SMTP deixaria o pedido de conta que
  // existe mais lento que o de conta que não existe, e o tempo entregaria quem tem conta.
  emailService
    .enviarRecuperacaoDeSenha({
      para: usuario.email,
      apelido: usuario.nickname,
      link: montarLink(token),
      validadeEmMinutos: VALIDADE_DO_LINK_EM_MINUTOS,
    })
    .catch((erro) => logger.error({ erro, usuarioId: usuario.id }, 'Falha ao enviar e-mail de recuperação'));
}
```

### 186. `20a6ba2` feat: dá para entrar e criar conta com o Google

*10/09/2026, Razawaky, tipo `feat`.*

Fora do roadmap, a pedido do usuário. O botão só aparece com GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET configurados; a ida leva state e PKCE, e o escopo é só openid e e-mail, então o nome completo nem chega (RN-049). E-mail verificado de conta existente vincula o Google a ela; quem não tem conta completa o cadastro com apelido em branco, data de nascimento e consentimento, as mesmas regras do cadastro comum. A migration 025 deixa password_hash nulo e cria google_sub; conta nascida do Google não entra por senha até definir uma pela recuperação.

**Arquivos (23 arquivos, +812 −22):** `package-lock.json` (+248 −0), `test/integration/loginComGoogle.test.js` (+158 −0), `src/services/googleAuthService.js` (+92 −0), `src/controllers/googleAuthController.js` (+66 −0), `src/views/pages/completar-cadastro.ejs` (+60 −0), `src/routes/sessao.js` (+32 −1), `src/repositories/usersRepository.js` (+22 −4), `docs/ESTADO-DO-PROJETO.md` (+18 −7), `src/views/partials/ui/botao-google.ejs` (+19 −0), `src/config/google.js` (+16 −0), `src/controllers/paginaController.js` (+14 −1), `src/services/usersService.js` (+13 −2), e mais 11 arquivos.

**Código atual:** `perfilDoRetorno` em `src/services/googleAuthService.js:49`.

```js
/** Troca o código da volta pelo e-mail e pelo id da pessoa, conferindo a assinatura do Google. */
export async function perfilDoRetorno({ codigo, stateRecebido, ida }) {
  exigirGoogleConfigurado();

  // O state prova que a volta é da ida que esta sessão começou, e não de um link plantado por outra pessoa.
  if (!ida || !codigo || stateRecebido !== ida.state) throw erroGoogle();
  const { codeVerifier } = ida;

  try {
    const { tokens } = await clienteGoogle.getToken({ code: codigo, codeVerifier });
    const ticket = await clienteGoogle.verifyIdToken({ idToken: tokens.id_token, audience: env.google.idDoCliente });
    const dados = ticket.getPayload();
    return { googleSub: dados.sub, email: dados.email.toLowerCase(), emailVerificado: dados.email_verified === true };
  } catch (erro) {
    logger.warn({ erro }, 'Falha ao trocar o código do Google');
    throw erroGoogle();
  }
}
```

### 187. `d24222a` feat: um Jenkins local em contêiner roda o mesmo portão do GitHub Actions

*10/09/2026, Razawaky, tipo `feat`.*

Imagem oficial jenkins/jenkins LTS com o CLI do Docker e os plugins do pipeline, configurada inteira por Configuration as Code: usuário admin com senha do .env e um job multibranch que lê o repositório desta máquina e varre de 5 em 5 minutos. O Jenkinsfile espelha o ci.yml (lint e auditoria suíte contra MySQL, cobertura, rolagem a 320 px e build da imagem), com cada etapa num contêiner do agente e um MySQL próprio. Sobe pelo perfil jenkins do docker-compose, só em 127.0.0.1.

**Arquivos (7 arquivos, +227 −0):** `Jenkinsfile` (+100 −0), `jenkins/casc.yaml` (+51 −0), `docker-compose.yml` (+28 −0), `jenkins/Dockerfile` (+26 −0), `jenkins/entrada.sh` (+9 −0), `jenkins/agente.Dockerfile` (+7 −0), `.env.example` (+6 −0).

### 188. `0e9ed2e` fix: o Jenkinsfile passou o agente por parâmetro para a etapa com MySQL

*10/09/2026, Razawaky, tipo `fix`.*

Função do Jenkinsfile não enxerga o def do topo do script, e o build #1 quebrou na suíte com MissingPropertyException.

**Arquivos (1 arquivo, +5 −4):** `Jenkinsfile` (+5 −4).

### 189. `a3901ee` docs: o Jenkins local entrou no laudo de integração contínua e no manual

*10/09/2026, Razawaky, tipo `docs`.*

O docs/18 explica o Jenkins ao lado do Actions e por que ele só escuta em 127.0.0.1; o manual ganhou o passo de subir o Jenkins e as linhas de JENKINS_ADMIN_PASSWORD e DOCKER_GID. test/unit/jenkins.test.js reprova pipeline que chame script inexistente, que deixe de rodar etapa do Actions ou contêiner exposto fora da máquina.

**Arquivos (3 arquivos, +87 −0):** `test/unit/jenkins.test.js` (+53 −0), `docs/18-INTEGRACAO-CONTINUA.md` (+21 −0), `docs/24-MANUAL-DE-INSTALACAO-E-EXECUCAO.md` (+13 −0).

### 190. `a895461` fix: o teste dos documentos do TCC parou de exigir o CSS compilado no disco

*10/09/2026, Razawaky, tipo `fix`.*

O docs/23 e o docs/24 citam src/public/css/app.css, que sai do build e fica fora do git. Na máquina de quem desenvolve o arquivo existe; num checkout limpo, como o do Jenkins e o do GitHub Actions, não, e a suíte reprovava desde a T-15.3. O Jenkins achou no primeiro build completo. O teste passa a aceitar pelo nome os arquivos que o próprio build gera.

**Arquivos (1 arquivo, +10 −3):** `test/unit/tcc.test.js` (+10 −3).

**Código atual:** `existeNoProjeto` em `test/unit/tcc.test.js:27`.

```js
function existeNoProjeto(caminho) {
  return GERADOS_PELO_BUILD.has(caminho) || existsSync(path.join(raiz, caminho));
}
```

### 191. `461dd58` fix: a medição de 320 px passou a tentar o próximo navegador quando o primeiro não existe

*10/09/2026, Razawaky, tipo `fix`.*

O spawn de um navegador ausente chega como evento error, que o script não ouvia: o processo morria no brave, primeiro da lista, sem tentar o chromium. Na máquina de quem tem o Brave não aparecia; no agente do Jenkins, só com Chromium, e no runner do GitHub, só com Chrome, quebrava.

**Arquivos (1 arquivo, +3 −0):** `scripts/evidencias.js` (+3 −0).

**Código atual:** `subirNavegador` em `scripts/evidencias.js:141`.

```js
/** Sobe o navegador sem janela com a porta de depuração aberta. */
async function subirNavegador(perfilTemporario) {
  for (const nome of NAVEGADORES_POSSIVEIS) {
    const processo = spawn(
      nome,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        `--remote-debugging-port=${PORTA_DE_DEPURACAO}`,
        `--user-data-dir=${perfilTemporario}`,
        'about:blank',
      ],
      { stdio: 'ignore' },
    );
    // Navegador que não está instalado chega como evento `error`; sem ouvir, o
    // script morria no primeiro da lista em vez de tentar o próximo.
    processo.on('error', () => {});

    for (let tentativa = 0; tentativa < 40; tentativa += 1) {
      await esperar(250);
      try {
        const resposta = await fetch(`http://127.0.0.1:${PORTA_DE_DEPURACAO}/json/version`);
        const versao = await resposta.json();
        return { processo, nome, enderecoDoNavegador: versao.webSocketDebuggerUrl };
      } catch {
        if (processo.exitCode !== null) break;
      }
    }

    processo.kill();
  }

  throw new Error(`Nenhum navegador encontrado. Instale um destes: ${NAVEGADORES_POSSIVEIS.join(', ')}.`);
}
```

### 192. `c476998` docs: o Jenkins ganhou documento próprio, com acesso, processo e cada etapa

*10/09/2026, Razawaky, tipo `docs`.*

docs/29-JENKINS.md explica como subir, como ele é montado pelo casc.yaml como um build começa, o que cada etapa faz e quanto leva (build #6, o primeiro verde de ponta a ponta), como ler um build vermelho, as diferenças para o Actions e os problemas comuns. O usuário é admin e a senha padrão de desenvolvimento passa a vir no .env.example, aceitável só porque o Jenkins escuta apenas em 127.0.0.1. O estado registra os dois defeitos que o checkout limpo achou e a DT-131, o teste de tempo que reprova sem motivo em máquina sem memória livre.

**Arquivos (5 arquivos, +170 −10):** `docs/29-JENKINS.md` (+142 −0), `docs/ESTADO-DO-PROJETO.md` (+18 −5), `.env.example` (+5 −3), `docs/24-MANUAL-DE-INSTALACAO-E-EXECUCAO.md` (+3 −2), `docs/18-INTEGRACAO-CONTINUA.md` (+2 −0).

### 193. `1ca64b7` fix: o teste do fluxo autenticado passou a calcular o dia da agenda no fuso do jogador

*10/09/2026, Razawaky, tipo `fix`.*

O teste montava a agenda com new Date().getDay(), no fuso da máquina, e o tasksService decide o dia no fuso do jogador. No contêiner do Jenkins, em UTC, depois das 21h o teste já via sexta e o serviço ainda via quinta, então nenhuma tarefa era gerada e três testes caíam (build #8).

**Arquivos (1 arquivo, +4 −1):** `test/integration/fluxoAutenticado.test.js` (+4 −1).

**Código atual:** `HOJE` em `test/integration/fluxoAutenticado.test.js:54`.

```js
/**
 * A agenda semanal do jogador precisa incluir **hoje**.
 *
 * `tasksService` só propõe tarefa em dia marcado na agenda (RN-011), e a agenda
 * daqui era fixa em segunda, quarta e sexta. O efeito só aparecia no calendário:
 * a suíte passava nesses três dias e reprovava nos outros quatro, derrubando de
 * uma vez tarefa, pagamento de mel e pólen, compra, meta e auditoria da compra —
 * seis testes caindo por um motivo que não tinha nada a ver com o que eles
 * verificam.
 *
 * Três dias alternados a partir de hoje mantêm o mesmo cenário de antes (agenda
 * parcial, não a semana inteira) sem amarrar o resultado ao dia em que a suíte
 * roda. O passo 2 garante dias distintos: 7 é ímpar, então 0, 2 e 4 nunca se
 * repetem ao voltar pelo módulo.
 */
// Hoje no fuso do jogador, igual ao tasksService. O getDay() usava o fuso da
// máquina, e no contêiner em UTC o dia virava três horas antes do jogador.
const HOJE = diaDaSemana(dataDoDia(new Date(), FUSO_PADRAO));
```
