-- 016 — A faixa diz também se o item perde valor.
--
-- A RN-038 desliga três coisas na Faixa A: custo fixo, depreciação e
-- inadimplência. As duas primeiras são efeitos diferentes, e `age_bands` só
-- tinha interruptor para o custo (`is_upkeep_enabled`) — a depreciação ficaria
-- sem fonte, ou viraria uma lista de faixas escrita no service, que é o valor
-- mágico que a RN-006 proíbe no resto da economia.
--
-- A inadimplência não ganha coluna própria: ela é consequência de não pagar o
-- custo fixo, então quem não cobra também não tem como ficar devendo.
--
-- Nasce ligada, porque é o que vale para as faixas B e C; o seed desliga a A.
--
-- REVERSÃO: ALTER TABLE age_bands DROP COLUMN is_depreciation_enabled;

ALTER TABLE age_bands
  ADD COLUMN is_depreciation_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER is_upkeep_enabled;

UPDATE age_bands SET is_depreciation_enabled = 0 WHERE code = 'A';
