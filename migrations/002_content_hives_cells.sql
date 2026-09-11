-- 002 — Trilha: favos, células, conteúdo e progresso.
--
-- RN-025: a hierarquia é Favo (módulo) → Célula (atividade) → conteúdo/jogo.
-- Nada disso existia no schema anterior, que tinha só `conteudo` e `jogo`
-- soltos, sem trilha e sem progresso por atividade.
--
-- `hives.required_item_id` fica sem foreign key aqui de propósito: `items` só
-- nasce em 005. A constraint é acrescentada lá, no fim do arquivo.
--
-- REVERSÃO: DROP TABLE hive_progress, cell_progress, contents, cells, hives,
-- game_types.

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------

-- Os seis tipos de jogo do RF-JOG. É tabela e não enum porque cada tipo tem um
-- validador de payload próprio (ver `contents.body`) e porque acrescentar um
-- jogo novo não pode exigir migration destrutiva.
CREATE TABLE IF NOT EXISTS game_types (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug        VARCHAR(60) NOT NULL,
  name        VARCHAR(120) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Favo = módulo da trilha. RN-027: o favo seguinte libera com `unlock_percent`
-- do atual concluído (80% por padrão). RN-028: pode exigir patrimônio mínimo
-- ou um item específico do inventário.
CREATE TABLE IF NOT EXISTS hives (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug               VARCHAR(60) NOT NULL,
  title              VARCHAR(120) NOT NULL,
  description        VARCHAR(500) DEFAULT NULL,
  order_index        SMALLINT UNSIGNED NOT NULL,
  age_band_id        BIGINT UNSIGNED NOT NULL,
  unlock_percent     TINYINT UNSIGNED NOT NULL DEFAULT 80,
  required_patrimony BIGINT NOT NULL DEFAULT 0,
  required_item_id   BIGINT UNSIGNED DEFAULT NULL,
  is_active          TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at         DATETIME DEFAULT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hives_slug (slug),
  KEY idx_hives_order (age_band_id, order_index),
  CONSTRAINT fk_hives_age_band FOREIGN KEY (age_band_id) REFERENCES age_bands (id) ON DELETE RESTRICT,
  CONSTRAINT ck_hives_unlock_percent CHECK (unlock_percent BETWEEN 1 AND 100),
  CONSTRAINT ck_hives_required_patrimony CHECK (required_patrimony >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Célula = atividade. RN-026: são sequenciais dentro do favo, e a UNIQUE
-- (hive_id, order_index) é o que garante a ordem — sem ela, duas células na
-- mesma posição tornam "a próxima" ambígua.
-- RN-029: toda célula pertence a uma faixa de idade.
CREATE TABLE IF NOT EXISTS cells (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hive_id           BIGINT UNSIGNED NOT NULL,
  game_type_id      BIGINT UNSIGNED NOT NULL,
  age_band_id       BIGINT UNSIGNED NOT NULL,
  order_index       SMALLINT UNSIGNED NOT NULL,
  title             VARCHAR(120) NOT NULL,
  estimated_seconds INT UNSIGNED NOT NULL DEFAULT 300,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at        DATETIME DEFAULT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- Esta UNIQUE também serve de índice para a consulta "células do favo em
  -- ordem" (seção 5.7 do documento de banco). Um KEY separado com as mesmas
  -- colunas seria índice duplicado.
  UNIQUE KEY uq_cells_hive_order (hive_id, order_index),
  KEY idx_cells_game_type (game_type_id),
  CONSTRAINT fk_cells_hive FOREIGN KEY (hive_id) REFERENCES hives (id) ON DELETE RESTRICT,
  CONSTRAINT fk_cells_game_type FOREIGN KEY (game_type_id) REFERENCES game_types (id) ON DELETE RESTRICT,
  CONSTRAINT fk_cells_age_band FOREIGN KEY (age_band_id) REFERENCES age_bands (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Payload da atividade. Decisão de checkpoint: JSON validado na aplicação, com
-- `version` no registro para o validador saber qual formato esperar. O tipo de
-- jogo vem de `cells.game_type_id` e decide qual validador roda.
--
-- O que o banco garante: JSON sintaticamente válido e a ligação com a célula.
-- O que ele não garante: que o conteúdo do JSON faça sentido para o jogo. Essa
-- validação é da aplicação, e é dívida assumida em troca de não precisar de uma
-- tabela por tipo de jogo.
--
-- O dump antigo guardava o corpo da atividade em VARCHAR(255).
CREATE TABLE IF NOT EXISTS contents (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cell_id    BIGINT UNSIGNED NOT NULL,
  version    SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  body       JSON NOT NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_contents_cell_version (cell_id, version),
  CONSTRAINT fk_contents_cell FOREIGN KEY (cell_id) REFERENCES cells (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Progresso
-- ---------------------------------------------------------------------------

-- RN-030: sem sistema de vidas. A avaliação é por estrelas — 3 (0-1 erro),
-- 2 (2-3 erros), 1 (4+ erros, mas concluiu). A criança nunca é bloqueada por
-- errar, então não existe estado "reprovado".
--
-- A UNIQUE (user_id, cell_id) é o que torna a repetição detectável: se a linha
-- já existe, a conclusão é repetição e vale 25% de XP e zero mel (RN-008).
CREATE TABLE IF NOT EXISTS cell_progress (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            BIGINT UNSIGNED NOT NULL,
  cell_id            BIGINT UNSIGNED NOT NULL,
  stars              TINYINT UNSIGNED NOT NULL DEFAULT 0,
  attempts           INT UNSIGNED NOT NULL DEFAULT 0,
  errors             INT UNSIGNED NOT NULL DEFAULT 0,
  best_score         INT UNSIGNED NOT NULL DEFAULT 0,
  first_completed_at DATETIME DEFAULT NULL,
  last_completed_at  DATETIME DEFAULT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- Atende também à consulta indexada da seção 5.7; não precisa de KEY à parte.
  UNIQUE KEY uq_cell_progress_user_cell (user_id, cell_id),
  CONSTRAINT fk_cell_progress_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_cell_progress_cell FOREIGN KEY (cell_id) REFERENCES cells (id) ON DELETE CASCADE,
  CONSTRAINT ck_cell_progress_stars CHECK (stars BETWEEN 0 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Cache do percentual por favo. É desnormalização deliberada: recontar as
-- células a cada carregamento da Colmeia seria N+1 na página mais visitada do
-- app (RNF-04). A verdade continua sendo `cell_progress` — esta tabela é
-- derivável e pode ser recalculada a qualquer momento.
CREATE TABLE IF NOT EXISTS hive_progress (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  hive_id         BIGINT UNSIGNED NOT NULL,
  completed_cells SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  total_cells     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  percent         TINYINT UNSIGNED NOT NULL DEFAULT 0,
  completed_at    DATETIME DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hive_progress_user_hive (user_id, hive_id),
  CONSTRAINT fk_hive_progress_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_hive_progress_hive FOREIGN KEY (hive_id) REFERENCES hives (id) ON DELETE CASCADE,
  CONSTRAINT ck_hive_progress_percent CHECK (percent BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
