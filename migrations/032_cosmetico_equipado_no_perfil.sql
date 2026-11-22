-- 032 — Cosmético equipado no perfil (acessório do avatar).
--
-- O jogador pode equipar um item cosmético comprado como acessório sobre o
-- Beenie. A referência é o item do catálogo; a posse é validada no serviço.
--
-- REVERSÃO: ALTER TABLE profiles DROP FOREIGN KEY fk_profiles_equipped_cosmetic,
--           DROP KEY idx_profiles_equipped_cosmetic,
--           DROP COLUMN equipped_cosmetic_item_id;

ALTER TABLE profiles
  ADD COLUMN equipped_cosmetic_item_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER avatar_background,
  ADD KEY idx_profiles_equipped_cosmetic (equipped_cosmetic_item_id),
  ADD CONSTRAINT fk_profiles_equipped_cosmetic
    FOREIGN KEY (equipped_cosmetic_item_id) REFERENCES items (id)
    ON DELETE SET NULL;
