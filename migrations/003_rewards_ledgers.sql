-- 003 — Motor de recompensas: níveis, carteira, livros e sessões de jogo.
--
-- É o coração do sistema e a parte que o schema anterior não tinha. RN-001: XP,
-- pólen e mel são três recompensas independentes que nunca se convertem entre
-- si — por isso três livros separados, não uma tabela genérica de "transação".
--
-- Por que livro (ledger) e não só uma coluna de saldo: com uma coluna é
-- impossível provar como o usuário chegou ao saldo, que é exatamente o que a
-- RN-010 e a auditoria do TCC exigem demonstrar. O livro é a verdade; `wallets`
-- e `user_levels` são cache, atualizados na mesma transação. `scripts/reconcile.js`
-- (T-01.4) confere se os dois batem.
--
-- Decisão do checkpoint da E01: o estado de nível do usuário fica em
-- `user_levels`, uma linha por usuário, e não dentro de `wallets`. A curva de
-- XP continua em `levels`, tabela versionada, porque a RN-003 proíbe calcular
-- nível por fórmula no código.
--
-- REVERSÃO: DROP TABLE coin_ledger, point_ledger, xp_ledger, idempotency_keys,
-- game_sessions, game_session_statuses, reward_configs, reward_reasons,
-- wallets, user_levels, levels.

-- ---------------------------------------------------------------------------
-- Níveis
-- ---------------------------------------------------------------------------

-- RN-003: a curva de XP é dado, não fórmula em código. Referência da semente:
-- nível n exige 100 * n^1.5 XP, arredondado para a dezena. Trocar a curva é
-- trocar linhas desta tabela, sem deploy.
CREATE TABLE IF NOT EXISTS levels (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  level        SMALLINT UNSIGNED NOT NULL,
  required_xp  INT UNSIGNED NOT NULL,
  reward_coins BIGINT NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_levels_level (level),
  CONSTRAINT ck_levels_values CHECK (level >= 1 AND reward_coins >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estado de nível do usuário. `xp_total` é cache da soma de `xp_ledger`;
-- `xp_next_level` é cópia do `required_xp` do nível seguinte, guardada para a
-- barra de progresso da Colmeia não precisar de mais um join por página.
CREATE TABLE IF NOT EXISTS user_levels (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  level         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  xp_total      INT UNSIGNED NOT NULL DEFAULT 0,
  xp_next_level INT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_levels_user (user_id),
  CONSTRAINT fk_user_levels_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_user_levels_level CHECK (level >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Carteira
-- ---------------------------------------------------------------------------

-- RN-004: mel nunca fica negativo, e quem garante isso é o banco. O CHECK vale
-- mesmo que o service tenha bug — que é a régua do documento de banco.
-- RN-005: mel é BIGINT em unidades inteiras. Nunca FLOAT.
CREATE TABLE IF NOT EXISTS wallets (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  coins        BIGINT NOT NULL DEFAULT 0,
  points_total INT UNSIGNED NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallets_user (user_id),
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_wallets_coins CHECK (coins >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Configuração de recompensa
-- ---------------------------------------------------------------------------

-- Motivo de cada lançamento nos livros: conclusão de célula, meta, marco de
-- sequência, renda passiva, rendimento de cofre, compra, custo fixo, venda,
-- ajuste administrativo.
CREATE TABLE IF NOT EXISTS reward_reasons (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(60) NOT NULL,
  name       VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reward_reasons_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- RN-006: quanto vale cada coisa é configuração em banco, por tipo de jogo,
-- faixa de idade e número de estrelas. Zero valor de recompensa no código.
CREATE TABLE IF NOT EXISTS reward_configs (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  game_type_id   BIGINT UNSIGNED NOT NULL,
  age_band_id    BIGINT UNSIGNED NOT NULL,
  stars          TINYINT UNSIGNED NOT NULL,
  xp_amount      INT UNSIGNED NOT NULL DEFAULT 0,
  points_amount  INT UNSIGNED NOT NULL DEFAULT 0,
  coins_amount   BIGINT NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reward_configs_combo (game_type_id, age_band_id, stars),
  CONSTRAINT fk_reward_configs_game_type FOREIGN KEY (game_type_id) REFERENCES game_types (id) ON DELETE RESTRICT,
  CONSTRAINT fk_reward_configs_age_band FOREIGN KEY (age_band_id) REFERENCES age_bands (id) ON DELETE RESTRICT,
  CONSTRAINT ck_reward_configs_stars CHECK (stars BETWEEN 1 AND 3),
  CONSTRAINT ck_reward_configs_coins CHECK (coins_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Sessão de jogo
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS game_session_statuses (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(40) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_session_statuses_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- RN-007: a recompensa é calculada no servidor a partir do que está registrado
-- aqui. O cliente envia respostas, nunca pontuação.
-- RN-009: `token` é único e é o que impede a mesma sessão de creditar duas
-- vezes. A UNIQUE é a trava real — não um lock no código.
-- RN-008: `is_replay` marca repetição de célula já concluída, que vale 25% de
-- XP e zero mel.
CREATE TABLE IF NOT EXISTS game_sessions (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  cell_id          BIGINT UNSIGNED NOT NULL,
  status_id        BIGINT UNSIGNED NOT NULL,
  token            CHAR(36) NOT NULL,
  started_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at      DATETIME DEFAULT NULL,
  duration_seconds INT UNSIGNED DEFAULT NULL,
  errors           INT UNSIGNED NOT NULL DEFAULT 0,
  stars            TINYINT UNSIGNED NOT NULL DEFAULT 0,
  xp_awarded       INT UNSIGNED NOT NULL DEFAULT 0,
  points_awarded   INT UNSIGNED NOT NULL DEFAULT 0,
  coins_awarded    BIGINT NOT NULL DEFAULT 0,
  is_replay        TINYINT(1) NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_sessions_token (token),
  KEY idx_game_sessions_user_started (user_id, started_at),
  CONSTRAINT fk_game_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_game_sessions_cell FOREIGN KEY (cell_id) REFERENCES cells (id) ON DELETE RESTRICT,
  CONSTRAINT fk_game_sessions_status FOREIGN KEY (status_id) REFERENCES game_session_statuses (id) ON DELETE RESTRICT,
  CONSTRAINT ck_game_sessions_stars CHECK (stars BETWEEN 0 AND 3),
  CONSTRAINT ck_game_sessions_coins CHECK (coins_awarded >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- RN-009, segunda camada: qualquer operação que credita valor registra a chave
-- aqui antes de creditar. Chave repetida bate na UNIQUE e a operação devolve o
-- resultado guardado em vez de creditar de novo.
--
-- A coluna se chama `idempotency_key` e não `key` porque KEY é palavra
-- reservada no MySQL e obrigaria crase em toda consulta.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  idempotency_key VARCHAR(190) NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  operation       VARCHAR(80) NOT NULL,
  response_hash   CHAR(64) DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_idempotency_keys_key (idempotency_key),
  KEY idx_idempotency_keys_user (user_id, created_at),
  CONSTRAINT fk_idempotency_keys_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Livros (append-only)
-- ---------------------------------------------------------------------------
--
-- Os três seguem a mesma forma: quem, quanto, por quê, referência ao que
-- originou e o saldo depois do lançamento. `balance_after` é redundante de
-- propósito: é o que permite auditar uma linha sem somar o livro inteiro.
--
-- ON DELETE RESTRICT no motivo: histórico não se apaga por acidente.

-- RN-002: XP nunca é gasto nem perdido. O CHECK (amount > 0) é essa regra
-- escrita no banco — nem um ajuste administrativo consegue tirar XP.
CREATE TABLE IF NOT EXISTS xp_ledger (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  amount         INT NOT NULL,
  reason_id      BIGINT UNSIGNED NOT NULL,
  reference_type VARCHAR(40) DEFAULT NULL,
  reference_id   BIGINT UNSIGNED DEFAULT NULL,
  balance_after  INT UNSIGNED NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_xp_ledger_user_created (user_id, created_at),
  KEY idx_xp_ledger_reference (reference_type, reference_id),
  CONSTRAINT fk_xp_ledger_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_xp_ledger_reason FOREIGN KEY (reason_id) REFERENCES reward_reasons (id) ON DELETE RESTRICT,
  CONSTRAINT ck_xp_ledger_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Pólen: progresso de tarefas e metas. Pode ter lançamento negativo em
-- correção administrativa, por isso `amount` é assinado.
CREATE TABLE IF NOT EXISTS point_ledger (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  amount         INT NOT NULL,
  reason_id      BIGINT UNSIGNED NOT NULL,
  reference_type VARCHAR(40) DEFAULT NULL,
  reference_id   BIGINT UNSIGNED DEFAULT NULL,
  balance_after  INT UNSIGNED NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_point_ledger_user_created (user_id, created_at),
  KEY idx_point_ledger_reference (reference_type, reference_id),
  CONSTRAINT fk_point_ledger_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_point_ledger_reason FOREIGN KEY (reason_id) REFERENCES reward_reasons (id) ON DELETE RESTRICT,
  CONSTRAINT ck_point_ledger_amount CHECK (amount <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Mel: entra por recompensa e renda passiva, sai por compra e custo fixo.
-- `balance_after` é UNSIGNED, então o próprio livro recusa registrar um estado
-- de saldo negativo (RN-004) — a trava existe nos dois lugares, carteira e livro.
CREATE TABLE IF NOT EXISTS coin_ledger (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  amount         BIGINT NOT NULL,
  reason_id      BIGINT UNSIGNED NOT NULL,
  reference_type VARCHAR(40) DEFAULT NULL,
  reference_id   BIGINT UNSIGNED DEFAULT NULL,
  balance_after  BIGINT UNSIGNED NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_coin_ledger_user_created (user_id, created_at),
  KEY idx_coin_ledger_reference (reference_type, reference_id),
  CONSTRAINT fk_coin_ledger_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_coin_ledger_reason FOREIGN KEY (reason_id) REFERENCES reward_reasons (id) ON DELETE RESTRICT,
  CONSTRAINT ck_coin_ledger_amount CHECK (amount <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
