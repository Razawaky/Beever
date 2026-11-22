-- 034 — Cosmético de fundo equipado no perfil.
--
-- Além do acessório do personagem, o jogador pode equipar um cosmético que
-- vira o fundo do avatar.
--
-- REVERSÃO: ALTER TABLE profiles DROP FOREIGN KEY fk_profiles_equipped_bg_cosmetic,
--           DROP KEY idx_profiles_equipped_bg_cosmetic,
--           DROP COLUMN equipped_background_cosmetic_item_id;

ALTER TABLE profiles
  ADD COLUMN equipped_background_cosmetic_item_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER equipped_cosmetic_item_id,
  ADD KEY idx_profiles_equipped_bg_cosmetic (equipped_background_cosmetic_item_id),
  ADD CONSTRAINT fk_profiles_equipped_bg_cosmetic
    FOREIGN KEY (equipped_background_cosmetic_item_id) REFERENCES items (id)
    ON DELETE SET NULL;
