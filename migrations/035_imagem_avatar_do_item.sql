-- 035 — Imagem original do cosmético para uso no avatar.
--
-- A loja usa image_path (auto-trim). O avatar usa avatar_image_path quando
-- existir, preservando o canvas/tamanho original enviado pelo admin.
--
-- REVERSÃO: ALTER TABLE items DROP COLUMN avatar_image_path;

ALTER TABLE items
  ADD COLUMN avatar_image_path VARCHAR(500) NULL DEFAULT NULL AFTER image_path;
