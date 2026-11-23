-- 036 — Recompensa de mel configurável por célula.
--
-- Permite ao administrador definir a quantidade de mel base (3 estrelas)
-- que uma célula concede. NULL = usa reward_configs padrão.
--
-- REVERSÃO: ALTER TABLE cells DROP COLUMN reward_coins;

ALTER TABLE cells
  ADD COLUMN reward_coins INT UNSIGNED NULL DEFAULT NULL AFTER estimated_seconds;
