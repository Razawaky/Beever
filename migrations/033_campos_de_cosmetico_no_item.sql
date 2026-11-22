-- 033 — Tipo/camada de cosmético no item.
--
-- Cosméticos podem ser do personagem (avatar) ou do fundo do avatar.
-- Quando for do personagem, a imagem pode ficar sobre ou atrás do avatar.
--
-- REVERSÃO:
-- ALTER TABLE items DROP COLUMN cosmetic_layer, DROP COLUMN cosmetic_kind;

ALTER TABLE items
  ADD COLUMN cosmetic_kind VARCHAR(20) NULL DEFAULT NULL AFTER is_consumable,
  ADD COLUMN cosmetic_layer VARCHAR(20) NULL DEFAULT NULL AFTER cosmetic_kind;
