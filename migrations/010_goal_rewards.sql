-- 010 — Diz quanto uma meta paga, e diz isso no banco.
--
-- Concluir uma meta creditava zero: o service nunca informava recompensa e a
-- coluna ficava no default. A tela chegava a anunciar "rendeu 0 de mel e 0 de
-- pólen", que é pior do que não anunciar nada. Foi a segunda lacuna bloqueante
-- apontada na auditoria da E02.
--
-- O valor mora aqui e não no código porque é a RN-006: quanto uma atividade
-- paga é dado versionado, editável pelo seed sem deploy. `reward_configs` não
-- serve para isto — ela é indexada por tipo de jogo, faixa e estrelas, que são
-- eixos de célula, não de meta.
--
-- A escala segue a que o jogo já usa: tarefa diária paga 20 de mel, semanal
-- até 80. Uma meta de sete dias pagando 100 mantém a proporção — meta vale mais
-- que a tarefa que a alimenta, sem virar atalho para enriquecer.
--
-- `reward_multiplier` continua onde estava, servindo ao que já servia; estas
-- colunas trazem o valor final de cada dificuldade, para o service ler uma
-- linha e não fazer conta.
--
-- REVERSÃO: ALTER TABLE goal_difficulties DROP COLUMN reward_coins, DROP COLUMN reward_points.

ALTER TABLE goal_difficulties
  ADD COLUMN reward_coins BIGINT NOT NULL DEFAULT 0 AFTER reward_multiplier,
  ADD COLUMN reward_points INT UNSIGNED NOT NULL DEFAULT 0 AFTER reward_coins,
  ADD CONSTRAINT ck_goal_difficulties_reward CHECK (reward_coins >= 0);
