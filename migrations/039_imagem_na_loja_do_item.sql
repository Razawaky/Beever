-- Controla se a ilustração do item aparece na vitrine da loja.
ALTER TABLE items
  ADD COLUMN show_image_in_store TINYINT(1) NOT NULL DEFAULT 1 AFTER avatar_image_path;
