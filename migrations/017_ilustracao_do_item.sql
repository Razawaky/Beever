-- 017 — O item passa a ter ilustração própria.
--
-- Até aqui só `avatars` tinha arte (`image_path`), e o item aparecia na loja
-- como texto. A T-12.3 promete cadastro com ilustração, e sem esta coluna o
-- caminho do arquivo não teria onde morar.
--
-- Guarda o caminho, não os bytes: arte em BLOB faz o banco crescer com imagem,
-- engorda o backup e transforma cada card da vitrine numa consulta. O arquivo
-- fica na pasta de uploads, servida como estática, e o dia em que houver mais de
-- uma instância a pasta vira bucket sem esta coluna mudar.
--
-- Nasce nula, porque o catálogo do seed não tem arte e a loja precisa continuar
-- funcionando sem ela.
--
-- REVERSÃO: ALTER TABLE items DROP COLUMN image_path;

ALTER TABLE items
  ADD COLUMN image_path VARCHAR(255) DEFAULT NULL AFTER description_kid;
