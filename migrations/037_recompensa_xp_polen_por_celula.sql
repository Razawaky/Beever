-- 037 — Recompensas de XP e pólen configuráveis por célula.
--
-- Complementa 036: permite ao administrador definir XP e pólen base (3 estrelas)
-- por célula. NULL = usa reward_configs padrão.
--
-- REVERSÃO: ALTER TABLE cells DROP COLUMN reward_points, DROP COLUMN reward_xp;

ALTER TABLE cells
  ADD COLUMN reward_xp INT UNSIGNED NULL DEFAULT NULL AFTER reward_coins,
  ADD COLUMN reward_points INT UNSIGNED NULL DEFAULT NULL AFTER reward_xp;
