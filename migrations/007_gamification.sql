-- 007 — Conquistas e liga.
--
-- Escopo P1 (RF-GAM): não é MVP e é cortável se o prazo apertar. Fica em
-- arquivo separado justamente por isso — dá para não aplicar este e ter um
-- banco íntegro mesmo assim, porque nada em 001 a 006 depende daqui.
--
-- RN-023: os marcos de sequência (7, 14, 30, 60, 100 dias) rendem mel bônus
-- **e** conquista, então `achievements` é o par natural de `streaks`.
--
-- REVERSÃO: DROP TABLE league_members, leagues, user_achievements, achievements.

CREATE TABLE IF NOT EXISTS achievements (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(60) NOT NULL,
  name         VARCHAR(120) NOT NULL,
  description  VARCHAR(255) NOT NULL,
  icon_path    VARCHAR(255) DEFAULT NULL,
  reward_coins BIGINT NOT NULL DEFAULT 0,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_achievements_slug (slug),
  CONSTRAINT ck_achievements_reward CHECK (reward_coins >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- A UNIQUE é o que impede a mesma conquista ser desbloqueada (e paga) duas
-- vezes — mesma ideia da idempotência do resto do sistema.
CREATE TABLE IF NOT EXISTS user_achievements (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  achievement_id BIGINT UNSIGNED NOT NULL,
  unlocked_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_achievements (user_id, achievement_id),
  CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_achievements_achievement FOREIGN KEY (achievement_id) REFERENCES achievements (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Liga semanal por pólen. Uma liga por semana; a UNIQUE em (starts_on) impede
-- duas ligas concorrentes para o mesmo período.
CREATE TABLE IF NOT EXISTS leagues (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(120) NOT NULL,
  starts_on  DATE NOT NULL,
  ends_on    DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_leagues_starts_on (starts_on),
  CONSTRAINT ck_leagues_dates CHECK (ends_on > starts_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS league_members (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  league_id   BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  points      INT UNSIGNED NOT NULL DEFAULT 0,
  final_rank  SMALLINT UNSIGNED DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_league_members (league_id, user_id),
  KEY idx_league_members_ranking (league_id, points),
  CONSTRAINT fk_league_members_league FOREIGN KEY (league_id) REFERENCES leagues (id) ON DELETE CASCADE,
  CONSTRAINT fk_league_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
