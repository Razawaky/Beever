-- 004 — Metas, tarefas e sequência.
--
-- Substitui `cronograma → meta → tarefa` do schema anterior. A diferença de
-- fundo: lá a meta era texto livre com progresso em porcentagem FLOAT; aqui a
-- meta tem tipo, alvo numérico e progresso inteiro, porque é o que permite ao
-- `GoalPlannerService` (RN-014/015) gerar meta sozinho e ao sistema fechá-la
-- por evento, sem alguém digitar "100%".
--
-- REVERSÃO: DROP TABLE streak_events, streak_event_types, streaks, tasks,
-- task_types, task_scopes, goals, goal_difficulties, goal_statuses, goal_types.

-- ---------------------------------------------------------------------------
-- Metas
-- ---------------------------------------------------------------------------

-- RN-015: acumular mel, alcançar patrimônio, concluir um favo, concluir N
-- células, manter sequência de N dias, guardar no cofre, atingir nível N.
-- `progress_source` diz ao GoalService qual evento move o contador desta meta.
CREATE TABLE IF NOT EXISTS goal_types (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug            VARCHAR(60) NOT NULL,
  name            VARCHAR(120) NOT NULL,
  progress_source VARCHAR(60) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_goal_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ativa · concluida · expirada · renovada. RN-017: meta vencida não pune, só
-- muda de estado — por isso "expirada" é estado, não exclusão.
CREATE TABLE IF NOT EXISTS goal_statuses (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(40) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_goal_statuses_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- RN-014: quem tem poucos dias disponíveis recebe menos metas, com prazo maior
-- e recompensa multiplicada. O multiplicador é dado, não constante em código.
--   1-2 dias/semana → 1 meta · 28 dias · alta   · 2.0x
--   3-4 dias/semana → 2 metas · 14 dias · média · 1.5x
--   5-7 dias/semana → 3 metas ·  7 dias · simples · 1.0x
CREATE TABLE IF NOT EXISTS goal_difficulties (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug              VARCHAR(40) NOT NULL,
  name              VARCHAR(80) NOT NULL,
  reward_multiplier DECIMAL(6,3) NOT NULL DEFAULT 1.000,
  default_days      SMALLINT UNSIGNED NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_goal_difficulties_slug (slug),
  CONSTRAINT ck_goal_difficulties_multiplier CHECK (reward_multiplier > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- `renewed_from_goal_id` implementa a RN-017: a meta expirada não some, e a
-- renovada aponta para ela. Dá para reconstruir a corrente inteira depois.
-- O índice (user_id, status_id, due_at) é o da consulta da Colmeia: "a meta
-- mais próxima do vencimento" (RF-HOM-04).
CREATE TABLE IF NOT EXISTS goals (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id              BIGINT UNSIGNED NOT NULL,
  goal_type_id         BIGINT UNSIGNED NOT NULL,
  status_id            BIGINT UNSIGNED NOT NULL,
  difficulty_id        BIGINT UNSIGNED NOT NULL,
  title                VARCHAR(160) NOT NULL,
  target_value         BIGINT NOT NULL,
  current_value        BIGINT NOT NULL DEFAULT 0,
  reward_coins         BIGINT NOT NULL DEFAULT 0,
  reward_points        INT UNSIGNED NOT NULL DEFAULT 0,
  starts_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at               DATETIME NOT NULL,
  completed_at         DATETIME DEFAULT NULL,
  renewed_from_goal_id BIGINT UNSIGNED DEFAULT NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_goals_user_status_due (user_id, status_id, due_at),
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_goals_type FOREIGN KEY (goal_type_id) REFERENCES goal_types (id) ON DELETE RESTRICT,
  CONSTRAINT fk_goals_status FOREIGN KEY (status_id) REFERENCES goal_statuses (id) ON DELETE RESTRICT,
  CONSTRAINT fk_goals_difficulty FOREIGN KEY (difficulty_id) REFERENCES goal_difficulties (id) ON DELETE RESTRICT,
  CONSTRAINT fk_goals_renewed_from FOREIGN KEY (renewed_from_goal_id) REFERENCES goals (id) ON DELETE SET NULL,
  CONSTRAINT ck_goals_values CHECK (target_value > 0 AND current_value >= 0 AND reward_coins >= 0),
  CONSTRAINT ck_goals_dates CHECK (due_at > starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Tarefas
-- ---------------------------------------------------------------------------

-- RN-047: diária ou semanal.
CREATE TABLE IF NOT EXISTS task_scopes (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(40) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_task_scopes_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- RN-046: compromissos curtos fora da trilha ("conclua 3 células hoje",
-- "deposite 50 no cofre") que rendem pólen e um pouco de mel.
CREATE TABLE IF NOT EXISTS task_types (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug            VARCHAR(60) NOT NULL,
  name            VARCHAR(120) NOT NULL,
  scope_id        BIGINT UNSIGNED NOT NULL,
  progress_source VARCHAR(60) NOT NULL,
  default_target  BIGINT NOT NULL DEFAULT 1,
  reward_points   INT UNSIGNED NOT NULL DEFAULT 0,
  reward_coins    BIGINT NOT NULL DEFAULT 0,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_task_types_slug (slug),
  CONSTRAINT fk_task_types_scope FOREIGN KEY (scope_id) REFERENCES task_scopes (id) ON DELETE RESTRICT,
  CONSTRAINT ck_task_types_values CHECK (default_target > 0 AND reward_coins >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Progresso é contagem inteira (`current_value` de `target_value`), não a
-- porcentagem FLOAT do schema antigo. Isso importa: a trava de conclusão única
-- passa a comparar inteiros, não ponto flutuante.
-- RN-047 limita a 3 tarefas ativas — regra de geração, aplicada pelo
-- TaskService, porque o banco não conta linhas de outra linha.
--
-- `status_id` aponta para `goal_statuses` de propósito: tarefa e meta têm
-- exatamente os mesmos estados (ativa, concluída, expirada, renovada), e duas
-- tabelas de domínio idênticas divergiriam com o tempo.
CREATE TABLE IF NOT EXISTS tasks (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  task_type_id  BIGINT UNSIGNED NOT NULL,
  status_id     BIGINT UNSIGNED NOT NULL,
  target_value  BIGINT NOT NULL,
  current_value BIGINT NOT NULL DEFAULT 0,
  reward_points INT UNSIGNED NOT NULL DEFAULT 0,
  reward_coins  BIGINT NOT NULL DEFAULT 0,
  due_at        DATETIME NOT NULL,
  completed_at  DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_user_status_due (user_id, status_id, due_at),
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_type FOREIGN KEY (task_type_id) REFERENCES task_types (id) ON DELETE RESTRICT,
  CONSTRAINT fk_tasks_status FOREIGN KEY (status_id) REFERENCES goal_statuses (id) ON DELETE RESTRICT,
  CONSTRAINT ck_tasks_values CHECK (target_value > 0 AND current_value >= 0 AND reward_coins >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Sequência
-- ---------------------------------------------------------------------------

-- RN-021: a avaliação é preguiçosa, na primeira requisição do usuário depois da
-- virada do dia — daí `last_evaluated_at`. RN-024: a virada usa o fuso do
-- usuário (`profiles.timezone`), não o do servidor, e por isso
-- `last_counted_date` é DATE, já resolvido no fuso dele.
-- RN-022: no máximo 2 escudos acumulados, e o CHECK garante isso no banco.
CREATE TABLE IF NOT EXISTS streaks (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  current_days      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  best_days         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  shields_available TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_counted_date DATE DEFAULT NULL,
  last_evaluated_at DATETIME DEFAULT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_streaks_user (user_id),
  CONSTRAINT fk_streaks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_streaks_shields CHECK (shields_available <= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- cumprido · perdido · protegido_por_escudo · neutro. RN-020: dia não marcado
-- não avança nem quebra a sequência, e precisa aparecer como "neutro" no
-- calendário — por isso é evento registrado, não ausência de registro.
CREATE TABLE IF NOT EXISTS streak_event_types (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(40) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_streak_event_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Fonte de verdade do calendário semanal (RF-SEQ). A UNIQUE (user_id,
-- event_date) impede avaliar o mesmo dia duas vezes — é a idempotência da
-- avaliação preguiçosa da RN-021.
CREATE TABLE IF NOT EXISTS streak_events (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  event_date    DATE NOT NULL,
  event_type_id BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- Serve de índice para o calendário semanal (seção 5.7) além de garantir a
  -- unicidade do dia avaliado.
  UNIQUE KEY uq_streak_events_user_date (user_id, event_date),
  CONSTRAINT fk_streak_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_streak_events_type FOREIGN KEY (event_type_id) REFERENCES streak_event_types (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
