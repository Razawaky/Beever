-- 023 — O que faltava para a liga semanal existir (RF-GAM-02).
--
-- `leagues` e `league_members` nasceram na E01 e nunca receberam uma linha. Ao
-- escrever a primeira, três coisas apareceram.
--
-- 1. `uq_leagues_starts_on` permitia **uma liga por semana** em todo o sistema, e
--    a RF-GAM-02 pede grupos. Cada grupo é uma linha de `leagues` com o mesmo
--    domingo e nome diferente, então a unicidade passa a ser do par.
--
-- 2. Somar o pólen da semana é uma pergunta por período, para todos os jogadores.
--    O índice de `point_ledger` começa por `user_id`, porque foi feito para "o
--    extrato deste jogador"; a liga pergunta o contrário, e sem o índice novo ela
--    varre a tabela que mais cresce no sistema.
--
-- 3. O prêmio do pódio é valor de recompensa, e valor de recompensa vem de
--    configuração em banco (RN-006). Três linhas, uma por posição, em vez de três
--    números no meio do service.
--
-- REVERSÃO: DROP TABLE league_prizes;
-- ALTER TABLE point_ledger DROP KEY idx_point_ledger_created_user;
-- ALTER TABLE leagues DROP KEY uq_leagues_semana_grupo,
--   ADD UNIQUE KEY uq_leagues_starts_on (starts_on).

ALTER TABLE leagues
  DROP KEY uq_leagues_starts_on,
  ADD UNIQUE KEY uq_leagues_semana_grupo (starts_on, name);

ALTER TABLE point_ledger
  ADD KEY idx_point_ledger_created_user (created_at, user_id);

CREATE TABLE IF NOT EXISTS league_prizes (
  final_rank   SMALLINT UNSIGNED NOT NULL,
  reward_coins BIGINT NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (final_rank),
  CONSTRAINT ck_league_prizes_coins CHECK (reward_coins >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
