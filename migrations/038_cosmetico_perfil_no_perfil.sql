-- 038 — Cosmético de avatar do perfil equipado.
--
-- Além do acessório e do fundo, o jogador pode equipar um cosmético que
-- substitui a imagem do avatar do perfil (Beenie comprável).
--
-- REVERSÃO: ALTER TABLE profiles DROP FOREIGN KEY fk_profiles_equipped_profile_cosmetic,
--           DROP KEY idx_profiles_equipped_profile_cosmetic,
--           DROP COLUMN equipped_profile_cosmetic_item_id;

ALTER TABLE profiles
  ADD COLUMN equipped_profile_cosmetic_item_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER equipped_background_cosmetic_item_id,
  ADD KEY idx_profiles_equipped_profile_cosmetic (equipped_profile_cosmetic_item_id),
  ADD CONSTRAINT fk_profiles_equipped_profile_cosmetic
    FOREIGN KEY (equipped_profile_cosmetic_item_id) REFERENCES items (id)
    ON DELETE SET NULL;
